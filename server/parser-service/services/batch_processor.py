"""
Batch Processing Service.
Пакетная обработка документов с поддержкой приоритетов и статусов.
"""

import logging
import asyncio
from typing import List, Dict, Any, Optional
from enum import Enum
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


class TaskStatus(str, Enum):
    """Статусы задач."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskPriority(int, Enum):
    """Приоритеты задач."""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4


class BatchTask:
    """Задача для пакетной обработки."""
    
    def __init__(
        self,
        file_path: str,
        file_name: str,
        user_id: str,
        priority: TaskPriority = TaskPriority.NORMAL,
        options: Optional[Dict[str, Any]] = None,
    ):
        """
        Инициализация задачи.
        
        Args:
            file_path: Путь к файлу
            file_name: Имя файла
            user_id: ID пользователя
            priority: Приоритет задачи
            options: Опции парсинга
        """
        self.task_id = str(uuid.uuid4())
        self.file_path = file_path
        self.file_name = file_name
        self.user_id = user_id
        self.priority = priority
        self.options = options or {}
        
        self.status = TaskStatus.PENDING
        self.created_at = datetime.utcnow()
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        
        self.result: Optional[Dict[str, Any]] = None
        self.error: Optional[str] = None
        self.progress: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Преобразование в словарь."""
        return {
            "task_id": self.task_id,
            "file_name": self.file_name,
            "user_id": self.user_id,
            "priority": self.priority.value,
            "status": self.status.value,
            "progress": self.progress,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "error": self.error,
        }


class BatchProcessor:
    """Процессор для пакетной обработки документов."""
    
    def __init__(self, max_workers: int = 4):
        """
        Инициализация процессора.
        
        Args:
            max_workers: Максимальное количество параллельных задач
        """
        self.max_workers = max_workers
        self.tasks: Dict[str, BatchTask] = {}
        self.queue: List[BatchTask] = []
        self.active_tasks: Dict[str, BatchTask] = {}
    
    async def add_task(self, task: BatchTask) -> str:
        """
        Добавление задачи в очередь.
        
        Args:
            task: Задача для обработки
            
        Returns:
            ID задачи
        """
        self.tasks[task.task_id] = task
        self.queue.append(task)
        
        # Сортировка по приоритету
        self.queue.sort(key=lambda t: t.priority.value, reverse=True)
        
        logger.info(
            f"Task added: {task.task_id}, file={task.file_name}, "
            f"priority={task.priority.value}, queue_size={len(self.queue)}"
        )
        
        return task.task_id
    
    async def add_batch(self, tasks: List[BatchTask]) -> List[str]:
        """
        Добавление нескольких задач.
        
        Args:
            tasks: Список задач
            
        Returns:
            Список ID задач
        """
        task_ids = []
        for task in tasks:
            task_id = await self.add_task(task)
            task_ids.append(task_id)
        
        logger.info(f"Batch added: {len(tasks)} tasks")
        return task_ids
    
    async def process_next(self) -> Optional[BatchTask]:
        """
        Обработка следующей задачи из очереди.
        
        Returns:
            Обработанная задача или None
        """
        if not self.queue:
            return None
        
        # Проверка лимита активных задач
        if len(self.active_tasks) >= self.max_workers:
            logger.warning(f"Max workers limit reached: {self.max_workers}")
            return None
        
        # Берем задачу с наивысшим приоритетом
        task = self.queue.pop(0)
        
        # Обработка задачи
        await self._process_task(task)
        
        return task
    
    async def _process_task(self, task: BatchTask):
        """
        Обработка одной задачи.
        
        Args:
            task: Задача
        """
        task.status = TaskStatus.PROCESSING
        task.started_at = datetime.utcnow()
        self.active_tasks[task.task_id] = task
        
        logger.info(f"Processing task: {task.task_id}, file={task.file_name}")
        
        try:
            # Имитация парсинга (в реальности здесь вызов парсера)
            # result = await self._parse_file(task.file_path, task.options)
            
            # Для примера - симуляция
            await asyncio.sleep(1)  # Имитация работы
            result = {
                "status": "success",
                "file_name": task.file_name,
                "parsed_at": datetime.utcnow().isoformat(),
            }
            
            task.result = result
            task.status = TaskStatus.COMPLETED
            task.progress = 100.0
            task.completed_at = datetime.utcnow()
            
            logger.info(f"Task completed: {task.task_id}")
        
        except Exception as e:
            logger.error(f"Task failed: {task.task_id}, error: {e}")
            task.status = TaskStatus.FAILED
            task.error = str(e)
            task.completed_at = datetime.utcnow()
        
        finally:
            # Удаление из активных
            if task.task_id in self.active_tasks:
                del self.active_tasks[task.task_id]
    
    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Получение статуса задачи.
        
        Args:
            task_id: ID задачи
            
        Returns:
            Информация о задаче
        """
        task = self.tasks.get(task_id)
        
        if not task:
            return None
        
        return task.to_dict()
    
    def get_batch_status(self, task_ids: List[str]) -> Dict[str, Any]:
        """
        Получение статуса пакета задач.
        
        Args:
            task_ids: Список ID задач
            
        Returns:
            Статистика по пакету
        """
        tasks = [self.tasks.get(tid) for tid in task_ids if tid in self.tasks]
        
        if not tasks:
            return {
                "total": 0,
                "pending": 0,
                "processing": 0,
                "completed": 0,
                "failed": 0,
                "cancelled": 0,
                "progress": 0.0,
            }
        
        status_counts = {
            "total": len(tasks),
            "pending": sum(1 for t in tasks if t.status == TaskStatus.PENDING),
            "processing": sum(1 for t in tasks if t.status == TaskStatus.PROCESSING),
            "completed": sum(1 for t in tasks if t.status == TaskStatus.COMPLETED),
            "failed": sum(1 for t in tasks if t.status == TaskStatus.FAILED),
            "cancelled": sum(1 for t in tasks if t.status == TaskStatus.CANCELLED),
        }
        
        # Общий прогресс
        total_progress = sum(t.progress for t in tasks)
        status_counts["progress"] = round(total_progress / len(tasks), 2)
        
        return status_counts
    
    def cancel_task(self, task_id: str) -> bool:
        """
        Отмена задачи.
        
        Args:
            task_id: ID задачи
            
        Returns:
            True если отменена
        """
        task = self.tasks.get(task_id)
        
        if not task:
            return False
        
        # Можно отменить только pending задачи
        if task.status != TaskStatus.PENDING:
            logger.warning(f"Cannot cancel task {task_id}: status={task.status}")
            return False
        
        task.status = TaskStatus.CANCELLED
        task.completed_at = datetime.utcnow()
        
        # Удаление из очереди
        self.queue = [t for t in self.queue if t.task_id != task_id]
        
        logger.info(f"Task cancelled: {task_id}")
        return True
    
    def get_queue_info(self) -> Dict[str, Any]:
        """
        Информация об очереди.
        
        Returns:
            Статистика очереди
        """
        return {
            "queue_size": len(self.queue),
            "active_tasks": len(self.active_tasks),
            "max_workers": self.max_workers,
            "total_tasks": len(self.tasks),
            "priority_distribution": {
                "urgent": sum(1 for t in self.queue if t.priority == TaskPriority.URGENT),
                "high": sum(1 for t in self.queue if t.priority == TaskPriority.HIGH),
                "normal": sum(1 for t in self.queue if t.priority == TaskPriority.NORMAL),
                "low": sum(1 for t in self.queue if t.priority == TaskPriority.LOW),
            }
        }


# Глобальный экземпляр
batch_processor = BatchProcessor(max_workers=4)
