"""
Audit Logging.
Логирование всех действий пользователей для аудита.
"""

import logging
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum
import json

logger = logging.getLogger(__name__)


class AuditAction(str, Enum):
    """Типы действий для аудита."""
    # Аутентификация
    LOGIN = "auth.login"
    LOGOUT = "auth.logout"
    TOKEN_REFRESH = "auth.token_refresh"
    LOGIN_FAILED = "auth.login_failed"
    
    # Парсинг
    DOCUMENT_PARSE = "document.parse"
    DOCUMENT_PARSE_BATCH = "document.parse_batch"
    DOCUMENT_EXPORT = "document.export"
    
    # Анализ
    ANALYSIS_NER = "analysis.ner"
    ANALYSIS_SEMANTIC = "analysis.semantic"
    ANALYSIS_CLASSIFICATION = "analysis.classification"
    
    # Административные
    USER_CREATE = "admin.user_create"
    USER_UPDATE = "admin.user_update"
    USER_DELETE = "admin.user_delete"
    ROLE_CHANGE = "admin.role_change"
    
    # Системные
    SYSTEM_ERROR = "system.error"
    ACCESS_DENIED = "system.access_denied"


class AuditLevel(str, Enum):
    """Уровни важности аудит-событий."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AuditLogger:
    """Логгер для аудита действий."""
    
    def __init__(self, log_file: Optional[str] = None):
        """
        Инициализация аудит-логгера.
        
        Args:
            log_file: Путь к файлу логов (опционально)
        """
        self.log_file = log_file
        
        # Настройка отдельного логгера для аудита
        self.audit_logger = logging.getLogger("audit")
        self.audit_logger.setLevel(logging.INFO)
        
        # Handler для вывода в консоль
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        formatter = logging.Formatter(
            '%(asctime)s - AUDIT - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(formatter)
        self.audit_logger.addHandler(console_handler)
        
        # Handler для файла (если указан)
        if log_file:
            try:
                file_handler = logging.FileHandler(log_file)
                file_handler.setLevel(logging.INFO)
                file_handler.setFormatter(formatter)
                self.audit_logger.addHandler(file_handler)
            except Exception as e:
                logger.error(f"Failed to setup file handler for audit log: {e}")
    
    def log(
        self,
        action: AuditAction,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        level: AuditLevel = AuditLevel.INFO,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ):
        """
        Логирование аудит-события.
        
        Args:
            action: Тип действия
            user_id: ID пользователя
            username: Имя пользователя
            level: Уровень важности
            details: Дополнительные детали
            ip_address: IP адрес пользователя
            user_agent: User-Agent пользователя
        """
        try:
            audit_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "action": action.value,
                "level": level.value,
                "user_id": user_id,
                "username": username,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "details": details or {},
            }
            
            # Логирование в JSON формате
            log_message = json.dumps(audit_entry, ensure_ascii=False)
            
            # Выбор уровня логирования
            if level == AuditLevel.INFO:
                self.audit_logger.info(log_message)
            elif level == AuditLevel.WARNING:
                self.audit_logger.warning(log_message)
            elif level == AuditLevel.ERROR:
                self.audit_logger.error(log_message)
            elif level == AuditLevel.CRITICAL:
                self.audit_logger.critical(log_message)
        
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
    
    def log_auth(
        self,
        action: AuditAction,
        username: str,
        success: bool,
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        """
        Логирование событий аутентификации.
        
        Args:
            action: Действие (LOGIN, LOGOUT, etc.)
            username: Имя пользователя
            success: Успешно или нет
            ip_address: IP адрес
            details: Дополнительные детали
        """
        level = AuditLevel.INFO if success else AuditLevel.WARNING
        
        self.log(
            action=action,
            username=username,
            level=level,
            details={
                "success": success,
                **(details or {})
            },
            ip_address=ip_address,
        )
    
    def log_document_parse(
        self,
        user_id: str,
        filename: str,
        file_size: int,
        file_type: str,
        success: bool,
        analysis_enabled: Optional[Dict[str, bool]] = None,
        error: Optional[str] = None,
    ):
        """
        Логирование парсинга документа.
        
        Args:
            user_id: ID пользователя
            filename: Имя файла
            file_size: Размер файла
            file_type: Тип файла
            success: Успешно или нет
            analysis_enabled: Какие анализы были включены
            error: Ошибка (если была)
        """
        level = AuditLevel.INFO if success else AuditLevel.ERROR
        
        self.log(
            action=AuditAction.DOCUMENT_PARSE,
            user_id=user_id,
            level=level,
            details={
                "filename": filename,
                "file_size": file_size,
                "file_type": file_type,
                "success": success,
                "analysis_enabled": analysis_enabled,
                "error": error,
            }
        )
    
    def log_access_denied(
        self,
        user_id: str,
        username: str,
        action: str,
        required_permission: str,
        ip_address: Optional[str] = None,
    ):
        """
        Логирование отказа в доступе.
        
        Args:
            user_id: ID пользователя
            username: Имя пользователя
            action: Действие которое пытался выполнить
            required_permission: Требуемое разрешение
            ip_address: IP адрес
        """
        self.log(
            action=AuditAction.ACCESS_DENIED,
            user_id=user_id,
            username=username,
            level=AuditLevel.WARNING,
            details={
                "attempted_action": action,
                "required_permission": required_permission,
            },
            ip_address=ip_address,
        )


# Глобальный экземпляр
audit_logger = AuditLogger(log_file="audit.log")
