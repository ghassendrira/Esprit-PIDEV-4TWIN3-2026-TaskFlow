from pathlib import Path
import json
import re

BASE_DIR = Path(".")
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
CLEANED_DIR = DATA_DIR / "cleaned"
FINAL_DIR = DATA_DIR / "cleaned_final"

FINAL_DIR.mkdir(parents=True, exist_ok=True)


def normalize_line(text: str) -> str:
    text = text.strip()
    text = re.sub(r"\s+", " ", text)
    return text


def deduplicate_txt_file(input_path: Path, output_path: Path):
    seen = set()
    kept_lines = []

    with open(input_path, "r", encoding="utf-8") as f:
        for line in f:
            clean = normalize_line(line)
            if not clean:
                continue
            if clean not in seen:
                seen.add(clean)
                kept_lines.append(clean)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(kept_lines) + ("\n" if kept_lines else ""))

    print(f"[DEDUP] {input_path.name}: {len(kept_lines)} lignes uniques")


def repair_lexique_json_to_txt():
    """
    Répare lexique_finance_1800_termes_fr à partir du JSON brut si disponible.
    Cherche en priorité dans data/raw.
    """
    candidates = [
        RAW_DIR / "lexique_finance_1800_termes_fr.json",
        RAW_DIR / "lexique_finance_1800_termes_fr.txt",
        CLEANED_DIR / "lexique_finance_1800_termes_fr.txt",
    ]

    source = None
    for c in candidates:
        if c.exists():
            source = c
            break

    if source is None:
        print("[WARN] Aucun fichier source trouvé pour lexique_finance_1800_termes_fr")
        return

    output_path = FINAL_DIR / "lexique_finance_1800_termes_fr.txt"

    try:
        text = source.read_text(encoding="utf-8").strip()

        # Cas 1 : vrai JSON
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            data = None

        entries = []

        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict):
                    parts = []
                    for k, v in item.items():
                        if isinstance(v, (dict, list)):
                            v = json.dumps(v, ensure_ascii=False)
                        parts.append(f"{k}: {v}")
                    entries.append(". ".join(parts))

        elif isinstance(data, dict):
            # soit un seul objet, soit un dict contenant une liste
            list_found = False
            for _, v in data.items():
                if isinstance(v, list):
                    list_found = True
                    for item in v:
                        if isinstance(item, dict):
                            parts = []
                            for k2, v2 in item.items():
                                if isinstance(v2, (dict, list)):
                                    v2 = json.dumps(v2, ensure_ascii=False)
                                parts.append(f"{k2}: {v2}")
                            entries.append(". ".join(parts))
            if not list_found:
                parts = []
                for k, v in data.items():
                    if isinstance(v, (dict, list)):
                        v = json.dumps(v, ensure_ascii=False)
                    parts.append(f"{k}: {v}")
                entries.append(". ".join(parts))

        else:
            # Cas 2 : pseudo-json sérialisé sur une ligne
            repaired = text
            repaired = repaired.replace("}{", "}\n{")
            repaired = repaired.replace("}, {", "}\n{")
            repaired = repaired.replace("}.{", ".\n{")
            repaired = re.sub(r'(?<!\n)(metadata:)', r'\n\1', repaired)
            repaired = re.sub(r'(?<!\n)(title:)', r'\n\1', repaired)
            repaired = re.sub(r'(?<!\n)(term:)', r'\n\1', repaired)
            repaired = re.sub(r'(?<!\n)(definition:)', r'\n\1', repaired)

            lines = [normalize_line(x) for x in repaired.splitlines() if normalize_line(x)]
            entries.extend(lines)

        # Déduplication finale
        seen = set()
        unique_entries = []
        for e in entries:
            e = normalize_line(e)
            if e and e not in seen:
                seen.add(e)
                unique_entries.append(e)

        output_path.write_text("\n".join(unique_entries) + ("\n" if unique_entries else ""), encoding="utf-8")
        print(f"[REPAIR] lexique_finance_1800_termes_fr.txt: {len(unique_entries)} lignes")

    except Exception as e:
        print(f"[ERROR] Réparation lexique impossible: {e}")


def copy_good_files():
    good_files = [
        "lexique_finance_enriched.txt",
        "finance_ml_dataset_optimized.txt",
        "risk_and_regulation.txt",
        "recueil_formules_finance.txt",
        "company_fundamentals.txt",
        "market_timeseries.txt",
        "finance_definitions.txt",
        "finance_qa_dataset.txt",
    ]

    for filename in good_files:
        src = CLEANED_DIR / filename
        dst = FINAL_DIR / filename
        if src.exists():
            dst.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
            print(f"[COPY] {filename}")
        else:
            print(f"[WARN] Fichier absent: {filename}")


def deduplicate_priority_files():
    files_to_dedup = [
        "ratio_interpretations.txt",
        "microfinance_and_banking.txt",
        "finance_formulas.txt",
        "finance_qa.txt",
    ]

    for filename in files_to_dedup:
        src = CLEANED_DIR / filename
        dst = FINAL_DIR / filename
        if src.exists():
            deduplicate_txt_file(src, dst)
        else:
            print(f"[WARN] Fichier absent: {filename}")


def copy_jsonl_if_exists():
    jsonl_files = [
        "formulas_structured.jsonl",
    ]

    for filename in jsonl_files:
        possible_sources = [
            DATA_DIR / "chunks" / filename,
            CLEANED_DIR / filename,
            RAW_DIR / filename,
        ]

        found = None
        for p in possible_sources:
            if p.exists():
                found = p
                break

        if found:
            dst = FINAL_DIR / filename
            dst.write_text(found.read_text(encoding="utf-8"), encoding="utf-8")
            print(f"[COPY] {filename}")
        else:
            print(f"[WARN] JSONL absent: {filename}")


def main():
    print("=== Début nettoyage final ===")
    copy_good_files()
    deduplicate_priority_files()
    repair_lexique_json_to_txt()
    copy_jsonl_if_exists()
    print("=== Terminé : dossier data/cleaned_final prêt ===")


if __name__ == "__main__":
    main()