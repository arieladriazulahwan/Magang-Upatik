from __future__ import annotations

import argparse
import csv
import json
import pathlib
import posixpath
import zipfile
import xml.etree.ElementTree as ET

NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("xlsx")
    parser.add_argument("--summary", action="store_true")
    parser.add_argument("--sheet")
    parser.add_argument("--sheet-suffix")
    parser.add_argument("--out")
    args = parser.parse_args()

    workbook = XlsxWorkbook(pathlib.Path(args.xlsx))

    if args.summary:
        print(json.dumps(workbook.summary(), ensure_ascii=False, indent=2))
        return

    if not args.out:
        raise SystemExit("--out wajib diisi jika bukan --summary")

    if args.sheet_suffix:
        selected_sheets = [
            name
            for name in workbook.sheet_paths
            if name.endswith(args.sheet_suffix) and "Belum" not in name
        ]
        rows = workbook.combined_rows(selected_sheets)
    elif args.sheet:
        rows = workbook.rows(args.sheet)
    else:
        raise SystemExit("--sheet atau --sheet-suffix wajib diisi")

    with pathlib.Path(args.out).open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerows(rows)


class XlsxWorkbook:
    def __init__(self, path: pathlib.Path) -> None:
        self.path = path
        self.zip = zipfile.ZipFile(path)
        self.shared_strings = self._shared_strings()
        self.sheet_paths = self._sheet_paths()

    def summary(self) -> list[dict[str, int | str]]:
        result = []
        for name, path in self.sheet_paths.items():
            root = ET.fromstring(self.zip.read(path))
            rows = root.findall(".//a:sheetData/a:row", NS)
            result.append(
                {
                    "sheet": name,
                    "rows_including_header": len(rows),
                    "data_rows": max(len(rows) - 1, 0),
                }
            )
        return result

    def rows(self, sheet_name: str) -> list[list[str]]:
        if sheet_name not in self.sheet_paths:
            raise RuntimeError(f"Sheet {sheet_name} tidak ditemukan.")

        root = ET.fromstring(self.zip.read(self.sheet_paths[sheet_name]))
        rows = []
        max_col = 0

        for row in root.findall(".//a:sheetData/a:row", NS):
            values = {}
            for cell in row.findall("a:c", NS):
                index = column_index(cell.attrib.get("r", "A"))
                raw = cell.find("a:v", NS)
                value = "" if raw is None or raw.text is None else raw.text
                if cell.attrib.get("t") == "s" and value != "":
                    value = self.shared_strings[int(value)]
                values[index] = value
                max_col = max(max_col, index + 1)
            rows.append([values.get(index, "") for index in range(max_col)])

        return rows

    def combined_rows(self, sheet_names: list[str]) -> list[list[str]]:
        combined = []
        header = None

        for sheet_name in sheet_names:
            rows = self.rows(sheet_name)
            if not rows:
                continue

            current_header = [value.strip().lower() for value in rows[0]]

            if header is None:
                header = current_header + ["source_sheet"]
                combined.append(header)

            for row in rows[1:]:
                normalized = row + [""] * max(0, len(current_header) - len(row))
                combined.append(normalized[: len(current_header)] + [sheet_name])

        return combined

    def _shared_strings(self) -> list[str]:
        if "xl/sharedStrings.xml" not in self.zip.namelist():
            return []

        root = ET.fromstring(self.zip.read("xl/sharedStrings.xml"))
        result = []
        for item in root.findall("a:si", NS):
            result.append("".join(text.text or "" for text in item.findall(".//a:t", NS)))
        return result

    def _sheet_paths(self) -> dict[str, str]:
        workbook = ET.fromstring(self.zip.read("xl/workbook.xml"))
        sheets = [
            (sheet.attrib["name"], sheet.attrib.get(f"{{{REL_NS}}}id"))
            for sheet in workbook.findall(".//a:sheet", NS)
        ]

        relationships = ET.fromstring(self.zip.read("xl/_rels/workbook.xml.rels"))
        rels = {rel.attrib["Id"]: rel.attrib["Target"] for rel in relationships}

        paths = {}
        for name, relation_id in sheets:
            raw = rels[relation_id]
            paths[name] = raw.lstrip("/") if raw.startswith("/xl/") else posixpath.normpath("xl/" + raw)
        return paths


def column_index(cell_ref: str) -> int:
    letters = "".join(char for char in cell_ref if char.isalpha()) or "A"
    index = 0
    for letter in letters:
        index = index * 26 + ord(letter.upper()) - 64
    return index - 1


if __name__ == "__main__":
    main()
