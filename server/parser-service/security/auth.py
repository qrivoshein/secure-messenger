"""
Authentication and Authorization.
JWT аутентификация и управление токенами.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

# Настройки
SECRET_KEY = "your-secret-key-change-this-in-production"  # ВАЖНО: Изменить в продакшене!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthManager:
    """Управление аутентификацией и токенами."""
    
    def __init__(
        self, 
        secret_key: str = SECRET_KEY,
        algorithm: str = ALGORITHM,
        access_token_expire_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES
    ):
        """
        Инициализация менеджера аутентификации.
        
        Args:
            secret_key: Секретный ключ для JWT
            algorithm: Алгоритм шифрования
            access_token_expire_minutes: Время жизни access token в минутах
        """
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.access_token_expire_minutes = access_token_expire_minutes
    
    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """
        Создание access token.
        
        Args:
            data: Данные для включения в токен (обычно user_id, username, роли)
            expires_delta: Кастомное время жизни (опционально)
            
        Returns:
            JWT токен
        """
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        })
        
        try:
            encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
            return encoded_jwt
        except Exception as e:
            logger.error(f"Failed to create access token: {e}")
            raise
    
    def create_refresh_token(self, data: Dict[str, Any]) -> str:
        """
        Создание refresh token.
        
        Args:
            data: Данные для включения в токен
            
        Returns:
            JWT refresh токен
        """
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh"
        })
        
        try:
            encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
            return encoded_jwt
        except Exception as e:
            logger.error(f"Failed to create refresh token: {e}")
            raise
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Верификация токена.
        
        Args:
            token: JWT токен
            
        Returns:
            Payload токена или None если невалиден
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError as e:
            logger.warning(f"Token verification failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during token verification: {e}")
            return None
    
    def verify_access_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Верификация access token.
        
        Args:
            token: Access токен
            
        Returns:
            Payload или None
        """
        payload = self.verify_token(token)
        
        if payload and payload.get("type") == "access":
            return payload
        
        return None
    
    def verify_refresh_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Верификация refresh token.
        
        Args:
            token: Refresh токен
            
        Returns:
            Payload или None
        """
        payload = self.verify_token(token)
        
        if payload and payload.get("type") == "refresh":
            return payload
        
        return None
    
    @staticmethod
    def hash_password(password: str) -> str:
        """
        Хеширование пароля.
        
        Args:
            password: Пароль в открытом виде
            
        Returns:
            Хешированный пароль
        """
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        Проверка пароля.
        
        Args:
            plain_password: Пароль в открытом виде
            hashed_password: Хешированный пароль
            
        Returns:
            True если пароль верный
        """
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False


# Глобальный экземпляр
auth_manager = AuthManager()
