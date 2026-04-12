from pathlib import Path
import re
from unidecode import unidecode

TEXT_DIR = Path("data/text")
CLEAN_DIR = Path("data/cleaned")
CLEAN_DIR.mkdir(parents=True, exist_ok=True)

def clean_text(text):
    text = text.replace("\xa0", " ")
    text = text.replace("\t", " ")
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"[ ]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

for txt_file in TEXT_DIR.glob("*.txt"):
    try:
        with open(txt_file, "r", encoding="utf-8") as f:
            text = f.read()

        cleaned = clean_text(text)

        out_file = CLEAN_DIR / txt_file.name
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(cleaned)

        print(f"Nettoyé: {txt_file.name}")
    except Exception as e:
        print(f"Erreur sur {txt_file.name}: {e}")