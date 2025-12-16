import io
import xlsxwriter
from typing import Dict, Any
from .base_exporter import BaseExporter

class ExcelExporter(BaseExporter):
    def export(self, data: Dict[str, Any], options: Dict[str, Any] = None) -> bytes:
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        
        bold = workbook.add_format({'bold': True, 'bg_color': '#D9E1F2'})
        header = workbook.add_format({
            'bold': True,
            'bg_color': '#4472C4',
            'font_color': 'white',
            'border': 1
        })
        
        metadata = data.get('metadata', {})
        content = data.get('content', {})
        
        toc_sheet = workbook.add_worksheet('Contents')
        toc_sheet.write(0, 0, 'Document Structure', bold)
        toc_sheet.write(1, 0, 'Section', header)
        toc_sheet.write(1, 1, 'Description', header)
        
        row = 2
        toc_sheet.write(row, 0, 'Metadata')
        toc_sheet.write(row, 1, 'Document metadata and properties')
        row += 1
        
        meta_sheet = workbook.add_worksheet('Metadata')
        meta_sheet.write(0, 0, 'Property', header)
        meta_sheet.write(0, 1, 'Value', header)
        
        meta_row = 1
        for key, value in metadata.items():
            meta_sheet.write(meta_row, 0, str(key))
            meta_sheet.write(meta_row, 1, str(value))
            meta_row += 1
        
        text = content.get('text', '')
        if text:
            text_sheet = workbook.add_worksheet('Text Content')
            text_sheet.write(0, 0, 'Full Text', bold)
            
            lines = text.split('\n')
            for i, line in enumerate(lines[:1000], start=1):
                text_sheet.write(i, 0, line)
            
            toc_sheet.write(row, 0, 'Text Content')
            toc_sheet.write(row, 1, f'{len(lines)} lines of text')
            row += 1
        
        tables = content.get('tables', [])
        if tables:
            for i, table in enumerate(tables[:10], start=1):
                sheet_name = f'Table {i}'
                table_sheet = workbook.add_worksheet(sheet_name)
                
                rows = table.get('rows', [])
                if rows:
                    for col_idx, cell in enumerate(rows[0]):
                        table_sheet.write(0, col_idx, str(cell), header)
                    
                    for row_idx, row_data in enumerate(rows[1:], start=1):
                        for col_idx, cell in enumerate(row_data):
                            table_sheet.write(row_idx, col_idx, str(cell))
                
                page = table.get('page', '')
                toc_sheet.write(row, 0, sheet_name)
                toc_sheet.write(row, 1, f'Table from page {page}' if page else 'Extracted table')
                row += 1
        
        structure = content.get('structure', [])
        if structure and isinstance(structure, list):
            struct_sheet = workbook.add_worksheet('Structure')
            struct_sheet.write(0, 0, 'Type', header)
            struct_sheet.write(0, 1, 'Content', header)
            struct_sheet.write(0, 2, 'Details', header)
            
            struct_row = 1
            for element in structure[:500]:
                if isinstance(element, dict):
                    elem_type = element.get('type', 'unknown')
                    text = element.get('text', '')
                    details = ', '.join([f"{k}: {v}" for k, v in element.items() 
                                        if k not in ['type', 'text', 'elements']])
                    
                    struct_sheet.write(struct_row, 0, elem_type)
                    struct_sheet.write(struct_row, 1, text[:500] if text else '')
                    struct_sheet.write(struct_row, 2, details)
                    struct_row += 1
            
            toc_sheet.write(row, 0, 'Structure')
            toc_sheet.write(row, 1, f'{len(structure)} structural elements')
            row += 1
        
        toc_sheet.set_column(0, 0, 20)
        toc_sheet.set_column(1, 1, 50)
        
        workbook.close()
        output.seek(0)
        
        return output.read()
    
    def get_extension(self) -> str:
        return 'xlsx'
    
    def get_mime_type(self) -> str:
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
