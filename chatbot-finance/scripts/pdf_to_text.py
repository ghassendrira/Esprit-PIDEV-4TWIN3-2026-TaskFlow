import fitz  # PyMuPDF
from pathlib import Path

PDF_PATH = "data/raw/recueil_formules_finance.pdf"
OUTPUT_PATH = "data/text/recueil_formules_finance.txt"

doc = fitz.open(PDF_PATH)

full_text = ""

for i, page in enumerate(doc):
    text = page.get_text("text")
    full_text += f"\n\n--- PAGE {i+1} ---\n\n"
    full_text += text

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    f.write(full_text)

print("Extraction terminée.")