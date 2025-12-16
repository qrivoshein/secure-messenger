"""
Document Classification utilities.
Классификация типа документа (счет, договор, резюме, отчет и т.д.)
"""

import re
import logging
from typing import Dict, Any, List, Tuple
from collections import Counter

logger = logging.getLogger(__name__)


class DocumentClassifier:
    """Классификация типа документа на основе ключевых слов и структуры."""
    
    # Словари ключевых слов для разных типов документов
    DOCUMENT_TYPES = {
        'invoice': {
            'name': 'Счет/Invoice',
            'keywords': [
                'счет', 'счёт', 'invoice', 'bill', 'payment', 'invoice number',
                'номер счета', 'сумма к оплате', 'итого к оплате', 'плательщик',
                'получатель', 'банковские реквизиты', 'назначение платежа',
                'инн', 'кпп', 'огрн', 'р/с', 'расчетный счет',
            ],
            'weight': 1.5,  # Важность при совпадении
        },
        'contract': {
            'name': 'Договор/Contract',
            'keywords': [
                'договор', 'contract', 'agreement', 'соглашение', 'контракт',
                'заказчик', 'исполнитель', 'customer', 'contractor',
                'предмет договора', 'subject of contract', 'сторона', 'party',
                'обязательства', 'obligations', 'срок действия', 'validity period',
                'подпись', 'signature', 'печать', 'seal', 'настоящим договором',
            ],
            'weight': 1.5,
        },
        'resume': {
            'name': 'Резюме/CV',
            'keywords': [
                'резюме', 'cv', 'curriculum vitae', 'resume',
                'образование', 'education', 'опыт работы', 'work experience',
                'навыки', 'skills', 'квалификация', 'qualification',
                'дата рождения', 'date of birth', 'контакты', 'contacts',
                'должность', 'position', 'карьера', 'career',
            ],
            'weight': 1.3,
        },
        'report': {
            'name': 'Отчет/Report',
            'keywords': [
                'отчет', 'report', 'отчёт', 'reporting', 'анализ', 'analysis',
                'результаты', 'results', 'выводы', 'conclusions',
                'рекомендации', 'recommendations', 'статистика', 'statistics',
                'данные', 'data', 'показатели', 'indicators', 'период', 'period',
                'итоги', 'summary', 'заключение', 'conclusion',
            ],
            'weight': 1.2,
        },
        'presentation': {
            'name': 'Презентация/Presentation',
            'keywords': [
                'презентация', 'presentation', 'слайд', 'slide',
                'повестка', 'agenda', 'цели', 'goals', 'objectives',
                'проект', 'project', 'план', 'plan', 'стратегия', 'strategy',
            ],
            'weight': 1.2,
        },
        'letter': {
            'name': 'Письмо/Letter',
            'keywords': [
                'уважаемый', 'dear', 'письмо', 'letter', 'обращение',
                'с уважением', 'sincerely', 'regards', 'best regards',
                'адресат', 'addressee', 'тема', 'subject', 'от кого', 'from',
                'кому', 'to', 'дата', 'date',
            ],
            'weight': 1.1,
        },
        'order': {
            'name': 'Приказ/Order',
            'keywords': [
                'приказ', 'order', 'приказываю', 'распоряжение', 'decree',
                'назначить', 'appoint', 'утвердить', 'approve',
                'ввести в действие', 'enforce', 'основание', 'basis',
                'контроль возложить', 'assign control',
            ],
            'weight': 1.4,
        },
        'statement': {
            'name': 'Выписка/Statement',
            'keywords': [
                'выписка', 'statement', 'банковская выписка', 'bank statement',
                'операции', 'transactions', 'баланс', 'balance',
                'дебет', 'debit', 'кредит', 'credit', 'остаток', 'remainder',
                'счет', 'account', 'движение средств', 'fund movement',
            ],
            'weight': 1.3,
        },
        'specification': {
            'name': 'Спецификация/Specification',
            'keywords': [
                'спецификация', 'specification', 'техническое задание', 'tz',
                'требования', 'requirements', 'характеристики', 'characteristics',
                'параметры', 'parameters', 'технические данные', 'technical data',
                'артикул', 'article', 'наименование', 'name', 'количество', 'quantity',
            ],
            'weight': 1.2,
        },
        'act': {
            'name': 'Акт/Act',
            'keywords': [
                'акт', 'act', 'акт выполненных работ', 'work completion act',
                'акт приема-передачи', 'acceptance act', 'комиссия', 'commission',
                'составлен', 'compiled', 'подписи', 'signatures', 'приняли', 'accepted',
                'передали', 'transferred', 'работы выполнены', 'work completed',
            ],
            'weight': 1.3,
        },
    }
    
    def __init__(self):
        """Инициализация классификатора."""
        self.min_confidence = 0.1  # Минимальная уверенность для классификации
    
    def classify(self, text: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Классифицирует тип документа.
        
        Args:
            text: Текст документа
            metadata: Метаданные документа (опционально)
            
        Returns:
            Dict с результатами классификации
        """
        if not text or not isinstance(text, str):
            return self._empty_result()
        
        try:
            text_lower = text.lower()
            
            # Подсчет совпадений для каждого типа
            scores = {}
            matches_detail = {}
            
            for doc_type, config in self.DOCUMENT_TYPES.items():
                keywords = config['keywords']
                weight = config['weight']
                
                matches = []
                score = 0.0
                
                for keyword in keywords:
                    keyword_lower = keyword.lower()
                    count = text_lower.count(keyword_lower)
                    
                    if count > 0:
                        matches.append({
                            'keyword': keyword,
                            'count': count,
                        })
                        # Увеличиваем счет с учетом веса
                        score += count * weight
                
                if matches:
                    scores[doc_type] = score
                    matches_detail[doc_type] = matches
            
            # Нормализация scores
            if scores:
                max_score = max(scores.values())
                normalized_scores = {
                    doc_type: score / max_score
                    for doc_type, score in scores.items()
                }
            else:
                normalized_scores = {}
            
            # Сортировка по уверенности
            sorted_types = sorted(
                normalized_scores.items(),
                key=lambda x: x[1],
                reverse=True
            )
            
            # Определение основного типа
            if sorted_types and sorted_types[0][1] >= self.min_confidence:
                primary_type = sorted_types[0][0]
                confidence = sorted_types[0][1]
                is_confident = confidence > 0.5
            else:
                primary_type = 'unknown'
                confidence = 0.0
                is_confident = False
            
            # Формирование результата
            result = {
                'document_type': primary_type,
                'document_type_name': self.DOCUMENT_TYPES.get(primary_type, {}).get('name', 'Unknown'),
                'confidence': confidence,
                'is_confident': is_confident,
                'all_probabilities': [
                    {
                        'type': doc_type,
                        'type_name': self.DOCUMENT_TYPES[doc_type]['name'],
                        'confidence': conf,
                        'matched_keywords': len(matches_detail.get(doc_type, [])),
                    }
                    for doc_type, conf in sorted_types
                ],
                'matched_keywords': matches_detail.get(primary_type, [])[:10],  # Top 10
            }
            
            # Дополнительный анализ из метаданных
            if metadata:
                result['metadata_hints'] = self._analyze_metadata(metadata)
            
            return result
            
        except Exception as e:
            logger.error(f"Classification error: {e}")
            return self._empty_result()
    
    def _analyze_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Анализ метаданных для уточнения классификации."""
        hints = {}
        
        # Анализ заголовка/названия
        title = metadata.get('title', '').lower()
        if title:
            for doc_type, config in self.DOCUMENT_TYPES.items():
                for keyword in config['keywords'][:5]:  # Проверяем основные ключевые слова
                    if keyword.lower() in title:
                        hints['title_match'] = doc_type
                        break
        
        # Анализ автора
        author = metadata.get('author', '').lower()
        if 'hr' in author or 'recruiter' in author or 'кадры' in author:
            hints['author_hint'] = 'resume'
        elif 'accounting' in author or 'бухгалтерия' in author:
            hints['author_hint'] = 'invoice'
        
        return hints
    
    def _empty_result(self) -> Dict[str, Any]:
        """Пустой результат."""
        return {
            'document_type': 'unknown',
            'document_type_name': 'Unknown',
            'confidence': 0.0,
            'is_confident': False,
            'all_probabilities': [],
            'matched_keywords': [],
        }


# Глобальный экземпляр
document_classifier = DocumentClassifier()
