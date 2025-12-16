from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import tempfile
import os
import json
from datetime import datetime

from parsers.pdf_parser import PDFParser
from parsers.docx_parser import DOCXParser
from parsers.xlsx_parser import XLSXParser
from parsers.txt_parser import TXTParser
from parsers.html_parser import HTMLParser
from parsers.image_parser import ImageParser
from parsers.csv_parser import CSVParser
from parsers.rtf_parser import RTFParser
from parsers.odt_parser import ODTParser
from parsers.eml_parser import EMLParser
from parsers.archive_parser import ArchiveParser
from exporters.json_exporter import JSONExporter
from exporters.text_exporter import TextExporter
from exporters.markdown_exporter import MarkdownExporter
from exporters.excel_exporter import ExcelExporter
from exporters.html_exporter import HTMLExporter

# Утилиты для анализа
from utils.ner import ner_extractor
from utils.language_detector import language_detector
from utils.document_classifier import document_classifier
from utils.semantic_analyzer import semantic_analyzer
from utils.data_cleaner import data_cleaner
from utils.validators import file_validator

import logging

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Document Parser Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PARSERS = {
    'pdf': PDFParser,
    'docx': DOCXParser,
    'xlsx': XLSXParser,
    'txt': TXTParser,
    'html': HTMLParser,
    'htm': HTMLParser,
    'png': ImageParser,
    'jpg': ImageParser,
    'jpeg': ImageParser,
    'bmp': ImageParser,
    'tiff': ImageParser,
    'csv': CSVParser,
    'rtf': RTFParser,
    'odt': ODTParser,
    'eml': EMLParser,
    'zip': ArchiveParser,
    '7z': ArchiveParser,
    'rar': ArchiveParser,
}

EXPORTERS = {
    'json': JSONExporter,
    'text': TextExporter,
    'markdown': MarkdownExporter,
    'excel': ExcelExporter,
    'html': HTMLExporter,
}

class ParseRequest(BaseModel):
    file_id: str
    options: Optional[Dict[str, Any]] = {}

class ParseOptions(BaseModel):
    enable_ner: bool = True
    enable_classification: bool = True
    enable_semantic_analysis: bool = True
    enable_language_detection: bool = True
    clean_text: bool = True

class ExportRequest(BaseModel):
    data: Dict[str, Any]
    format: str
    options: Optional[Dict[str, Any]] = {}

@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.post("/parse")
async def parse_document(
    file: UploadFile = File(...),
    enable_ner: bool = True,
    enable_classification: bool = True,
    enable_semantic_analysis: bool = False,
    enable_language_detection: bool = True,
    clean_text: bool = False,
):
    """
    Парсинг документа с опциональным расширенным анализом.
    
    Args:
        file: Файл для парсинга
        enable_ner: Включить Named Entity Recognition
        enable_classification: Включить классификацию документа
        enable_semantic_analysis: Включить семантический анализ
        enable_language_detection: Включить определение языка
        clean_text: Включить очистку текста
    """
    try:
        file_ext = file.filename.split('.')[-1].lower()
        
        if file_ext not in PARSERS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format: {file_ext}. Supported: {list(PARSERS.keys())}"
            )
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_ext}') as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            # 1. Валидация файла
            validation = file_validator.validate_file(tmp_path)
            if not validation['is_valid']:
                raise HTTPException(
                    status_code=400,
                    detail=f"File validation failed: {validation['errors']}"
                )
            
            # 2. Базовый парсинг
            parser_class = PARSERS[file_ext]
            parser = parser_class()
            result = parser.parse(tmp_path)
            
            # 3. Добавление метаданных
            result['metadata']['filename'] = file.filename
            result['metadata']['size'] = len(content)
            result['metadata']['size_mb'] = round(len(content) / (1024 * 1024), 2)
            result['metadata']['parsed_at'] = datetime.utcnow().isoformat()
            
            # Проверка на ошибки парсинга
            if 'error' in result['metadata']:
                logger.warning(f"Parsing error for {file.filename}: {result['metadata']['error']}")
                return JSONResponse(content=result, status_code=200)
            
            # 4. Получение текста
            text = result.get('content', {}).get('text', '')
            
            if not text:
                logger.warning(f"No text extracted from {file.filename}")
                return JSONResponse(content=result)
            
            # 5. Очистка текста (опционально)
            if clean_text:
                text = data_cleaner.clean_text(text, aggressive=False)
                result['content']['text'] = text
                result['metadata']['text_cleaned'] = True
            
            # 6. Определение языка (опционально)
            if enable_language_detection and len(text) > 20:
                try:
                    lang_info = language_detector.detect_language(text)
                    result['analysis'] = result.get('analysis', {})
                    result['analysis']['language'] = lang_info
                    logger.info(f"Detected language: {lang_info.get('language', 'unknown')}")
                except Exception as e:
                    logger.error(f"Language detection failed: {e}")
            
            # 7. NER - Named Entity Recognition (опционально)
            if enable_ner and len(text) > 20:
                try:
                    entities = ner_extractor.extract_all(text)
                    result['analysis'] = result.get('analysis', {})
                    result['analysis']['entities'] = entities
                    logger.info(f"Extracted {entities['statistics']['total_entities']} entities")
                except Exception as e:
                    logger.error(f"NER failed: {e}")
            
            # 8. Классификация документа (опционально)
            if enable_classification and len(text) > 50:
                try:
                    classification = document_classifier.classify(
                        text,
                        metadata=result.get('metadata', {})
                    )
                    result['analysis'] = result.get('analysis', {})
                    result['analysis']['classification'] = classification
                    logger.info(f"Classified as: {classification.get('document_type', 'unknown')}")
                except Exception as e:
                    logger.error(f"Classification failed: {e}")
            
            # 9. Семантический анализ (опционально, ресурсоемко)
            if enable_semantic_analysis and len(text) > 100:
                try:
                    semantic = semantic_analyzer.analyze(text)
                    result['analysis'] = result.get('analysis', {})
                    result['analysis']['semantic'] = semantic
                    logger.info(f"Semantic analysis: {len(semantic.get('keywords', []))} keywords")
                except Exception as e:
                    logger.error(f"Semantic analysis failed: {e}")
            
            # 10. Финальная статистика
            if 'analysis' in result:
                result['metadata']['analysis_performed'] = {
                    'ner': enable_ner,
                    'classification': enable_classification,
                    'semantic': enable_semantic_analysis,
                    'language': enable_language_detection,
                }
            
            logger.info(f"Successfully parsed {file.filename}: {len(text)} chars")
            return JSONResponse(content=result)
        
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/export")
async def export_document(request: ExportRequest):
    try:
        export_format = request.format.lower()
        
        if export_format not in EXPORTERS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported export format: {export_format}"
            )
        
        exporter_class = EXPORTERS[export_format]
        exporter = exporter_class()
        result = exporter.export(request.data, request.options)
        
        if export_format == 'json':
            return JSONResponse(content=json.loads(result))
        else:
            with tempfile.NamedTemporaryFile(
                delete=False, 
                suffix=f'.{exporter.get_extension()}',
                mode='wb' if export_format == 'excel' else 'w',
                encoding=None if export_format == 'excel' else 'utf-8'
            ) as tmp:
                if export_format == 'excel':
                    tmp.write(result)
                else:
                    tmp.write(result.encode('utf-8') if isinstance(result, str) else result)
                tmp_path = tmp.name
            
            return FileResponse(
                tmp_path,
                media_type=exporter.get_mime_type(),
                filename=f"export.{exporter.get_extension()}"
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/formats")
async def get_supported_formats():
    return {
        "parsers": list(PARSERS.keys()),
        "exporters": list(EXPORTERS.keys())
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
