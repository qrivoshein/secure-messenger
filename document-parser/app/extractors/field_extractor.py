"""Извлечение ключевых реквизитов российских деловых документов.

Архитектура: на вход — текст и (опционально) DocumentStructure; на выходе —
объект ExtractedFields с типизированными полями. Каждый экстрактор изолирован
и подключается через config — добавить новый реквизит можно без правки ядра.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.extractors.patterns import (
    DOC_TYPE_HINTS,
    MONTH_TO_NUM,
    RE_ACCOUNT,
    RE_AMOUNT,
    RE_BIK,
    RE_DATE_NUM,
    RE_DATE_WORD,
    RE_DOC_NUMBER,
    RE_INN,
    RE_KPP,
    RE_OGRN,
)
from app.extractors.validators import (
    validate_account,
    validate_bik,
    validate_inn,
    validate_kpp,
    validate_ogrn,
)


class Amount(BaseModel):
    value: float
    currency: str = "RUB"
    raw: str


class ExtractedFields(BaseModel):
    """Структурированные реквизиты, извлечённые из документа."""
    inn: List[str] = Field(default_factory=list)
    kpp: List[str] = Field(default_factory=list)
    ogrn: List[str] = Field(default_factory=list)
    bik: List[str] = Field(default_factory=list)
    bank_accounts: List[str] = Field(default_factory=list)
    amounts: List[Amount] = Field(default_factory=list)
    dates: List[str] = Field(default_factory=list)  # ISO YYYY-MM-DD
    document_numbers: List[str] = Field(default_factory=list)
    document_type_hint: Optional[str] = None


DEFAULT_CONFIG: Dict[str, Any] = {
    "enabled": [
        "inn", "kpp", "ogrn", "bik", "bank_accounts",
        "amounts", "dates", "document_numbers", "document_type",
    ],
    "templates": {
        "invoice":  ["inn", "kpp", "amounts", "dates", "document_numbers"],
        "act":      ["inn", "kpp", "amounts", "dates", "document_numbers"],
        "contract": ["inn", "kpp", "ogrn", "amounts", "dates", "document_numbers"],
        "waybill":  ["inn", "kpp", "amounts", "dates", "document_numbers"],
    },
}


class FieldExtractor:
    """Главный класс извлечения. На вход — текст, на выход — ExtractedFields."""

    def __init__(self, config: Optional[Dict[str, Any]] = None) -> None:
        self.config = config or DEFAULT_CONFIG

    # ---------- Конфигурация ----------

    @classmethod
    def from_config_file(cls, path: str | Path) -> "FieldExtractor":
        with open(path, "r", encoding="utf-8") as f:
            return cls(config=json.load(f))

    def _is_enabled(self, name: str) -> bool:
        return name in self.config.get("enabled", [])

    # ---------- Точка входа ----------

    def extract(self, text: str) -> ExtractedFields:
        if not text:
            return ExtractedFields()
        normalized = self._normalize(text)
        fields = ExtractedFields()
        if self._is_enabled("inn"):
            fields.inn = self._extract_inn(normalized)
        if self._is_enabled("kpp"):
            fields.kpp = self._extract_kpp(normalized)
        if self._is_enabled("ogrn"):
            fields.ogrn = self._extract_ogrn(normalized)
        if self._is_enabled("bik"):
            fields.bik = self._extract_bik(normalized)
        if self._is_enabled("bank_accounts"):
            fields.bank_accounts = self._extract_accounts(normalized, fields.inn)
        if self._is_enabled("amounts"):
            fields.amounts = self._extract_amounts(normalized)
        if self._is_enabled("dates"):
            fields.dates = self._extract_dates(normalized)
        if self._is_enabled("document_numbers"):
            fields.document_numbers = self._extract_document_numbers(normalized)
        if self._is_enabled("document_type"):
            fields.document_type_hint = self._detect_document_type(normalized)
        return fields

    # ---------- Утилиты ----------

    @staticmethod
    def _normalize(text: str) -> str:
        # Заменяем неразрывный пробел на обычный, схлопываем пробелы внутри строки
        return text.replace(" ", " ")

    @staticmethod
    def _uniq(items: List[str]) -> List[str]:
        seen, out = set(), []
        for x in items:
            if x not in seen:
                seen.add(x)
                out.append(x)
        return out

    # ---------- Конкретные экстракторы ----------

    def _extract_inn(self, text: str) -> List[str]:
        return self._uniq([m.group(0) for m in RE_INN.finditer(text) if validate_inn(m.group(0))])

    def _extract_kpp(self, text: str) -> List[str]:
        return self._uniq([m.group(0) for m in RE_KPP.finditer(text) if validate_kpp(m.group(0))])

    def _extract_ogrn(self, text: str) -> List[str]:
        return self._uniq([m.group(0) for m in RE_OGRN.finditer(text) if validate_ogrn(m.group(0))])

    def _extract_bik(self, text: str) -> List[str]:
        return self._uniq([m.group(0) for m in RE_BIK.finditer(text) if validate_bik(m.group(0))])

    def _extract_accounts(self, text: str, found_inns: List[str]) -> List[str]:
        # Чтобы не путать счёт с длинным «13-цифровым ОГРН» или цепочкой ИНН подряд,
        # ищем последовательность ровно 20 цифр, не входящую в более длинную цифровую группу.
        accounts: List[str] = []
        for m in RE_ACCOUNT.finditer(text):
            val = m.group(0)
            if validate_account(val):
                accounts.append(val)
        return self._uniq(accounts)

    def _extract_amounts(self, text: str) -> List[Amount]:
        out: List[Amount] = []
        seen_raw: set[str] = set()
        for m in RE_AMOUNT.finditer(text):
            raw_full = m.group(0)
            if raw_full in seen_raw:
                continue
            seen_raw.add(raw_full)
            num_str = m.group(1).replace(" ", "").replace(" ", "").replace(",", ".")
            try:
                value = float(num_str)
            except ValueError:
                continue
            out.append(Amount(value=value, currency="RUB", raw=raw_full.strip()))
        return out

    def _extract_dates(self, text: str) -> List[str]:
        out: List[str] = []
        for m in RE_DATE_NUM.finditer(text):
            d, mo, y = m.group(1), m.group(2), m.group(3)
            iso = self._normalize_numeric_date(d, mo, y)
            if iso:
                out.append(iso)
        for m in RE_DATE_WORD.finditer(text):
            d, mo_word, y = m.group(1), m.group(2).lower(), m.group(3)
            iso = self._normalize_word_date(d, mo_word, y)
            if iso:
                out.append(iso)
        return self._uniq(out)

    def _extract_document_numbers(self, text: str) -> List[str]:
        nums: List[str] = []
        for m in RE_DOC_NUMBER.finditer(text):
            n = m.group(1).strip(" .,;:")
            # отсеиваем единичные цифры < 2 символов и слишком длинные хвосты
            if 1 < len(n) <= 40:
                nums.append(n)
        return self._uniq(nums)

    def _detect_document_type(self, text: str) -> Optional[str]:
        low = text.lower()
        # ищем самое раннее упоминание и возвращаем соответствующий тип
        best_pos, best_type = None, None
        for doc_type, hints in DOC_TYPE_HINTS.items():
            for h in hints:
                pos = low.find(h)
                if pos != -1 and (best_pos is None or pos < best_pos):
                    best_pos, best_type = pos, doc_type
        return best_type

    # ---------- Помощники дат ----------

    @staticmethod
    def _normalize_numeric_date(d: str, m: str, y: str) -> Optional[str]:
        try:
            day, month, year = int(d), int(m), int(y)
        except ValueError:
            return None
        if year < 100:
            year += 2000 if year < 70 else 1900
        if not (1 <= day <= 31 and 1 <= month <= 12 and 1900 <= year <= 2100):
            return None
        return f"{year:04d}-{month:02d}-{day:02d}"

    @staticmethod
    def _normalize_word_date(d: str, mo_word: str, y: str) -> Optional[str]:
        # ищем месяц по префиксу
        month = None
        for prefix, num in MONTH_TO_NUM.items():
            if mo_word.startswith(prefix):
                month = num
                break
        if not month:
            return None
        try:
            day, year = int(d), int(y)
        except ValueError:
            return None
        if not (1 <= day <= 31 and 1900 <= year <= 2100):
            return None
        return f"{year:04d}-{month}-{day:02d}"
