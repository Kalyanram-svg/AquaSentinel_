from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from backend.database import get_db
from backend.models import User, AuditLog
from backend.schemas import UserCreate, UserLogin, UserResponse, TokenResponse
from backend.auth import verify_password, get_password_hash, create_access_token, get_current_user
from backend.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    hashed_pw = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        hashed_password=hashed_pw,
        full_name=user_in.full_name or "AquaSentinel Analyst",
        role=user_in.role or "Marine Scientist",
        organization=user_in.organization or "Ministry of Earth Sciences"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Log audit
    log = AuditLog(
        action="USER_REGISTER",
        user_email=user.email,
        resource_type="User",
        resource_id=str(user.id),
        details={"email": user.email, "role": user.role}
    )
    db.add(log)
    db.commit()

    token = create_access_token({"sub": user.email, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token({"sub": user.email, "role": user.role})
    
    # Audit login
    log = AuditLog(action="USER_LOGIN", user_email=user.email, resource_type="Auth", resource_id=str(user.id))
    db.add(log)
    db.commit()

    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/demo", response_model=TokenResponse)
def demo_login(db: Session = Depends(get_db)):
    """1-Click Evaluator/Demo Bypass Access."""
    user = db.query(User).filter(User.email == settings.DEMO_USER_EMAIL).first()
    if not user:
        user = User(
            email=settings.DEMO_USER_EMAIL,
            hashed_password=get_password_hash(settings.DEMO_USER_PASSWORD),
            full_name="Lead Sonar Analyst (Evaluator Demo)",
            role="Lead Marine Scientist",
            organization="Ministry of Earth Sciences (MoES)"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": user.email, "role": user.role})
    
    log = AuditLog(action="DEMO_LOGIN", user_email=user.email, resource_type="Auth", resource_id=str(user.id), details={"mode": "demo_evaluator"})
    db.add(log)
    db.commit()

    return {"access_token": token, "token_type": "bearer", "user": user}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
