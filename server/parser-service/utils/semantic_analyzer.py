"""
Semantic Analysis utilities.
Семантический анализ: извлечение ключевых слов, тематическое моделирование, саммаризация.
"""

import logging
import re
from typing import Dict, Any, List, Tuple
from collections import Counter
import math

logger = logging.getLogger(__name__)

try:
    from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
    from sklearn.decomposition import LatentDirichletAllocation
    SKLEARN_AVAILABLE = True
except ImportError:
    logger.warning("scikit-learn not available, some features will be disabled")
    SKLEARN_AVAILABLE = False

try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize, sent_tokenize
    NLTK_AVAILABLE = True
    
    # Попытка загрузки необходимых ресурсов
    try:
        stopwords.words('russian')
    except LookupError:
        logger.info("Downloading NLTK stopwords...")
        nltk.download('stopwords', quiet=True)
        nltk.download('punkt', quiet=True)
        
except ImportError:
    logger.warning("NLTK not available, using fallback methods")
    NLTK_AVAILABLE = False


class SemanticAnalyzer:
    """Семантический анализ текста."""
    
    # Стоп-слова для русского и английского (fallback)
    STOPWORDS_RU = {
        'и', 'в', 'во', 'не', 'что', 'он', 'на', 'я', 'с', 'со', 'как', 'а', 'то',
        'все', 'она', 'так', 'его', 'но', 'да', 'ты', 'к', 'у', 'же', 'вы', 'за',
        'бы', 'по', 'только', 'ее', 'мне', 'было', 'вот', 'от', 'меня', 'еще', 'нет',
        'о', 'из', 'ему', 'теперь', 'когда', 'даже', 'ну', 'вдруг', 'ли', 'если',
        'уже', 'или', 'ни', 'быть', 'был', 'него', 'до', 'вас', 'нибудь', 'опять',
        'уж', 'вам', 'ведь', 'там', 'потом', 'себя', 'ничего', 'ей', 'может', 'они',
        'тут', 'где', 'есть', 'надо', 'ней', 'для', 'мы', 'тебя', 'их', 'чем', 'была',
        'сам', 'чтоб', 'без', 'будто', 'чего', 'раз', 'тоже', 'себе', 'под', 'будет',
    }
    
    STOPWORDS_EN = {
        'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for',
        'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by',
        'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all',
        'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get',
    }
    
    def __init__(self):
        """Инициализация анализатора."""
        self.stopwords_combined = self.STOPWORDS_RU | self.STOPWORDS_EN
        
        if NLTK_AVAILABLE:
            try:
                self.stopwords_combined.update(stopwords.words('russian'))
                self.stopwords_combined.update(stopwords.words('english'))
            except:
                pass
    
    def analyze(self, text: str, language: str = 'ru') -> Dict[str, Any]:
        """
        Полный семантический анализ текста.
        
        Args:
            text: Исходный текст
            language: Язык текста ('ru', 'en', 'auto')
            
        Returns:
            Dict с результатами анализа
        """
        if not text or not isinstance(text, str):
            return self._empty_result()
        
        try:
            result = {
                'keywords': self.extract_keywords(text, language, top_n=20),
                'statistics': self.get_text_statistics(text),
                'summary': self.generate_summary(text, sentences=3),
            }
            
            # Тематическое моделирование (если доступен sklearn)
            if SKLEARN_AVAILABLE and len(text) > 500:
                try:
                    result['topics'] = self.extract_topics(text, n_topics=3)
                except Exception as e:
                    logger.warning(f"Topic modeling failed: {e}")
                    result['topics'] = []
            else:
                result['topics'] = []
            
            return result
            
        except Exception as e:
            logger.error(f"Semantic analysis error: {e}")
            return self._empty_result()
    
    def extract_keywords(self, text: str, language: str = 'ru', top_n: int = 20) -> List[Dict[str, Any]]:
        """
        Извлечение ключевых слов методом TF-IDF (или fallback).
        
        Args:
            text: Текст
            language: Язык
            top_n: Количество ключевых слов
            
        Returns:
            Список ключевых слов с весами
        """
        try:
            if SKLEARN_AVAILABLE:
                return self._extract_keywords_tfidf(text, top_n)
            else:
                return self._extract_keywords_frequency(text, top_n)
        except Exception as e:
            logger.error(f"Keyword extraction error: {e}")
            return []
    
    def _extract_keywords_tfidf(self, text: str, top_n: int) -> List[Dict[str, Any]]:
        """Извлечение ключевых слов с TF-IDF."""
        try:
            # Токенизация
            words = self._tokenize(text)
            
            # Если слов мало, используем частотный метод
            if len(words) < 20:
                return self._extract_keywords_frequency(text, top_n)
            
            # TF-IDF
            vectorizer = TfidfVectorizer(
                max_features=top_n * 2,
                stop_words=list(self.stopwords_combined),
                token_pattern=r'[а-яёА-ЯЁa-zA-Z]{3,}',  # Минимум 3 буквы
            )
            
            tfidf_matrix = vectorizer.fit_transform([text])
            feature_names = vectorizer.get_feature_names_out()
            tfidf_scores = tfidf_matrix.toarray()[0]
            
            # Сортировка по важности
            word_scores = list(zip(feature_names, tfidf_scores))
            word_scores.sort(key=lambda x: x[1], reverse=True)
            
            keywords = [
                {
                    'word': word,
                    'score': float(score),
                    'rank': idx + 1,
                }
                for idx, (word, score) in enumerate(word_scores[:top_n])
                if score > 0
            ]
            
            return keywords
            
        except Exception as e:
            logger.error(f"TF-IDF extraction error: {e}")
            return self._extract_keywords_frequency(text, top_n)
    
    def _extract_keywords_frequency(self, text: str, top_n: int) -> List[Dict[str, Any]]:
        """Извлечение ключевых слов по частоте (fallback)."""
        try:
            words = self._tokenize(text)
            
            # Фильтрация стоп-слов и коротких слов
            filtered_words = [
                word.lower() for word in words
                if len(word) >= 3 and word.lower() not in self.stopwords_combined
            ]
            
            # Подсчет частот
            word_counts = Counter(filtered_words)
            
            # Топ слов
            top_words = word_counts.most_common(top_n)
            
            # Нормализация scores
            max_count = top_words[0][1] if top_words else 1
            
            keywords = [
                {
                    'word': word,
                    'score': count / max_count,
                    'count': count,
                    'rank': idx + 1,
                }
                for idx, (word, count) in enumerate(top_words)
            ]
            
            return keywords
            
        except Exception as e:
            logger.error(f"Frequency extraction error: {e}")
            return []
    
    def extract_topics(self, text: str, n_topics: int = 3, words_per_topic: int = 10) -> List[Dict[str, Any]]:
        """
        Тематическое моделирование (LDA).
        
        Args:
            text: Текст
            n_topics: Количество тем
            words_per_topic: Слов в каждой теме
            
        Returns:
            Список тем с ключевыми словами
        """
        if not SKLEARN_AVAILABLE:
            logger.warning("sklearn not available for topic modeling")
            return []
        
        try:
            # Векторизация
            vectorizer = CountVectorizer(
                max_features=1000,
                stop_words=list(self.stopwords_combined),
                token_pattern=r'[а-яёА-ЯЁa-zA-Z]{3,}',
            )
            
            doc_term_matrix = vectorizer.fit_transform([text])
            
            # LDA
            lda = LatentDirichletAllocation(
                n_components=n_topics,
                random_state=42,
                max_iter=10,
            )
            
            lda.fit(doc_term_matrix)
            
            # Извлечение топ-слов для каждой темы
            feature_names = vectorizer.get_feature_names_out()
            
            topics = []
            for topic_idx, topic in enumerate(lda.components_):
                top_words_idx = topic.argsort()[-words_per_topic:][::-1]
                top_words = [
                    {
                        'word': feature_names[i],
                        'weight': float(topic[i]),
                    }
                    for i in top_words_idx
                ]
                
                topics.append({
                    'topic_id': topic_idx + 1,
                    'keywords': top_words,
                })
            
            return topics
            
        except Exception as e:
            logger.error(f"Topic modeling error: {e}")
            return []
    
    def get_text_statistics(self, text: str) -> Dict[str, Any]:
        """
        Статистика текста.
        
        Args:
            text: Текст
            
        Returns:
            Статистика
        """
        try:
            words = self._tokenize(text)
            sentences = self._split_sentences(text)
            
            # Уникальные слова
            unique_words = set(word.lower() for word in words if len(word) >= 3)
            
            # Средняя длина слова
            avg_word_length = sum(len(word) for word in words) / len(words) if words else 0
            
            # Средняя длина предложения
            avg_sentence_length = len(words) / len(sentences) if sentences else 0
            
            return {
                'total_characters': len(text),
                'total_words': len(words),
                'total_sentences': len(sentences),
                'unique_words': len(unique_words),
                'lexical_diversity': len(unique_words) / len(words) if words else 0,
                'avg_word_length': round(avg_word_length, 2),
                'avg_sentence_length': round(avg_sentence_length, 2),
            }
            
        except Exception as e:
            logger.error(f"Statistics error: {e}")
            return {}
    
    def generate_summary(self, text: str, sentences: int = 3) -> str:
        """
        Генерация краткого резюме (extractive summarization).
        
        Args:
            text: Текст
            sentences: Количество предложений в резюме
            
        Returns:
            Резюме
        """
        try:
            sents = self._split_sentences(text)
            
            if len(sents) <= sentences:
                return text
            
            # Простой алгоритм: берем первые и последние предложения
            # + одно из середины
            if sentences == 3 and len(sents) >= 3:
                summary_sents = [
                    sents[0],  # Первое
                    sents[len(sents) // 2],  # Среднее
                    sents[-1],  # Последнее
                ]
            else:
                # Просто первые N предложений
                summary_sents = sents[:sentences]
            
            return ' '.join(summary_sents)
            
        except Exception as e:
            logger.error(f"Summary generation error: {e}")
            return text[:500] + '...' if len(text) > 500 else text
    
    def _tokenize(self, text: str) -> List[str]:
        """Токенизация текста."""
        if NLTK_AVAILABLE:
            try:
                return word_tokenize(text, language='russian')
            except:
                pass
        
        # Fallback: простая regex токенизация
        return re.findall(r'[а-яёА-ЯЁa-zA-Z]+', text)
    
    def _split_sentences(self, text: str) -> List[str]:
        """Разбиение на предложения."""
        if NLTK_AVAILABLE:
            try:
                return sent_tokenize(text, language='russian')
            except:
                pass
        
        # Fallback: разбиение по точкам, восклицательным и вопросительным знакам
        sentences = re.split(r'[.!?]+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _empty_result(self) -> Dict[str, Any]:
        """Пустой результат."""
        return {
            'keywords': [],
            'topics': [],
            'statistics': {},
            'summary': '',
        }


# Глобальный экземпляр
semantic_analyzer = SemanticAnalyzer()
