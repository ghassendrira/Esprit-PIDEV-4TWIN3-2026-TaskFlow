from pathlib import Path
from docx import Document

RAW_DIR = Path("data/raw")
TEXT_DIR = Path("data/text")
TEXT_DIR.mkdir(parents=True, exist_ok=True)

for docx_file in RAW_DIR.glob("*.docx"):
    try:
        doc = Document(docx_file)
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        text = "\n".join(paragraphs)

        out_file = TEXT_DIR / f"{docx_file.stem}.txt"
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(text)

        print(f"Converti: {docx_file.name} -> {out_file.name}")
    except Exception as e:
        print(f"Erreur sur {docx_file.name}: {e}")