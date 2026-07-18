import json
import sys

import xlrd


def clean(value):
    return " ".join(str(value or "").replace("\n", " ").split())


def as_number(value):
    try:
        return float(value)
    except Exception:
        return None


def main():
    if len(sys.argv) < 2:
        raise SystemExit("usage: parse-boq-xls.py <file>")

    workbook = xlrd.open_workbook(sys.argv[1])
    sheet_name = next((name for name in workbook.sheet_names() if "boq" in name.lower()), workbook.sheet_names()[0])
    sheet = workbook.sheet_by_name(sheet_name)

    work_name = ""
    items = []
    total_amount = 0.0

    for row_index in range(sheet.nrows):
        row = sheet.row_values(row_index)
        for cell in row:
            text = clean(cell)
            if text.lower().startswith("name of work:"):
                work_name = text.split(":", 1)[1].strip()

        if row and clean(row[0]).lower() == "total in figures":
            total_amount = as_number(row[52] if len(row) > 52 else None) or as_number(row[53] if len(row) > 53 else None) or total_amount

        if len(row) <= 52:
            continue
        sl_no = as_number(row[0])
        description = clean(row[1] if len(row) > 1 else "")
        quantity = as_number(row[3] if len(row) > 3 else None)
        unit = clean(row[4] if len(row) > 4 else "")
        rate = as_number(row[5] if len(row) > 5 else None)
        amount = as_number(row[52]) or as_number(row[53] if len(row) > 53 else None)
        if sl_no is None or not description or quantity is None or not unit or amount is None or amount <= 0:
            continue
        items.append(
            {
                "slNo": int(sl_no) if sl_no.is_integer() else sl_no,
                "description": description,
                "quantity": quantity,
                "unit": unit,
                "rate": rate,
                "amount": amount,
            }
        )

    if not total_amount:
        total_amount = sum(item["amount"] for item in items)

    print(
        json.dumps(
            {
                "sheetName": sheet_name,
                "workName": work_name,
                "totalAmountInr": total_amount,
                "items": items,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
