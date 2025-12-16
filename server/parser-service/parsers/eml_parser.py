"""
EML Parser.
Парсер EML (Email) файлов.
"""

import logging
import email
from email import policy
from email.parser import BytesParser
from typing import Dict, Any, List
from .base_parser import BaseParser
import base64
import quopri

logger = logging.getLogger(__name__)


class EMLParser(BaseParser):
    """Парсер EML (email) файлов."""
    
    def parse(self, file_path: str) -> Dict[str, Any]:
        """
        Парсинг EML файла.
        
        Args:
            file_path: Путь к EML файлу
            
        Returns:
            Структурированные данные
        """
        result = self.create_result_structure()
        
        try:
            # Чтение и парсинг email
            with open(file_path, 'rb') as f:
                msg = BytesParser(policy=policy.default).parse(f)
            
            # 1. Метаданные
            result['metadata'] = {
                'type': 'eml',
                'from': self._decode_header(msg.get('From', '')),
                'to': self._decode_header(msg.get('To', '')),
                'cc': self._decode_header(msg.get('Cc', '')),
                'bcc': self._decode_header(msg.get('Bcc', '')),
                'subject': self._decode_header(msg.get('Subject', '')),
                'date': str(msg.get('Date', '')),
                'message_id': str(msg.get('Message-ID', '')),
                'in_reply_to': str(msg.get('In-Reply-To', '')),
                'references': str(msg.get('References', '')),
            }
            
            # 2. Извлечение тела письма
            body_text = self._get_email_body(msg)
            result['content']['text'] = body_text
            
            # 3. Вложения
            attachments = self._extract_attachments(msg)
            result['content']['attachments'] = attachments
            result['metadata']['attachment_count'] = len(attachments)
            
            # 4. Заголовки (все)
            headers = {}
            for key, value in msg.items():
                headers[key] = self._decode_header(value)
            result['metadata']['headers'] = headers
            
            # 5. Статистика
            result['metadata']['word_count'] = len(body_text.split())
            result['metadata']['character_count'] = len(body_text)
            
            # 6. Структура письма
            structure = []
            
            # Заголовок письма
            structure.append({
                'type': 'header',
                'from': result['metadata']['from'],
                'to': result['metadata']['to'],
                'subject': result['metadata']['subject'],
                'date': result['metadata']['date'],
            })
            
            # Тело
            if body_text:
                # Разбиваем на параграфы
                paragraphs = [p.strip() for p in body_text.split('\n\n') if p.strip()]
                for para in paragraphs:
                    structure.append({
                        'type': 'paragraph',
                        'text': para,
                    })
            
            # Вложения
            if attachments:
                structure.append({
                    'type': 'attachments',
                    'count': len(attachments),
                    'files': [a['filename'] for a in attachments],
                })
            
            result['content']['structure'] = structure
            
            logger.info(f"EML parsed successfully: {result['metadata']['subject']}")
            
        except Exception as e:
            logger.error(f"EML parsing error: {e}")
            result['metadata']['error'] = str(e)
        
        return result
    
    def _decode_header(self, header_value: str) -> str:
        """Декодирование заголовка email."""
        if not header_value:
            return ''
        
        try:
            decoded_parts = email.header.decode_header(header_value)
            decoded_str = ''
            
            for part, encoding in decoded_parts:
                if isinstance(part, bytes):
                    if encoding:
                        decoded_str += part.decode(encoding, errors='replace')
                    else:
                        decoded_str += part.decode('utf-8', errors='replace')
                else:
                    decoded_str += part
            
            return decoded_str
        except Exception as e:
            logger.warning(f"Header decoding failed: {e}")
            return str(header_value)
    
    def _get_email_body(self, msg) -> str:
        """Извлечение тела письма (текст или HTML)."""
        body_parts = []
        
        try:
            # Если письмо не multipart
            if not msg.is_multipart():
                content_type = msg.get_content_type()
                charset = msg.get_content_charset() or 'utf-8'
                
                try:
                    payload = msg.get_payload(decode=True)
                    if payload:
                        text = payload.decode(charset, errors='replace')
                        return text.strip()
                except:
                    return str(msg.get_payload())
            
            # Multipart: ищем текстовые части
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get('Content-Disposition', ''))
                
                # Пропускаем вложения
                if 'attachment' in content_disposition:
                    continue
                
                # Текстовые части
                if content_type == 'text/plain':
                    try:
                        charset = part.get_content_charset() or 'utf-8'
                        payload = part.get_payload(decode=True)
                        if payload:
                            text = payload.decode(charset, errors='replace')
                            body_parts.append(text)
                    except Exception as e:
                        logger.warning(f"Failed to decode text/plain part: {e}")
                
                # HTML (если нет text/plain)
                elif content_type == 'text/html' and not body_parts:
                    try:
                        charset = part.get_content_charset() or 'utf-8'
                        payload = part.get_payload(decode=True)
                        if payload:
                            html = payload.decode(charset, errors='replace')
                            # Простое удаление HTML тегов
                            text = self._strip_html(html)
                            body_parts.append(text)
                    except Exception as e:
                        logger.warning(f"Failed to decode text/html part: {e}")
            
            return '\n\n'.join(body_parts).strip()
            
        except Exception as e:
            logger.error(f"Email body extraction error: {e}")
            return ''
    
    def _strip_html(self, html: str) -> str:
        """Удаление HTML тегов."""
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html, 'html.parser')
            return soup.get_text(separator='\n', strip=True)
        except:
            # Fallback: простое regex удаление
            import re
            text = re.sub(r'<[^>]+>', '', html)
            return text
    
    def _extract_attachments(self, msg) -> List[Dict[str, Any]]:
        """Извлечение информации о вложениях."""
        attachments = []
        
        try:
            for part in msg.walk():
                content_disposition = str(part.get('Content-Disposition', ''))
                
                if 'attachment' in content_disposition:
                    filename = part.get_filename()
                    
                    if filename:
                        # Декодирование имени файла
                        filename = self._decode_header(filename)
                        
                        content_type = part.get_content_type()
                        size = len(part.get_payload(decode=True) or b'')
                        
                        attachments.append({
                            'filename': filename,
                            'content_type': content_type,
                            'size': size,
                            'size_mb': round(size / (1024 * 1024), 2),
                        })
        
        except Exception as e:
            logger.warning(f"Attachment extraction failed: {e}")
        
        return attachments
