from celery import Celery
import os

REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')

app = Celery(
    'parser_tasks',
    broker=REDIS_URL,
    backend=REDIS_URL
)

app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,
    task_soft_time_limit=240,
)

@app.task(bind=True, name='parse_document')
def parse_document_task(self, file_path: str, file_type: str):
    from parsers.pdf_parser import PDFParser
    from parsers.docx_parser import DOCXParser
    from parsers.xlsx_parser import XLSXParser
    from parsers.txt_parser import TXTParser
    from parsers.html_parser import HTMLParser
    from parsers.image_parser import ImageParser
    
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
    }
    
    try:
        self.update_state(
            state='PROGRESS',
            meta={'progress': 10, 'status': 'starting', 'message': 'Initializing parser...'}
        )
        
        if file_type not in PARSERS:
            raise ValueError(f"Unsupported file type: {file_type}")
        
        self.update_state(
            state='PROGRESS',
            meta={'progress': 30, 'status': 'parsing', 'message': 'Parsing document...'}
        )
        
        parser_class = PARSERS[file_type]
        parser = parser_class()
        result = parser.parse(file_path)
        
        self.update_state(
            state='PROGRESS',
            meta={'progress': 90, 'status': 'finalizing', 'message': 'Finalizing results...'}
        )
        
        return {
            'status': 'completed',
            'result': result
        }
        
    except Exception as e:
        self.update_state(
            state='FAILURE',
            meta={'error': str(e)}
        )
        raise

@app.task(bind=True, name='export_document')
def export_document_task(self, data: dict, export_format: str, options: dict = None):
    from exporters.json_exporter import JSONExporter
    from exporters.text_exporter import TextExporter
    from exporters.markdown_exporter import MarkdownExporter
    from exporters.excel_exporter import ExcelExporter
    from exporters.html_exporter import HTMLExporter
    
    EXPORTERS = {
        'json': JSONExporter,
        'text': TextExporter,
        'markdown': MarkdownExporter,
        'excel': ExcelExporter,
        'html': HTMLExporter,
    }
    
    try:
        self.update_state(
            state='PROGRESS',
            meta={'progress': 30, 'status': 'exporting', 'message': f'Exporting to {export_format}...'}
        )
        
        if export_format not in EXPORTERS:
            raise ValueError(f"Unsupported export format: {export_format}")
        
        exporter_class = EXPORTERS[export_format]
        exporter = exporter_class()
        result = exporter.export(data, options or {})
        
        self.update_state(
            state='PROGRESS',
            meta={'progress': 90, 'status': 'finalizing', 'message': 'Finalizing export...'}
        )
        
        return {
            'status': 'completed',
            'result': result,
            'format': export_format
        }
        
    except Exception as e:
        self.update_state(
            state='FAILURE',
            meta={'error': str(e)}
        )
        raise

@app.task(name='cleanup_old_files')
def cleanup_old_files():
    import os
    import time
    from pathlib import Path
    
    upload_dir = Path('/app/uploads')
    max_age = 3600  # 1 hour
    
    if not upload_dir.exists():
        return {'cleaned': 0}
    
    current_time = time.time()
    cleaned = 0
    
    for file_path in upload_dir.glob('*'):
        if file_path.is_file():
            file_age = current_time - file_path.stat().st_mtime
            if file_age > max_age:
                try:
                    file_path.unlink()
                    cleaned += 1
                except Exception as e:
                    print(f"Failed to delete {file_path}: {e}")
    
    return {'cleaned': cleaned}

app.conf.beat_schedule = {
    'cleanup-every-hour': {
        'task': 'cleanup_old_files',
        'schedule': 3600.0,
    },
}
