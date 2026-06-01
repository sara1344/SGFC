import PyPDF2
import os

def unir_pdfs(carpeta, pdf_salida):
    merger = PyPDF2.PdfMerger()
    
    archivos_pdf = [f for f in os.listdir(carpeta) if f.endswith(".pdf")]
    archivos_pdf.sort()  # Ordenar por nombre
    
    for pdf in archivos_pdf:
        merger.append(os.path.join(carpeta, pdf))
    
    merger.write(pdf_salida)
    merger.close()
    print(f"PDFs unidos exitosamente en {pdf_salida}")

# Ruta donde están los PDFs
carpeta_pdfs = r"C:\Users\Julian\Desktop\nueva"

#archivo finalizado guardado
pdf_resultante = r"C:\Users\Julian\Desktop\pdf\Catalogos_portada.pdf"

#funcion
unir_pdfs(carpeta_pdfs, pdf_resultante)
