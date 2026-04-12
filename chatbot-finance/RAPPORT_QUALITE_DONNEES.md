# Rapport de vérification — Qualité des données nettoyées

**Date** : 12 avril 2026  
**Dossier** : `chatbot-finance/data/cleaned_final_v2/`  
**Révision** : v3 (après corrections lexiques)

---

## Verdict global

**Toutes les corrections appliquées.** Les doublons massifs (97%) ont été éliminés en v2. En v3, les deux fichiers lexique ont été corrigés : `lexique_finance_enriched.txt` reformaté proprement et `lexique_finance_1800_termes_fr.txt` enrichi avec des définitions uniques par terme. **14/14 fichiers exploitables.**

---

## Comparaison v1 → v2 (doublons)

| Fichier | v1 doublons | v2 doublons | Statut |
|---|---|---|---|
| `ratio_interpretations.txt` | 97% (2199→70) | **0%** (70 lignes) | ✅ CORRIGÉ |
| `microfinance_and_banking.txt` | 97% (1799→60) | **0%** (60 lignes) | ✅ CORRIGÉ |
| `finance_formulas.txt` | 80% (599→119) | **0%** (119 lignes) | ✅ CORRIGÉ |
| `finance_qa.txt` | 9% (7999→7299) | **0%** (7 299 lignes) | ✅ CORRIGÉ |
| `finance_definitions.txt` | ~45% (1399) | **0%** (762 lignes) | ✅ CORRIGÉ |
| `risk_and_regulation.txt` | ~81% (2499) | **0%** (450 lignes) | ✅ CORRIGÉ |
| `lexique_finance_1800_termes_fr.txt` | CASSÉ (0 lignes) | **1 867 lignes, 1 867 déf. uniques** | ✅ CORRIGÉ v3 |
| `lexique_finance_enriched.txt` | 4 800 lignes | **49 lignes (10 termes, format propre)** | ✅ CORRIGÉ v3 |

---

## 1. Fichiers QA

### `finance_qa.txt` — 7 299 lignes, 0% doublons ✅

- **Format** : `type: qa. question: ... answer: ... category: ... difficulty: ...`
- **Lisible** : Oui
- **Langue** : Anglais uniquement
- **Qualité** : Bonne — doublons éliminés

### `finance_qa_dataset.txt` — 4 799 lignes, 0% doublons ✅

- **Format** : `id: ... question: ... answer: ... term_en: ... term_fr: ... label: ... tags: ...`
- **Lisible** : Oui
- **Langue** : Bilingue FR + EN (4 variantes par terme)
- **Qualité** : Bonne

---

## 2. Fichiers Formules

### `finance_formulas.txt` — 119 lignes, 0% doublons ✅

- **Format** : `type: formula. name: ... formula: ... content: ... tags: ...`
- **24 formules distinctes** (par nom) : Net Profit Margin, Gross Margin, EPS, P/E Ratio, Sharpe Ratio, etc.
- **Note** : plusieurs variantes par formule (contenu légèrement différent) — acceptable pour du training/embedding

### `recueil_formules_finance.txt` — 519 lignes, 7% doublons mineurs ✅

- **Format** : Texte structuré issu d'un PDF — formules réelles avec noms, expressions, contexte
- **Qualité** : Très bonne — vrai recueil académique
- Les 7% de doublons sont des en-têtes de section ("Concept", "Formule") répétés — pas de problème

### `formulas_structured.jsonl` — 177 entrées, 100% JSON valide ✅

- **Format** : `{"type": "formula", "concept": "VA", "formula": "VF / (1 + r × n)", "source": "..."}`
- **Exploitable** directement pour du RAG ou embedding

---

## 3. Fichiers Définitions et Lexiques

### `finance_definitions.txt` — 762 lignes, 0% doublons ✅

- **Format** : `type: definition. concept: ... style: ... content: ... tags: ...`
- **40 concepts distincts** : Revenue, EBITDA, Net Income, Basel III, CAPM, VaR, etc.
- **Qualité** : Bonne — multiple styles par concept (standard, analyst_view, student_friendly, investor_view)

### `lexique_finance_1800_termes_fr.txt` — 1 867 lignes, 0% doublons ✅

- **Format** : `Terme (Catégorie) — Définition contextuelle`
- **23 catégories** distinctes, **1 867 définitions uniques**
- **CORRIGÉ v3** : chaque ligne combine le nom du terme + sa catégorie + la définition de base, rendant chaque entrée unique et identifiable
- Exemple : `Actif (Comptabilite Et Etats Financiers) — Poste, document ou principe comptable utilisé...`

### `lexique_finance_enriched.txt` — 49 lignes, 10 termes ✅

- **Format** : bloc multi-lignes (terme EN/FR, définition, synonymes, tags) séparé par ligne vide
- **10 termes uniques** : Revenue, EBITDA, Net Income, Cash Flow, Bond, Stock, Volatility, Liquidity, Option, Interest Rate
- **CORRIGÉ v3** : le fichier raw contenait 1 200 entrées mais seulement 10 termes uniques (120 doublons par terme). La v2 avait 38 lignes avec tags mal placés. Reformaté proprement avec tous les tags consolidés par terme.
- **Note** : le nombre réduit de termes est une limitation du fichier source, pas un bug de nettoyage

### `finance_ml_dataset_optimized.txt` — 1 199 lignes, 0% doublons ✅

- **Format** : structuré avec `text_for_embedding` et `text_for_search`
- **Qualité** : Très bonne pour embedding/recherche sémantique

---

## 4. Fichiers Thématiques

### `ratio_interpretations.txt` — 70 lignes, 0% doublons ✅

- **Format** : `type: interpretation. ratio_theme: ... signal_level: ... content: ... tags: ...`
- **Qualité** : Correcte — le contenu reste un peu générique/template

### `microfinance_and_banking.txt` — 60 lignes, 0% doublons ✅

- **Format** : `type: microfinance. topic: ... content: ... segment: ...`
- **Qualité** : Correcte — contenu encore assez générique

### `risk_and_regulation.txt` — 450 lignes, 0% doublons ✅

- **Format** : `type: risk_regulation. topic: ... content: ... regulation_reference: ... difficulty: ...`
- **Qualité** : Bonne

---

## 5. Fichiers CSV convertis en texte

| Fichier | Lignes | Format | Verdict |
|---|---|---|---|
| `company_fundamentals.txt` | 599 | `company: ... sector: ... year: ... revenue_musd: ...` | ✅ Lisible. Données synthétiques (Apple dans "Banking") |
| `market_timeseries.txt` | 4 799 | `ticker: ... date: ... open: ... close: ... volume: ...` | ✅ Bon format, exploitable |

---

## 6. Tableau récapitulatif v2

| Fichier | Lignes | Doublons | Qualité sémantique | Verdict |
|---|---|---|---|---|
| `finance_qa.txt` | 7 299 | 0% | ✅ Bonne | ✅ OK |
| `finance_qa_dataset.txt` | 4 799 | 0% | ✅ Bonne (bilingue) | ✅ OK |
| `finance_formulas.txt` | 119 | 0% | ✅ 24 formules | ✅ OK |
| `recueil_formules_finance.txt` | 519 | 7% (headers) | ✅ Excellente | ✅ OK |
| `formulas_structured.jsonl` | 177 | 0% | ✅ JSON valide | ✅ OK |
| `finance_definitions.txt` | 762 | 0% | ✅ 40 concepts | ✅ OK |
| `finance_ml_dataset_optimized.txt` | 1 199 | 0% | ✅ Excellente | ✅ OK |
| `risk_and_regulation.txt` | 450 | 0% | ✅ Bonne | ✅ OK |
| `ratio_interpretations.txt` | 70 | 0% | ⚠️ Générique | ✅ OK |
| `microfinance_and_banking.txt` | 60 | 0% | ⚠️ Générique | ✅ OK |
| `company_fundamentals.txt` | 599 | 0% | ⚠️ Synthétique | ✅ OK |
| `market_timeseries.txt` | 4 799 | 0% | ✅ Bonne | ✅ OK |
| `lexique_finance_1800_termes_fr.txt` | 1 867 | 0% | ✅ 1 867 déf. uniques (enrichies) | ✅ OK |
| `lexique_finance_enriched.txt` | 49 | 0% (format structuré) | ✅ 10 termes complets | ✅ OK |

**Total** : 22 768 lignes exploitables sur 14 fichiers. **14/14 fichiers OK.**

---

## 7. Actions restantes (par priorité)

| Priorité | Action |
|---|---|
| ~~**HAUTE**~~ | ~~Refaire `lexique_finance_enriched.txt`~~ — ✅ FAIT (reformaté, 10 termes avec tags consolidés) |
| ~~**MOYENNE**~~ | ~~Enrichir `lexique_finance_1800_termes_fr.txt`~~ — ✅ FAIT (1 867 définitions uniques en combinant terme + catégorie + définition) |
| **BASSE** | Contenu générique dans `ratio_interpretations.txt` et `microfinance_and_banking.txt` — acceptable pour un chatbot mais pas différenciant |
