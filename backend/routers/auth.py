from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date
from database import get_db
from models.user import User
from schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    UserOut,
    UpdateFCMToken,
    ChangePassword,
)
from utils.security import hash_password, verify_password, create_access_token
from utils.dependencies import get_current_user
import uuid

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user (student or admin)"""
    existing = db.query(User).filter(User.email == user_data.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    new_user = User(
        id=uuid.uuid4(),
        name=user_data.name.strip(),
        email=user_data.email.lower(),
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        is_active=True,
        streak_count=0,
        last_active_date=date.today(),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(
        data={"sub": str(new_user.id), "role": new_user.role}
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=new_user.role,
        name=new_user.name,
        user_id=str(new_user.id),
        email=new_user.email,
    )


@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Login with email and password, returns JWT token"""
    user = db.query(User).filter(User.email == login_data.email.lower()).first()

    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403, detail="Account is deactivated. Contact admin."
        )

    # Update login streak
    today = date.today()
    if user.last_active_date:
        delta = (today - user.last_active_date).days
        if delta == 1:
            user.streak_count += 1   # consecutive day
        elif delta > 1:
            user.streak_count = 1    # streak broken, restart
        # delta == 0: same day, no change
    else:
        user.streak_count = 1
    user.last_active_date = today
    db.commit()

    token = create_access_token(data={"sub": str(user.id), "role": user.role})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role,
        name=user.name,
        user_id=str(user.id),
        email=user.email,
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current logged-in user's profile"""
    return current_user


@router.put("/update-fcm-token")
def update_fcm_token(
    data: UpdateFCMToken,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update Firebase Cloud Messaging token for push notifications"""
    current_user.fcm_token = data.fcm_token
    db.commit()
    return {"message": "FCM token updated successfully"}


@router.put("/change-password")
def change_password(
    data: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change password for the logged-in user"""
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=400, detail="Current password is incorrect"
        )
    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """Logout endpoint (client should delete the token locally)"""
    return {
        "message": f"Goodbye, {current_user.name}! Token cleared on client side."
    }
