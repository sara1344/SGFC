#!/usr/bin/env python3
"""
Reescribe un PDF para compatibilidad con FPDI (compresión avanzada / cifrado vacío).

Uso:
  python normalize_pdf.py --output salida.pdf entrada.pdf
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def normalize_pdf(source: Path, output: Path) -> dict:
    try:
        from pypdf import PdfReader, PdfWriter
    except ImportError as exc:
        raise RuntimeError(
            "Falta la librería pypdf. Instálela con: pip install pypdf"
        ) from exc

    reader = PdfReader(str(source))
    if reader.is_encrypted:
        status = reader.decrypt("")
        if status == 0:
            raise RuntimeError(
                "PDF protegido con contraseña. Guarde una copia sin contraseña "
                "(Archivo → Imprimir → Guardar como PDF) y vuelva a subirla."
            )

    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)

    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("wb") as handle:
        writer.write(handle)

    return {"paginas": len(reader.pages)}


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalizar PDF para SGFC")
    parser.add_argument("--output", "-o", required=True, help="Ruta del PDF resultante")
    parser.add_argument("source", help="PDF de entrada")
    args = parser.parse_args()

    source = Path(args.source).resolve()
    output = Path(args.output).resolve()
    if not source.is_file():
        print(json.dumps({"ok": False, "error": f"Archivo no encontrado: {source.name}"}), file=sys.stderr)
        return 1

    try:
        result = normalize_pdf(source, output)
        print(json.dumps({"ok": True, **result}))
        return 0
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
