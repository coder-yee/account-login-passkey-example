from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .database import get_db
from .models import Session as SessionModel, User
from .security import hash_session_token, utcnow


def get_current_user(
    session_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="当前未登录",
        )

    session = (
        db.query(SessionModel)
        .filter(
            SessionModel.session_token_hash == hash_session_token(session_token),
            SessionModel.expires_at > utcnow(),
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录已失效，请重新登录",
        )

    user = db.get(User, session.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录账户不存在",
        )

    session.last_used_at = utcnow()
    db.commit()

    return user
