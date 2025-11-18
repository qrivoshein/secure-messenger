import pandas as pd
from pathlib import Path
from typing import Optional
from app.models.schemas import DocumentStructure

class ExcelExporter:
    """Export document structure to Excel"""
    
    def export(self, structure: DocumentStructure, output_path: Path) -> Path:
        """Convert structure to Excel file"""
        
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            # Sheet 1: Metadata
            self._write_metadata_sheet(structure, writer)
            
            # Sheet 2: Content (if paragraphs exist)
            if structure.paragraphs:
                self._write_content_sheet(structure, writer)
            
            # Sheet 3+: Tables (one sheet per table)
            if structure.tables:
                self._write_tables_sheets(structure, writer)
            
            # Sheet: Table of Contents (if headings exist)
            if structure.headings:
                self._write_toc_sheet(structure, writer)
        
        return output_path
    
    def _write_metadata_sheet(self, structure: DocumentStructure, writer):
        """Write metadata to 'Info' sheet"""
        metadata = structure.metadata
        
        data = {
            'Property': [
                'Filename',
                'Document Type',
                'File Size (bytes)',
                'MIME Type',
                'Page Count',
                'Author',
                'Created At',
                'Modified At'
            ],
            'Value': [
                metadata.filename,
                metadata.document_type.value.upper(),
                metadata.filesize,
                metadata.mime_type,
                metadata.page_count or 'N/A',
                metadata.author or 'N/A',
                metadata.created_at or 'N/A',
                metadata.modified_at or 'N/A'
            ]
        }
        
        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name='Info', index=False)
        
        # Auto-adjust column width
        worksheet = writer.sheets['Info']
        for idx, col in enumerate(df.columns):
            max_length = max(
                df[col].astype(str).map(len).max(),
                len(col)
            )
            worksheet.column_dimensions[chr(65 + idx)].width = min(max_length + 2, 50)
    
    def _write_content_sheet(self, structure: DocumentStructure, writer):
        """Write content to 'Content' sheet"""
        data = {
            'Paragraph #': list(range(1, len(structure.paragraphs) + 1)),
            'Text': structure.paragraphs
        }
        
        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name='Content', index=False)
        
        # Auto-adjust column width
        worksheet = writer.sheets['Content']
        worksheet.column_dimensions['A'].width = 15
        worksheet.column_dimensions['B'].width = 80
    
    def _write_tables_sheets(self, structure: DocumentStructure, writer):
        """Write tables to separate sheets"""
        for i, table in enumerate(structure.tables, 1):
            sheet_name = f'Table {i}'
            
            # Create DataFrame from table
            df = pd.DataFrame(table.rows, columns=table.headers)
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            
            # Auto-adjust column widths
            worksheet = writer.sheets[sheet_name]
            for idx, col in enumerate(df.columns):
                max_length = max(
                    df[col].astype(str).map(len).max(),
                    len(str(col))
                )
                worksheet.column_dimensions[chr(65 + idx)].width = min(max_length + 2, 50)
    
    def _write_toc_sheet(self, structure: DocumentStructure, writer):
        """Write table of contents to 'Contents' sheet"""
        data = {
            'Level': [h['level'] for h in structure.headings],
            'Heading': [h['text'] for h in structure.headings],
            'Paragraph Index': [h['index'] for h in structure.headings]
        }
        
        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name='Contents', index=False)
        
        # Auto-adjust column width
        worksheet = writer.sheets['Contents']
        worksheet.column_dimensions['A'].width = 10
        worksheet.column_dimensions['B'].width = 60
        worksheet.column_dimensions['C'].width = 18
