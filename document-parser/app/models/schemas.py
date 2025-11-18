from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum

class DocumentType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    XLSX = "xlsx"
    TXT = "txt"
    HTML = "html"
    IMAGE = "image"

class ExportFormat(str, Enum):
    TEXT = "text"
    MARKDOWN = "markdown"
    JSON = "json"
    HTML = "html"
    EXCEL = "excel"
    CSV = "csv"

class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class DocumentMetadata(BaseModel):
    filename: str
    filesize: int
    mime_type: str
    document_type: DocumentType
    page_count: Optional[int] = None
    author: Optional[str] = None
    created_at: Optional[str] = None
    modified_at: Optional[str] = None

class TableData(BaseModel):
    headers: List[str]
    rows: List[List[Any]]
    page: Optional[int] = None
    position: Optional[Dict[str, float]] = None

class DocumentStructure(BaseModel):
    title: Optional[str] = None
    headings: List[Dict[str, Any]] = Field(default_factory=list)
    paragraphs: List[str] = Field(default_factory=list)
    tables: List[TableData] = Field(default_factory=list)
    images: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: DocumentMetadata

class ParseResponse(BaseModel):
    status: ProcessingStatus
    document_id: str
    structure: Optional[DocumentStructure] = None
    text_content: Optional[str] = None
    error: Optional[str] = None
    processing_time: float

class ExportRequest(BaseModel):
    document_id: str
    format: ExportFormat

class ExportResponse(BaseModel):
    status: str
    format: ExportFormat
    content: Optional[str] = None
    download_url: Optional[str] = None
    error: Optional[str] = None
