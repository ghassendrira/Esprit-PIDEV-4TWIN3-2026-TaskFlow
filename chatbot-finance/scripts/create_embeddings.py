from pathlib import Path
import json
import numpy as np
from sentence_transformers import SentenceTransformer

# ========= CONFIG =========
BASE_DIR = Path(".")
DATA_DIR = BASE_DIR / "data" / "cleaned_final_v2"
OUTPUT_DIR = BASE_DIR / "data" / "embeddings"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

FILES_TXT = [
    "finance_ml_dataset_optimized.txt",
    "finance_qa.txt",
    "finance_definitions.txt",
    "finance_qa_dataset.txt",
    "lexique_finance_1800_termes_fr.txt",
    "lexique_finance_enriched.txt",
    "recueil_formules_finance.txt",
    "finance_formulas.txt",
    "risk_and_regulation.txt",
    "company_fundamentals.txt",
    "market_timeseries.txt",
    "microfinance_and_banking.txt",
    "ratio_interpretations.txt",
]

FILES_JSONL = [
    "formulas_structured.jsonl",
]

# Choisis un des deux :
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
# MODEL_NAME = "all-MiniLM-L6-v2"

BATCH_SIZE = 64
# ==========================


def read_txt_file(file_path: Path, source_name: str):
    items = []

    with open(file_path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f):
            text = line.strip()
            if not text:
                continue

            items.append({
                "id": f"{source_name}_{i}",
                "source_file": source_name,
                "text_for_embedding": text,
                "metadata": {
                    "source_file": source_name,
                    "line_number": i
                }
            })

    return items


def read_jsonl_file(file_path: Path, source_name: str):
    items = []

    with open(file_path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f):
            line = line.strip()
            if not line:
                continue

            obj = json.loads(line)

            # priorité au champ text_for_embedding si présent
            if "text_for_embedding" in obj and str(obj["text_for_embedding"]).strip():
                text = str(obj["text_for_embedding"]).strip()
            else:
                # sinon on reconstruit un texte utile
                text_parts = []
                for key in ["concept", "formula", "name", "content", "definition", "category", "tags"]:
                    if key in obj and obj[key] is not None:
                        text_parts.append(f"{key}: {obj[key]}")
                text = ". ".join(text_parts).strip()

            if not text:
                continue

            items.append({
                "id": obj.get("id", f"{source_name}_{i}"),
                "source_file": source_name,
                "text_for_embedding": text,
                "metadata": {
                    "source_file": source_name,
                    "line_number": i,
                    **{k: v for k, v in obj.items() if k != "text_for_embedding"}
                }
            })

    return items


def load_all_documents():
    documents = []

    for filename in FILES_TXT:
        file_path = DATA_DIR / filename
        if not file_path.exists():
            print(f"[WARN] Fichier introuvable: {filename}")
            continue

        docs = read_txt_file(file_path, filename)
        documents.extend(docs)
        print(f"[LOAD] {filename}: {len(docs)} documents")

    for filename in FILES_JSONL:
        file_path = DATA_DIR / filename
        if not file_path.exists():
            print(f"[WARN] Fichier introuvable: {filename}")
            continue

        docs = read_jsonl_file(file_path, filename)
        documents.extend(docs)
        print(f"[LOAD] {filename}: {len(docs)} documents")

    return documents


def save_metadata(documents, output_jsonl: Path):
    with open(output_jsonl, "w", encoding="utf-8") as f:
        for doc in documents:
            f.write(json.dumps(doc, ensure_ascii=False) + "\n")

    print(f"[SAVE] Métadonnées sauvegardées dans {output_jsonl}")


def main():
    print("Chargement des documents...")
    documents = load_all_documents()

    if not documents:
        print("Aucun document chargé.")
        return

    texts = [doc["text_for_embedding"] for doc in documents]

    print(f"Nombre total de documents à encoder : {len(texts)}")
    print(f"Chargement du modèle : {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)

    print("Création des embeddings...")
    embeddings = model.encode(
        texts,
        batch_size=BATCH_SIZE,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True
    )

    print(f"Shape embeddings : {embeddings.shape}")

    embeddings_path = OUTPUT_DIR / "embeddings.npy"
    metadata_path = OUTPUT_DIR / "documents.jsonl"

    np.save(embeddings_path, embeddings)
    save_metadata(documents, metadata_path)

    print(f"[SAVE] Embeddings sauvegardés dans {embeddings_path}")
    print("Terminé avec succès.")


if __name__ == "__main__":
    main()