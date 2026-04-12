from pathlib import Path
import re

BASE_DIR = Path(".")
INPUT_DIR = BASE_DIR / "data" / "cleaned_final"
OUTPUT_DIR = BASE_DIR / "data" / "cleaned_final_v2"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

FILES_TO_DEDUP = [
    "lexique_finance_enriched.txt",
    "risk_and_regulation.txt",
    "finance_definitions.txt",
]

FILES_TO_COPY = [
    "finance_qa.txt",
    "finance_qa_dataset.txt",
    "finance_formulas.txt",
    "formulas_structured.jsonl",
    "finance_ml_dataset_optimized.txt",
    "ratio_interpretations.txt",
    "microfinance_and_banking.txt",
    "lexique_finance_1800_termes_fr.txt",
    "company_fundamentals.txt",
    "market_timeseries.txt",
    "recueil_formules_finance.txt",
]

def normalize_line(text: str) -> str:
    text = text.strip()
    text = re.sub(r"\s+", " ", text)
    return text

def deduplicate_file(input_path: Path, output_path: Path):
    seen = set()
    result = []

    with open(input_path, "r", encoding="utf-8") as f:
        for line in f:
            line = normalize_line(line)
            if not line:
                continue
            if line not in seen:
                seen.add(line)
                result.append(line)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(result) + ("\n" if result else ""))

    print(f"[DEDUP] {input_path.name}: {len(result)} lignes uniques")

def copy_file(input_path: Path, output_path: Path):
    text = input_path.read_text(encoding="utf-8")
    output_path.write_text(text, encoding="utf-8")
    print(f"[COPY] {input_path.name}")

def main():
    for filename in FILES_TO_DEDUP:
        src = INPUT_DIR / filename
        dst = OUTPUT_DIR / filename
        if src.exists():
            deduplicate_file(src, dst)
        else:
            print(f"[WARN] fichier introuvable: {filename}")

    for filename in FILES_TO_COPY:
        src = INPUT_DIR / filename
        dst = OUTPUT_DIR / filename
        if src.exists():
            copy_file(src, dst)
        else:
            print(f"[WARN] fichier introuvable: {filename}")

    print("Terminé. Dossier prêt :", OUTPUT_DIR)

if __name__ == "__main__":
    main()