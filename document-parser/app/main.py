import time
import uuid
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import config
from app.models.schemas import (
    ParseResponse, ExportRequest, ExportResponse,
    ExportFormat, ProcessingStatus, DocumentType
)
from app.parsers import PDFParser, DOCXParser, XLSXParser, TXTParser
from app.exporters import TextExporter, MarkdownExporter, JSONExporter, ExcelExporter
from app.extractors import FieldExtractor
from app.utils.file_utils import get_file_hash, detect_file_type, validate_file_size
from app.utils.cache_manager import cache_manager

# Подгружаем конфиг экстракторов из JSON; при ошибке — дефолт
_EXTRACTORS_CFG = Path(__file__).parent / "extractors" / "extractors.config.json"
try:
    field_extractor = FieldExtractor.from_config_file(_EXTRACTORS_CFG)
except Exception:
    field_extractor = FieldExtractor()

# Initialize directories
config.init_directories()

# Create FastAPI app
app = FastAPI(
    title="Document Parser API",
    description="Parse and export documents in various formats",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Storage for parsed documents (in-memory for MVP, use Redis in production)
documents_store = {}

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Document Parser API",
        "version": "1.0.0"
    }

@app.post("/parse", response_model=ParseResponse)
async def parse_document(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    Parse uploaded document and extract structure
    """
    start_time = time.time()
    
    try:
        # Validate file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to start
        
        if not validate_file_size(file_size):
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Max size: {config.MAX_FILE_SIZE_MB}MB"
            )
        
        # Generate document ID
        document_id = str(uuid.uuid4())
        
        # Save uploaded file temporarily
        file_path = config.UPLOAD_DIR / f"{document_id}_{file.filename}"
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Detect file type
        mime_type, doc_type = detect_file_type(file_path)
        
        # Parse document based on type
        structure = None
        text_content = None
        
        if doc_type == DocumentType.PDF:
            parser = PDFParser()
            structure = parser.parse(file_path)
            text_content = parser.extract_text(file_path)
        
        elif doc_type == DocumentType.DOCX:
            parser = DOCXParser()
            structure = parser.parse(file_path)
            text_content = parser.extract_text(file_path)
        
        elif doc_type == DocumentType.XLSX:
            parser = XLSXParser()
            structure = parser.parse(file_path)
            text_content = parser.extract_text(file_path)
        
        elif doc_type == DocumentType.TXT:
            parser = TXTParser()
            structure = parser.parse(file_path)
            text_content = parser.extract_text(file_path)
        
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {mime_type}"
            )
        
        # Извлекаем ключевые реквизиты российских деловых документов
        extracted = field_extractor.extract(text_content or "")
        extracted_fields = extracted.model_dump(exclude_none=False)

        # Store parsed document
        documents_store[document_id] = {
            "structure": structure,
            "text_content": text_content,
            "extracted_fields": extracted_fields,
            "file_path": file_path,
            "filename": file.filename
        }

        # Calculate processing time
        processing_time = time.time() - start_time

        return ParseResponse(
            status=ProcessingStatus.COMPLETED,
            document_id=document_id,
            structure=structure,
            text_content=text_content,
            extracted_fields=extracted_fields,
            processing_time=processing_time
        )
    
    except HTTPException:
        raise
    except Exception as e:
        processing_time = time.time() - start_time
        return ParseResponse(
            status=ProcessingStatus.FAILED,
            document_id="",
            error=str(e),
            processing_time=processing_time
        )

@app.post("/export", response_model=ExportResponse)
async def export_document(request: ExportRequest):
    """
    Export parsed document in specified format
    """
    try:
        # Get document from store
        if request.document_id not in documents_store:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc_data = documents_store[request.document_id]
        structure = doc_data["structure"]
        
        # Export based on format
        if request.format == ExportFormat.TEXT:
            exporter = TextExporter()
            content = exporter.export(structure)
            return ExportResponse(
                status="success",
                format=request.format,
                content=content
            )
        
        elif request.format == ExportFormat.MARKDOWN:
            exporter = MarkdownExporter()
            content = exporter.export(structure)
            return ExportResponse(
                status="success",
                format=request.format,
                content=content
            )
        
        elif request.format == ExportFormat.JSON:
            exporter = JSONExporter()
            content = exporter.export(structure)
            return ExportResponse(
                status="success",
                format=request.format,
                content=content
            )
        
        elif request.format == ExportFormat.EXCEL:
            # Generate Excel file
            output_path = config.CACHE_DIR / f"{request.document_id}.xlsx"
            exporter = ExcelExporter()
            exporter.export(structure, output_path)
            
            return ExportResponse(
                status="success",
                format=request.format,
                download_url=f"/download/{request.document_id}.xlsx"
            )
        
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported export format: {request.format}"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        return ExportResponse(
            status="error",
            format=request.format,
            error=str(e)
        )

@app.get("/download/{filename}")
async def download_file(filename: str):
    """
    Download exported file
    """
    file_path = config.CACHE_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

@app.delete("/document/{document_id}")
async def delete_document(document_id: str):
    """
    Delete parsed document and cleanup files
    """
    if document_id not in documents_store:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get document data
    doc_data = documents_store[document_id]
    
    # Delete uploaded file
    if doc_data["file_path"].exists():
        doc_data["file_path"].unlink()
    
    # Delete cached Excel file if exists
    excel_path = config.CACHE_DIR / f"{document_id}.xlsx"
    if excel_path.exists():
        excel_path.unlink()
    
    # Remove from store
    del documents_store[document_id]
    
    return {"status": "success", "message": "Document deleted"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "documents_count": len(documents_store),
        "upload_dir": str(config.UPLOAD_DIR),
        "cache_dir": str(config.CACHE_DIR)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.HOST, port=config.PORT)
