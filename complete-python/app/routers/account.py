from datetime import timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from ..config import settings
from ..dependencies import get_current_user
from ..database import get_db
from ..models import Session as SessionModel, User
from ..schemas import LoginRequest, PasswordVerifyRequest, RegisterRequest
from ..security import (
    hash_password,
    hash_session_token,
    new_session_token,
    new_webauthn_user_id,
    session_expiry,
    utcnow,
    verify_password,
)

router = APIRouter(prefix="/api/account", tags=["account"])


def public_user(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "passkeyEnabled": user.passkey_enabled,
        "createdAt": user.created_at.isoformat(),
    }


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.session_expire_seconds,
        path="/",
    )


@router.post("/register")
def register(
    body: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    username = body.username.strip()

    if not username:
        raise HTTPException(400, "请输入账户名")

    if db.query(User).filter(User.username == username).first():
        raise HTTPException(409, "账户名已存在")

    now = utcnow()
    user = User(
        username=username,
        password_hash=hash_password(body.password),
        webauthn_user_id=new_webauthn_user_id(),
        passkey_enabled=False,
        created_at=now,
        updated_at=now,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return public_user(user)


@router.post("/login")
def login(
    body: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.username == body.username.strip())
        .first()
    )

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "账户名或密码错误")

    token = new_session_token()
    now = utcnow()

    session = SessionModel(
        user_id=user.id,
        session_token_hash=hash_session_token(token),
        expires_at=session_expiry(),
        created_at=now,
    )

    db.add(session)
    db.commit()

    set_session_cookie(response, token)

    return {
        "success": True,
        "account": public_user(user),
    }


@router.post("/password/verify")
def verify_account_password(
    body: PasswordVerifyRequest,
    session_token: str | None = Cookie(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "账户密码错误")

    session = (
        db.query(SessionModel)
        .filter(
            SessionModel.session_token_hash
            == hash_session_token(session_token or ""),
            SessionModel.user_id == user.id,
            SessionModel.expires_at > utcnow(),
        )
        .first()
    )

    if not session:
        raise HTTPException(401, "当前登录 Session 不存在")

    session.password_verified_at = utcnow()
    session.last_used_at = utcnow()
    db.commit()

    return {"success": True}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {
        "success": True,
        "account": public_user(user),
    }


@router.post("/logout")
def logout(
    response: Response,
    session_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if session_token:
        session = (
            db.query(SessionModel)
            .filter(
                SessionModel.session_token_hash
                == hash_session_token(session_token)
            )
            .first()
        )
        if session:
            db.delete(session)
            db.commit()

    response.delete_cookie("session_token", path="/")

    return {"success": True}
