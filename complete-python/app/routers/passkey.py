import json
from base64 import urlsafe_b64encode
from datetime import timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from webauthn import (
    base64url_to_bytes,
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from ..config import settings
from ..database import get_db
from ..dependencies import get_current_user
from ..models import Passkey, Session as SessionModel, WebAuthnChallenge, User
from ..schemas import PasskeyVerifyRequest
from ..security import hash_session_token, new_session_token, utcnow

router = APIRouter(prefix="/api/passkey", tags=["passkey"])


def challenge_expiry():
    return utcnow() + timedelta(minutes=5)


def challenge_cookie(response: Response, challenge_id: int):
    response.set_cookie(
        key="webauthn_challenge_id",
        value=str(challenge_id),
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=300,
        path="/",
    )


def clear_challenge_cookie(response: Response):
    response.delete_cookie(
        "webauthn_challenge_id",
        path="/",
    )


def parse_challenge_id(value: str) -> int:
    # Cookie 属于不可信输入，避免转换异常或数据库整数溢出变成 500。
    if not value.isascii() or not value.isdigit() or len(value) > 20:
        raise HTTPException(400, "WebAuthn Challenge ID 无效")
    result = int(value)
    if not 0 < result <= 2**63 - 1:
        raise HTTPException(400, "WebAuthn Challenge ID 无效")
    return result


@router.post("/register/options")
def registration_options(
    response: Response,
    session_token: str | None = Cookie(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    credentials = (
        db.query(Passkey)
        .filter(
            Passkey.user_id == user.id,
            Passkey.enabled.is_(True),
        )
        .all()
    )

    exclude_credentials = [
        PublicKeyCredentialDescriptor(
            id=item.credential_id,
        )
        for item in credentials
    ]

    options = generate_registration_options(
        rp_id=settings.webauthn_rp_id,
        rp_name=settings.webauthn_rp_name,
        user_id=user.webauthn_user_id,
        user_name=user.username,
        user_display_name=user.username,
        timeout=60000,
        exclude_credentials=exclude_credentials,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.REQUIRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
    )

    session = (
        db.query(SessionModel)
        .filter(
            SessionModel.user_id == user.id,
            SessionModel.session_token_hash == hash_session_token(session_token or ""),
            SessionModel.expires_at > utcnow(),
        )
        .first()
    )

    if (
        not session
        or not session.password_verified_at
        or session.password_verified_at
        < utcnow() - timedelta(minutes=5)
    ):
        raise HTTPException(
            403,
            "请先验证账户密码",
        )

    challenge = WebAuthnChallenge(
        challenge=options.challenge,
        type="registration",
        user_id=user.id,
        session_id=session.id if session else None,
        expires_at=challenge_expiry(),
        created_at=utcnow(),
    )

    db.add(challenge)
    db.commit()
    db.refresh(challenge)

    challenge_cookie(response, challenge.id)

    return json.loads(options_to_json(options))


@router.post("/register/verify")
def registration_verify(
    body: PasskeyVerifyRequest,
    response: Response,
    challenge_id: str | None = Cookie(default=None, alias="webauthn_challenge_id"),
    session_token: str | None = Cookie(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not challenge_id:
        raise HTTPException(400, "WebAuthn 注册 Challenge 不存在")

    challenge = (
        db.query(WebAuthnChallenge)
        .filter(
            WebAuthnChallenge.id == parse_challenge_id(challenge_id),
            WebAuthnChallenge.type == "registration",
            WebAuthnChallenge.user_id == user.id,
            WebAuthnChallenge.expires_at > utcnow(),
        )
        .join(SessionModel, WebAuthnChallenge.session_id == SessionModel.id)
        .filter(
            SessionModel.session_token_hash == hash_session_token(session_token or ""),
            SessionModel.user_id == user.id,
            SessionModel.expires_at > utcnow(),
        )
        .first()
    )

    if not challenge:
        raise HTTPException(400, "WebAuthn 注册 Challenge 已失效")

    try:
        verification = verify_registration_response(
            credential=body.credential,
            expected_challenge=challenge.challenge,
            expected_rp_id=settings.webauthn_rp_id,
            expected_origin=settings.webauthn_origin,
            require_user_verification=False,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Passkey 注册验证失败: {exc}",
        ) from exc

    credential_id = verification.credential_id

    if (
        db.query(Passkey)
        .filter(Passkey.credential_id == credential_id)
        .first()
    ):
        raise HTTPException(409, "该 Passkey 已经注册")

    now = utcnow()
    passkey = Passkey(
        user_id=user.id,
        credential_id=credential_id,
        public_key=verification.credential_public_key,
        sign_count=verification.sign_count,
        name="Passkey",
        enabled=True,
        created_at=now,
        updated_at=now,
    )

    user.passkey_enabled = True
    db.add(passkey)
    db.delete(challenge)
    db.commit()
    db.refresh(passkey)

    clear_challenge_cookie(response)

    return {
        "success": True,
        "passkey": serialize_passkey(passkey),
    }


@router.post("/login/options")
def authentication_options(
    response: Response,
    db: Session = Depends(get_db),
):
    options = generate_authentication_options(
        rp_id=settings.webauthn_rp_id,
        timeout=60000,
        allow_credentials=[],
        user_verification=UserVerificationRequirement.PREFERRED,
    )

    challenge = WebAuthnChallenge(
        challenge=options.challenge,
        type="authentication",
        expires_at=challenge_expiry(),
        created_at=utcnow(),
    )

    db.add(challenge)
    db.commit()
    db.refresh(challenge)

    challenge_cookie(response, challenge.id)

    return json.loads(options_to_json(options))


@router.post("/login/verify")
def authentication_verify(
    body: PasskeyVerifyRequest,
    response: Response,
    challenge_id: str | None = Cookie(default=None, alias="webauthn_challenge_id"),
    db: Session = Depends(get_db),
):
    if not challenge_id:
        raise HTTPException(400, "WebAuthn 登录 Challenge 不存在")

    challenge = (
        db.query(WebAuthnChallenge)
        .filter(
            WebAuthnChallenge.id == parse_challenge_id(challenge_id),
            WebAuthnChallenge.type == "authentication",
            WebAuthnChallenge.expires_at > utcnow(),
        )
        .first()
    )

    if not challenge:
        raise HTTPException(400, "WebAuthn 登录 Challenge 已失效")

    credential_id_b64 = body.credential.get("rawId") or body.credential.get("id")
    if not credential_id_b64:
        raise HTTPException(400, "Credential ID 不存在")

    try:
        credential_id = base64url_to_bytes(credential_id_b64)
    except Exception as exc:
        raise HTTPException(400, "Credential ID 无效") from exc

    passkey = (
        db.query(Passkey)
        .filter(
            Passkey.credential_id == credential_id,
            Passkey.enabled.is_(True),
        )
        .first()
    )

    if not passkey:
        raise HTTPException(401, "Passkey 不存在或已停用")

    try:
        verification = verify_authentication_response(
            credential=body.credential,
            expected_challenge=challenge.challenge,
            expected_rp_id=settings.webauthn_rp_id,
            expected_origin=settings.webauthn_origin,
            credential_public_key=passkey.public_key,
            credential_current_sign_count=passkey.sign_count,
            require_user_verification=False,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail=f"Passkey 登录验证失败: {exc}",
        ) from exc

    user = db.get(User, passkey.user_id)
    if not user:
        raise HTTPException(401, "Passkey 所属账户不存在")

    passkey.sign_count = verification.new_sign_count
    passkey.last_used_at = utcnow()
    passkey.updated_at = utcnow()

    db.delete(challenge)

    token = new_session_token()
    session = SessionModel(
        user_id=user.id,
        session_token_hash=hash_session_token(token),
        expires_at=utcnow() + timedelta(seconds=settings.session_expire_seconds),
        created_at=utcnow(),
    )
    db.add(session)
    db.commit()

    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.session_expire_seconds,
        path="/",
    )
    clear_challenge_cookie(response)

    return {
        "success": True,
        "account": {
            "id": user.id,
            "username": user.username,
            "passkeyEnabled": user.passkey_enabled,
        },
        "passkey": serialize_passkey(passkey),
    }


@router.get("/list")
def list_passkeys(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [
        serialize_passkey(item)
        for item in (
            db.query(Passkey)
            .filter(Passkey.user_id == user.id)
            .order_by(Passkey.id.desc())
            .all()
        )
    ]


@router.post("/{passkey_id}/enable")
def enable_passkey(
    passkey_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return set_enabled(passkey_id, True, user, db)


@router.post("/{passkey_id}/disable")
def disable_passkey(
    passkey_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return set_enabled(passkey_id, False, user, db)


def set_enabled(
    passkey_id: int,
    enabled: bool,
    user: User,
    db: Session,
):
    passkey = (
        db.query(Passkey)
        .filter(
            Passkey.id == passkey_id,
            Passkey.user_id == user.id,
        )
        .first()
    )

    if not passkey:
        raise HTTPException(404, "Passkey 不存在")

    passkey.enabled = enabled
    passkey.updated_at = utcnow()
    # SessionLocal 关闭了 autoflush，统计前必须写入本次状态变更。
    db.flush()

    enabled_count = (
        db.query(Passkey)
        .filter(
            Passkey.user_id == user.id,
            Passkey.enabled.is_(True),
        )
        .count()
    )

    user.passkey_enabled = enabled_count > 0

    db.commit()
    db.refresh(passkey)

    return serialize_passkey(passkey)


def serialize_passkey(passkey: Passkey) -> dict:
    return {
        "id": passkey.id,
        "credentialId": urlsafe_b64encode(passkey.credential_id).rstrip(b"=").decode("ascii"),
        "name": passkey.name,
        "enabled": passkey.enabled,
        "createdAt": passkey.created_at.isoformat(),
        "lastUsedAt": (
            passkey.last_used_at.isoformat()
            if passkey.last_used_at
            else None
        ),
    }
