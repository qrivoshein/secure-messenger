from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseExporter(ABC):
    @abstractmethod
    def export(self, data: Dict[str, Any], options: Dict[str, Any] = None) -> Any:
        pass
    
    @abstractmethod
    def get_extension(self) -> str:
        pass
    
    @abstractmethod
    def get_mime_type(self) -> str:
        pass
