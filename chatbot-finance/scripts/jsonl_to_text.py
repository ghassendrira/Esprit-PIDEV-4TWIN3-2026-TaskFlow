from pathlib import Path
import json

RAW_DIR = Path("data/raw")
TEXT_DIR = Path("data/text")
TEXT_DIR.mkdir(parents=True, exist_ok=True)

def dict_to_text(obj):
    parts = []
    for k, v in obj.items():
        if isinstance(v, (dict, list)):
            v = json.dumps(v, ensure_ascii=False)
        parts.append(f"{k}: {v}")
    return ". ".join(parts)

for file_path in list(RAW_DIR.glob("*.jsonl")) + list(RAW_DIR.glob("*.json")):
    texts = []

    try:
        if file_path.suffix == ".jsonl":
            with open(file_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    obj = json.loads(line)
                    texts.append(dict_to_text(obj))
        else:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            if isinstance(data, list):
                for obj in data:
                    if isinstance(obj, dict):
                        texts.append(dict_to_text(obj))
                    else:
                        texts.append(str(obj))
            elif isinstance(data, dict):
                texts.append(dict_to_text(data))
            else:
                texts.append(str(data))

        out_file = TEXT_DIR / f"{file_path.stem}.txt"
        with open(out_file, "w", encoding="utf-8") as f:
            f.write("\n".join(texts))

        print(f"Converti: {file_path.name} -> {out_file.name}")

    except Exception as e:
        print(f"Erreur avec {file_path.name}: {e}")