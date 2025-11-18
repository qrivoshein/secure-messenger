import json
from app.models.schemas import DocumentStructure

class JSONExporter:
    """Export document structure to JSON"""
    
    def export(self, structure: DocumentStructure) -> str:
        """Convert structure to JSON"""
        # Convert Pydantic model to dict
        data = structure.model_dump()
        
        # Pretty print JSON
        return json.dumps(data, indent=2, ensure_ascii=False)
