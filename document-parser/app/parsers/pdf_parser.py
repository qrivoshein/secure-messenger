import fitz  # PyMuPDF
from pathlib import Path
from typing import List, Dict, Any
from app.models.schemas import DocumentMetadata, DocumentStructure, TableData, DocumentType

class PDFParser:
    """Parse PDF documents using PyMuPDF"""
    
    def parse(self, file_path: Path) -> DocumentStructure:
        """Parse PDF file and extract structure"""
        doc = fitz.open(str(file_path))
        
        # Extract metadata
        metadata = self._extract_metadata(doc, file_path)
        
        # Extract text content
        text_content = []
        tables = []
        images = []
        
        for page_num, page in enumerate(doc, 1):
            # Extract text
            page_text = page.get_text()
            if page_text.strip():
                text_content.append(page_text)
            
            # Extract tables (basic detection)
            page_tables = self._extract_tables(page, page_num)
            tables.extend(page_tables)
            
            # Extract images info
            image_list = page.get_images()
            for img_index, img in enumerate(image_list):
                images.append({
                    "page": page_num,
                    "index": img_index,
                    "xref": img[0]
                })
        
        doc.close()
        
        # Create structure
        structure = DocumentStructure(
            title=metadata.filename,
            paragraphs=text_content,
            tables=tables,
            images=images,
            metadata=metadata
        )
        
        return structure
    
    def _extract_metadata(self, doc: fitz.Document, file_path: Path) -> DocumentMetadata:
        """Extract PDF metadata"""
        pdf_metadata = doc.metadata
        
        return DocumentMetadata(
            filename=file_path.name,
            filesize=file_path.stat().st_size,
            mime_type="application/pdf",
            document_type=DocumentType.PDF,
            page_count=len(doc),
            author=pdf_metadata.get("author"),
            created_at=pdf_metadata.get("creationDate"),
            modified_at=pdf_metadata.get("modDate")
        )
    
    def _extract_tables(self, page: fitz.Page, page_num: int) -> List[TableData]:
        """Extract tables from PDF page (basic implementation)"""
        tables = []
        
        # Try to find tables using text blocks
        blocks = page.get_text("blocks")
        
        # Simple heuristic: detect grid-like text patterns
        # This is a placeholder - for better table detection use specialized libraries
        # like camelot-py or tabula-py in Phase 2
        
        return tables
    
    def extract_text(self, file_path: Path) -> str:
        """Extract plain text from PDF"""
        doc = fitz.open(str(file_path))
        text = ""
        
        for page in doc:
            text += page.get_text()
            text += "\n\n"
        
        doc.close()
        return text.strip()
