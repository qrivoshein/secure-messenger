from app.models.schemas import DocumentStructure

class MarkdownExporter:
    """Export document structure to Markdown"""
    
    def export(self, structure: DocumentStructure) -> str:
        """Convert structure to Markdown"""
        lines = []
        
        # Add title
        if structure.title:
            lines.append(f"# {structure.title}")
            lines.append("")
        
        # Add metadata as blockquote
        metadata = structure.metadata
        lines.append("> **Document Information**")
        lines.append(f"> - **Filename**: {metadata.filename}")
        lines.append(f"> - **Type**: {metadata.document_type.value.upper()}")
        lines.append(f"> - **Size**: {self._format_size(metadata.filesize)}")
        if metadata.page_count:
            lines.append(f"> - **Pages**: {metadata.page_count}")
        if metadata.author:
            lines.append(f"> - **Author**: {metadata.author}")
        lines.append("")
        lines.append("---")
        lines.append("")
        
        # Add table of contents (if headings exist)
        if structure.headings:
            lines.append("## Table of Contents")
            lines.append("")
            for heading in structure.headings:
                indent = "  " * (heading["level"] - 1)
                anchor = heading['text'].lower().replace(' ', '-')
                lines.append(f"{indent}- [{heading['text']}](#{anchor})")
            lines.append("")
            lines.append("---")
            lines.append("")
        
        # Add content with headings
        if structure.headings:
            # Reconstruct document with headings
            heading_idx = 0
            for i, para in enumerate(structure.paragraphs):
                # Check if this paragraph is a heading
                if heading_idx < len(structure.headings) and \
                   structure.headings[heading_idx]["index"] == i:
                    heading = structure.headings[heading_idx]
                    level = "#" * (heading["level"] + 1)  # +1 because title is h1
                    lines.append(f"{level} {heading['text']}")
                    lines.append("")
                    heading_idx += 1
                else:
                    lines.append(para)
                    lines.append("")
        else:
            # Just add paragraphs
            lines.append("## Content")
            lines.append("")
            for para in structure.paragraphs:
                lines.append(para)
                lines.append("")
        
        # Add tables
        if structure.tables:
            lines.append("## Tables")
            lines.append("")
            for i, table in enumerate(structure.tables, 1):
                lines.append(f"### Table {i}")
                lines.append("")
                lines.append(self._format_table_markdown(table))
                lines.append("")
        
        return "\n".join(lines)
    
    def _format_size(self, size_bytes: int) -> str:
        """Format file size"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} TB"
    
    def _format_table_markdown(self, table) -> str:
        """Format table as Markdown"""
        lines = []
        
        # Headers
        if table.headers:
            lines.append("| " + " | ".join(str(h) for h in table.headers) + " |")
            lines.append("| " + " | ".join(["---"] * len(table.headers)) + " |")
        
        # Rows
        for row in table.rows:
            lines.append("| " + " | ".join(str(cell) for cell in row) + " |")
        
        return "\n".join(lines)
