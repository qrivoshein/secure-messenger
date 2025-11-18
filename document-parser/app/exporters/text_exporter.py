from app.models.schemas import DocumentStructure

class TextExporter:
    """Export document structure to plain text"""
    
    def export(self, structure: DocumentStructure) -> str:
        """Convert structure to plain text"""
        lines = []
        
        # Add title
        if structure.title:
            lines.append(structure.title)
            lines.append("=" * len(structure.title))
            lines.append("")
        
        # Add metadata
        metadata = structure.metadata
        lines.append(f"Filename: {metadata.filename}")
        lines.append(f"Type: {metadata.document_type.value.upper()}")
        lines.append(f"Size: {self._format_size(metadata.filesize)}")
        if metadata.page_count:
            lines.append(f"Pages: {metadata.page_count}")
        if metadata.author:
            lines.append(f"Author: {metadata.author}")
        lines.append("")
        lines.append("-" * 50)
        lines.append("")
        
        # Add headings (if any)
        if structure.headings:
            lines.append("TABLE OF CONTENTS")
            lines.append("-" * 50)
            for heading in structure.headings:
                indent = "  " * (heading["level"] - 1)
                lines.append(f"{indent}{heading['text']}")
            lines.append("")
            lines.append("-" * 50)
            lines.append("")
        
        # Add paragraphs
        if structure.paragraphs:
            lines.append("CONTENT")
            lines.append("-" * 50)
            for para in structure.paragraphs:
                lines.append(para)
                lines.append("")
        
        # Add tables
        if structure.tables:
            lines.append("TABLES")
            lines.append("-" * 50)
            for i, table in enumerate(structure.tables, 1):
                lines.append(f"\nTable {i}:")
                lines.append(self._format_table(table))
                lines.append("")
        
        return "\n".join(lines)
    
    def _format_size(self, size_bytes: int) -> str:
        """Format file size"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} TB"
    
    def _format_table(self, table) -> str:
        """Format table as text"""
        lines = []
        
        # Headers
        if table.headers:
            lines.append(" | ".join(str(h) for h in table.headers))
            lines.append("-" * 80)
        
        # Rows
        for row in table.rows:
            lines.append(" | ".join(str(cell) for cell in row))
        
        return "\n".join(lines)
