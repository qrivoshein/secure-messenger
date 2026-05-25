"""Проверка контрольных сумм для российских реквизитов."""


def validate_inn(inn: str) -> bool:
    """ИНН-10 (ЮЛ) или ИНН-12 (ФЛ/ИП) с проверкой контрольных цифр по алгоритму ФНС."""
    if not inn.isdigit():
        return False
    if len(inn) == 10:
        weights = [2, 4, 10, 3, 5, 9, 4, 1, 3]
        check = sum(int(inn[i]) * weights[i] for i in range(9)) % 11 % 10
        return check == int(inn[9])
    if len(inn) == 12:
        w11 = [7, 2, 4, 10, 3, 5, 9, 4, 1, 3]
        w12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 1, 3]
        c11 = sum(int(inn[i]) * w11[i] for i in range(10)) % 11 % 10
        c12 = sum(int(inn[i]) * w12[i] for i in range(11)) % 11 % 10
        return c11 == int(inn[10]) and c12 == int(inn[11])
    return False


def validate_ogrn(ogrn: str) -> bool:
    """ОГРН (13 цифр) или ОГРНИП (15 цифр)."""
    if not ogrn.isdigit():
        return False
    if len(ogrn) == 13:
        # контрольная = (число из первых 12 цифр) mod 11; если остаток 10, то 0
        body = int(ogrn[:12])
        check = body % 11
        if check == 10:
            check = 0
        return check == int(ogrn[12])
    if len(ogrn) == 15:
        body = int(ogrn[:14])
        check = body % 13
        if check == 10:
            check = 0
        return check == int(ogrn[14])
    return False


def validate_kpp(kpp: str) -> bool:
    """КПП — 9 символов: 4 цифры + 2 (цифры или заглавные буквы A-Z) + 3 цифры."""
    if len(kpp) != 9:
        return False
    if not (kpp[:4].isdigit() and kpp[6:].isdigit()):
        return False
    mid = kpp[4:6]
    return all(c.isdigit() or ("A" <= c <= "Z") for c in mid)


def validate_bik(bik: str) -> bool:
    """БИК банка РФ — 9 цифр, первые две '04'."""
    return bik.isdigit() and len(bik) == 9 and bik.startswith("04")


def validate_account(account: str) -> bool:
    """Расчётный счёт — 20 цифр. Проверка контрольной цифры опускается без БИК."""
    return account.isdigit() and len(account) == 20
