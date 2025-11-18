import json
import pickle
from pathlib import Path
from typing import Any, Optional
from app.config import config

class CacheManager:
    """Simple file-based cache manager"""
    
    def __init__(self):
        self.cache_dir = config.CACHE_DIR
        
    def _get_cache_path(self, key: str) -> Path:
        """Get cache file path for key"""
        return self.cache_dir / f"{key}.cache"
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        cache_path = self._get_cache_path(key)
        if not cache_path.exists():
            return None
        
        try:
            with open(cache_path, 'rb') as f:
                return pickle.load(f)
        except Exception:
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache"""
        cache_path = self._get_cache_path(key)
        try:
            with open(cache_path, 'wb') as f:
                pickle.dump(value, f)
            return True
        except Exception:
            return False
    
    def delete(self, key: str) -> bool:
        """Delete value from cache"""
        cache_path = self._get_cache_path(key)
        try:
            if cache_path.exists():
                cache_path.unlink()
            return True
        except Exception:
            return False
    
    def clear(self) -> bool:
        """Clear all cache"""
        try:
            for cache_file in self.cache_dir.glob("*.cache"):
                cache_file.unlink()
            return True
        except Exception:
            return False

cache_manager = CacheManager()
