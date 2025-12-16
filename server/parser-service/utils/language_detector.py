"""
Language Detection utilities.
Определение языка документа и кодировки.
"""

import logging
from typing import Dict, Any, Optional
import chardet
from langdetect import detect, detect_langs, LangDetectException

logger = logging.getLogger(__name__)


class LanguageDetector:
    """Определение языка и кодировки текста."""
    
    # Карта языковых кодов
    LANGUAGE_NAMES = {
        'ru': 'Russian',
        'en': 'English',
        'de': 'German',
        'fr': 'French',
        'es': 'Spanish',
        'it': 'Italian',
        'pt': 'Portuguese',
        'pl': 'Polish',
        'uk': 'Ukrainian',
        'be': 'Belarusian',
        'zh-cn': 'Chinese (Simplified)',
        'zh-tw': 'Chinese (Traditional)',
        'ja': 'Japanese',
        'ko': 'Korean',
        'ar': 'Arabic',
        'he': 'Hebrew',
        'tr': 'Turkish',
    }
    
    def __init__(self):
        """Инициализация детектора."""
        self.min_text_length = 20  # Минимальная длина для надежного определения
    
    def detect_language(self, text: str) -> Dict[str, Any]:
        """
        Определяет язык текста с вероятностями.
        
        Args:
            text: Исходный текст
            
        Returns:
            Dict с информацией о языке
        """
        if not text or not isinstance(text, str):
            return self._empty_result()
        
        # Очистка текста
        text_clean = text.strip()
        
        if len(text_clean) < self.min_text_length:
            logger.warning(f"Text too short for reliable detection: {len(text_clean)} chars")
            return {
                'language': 'unknown',
                'language_name': 'Unknown',
                'confidence': 0.0,
                'probabilities': [],
                'is_reliable': False,
                'text_length': len(text_clean),
            }
        
        try:
            # Определение основного языка
            primary_lang = detect(text_clean)
            
            # Получение всех вероятностей
            lang_probs = detect_langs(text_clean)
            
            probabilities = [
                {
                    'language': str(lang_prob).split(':')[0],
                    'language_name': self.LANGUAGE_NAMES.get(
                        str(lang_prob).split(':')[0], 
                        'Unknown'
                    ),
                    'probability': lang_prob.prob,
                }
                for lang_prob in lang_probs
            ]
            
            # Сортировка по вероятности
            probabilities.sort(key=lambda x: x['probability'], reverse=True)
            
            # Определение надежности
            max_prob = probabilities[0]['probability'] if probabilities else 0.0
            is_reliable = max_prob > 0.9
            
            return {
                'language': primary_lang,
                'language_name': self.LANGUAGE_NAMES.get(primary_lang, 'Unknown'),
                'confidence': max_prob,
                'probabilities': probabilities,
                'is_reliable': is_reliable,
                'text_length': len(text_clean),
            }
            
        except LangDetectException as e:
            logger.error(f"Language detection failed: {e}")
            return {
                'language': 'unknown',
                'language_name': 'Unknown',
                'confidence': 0.0,
                'probabilities': [],
                'is_reliable': False,
                'text_length': len(text_clean),
                'error': str(e),
            }
        except Exception as e:
            logger.error(f"Unexpected error in language detection: {e}")
            return self._empty_result()
    
    def detect_encoding(self, raw_bytes: bytes) -> Dict[str, Any]:
        """
        Определяет кодировку текста.
        
        Args:
            raw_bytes: Байты файла
            
        Returns:
            Dict с информацией о кодировке
        """
        if not raw_bytes:
            return {
                'encoding': 'unknown',
                'confidence': 0.0,
                'is_reliable': False,
            }
        
        try:
            result = chardet.detect(raw_bytes)
            
            encoding = result.get('encoding', 'unknown')
            confidence = result.get('confidence', 0.0)
            
            return {
                'encoding': encoding,
                'confidence': confidence,
                'is_reliable': confidence > 0.8,
                'language': result.get('language', 'unknown'),
            }
            
        except Exception as e:
            logger.error(f"Encoding detection failed: {e}")
            return {
                'encoding': 'unknown',
                'confidence': 0.0,
                'is_reliable': False,
                'error': str(e),
            }
    
    def detect_full(self, text: str, raw_bytes: Optional[bytes] = None) -> Dict[str, Any]:
        """
        Полное определение языка и кодировки.
        
        Args:
            text: Текст документа
            raw_bytes: Исходные байты (опционально)
            
        Returns:
            Полная информация о языке и кодировке
        """
        result = {
            'language_info': self.detect_language(text),
        }
        
        if raw_bytes:
            result['encoding_info'] = self.detect_encoding(raw_bytes)
        
        return result
    
    def _empty_result(self) -> Dict[str, Any]:
        """Пустой результат в случае ошибки."""
        return {
            'language': 'unknown',
            'language_name': 'Unknown',
            'confidence': 0.0,
            'probabilities': [],
            'is_reliable': False,
            'text_length': 0,
        }


# Глобальный экземпляр
language_detector = LanguageDetector()
