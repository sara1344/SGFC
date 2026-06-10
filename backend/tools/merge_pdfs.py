#!/usr/bin/env python3
"""
Une PDFs para SGFC usando pypdf (soporta compresión PDF 1.5+ y cifrado con contraseña vacía).

Uso:
  python merge_pdfs.py --output salida.pdf entrada1.pdf entrada2.pdf ...
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def merge_pdfs(sources: list[Path], output: Path) -> dict:
    try:
        from pypdf import PdfReader, PdfWriter
    except ImportError as exc:
        raise RuntimeError(
            "Falta la librería pypdf. Instálela con: pip install pypdf"
        ) from exc

    writer = PdfWriter()
    total_pages = 0
    failures: list[dict] = []

    for src in sources:
        try:
            reader = PdfReader(str(src))
            if reader.is_encrypted:
                status = reader.decrypt("")
                if status == 0:
                    raise ValueError(
                        "PDF protegido con contraseña. Guarde una copia sin contraseña "
                        "(Archivo → Imprimir → Guardar como PDF) y vuelva a subirla."
                    )
            for page in reader.pages:
                writer.add_page(page)
                total_pages += 1
        except Exception as exc:
            failures.append({"file": src.name, "error": str(exc)})

    if total_pages == 0:
        detail = failures[0]["error"] if failures else "No se pudo leer ningún PDF."
        raise RuntimeError(detail)

    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("wb") as handle:
        writer.write(handle)

    return {"paginas": total_pages, "archivos": len(sources), "fallos": failures}


def main() -> int:
    parser = argparse.ArgumentParser(description="Unir PDFs para SGFC")
    parser.add_argument("--output", "-o", required=True, help="Ruta del PDF resultante")
    parser.add_argument("sources", nargs="+", help="PDFs de entrada en orden")
    args = parser.parse_args()

    output = Path(args.output).resolve()
    sources = [Path(s).resolve() for s in args.sources]

    for src in sources:
        if not src.is_file():
            print(json.dumps({"ok": False, "error": f"Archivo no encontrado: {src.name}"}), file=sys.stderr)
            return 1

    try:
        result = merge_pdfs(sources, output)
        print(json.dumps({"ok": True, **result}))
        return 0
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
