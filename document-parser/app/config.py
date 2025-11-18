import os
from pathlib import Path

class Config:
    # Server
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    
    # Redis
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    
    # File limits
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "100"))
    MAX_FILE_SIZE_BYTES: int = MAX_FILE_SIZE_MB * 1024 * 1024
    
    # Directories
    BASE_DIR: Path = Path(__file__).parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "temp"
    CACHE_DIR: Path = BASE_DIR / "cache"
    
    # Processing
    ENABLE_OCR: bool = os.getenv("ENABLE_OCR", "false").lower() == "true"
    OCR_LANGUAGE: str = os.getenv("OCR_LANGUAGE", "rus+eng")
    
    # Supported formats
    SUPPORTED_EXTENSIONS = {
        "pdf": ["application/pdf"],
        "docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        "xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
        "txt": ["text/plain"],
        "html": ["text/html"],
        "png": ["image/png"],
        "jpg": ["image/jpeg"],
        "jpeg": ["image/jpeg"],
    }
    
    @classmethod
    def init_directories(cls):
        """Create necessary directories"""
        cls.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        cls.CACHE_DIR.mkdir(parents=True, exist_ok=True)

config = Config()
