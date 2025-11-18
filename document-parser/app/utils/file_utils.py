import hashlib
import magic
from pathlib import Path
from typing import Tuple
from app.config import config
from app.models.schemas import DocumentType

def get_file_hash(file_path: Path) -> str:
    """Generate SHA256 hash for file"""
    sha256 = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            sha256.update(chunk)
    return sha256.hexdigest()

def detect_file_type(file_path: Path) -> Tuple[str, DocumentType]:
    """Detect MIME type and document type"""
    mime = magic.Magic(mime=True)
    mime_type = mime.from_file(str(file_path))
    
    # Map MIME type to DocumentType
    if mime_type == "application/pdf":
        return mime_type, DocumentType.PDF
    elif "wordprocessingml" in mime_type:
        return mime_type, DocumentType.DOCX
    elif "spreadsheetml" in mime_type:
        return mime_type, DocumentType.XLSX
    elif mime_type == "text/plain":
        return mime_type, DocumentType.TXT
    elif mime_type == "text/html":
        return mime_type, DocumentType.HTML
    elif mime_type.startswith("image/"):
        return mime_type, DocumentType.IMAGE
    else:
        return mime_type, DocumentType.TXT  # Default fallback

def validate_file_size(file_size: int) -> bool:
    """Check if file size is within limits"""
    return file_size <= config.MAX_FILE_SIZE_BYTES

def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal"""
    return Path(filename).name
