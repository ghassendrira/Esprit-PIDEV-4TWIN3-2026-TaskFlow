from pathlib import Path
import pandas as pd

RAW_DIR = Path("data/raw")
TEXT_DIR = Path("data/text")
TEXT_DIR.mkdir(parents=True, exist_ok=True)

for csv_file in RAW_DIR.glob("*.csv"):
    try:
        df = pd.read_csv(csv_file)
    except Exception as e:
        print(f"Erreur lecture {csv_file.name}: {e}")
        continue

    output_lines = []

    for i, row in df.iterrows():
        parts = []
        for col in df.columns:
            value = row[col]
            if pd.notna(value):
                parts.append(f"{col}: {value}")
        text = ". ".join(parts).strip()
        if text:
            output_lines.append(text)

    out_file = TEXT_DIR / f"{csv_file.stem}.txt"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("\n".join(output_lines))

    print(f"Converti: {csv_file.name} -> {out_file.name}")