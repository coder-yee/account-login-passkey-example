from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models import Passkey, Session as SessionModel, User, WebAuthnChallenge

router = APIRouter(prefix="/api/debug", tags=["debug"])


@router.get("/database")
def database(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {
        "users": [
            {
                "id": item.id,
                "username": item.username,
                "passkeyEnabled": item.passkey_enabled,
                "createdAt": item.created_at.isoformat(),
            }
            for item in db.query(User).filter(User.id == user.id).all()
        ],
        "passkeys": [
            {
                "id": item.id,
                "userId": item.user_id,
                "name": item.name,
                "enabled": item.enabled,
                "signCount": item.sign_count,
                "createdAt": item.created_at.isoformat(),
                "lastUsedAt": (
                    item.last_used_at.isoformat()
                    if item.last_used_at
                    else None
                ),
            }
            for item in db.query(Passkey).filter(Passkey.user_id == user.id).order_by(Passkey.id).all()
        ],
        "sessions": [
            {
                "id": item.id,
                "userId": item.user_id,
                "expiresAt": item.expires_at.isoformat(),
                "createdAt": item.created_at.isoformat(),
            }
            for item in db.query(SessionModel).filter(SessionModel.user_id == user.id).order_by(SessionModel.id).all()
        ],
        "challenges": [
            {
                "id": item.id,
                "type": item.type,
                "userId": item.user_id,
                "expiresAt": item.expires_at.isoformat(),
                "createdAt": item.created_at.isoformat(),
            }
            for item in db.query(WebAuthnChallenge).filter(WebAuthnChallenge.user_id == user.id).order_by(WebAuthnChallenge.id).all()
        ],
    }
