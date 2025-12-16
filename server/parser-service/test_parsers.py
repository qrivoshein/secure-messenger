import pytest
import tempfile
import os
from pathlib import Path

from parsers.pdf_parser import PDFParser
from parsers.docx_parser import DOCXParser
from parsers.xlsx_parser import XLSXParser
from parsers.txt_parser import TXTParser
from parsers.html_parser import HTMLParser

class TestTXTParser:
    def test_parse_simple_text(self):
        parser = TXTParser()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("Line 1\nLine 2\nLine 3")
            temp_path = f.name
        
        try:
            result = parser.parse(temp_path)
            
            assert result['metadata']['type'] == 'txt'
            assert result['metadata']['lines'] == 3
            assert 'Line 1' in result['content']['text']
            assert len(result['content']['structure']) == 3
        finally:
            os.unlink(temp_path)

class TestHTMLParser:
    def test_parse_html(self):
        parser = HTMLParser()
        
        html_content = """
        <html>
        <head><title>Test Document</title></head>
        <body>
            <h1>Heading 1</h1>
            <p>Paragraph text</p>
            <table>
                <tr><th>Col1</th><th>Col2</th></tr>
                <tr><td>Val1</td><td>Val2</td></tr>
            </table>
        </body>
        </html>
        """
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
            f.write(html_content)
            temp_path = f.name
        
        try:
            result = parser.parse(temp_path)
            
            assert result['metadata']['type'] == 'html'
            assert result['metadata']['title'] == 'Test Document'
            assert 'Heading 1' in result['content']['text']
            assert len(result['content']['tables']) > 0
        finally:
            os.unlink(temp_path)

class TestExporters:
    @pytest.fixture
    def sample_data(self):
        return {
            'metadata': {
                'type': 'test',
                'title': 'Test Document'
            },
            'content': {
                'text': 'Sample text',
                'structure': [
                    {'type': 'heading', 'text': 'Title', 'level': 1},
                    {'type': 'paragraph', 'text': 'Content'}
                ],
                'tables': [
                    {
                        'rows': [
                            ['Header1', 'Header2'],
                            ['Value1', 'Value2']
                        ]
                    }
                ],
                'images': []
            }
        }
    
    def test_json_exporter(self, sample_data):
        from exporters.json_exporter import JSONExporter
        
        exporter = JSONExporter()
        result = exporter.export(sample_data)
        
        assert isinstance(result, str)
        assert 'Test Document' in result
        assert exporter.get_extension() == 'json'
    
    def test_text_exporter(self, sample_data):
        from exporters.text_exporter import TextExporter
        
        exporter = TextExporter()
        result = exporter.export(sample_data)
        
        assert isinstance(result, str)
        assert 'Sample text' in result
        assert exporter.get_extension() == 'txt'
    
    def test_markdown_exporter(self, sample_data):
        from exporters.markdown_exporter import MarkdownExporter
        
        exporter = MarkdownExporter()
        result = exporter.export(sample_data)
        
        assert isinstance(result, str)
        assert '# Title' in result or '### Title' in result
        assert exporter.get_extension() == 'md'
    
    def test_excel_exporter(self, sample_data):
        from exporters.excel_exporter import ExcelExporter
        
        exporter = ExcelExporter()
        result = exporter.export(sample_data)
        
        assert isinstance(result, bytes)
        assert len(result) > 0
        assert exporter.get_extension() == 'xlsx'
    
    def test_html_exporter(self, sample_data):
        from exporters.html_exporter import HTMLExporter
        
        exporter = HTMLExporter()
        result = exporter.export(sample_data)
        
        assert isinstance(result, str)
        assert '<!DOCTYPE html>' in result
        assert 'Test Document' in result
        assert exporter.get_extension() == 'html'

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
