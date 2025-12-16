from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseParser(ABC):
    @abstractmethod
    def parse(self, file_path: str) -> Dict[str, Any]:
        pass
    
    def create_result_structure(self) -> Dict[str, Any]:
        return {
            'metadata': {},
            'content': {
                'text': '',
                'structure': [],
                'tables': [],
                'images': []
            }
        }
