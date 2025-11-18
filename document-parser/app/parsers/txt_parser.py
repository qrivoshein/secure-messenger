from pathlib import Path
from app.models.schemas import DocumentMetadata, DocumentStructure, DocumentType

class TXTParser:
    """Parse plain text documents"""
    
    def parse(self, file_path: Path) -> DocumentStructure:
        """Parse TXT file"""
        
        # Extract metadata
        metadata = self._extract_metadata(file_path)
        
        # Read text content
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Split into paragraphs
        paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
        
        # Create structure
        structure = DocumentStructure(
            title=metadata.filename,
            paragraphs=paragraphs,
            metadata=metadata
        )
        
        return structure
    
    def _extract_metadata(self, file_path: Path) -> DocumentMetadata:
        """Extract TXT metadata"""
        return DocumentMetadata(
            filename=file_path.name,
            filesize=file_path.stat().st_size,
            mime_type="text/plain",
            document_type=DocumentType.TXT
        )
    
    def extract_text(self, file_path: Path) -> str:
        """Extract plain text from TXT"""
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
