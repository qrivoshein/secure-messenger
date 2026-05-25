/**
 * Компактное превью ключевых реквизитов, автоматически извлечённых из
 * вложенного документа (бэкенд парсит файл при загрузке и возвращает
 * extracted_fields вместе с fileUrl). Встраивается прямо в карточку
 * сообщения с вложением — получатель видит ИНН, суммы, даты и т.д.
 * сразу в чате, без необходимости открывать отдельный модуль парсинга.
 *
 * DOM строится без innerHTML — каждое поле создаётся через
 * document.createElement(), что соответствует архитектурной защите
 * от XSS, заявленной в разделе 3.3 диплома.
 */
import { createElement } from "../utils/dom-helpers";
import type { ExtractedFields } from "../types";

const DOC_TYPE_LABELS: Record<string, string> = {
    invoice: "Счёт-фактура",
    act: "Акт",
    contract: "Договор",
    waybill: "Накладная",
};

function formatAmount(a: { value: number; currency: string }): string {
    const fmt = new Intl.NumberFormat("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const sym = a.currency === "RUB" ? "₽" : a.currency;
    return `${fmt.format(a.value)} ${sym}`;
}

function formatDateISO(iso: string): string {
    // ISO YYYY-MM-DD → DD.MM.YYYY
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

interface FieldRow {
    label: string;
    value: string;
    badge?: boolean;
}

function buildRows(f: ExtractedFields): FieldRow[] {
    const rows: FieldRow[] = [];

    if (f.document_type_hint) {
        rows.push({
            label: "Тип",
            value: DOC_TYPE_LABELS[f.document_type_hint] || f.document_type_hint,
            badge: true,
        });
    }

    if (f.document_numbers && f.document_numbers.length > 0) {
        rows.push({ label: "№", value: f.document_numbers[0] });
    }

    if (f.dates && f.dates.length > 0) {
        rows.push({ label: "Дата", value: formatDateISO(f.dates[0]) });
    }

    if (f.amounts && f.amounts.length > 0) {
        rows.push({ label: "Сумма", value: formatAmount(f.amounts[0]) });
    }

    if (f.inn && f.inn.length > 0) {
        const innValue = f.inn.length === 1 ? f.inn[0] : `${f.inn[0]} +${f.inn.length - 1}`;
        rows.push({ label: "ИНН", value: innValue });
    }

    if (f.kpp && f.kpp.length > 0) {
        rows.push({ label: "КПП", value: f.kpp[0] });
    }

    if (f.bik && f.bik.length > 0) {
        rows.push({ label: "БИК", value: f.bik[0] });
    }

    return rows;
}

export function renderExtractedFieldsPreview(fields?: ExtractedFields | null): HTMLElement | null {
    if (!fields) return null;
    const rows = buildRows(fields);
    if (rows.length === 0) return null;

    const container = createElement("div", {
        className: "extracted-fields-preview",
        styles: {
            marginTop: "8px",
            padding: "8px 10px",
            background: "rgba(102, 126, 234, 0.08)",
            borderLeft: "3px solid #667eea",
            borderRadius: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            fontSize: "12px",
            lineHeight: "1.45",
        },
    });

    const header = createElement("div", {
        className: "extracted-fields-header",
        text: "Извлечённые реквизиты",
        styles: {
            fontSize: "10px",
            fontWeight: "600",
            color: "#667eea",
            textTransform: "uppercase",
            letterSpacing: "0.4px",
            marginBottom: "2px",
        },
    });
    container.appendChild(header);

    for (const row of rows) {
        const line = createElement("div", {
            className: "extracted-field-row",
            styles: { display: "flex", gap: "6px", alignItems: "baseline" },
        });
        const label = createElement("span", {
            className: "extracted-field-label",
            text: row.label + ":",
            styles: {
                fontWeight: "500",
                color: "#718096",
                minWidth: "44px",
            },
        });
        const value = createElement("span", {
            className: "extracted-field-value",
            text: row.value,
            styles: {
                color: "#1a202c",
                fontWeight: row.badge ? "600" : "400",
            },
        });
        line.appendChild(label);
        line.appendChild(value);
        container.appendChild(line);
    }

    return container;
}
