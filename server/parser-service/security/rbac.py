"""
Role-Based Access Control (RBAC).
Управление ролями и разрешениями.
"""

import logging
from enum import Enum
from typing import List, Set, Optional, Dict

logger = logging.getLogger(__name__)


class Permission(str, Enum):
    """Разрешения в системе."""
    # Парсинг
    PARSE_DOCUMENT = "parse:document"
    PARSE_BATCH = "parse:batch"
    
    # Экспорт
    EXPORT_DOCUMENT = "export:document"
    
    # Анализ
    ANALYZE_NER = "analyze:ner"
    ANALYZE_SEMANTIC = "analyze:semantic"
    ANALYZE_CLASSIFICATION = "analyze:classification"
    
    # Административные
    ADMIN_VIEW_LOGS = "admin:view_logs"
    ADMIN_MANAGE_USERS = "admin:manage_users"
    ADMIN_VIEW_METRICS = "admin:view_metrics"


class Role(str, Enum):
    """Роли пользователей."""
    # Базовые роли
    GUEST = "guest"           # Ограниченный доступ
    USER = "user"             # Обычный пользователь
    POWER_USER = "power_user" # Продвинутый пользователь
    ADMIN = "admin"           # Администратор
    SUPER_ADMIN = "super_admin"  # Супер-администратор


# Маппинг ролей на разрешения
ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.GUEST: {
        Permission.PARSE_DOCUMENT,
    },
    
    Role.USER: {
        Permission.PARSE_DOCUMENT,
        Permission.EXPORT_DOCUMENT,
        Permission.ANALYZE_NER,
    },
    
    Role.POWER_USER: {
        Permission.PARSE_DOCUMENT,
        Permission.PARSE_BATCH,
        Permission.EXPORT_DOCUMENT,
        Permission.ANALYZE_NER,
        Permission.ANALYZE_SEMANTIC,
        Permission.ANALYZE_CLASSIFICATION,
    },
    
    Role.ADMIN: {
        Permission.PARSE_DOCUMENT,
        Permission.PARSE_BATCH,
        Permission.EXPORT_DOCUMENT,
        Permission.ANALYZE_NER,
        Permission.ANALYZE_SEMANTIC,
        Permission.ANALYZE_CLASSIFICATION,
        Permission.ADMIN_VIEW_LOGS,
        Permission.ADMIN_VIEW_METRICS,
    },
    
    Role.SUPER_ADMIN: set(Permission),  # Все разрешения
}


class RBACManager:
    """Управление доступом на основе ролей."""
    
    def __init__(self):
        """Инициализация RBAC менеджера."""
        self.role_permissions = ROLE_PERMISSIONS
    
    def get_role_permissions(self, role: Role) -> Set[Permission]:
        """
        Получение разрешений для роли.
        
        Args:
            role: Роль пользователя
            
        Returns:
            Набор разрешений
        """
        return self.role_permissions.get(role, set())
    
    def has_permission(self, role: Role, permission: Permission) -> bool:
        """
        Проверка наличия разрешения у роли.
        
        Args:
            role: Роль
            permission: Разрешение
            
        Returns:
            True если разрешение есть
        """
        role_perms = self.get_role_permissions(role)
        return permission in role_perms
    
    def has_any_permission(self, role: Role, permissions: List[Permission]) -> bool:
        """
        Проверка наличия хотя бы одного из разрешений.
        
        Args:
            role: Роль
            permissions: Список разрешений
            
        Returns:
            True если есть хотя бы одно разрешение
        """
        role_perms = self.get_role_permissions(role)
        return any(perm in role_perms for perm in permissions)
    
    def has_all_permissions(self, role: Role, permissions: List[Permission]) -> bool:
        """
        Проверка наличия всех разрешений.
        
        Args:
            role: Роль
            permissions: Список разрешений
            
        Returns:
            True если есть все разрешения
        """
        role_perms = self.get_role_permissions(role)
        return all(perm in role_perms for perm in permissions)
    
    def get_user_permissions(self, roles: List[Role]) -> Set[Permission]:
        """
        Получение всех разрешений пользователя (с учетом всех ролей).
        
        Args:
            roles: Список ролей пользователя
            
        Returns:
            Набор всех разрешений
        """
        all_permissions = set()
        
        for role in roles:
            all_permissions.update(self.get_role_permissions(role))
        
        return all_permissions
    
    def check_access(
        self, 
        user_roles: List[Role], 
        required_permission: Permission
    ) -> bool:
        """
        Проверка доступа пользователя.
        
        Args:
            user_roles: Роли пользователя
            required_permission: Требуемое разрешение
            
        Returns:
            True если доступ разрешен
        """
        user_permissions = self.get_user_permissions(user_roles)
        has_access = required_permission in user_permissions
        
        if not has_access:
            logger.warning(
                f"Access denied: roles={user_roles}, required={required_permission}"
            )
        
        return has_access


# Глобальный экземпляр
rbac_manager = RBACManager()
