"""
Named Entity Recognition (NER) utilities.
Извлечение сущностей: email, телефоны, URL, даты, суммы, ИНН, ФИО, адреса.
"""

import re
from typing import List, Dict, Any, Set
from datetime import datetime
import phonenumbers
from dateutil import parser as date_parser
import logging

logger = logging.getLogger(__name__)


class NERExtractor:
    """Извлечение именованных сущностей из текста."""
    
    # Regex patterns
    EMAIL_PATTERN = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    URL_PATTERN = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
    
    # Российские регистрационные номера
    INN_PATTERN = r'\b\d{10}(?:\d{2})?\b'  # 10 или 12 цифр
    KPP_PATTERN = r'\b\d{9}\b'  # 9 цифр
    OGRN_PATTERN = r'\b\d{13}(?:\d{2})?\b'  # 13 или 15 цифр
    
    # Денежные суммы
    MONEY_PATTERN = r'(?:(?:руб|₽|USD|EUR|доллар|евро)[.\s]?)?[\s]?(\d[\d\s,\.]*(?:\.\d{2})?)\s?(?:руб|₽|USD|EUR|доллар|евро)?'
    
    # Российские ФИО паттерны
    FIO_PATTERN = r'\b[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?\b'
    
    def __init__(self):
        """Инициализация экстрактора."""
        self.compiled_patterns = {
            'email': re.compile(self.EMAIL_PATTERN),
            'url': re.compile(self.URL_PATTERN, re.IGNORECASE),
            'inn': re.compile(self.INN_PATTERN),
            'kpp': re.compile(self.KPP_PATTERN),
            'ogrn': re.compile(self.OGRN_PATTERN),
            'money': re.compile(self.MONEY_PATTERN, re.IGNORECASE),
            'fio': re.compile(self.FIO_PATTERN),
        }
    
    def extract_all(self, text: str) -> Dict[str, List[Any]]:
        """
        Извлекает все сущности из текста.
        
        Args:
            text: Исходный текст
            
        Returns:
            Dict с извлеченными сущностями
        """
        if not text or not isinstance(text, str):
            return self._empty_result()
        
        try:
            result = {
                'emails': self.extract_emails(text),
                'phones': self.extract_phones(text),
                'urls': self.extract_urls(text),
                'dates': self.extract_dates(text),
                'money': self.extract_money(text),
                'inn': self.extract_inn(text),
                'kpp': self.extract_kpp(text),
                'ogrn': self.extract_ogrn(text),
                'fio': self.extract_fio(text),
            }
            
            # Статистика
            result['statistics'] = {
                'total_entities': sum(len(v) for v in result.values() if isinstance(v, list)),
                'entity_types': sum(1 for v in result.values() if isinstance(v, list) and len(v) > 0)
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error extracting entities: {e}")
            return self._empty_result()
    
    def extract_emails(self, text: str) -> List[str]:
        """Извлечение email адресов."""
        try:
            emails = self.compiled_patterns['email'].findall(text)
            return list(set(emails))  # Уникальные значения
        except Exception as e:
            logger.error(f"Error extracting emails: {e}")
            return []
    
    def extract_phones(self, text: str) -> List[Dict[str, Any]]:
        """Извлечение телефонных номеров (включая российские форматы)."""
        phones = []
        
        try:
            # Поиск телефонов через phonenumbers library
            for match in phonenumbers.PhoneNumberMatcher(text, "RU"):
                phone_info = {
                    'raw': match.raw_string,
                    'formatted': phonenumbers.format_number(
                        match.number, 
                        phonenumbers.PhoneNumberFormat.INTERNATIONAL
                    ),
                    'national': phonenumbers.format_number(
                        match.number, 
                        phonenumbers.PhoneNumberFormat.NATIONAL
                    ),
                    'country_code': match.number.country_code,
                    'is_valid': phonenumbers.is_valid_number(match.number),
                }
                phones.append(phone_info)
            
            # Также ищем российские форматы вручную (на случай если библиотека не нашла)
            russian_patterns = [
                r'\+7\s?\(?\d{3}\)?\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}',
                r'8\s?\(?\d{3}\)?\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}',
                r'\d{3}[-\s]?\d{3}[-\s]?\d{2}[-\s]?\d{2}',
            ]
            
            for pattern in russian_patterns:
                matches = re.findall(pattern, text)
                for match in matches:
                    if not any(p['raw'] == match for p in phones):
                        phones.append({
                            'raw': match,
                            'formatted': match,
                            'national': match,
                            'is_valid': True,
                        })
            
            return phones
            
        except Exception as e:
            logger.error(f"Error extracting phones: {e}")
            return []
    
    def extract_urls(self, text: str) -> List[str]:
        """Извлечение URL адресов."""
        try:
            urls = self.compiled_patterns['url'].findall(text)
            return list(set(urls))
        except Exception as e:
            logger.error(f"Error extracting URLs: {e}")
            return []
    
    def extract_dates(self, text: str) -> List[Dict[str, Any]]:
        """Извлечение дат (различные форматы)."""
        dates = []
        
        try:
            # Российские форматы дат
            date_patterns = [
                r'\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b',  # 01.02.2023, 1/2/23
                r'\b\d{4}[./-]\d{1,2}[./-]\d{1,2}\b',    # 2023-01-02
                r'\b\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+\d{4}\b',
            ]
            
            found_dates: Set[str] = set()
            
            for pattern in date_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                found_dates.update(matches)
            
            # Парсинг каждой найденной даты
            for date_str in found_dates:
                try:
                    parsed_date = date_parser.parse(date_str, dayfirst=True, fuzzy=True)
                    dates.append({
                        'raw': date_str,
                        'parsed': parsed_date.isoformat(),
                        'year': parsed_date.year,
                        'month': parsed_date.month,
                        'day': parsed_date.day,
                    })
                except:
                    # Если не удалось распарсить, добавляем как есть
                    dates.append({
                        'raw': date_str,
                        'parsed': None,
                    })
            
            return dates
            
        except Exception as e:
            logger.error(f"Error extracting dates: {e}")
            return []
    
    def extract_money(self, text: str) -> List[Dict[str, Any]]:
        """Извлечение денежных сумм."""
        money_values = []
        
        try:
            matches = self.compiled_patterns['money'].finditer(text)
            
            for match in matches:
                raw_text = match.group(0)
                amount_text = match.group(1) if match.groups() else match.group(0)
                
                # Очистка и парсинг суммы
                amount_clean = re.sub(r'[^\d.]', '', amount_text)
                
                try:
                    amount = float(amount_clean)
                except:
                    amount = None
                
                # Определение валюты
                currency = 'RUB'
                if any(c in raw_text.lower() for c in ['usd', 'доллар', '$']):
                    currency = 'USD'
                elif any(c in raw_text.lower() for c in ['eur', 'евро', '€']):
                    currency = 'EUR'
                
                money_values.append({
                    'raw': raw_text.strip(),
                    'amount': amount,
                    'currency': currency,
                    'formatted': f"{amount:.2f} {currency}" if amount else raw_text,
                })
            
            return money_values
            
        except Exception as e:
            logger.error(f"Error extracting money: {e}")
            return []
    
    def extract_inn(self, text: str) -> List[str]:
        """Извлечение ИНН (10 или 12 цифр)."""
        try:
            matches = self.compiled_patterns['inn'].findall(text)
            # Валидация ИНН (должен быть 10 или 12 цифр)
            valid_inn = [m for m in matches if len(m) in [10, 12]]
            return list(set(valid_inn))
        except Exception as e:
            logger.error(f"Error extracting INN: {e}")
            return []
    
    def extract_kpp(self, text: str) -> List[str]:
        """Извлечение КПП (9 цифр)."""
        try:
            matches = self.compiled_patterns['kpp'].findall(text)
            # Валидация КПП (должен быть 9 цифр)
            valid_kpp = [m for m in matches if len(m) == 9]
            return list(set(valid_kpp))
        except Exception as e:
            logger.error(f"Error extracting KPP: {e}")
            return []
    
    def extract_ogrn(self, text: str) -> List[str]:
        """Извлечение ОГРН (13 или 15 цифр)."""
        try:
            matches = self.compiled_patterns['ogrn'].findall(text)
            # Валидация ОГРН (должен быть 13 или 15 цифр)
            valid_ogrn = [m for m in matches if len(m) in [13, 15]]
            return list(set(valid_ogrn))
        except Exception as e:
            logger.error(f"Error extracting OGRN: {e}")
            return []
    
    def extract_fio(self, text: str) -> List[str]:
        """Извлечение ФИО (русские имена)."""
        try:
            matches = self.compiled_patterns['fio'].findall(text)
            
            # Фильтрация (убираем короткие и слишком длинные)
            valid_fio = []
            for match in matches:
                words = match.split()
                if 2 <= len(words) <= 3:  # Фамилия Имя или Фамилия Имя Отчество
                    valid_fio.append(match)
            
            return list(set(valid_fio))
        except Exception as e:
            logger.error(f"Error extracting FIO: {e}")
            return []
    
    def _empty_result(self) -> Dict[str, List]:
        """Пустой результат в случае ошибки."""
        return {
            'emails': [],
            'phones': [],
            'urls': [],
            'dates': [],
            'money': [],
            'inn': [],
            'kpp': [],
            'ogrn': [],
            'fio': [],
            'statistics': {
                'total_entities': 0,
                'entity_types': 0
            }
        }


# Глобальный экземпляр для использования
ner_extractor = NERExtractor()
