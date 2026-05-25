"""Юнит-тесты для модуля извлечения реквизитов.

Запуск: cd document-parser && python -m pytest tests/test_extractors.py -v
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.extractors import FieldExtractor
from app.extractors.validators import (
    validate_inn,
    validate_kpp,
    validate_ogrn,
    validate_bik,
)


# ---------- Валидаторы контрольных сумм ----------

class TestValidators:
    def test_inn_10_valid(self):
        # Математически валидный ИНН ЮЛ (контрольная сумма ФНС)
        assert validate_inn("1234567897")

    def test_inn_10_invalid_checksum(self):
        # Та же база, но контрольная цифра намеренно сломана
        assert not validate_inn("1234567890")

    def test_inn_12_valid(self):
        # Математически валидный ИНН ИП/ФЛ
        assert validate_inn("123456789036")

    def test_inn_12_invalid(self):
        assert not validate_inn("123456789000")

    def test_inn_wrong_length(self):
        assert not validate_inn("12345")

    def test_kpp_valid(self):
        assert validate_kpp("770701001")
        assert validate_kpp("7707AB001")  # с буквами в середине

    def test_kpp_invalid(self):
        assert not validate_kpp("12345")
        assert not validate_kpp("7707ab001")  # строчные буквы

    def test_ogrn_13_valid(self):
        # Валидный ОГРН Сбербанка
        assert validate_ogrn("1027700132195")

    def test_ogrn_15_valid(self):
        # Валидный ОГРНИП
        assert validate_ogrn("304500116000157")

    def test_ogrn_invalid(self):
        assert not validate_ogrn("1027700132190")

    def test_bik_valid(self):
        assert validate_bik("044525225")

    def test_bik_invalid_prefix(self):
        assert not validate_bik("123456789")  # не начинается с 04


# ---------- FieldExtractor end-to-end ----------

class TestFieldExtractor:
    def setup_method(self):
        self.fe = FieldExtractor()

    def test_extract_inn(self):
        text = "Поставщик: ООО Подрядчик, ИНН 1234567897, КПП 770701001"
        f = self.fe.extract(text)
        assert "1234567897" in f.inn
        assert "770701001" in f.kpp

    def test_extract_amount_with_spaces(self):
        text = "Итого к оплате: 1 234 567,89 руб."
        f = self.fe.extract(text)
        assert len(f.amounts) >= 1
        assert f.amounts[0].value == 1234567.89
        assert f.amounts[0].currency == "RUB"

    def test_extract_amount_with_rouble_sign(self):
        text = "Стоимость 50 000 ₽"
        f = self.fe.extract(text)
        assert any(a.value == 50000 for a in f.amounts)

    def test_extract_date_numeric(self):
        text = "Договор от 25.05.2026 года"
        f = self.fe.extract(text)
        assert "2026-05-25" in f.dates

    def test_extract_date_word(self):
        text = "Дата составления: 7 ноября 2025"
        f = self.fe.extract(text)
        assert "2025-11-07" in f.dates

    def test_extract_document_number(self):
        text = "Договор № 12/А-2026 от 01.04.2026"
        f = self.fe.extract(text)
        assert "12/А-2026" in f.document_numbers

    def test_extract_bik_and_account(self):
        text = "Банк: р/с 40702810400000000123, БИК 044525225"
        f = self.fe.extract(text)
        assert "044525225" in f.bik
        assert "40702810400000000123" in f.bank_accounts

    def test_detect_invoice_type(self):
        text = "СЧЁТ-ФАКТУРА № 5 от 15.04.2026"
        f = self.fe.extract(text)
        assert f.document_type_hint == "invoice"

    def test_detect_contract_type(self):
        text = "ДОГОВОР поставки № 7-С от 01.03.2026"
        f = self.fe.extract(text)
        assert f.document_type_hint == "contract"

    def test_detect_act_type(self):
        text = "АКТ выполненных работ № 3 к договору № 7-С"
        f = self.fe.extract(text)
        assert f.document_type_hint == "act"

    def test_filter_invalid_inn_by_checksum(self):
        # 10 цифр, но плохая контрольная — не должен попасть в результат
        text = "Случайные цифры 1234567890 в тексте"
        f = self.fe.extract(text)
        assert "1234567890" not in f.inn

    def test_empty_text(self):
        f = self.fe.extract("")
        assert f.inn == []
        assert f.amounts == []

    def test_full_invoice_extraction(self):
        # Имитация шапки счёта на оплату
        text = """
        СЧЁТ НА ОПЛАТУ № 145 от 20 мая 2026 г.

        Поставщик: ООО "Поставщик", ИНН 1234567897, КПП 772701001,
                   ОГРН 1027700132195, р/с 40702810500000004567, БИК 044525225.
        Покупатель: ИП Иванов И.И., ИНН 123456789036.

        Итого к оплате: 150 000,00 руб. (Сто пятьдесят тысяч рублей 00 копеек)
        """
        f = self.fe.extract(text)
        assert "1234567897" in f.inn
        assert "123456789036" in f.inn
        assert "772701001" in f.kpp
        assert "044525225" in f.bik
        assert "40702810500000004567" in f.bank_accounts
        assert any(a.value == 150000 for a in f.amounts)
        assert "2026-05-20" in f.dates
        assert "145" in f.document_numbers
        assert f.document_type_hint == "invoice"
