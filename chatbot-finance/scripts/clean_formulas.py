from pathlib import Path
import re

INPUT = Path("data/text/recueil_formules_finance.txt")
OUTPUT = Path("data/cleaned/recueil_formules_finance.txt")

text = INPUT.read_text(encoding="utf-8")

# nettoyage léger (NE PAS casser les formules)
text = re.sub(r"\n{3,}", "\n\n", text)
text = re.sub(r"[ ]{2,}", " ", text)

OUTPUT.write_text(text, encoding="utf-8")

print("Nettoyage OK")