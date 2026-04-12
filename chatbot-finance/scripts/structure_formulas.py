from pathlib import Path
import json
import re

INPUT = Path("data/cleaned/recueil_formules_finance.txt")
OUTPUT = Path("data/chunks/formulas_structured.jsonl")

text = INPUT.read_text(encoding="utf-8")

lines = text.split("\n")

results = []

for line in lines:
    line = line.strip()

    if "=" in line and len(line) > 10:
        parts = line.split("=")
        concept = parts[0].strip()
        formula = "=".join(parts[1:]).strip()

        results.append({
            "type": "formula",
            "concept": concept,
            "formula": formula,
            "source": "finance_formulas_pdf"
        })

with open(OUTPUT, "w", encoding="utf-8") as f:
    for r in results:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")

print(f"{len(results)} formules extraites")