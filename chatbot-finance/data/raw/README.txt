# Finance Dataset Pack for RAG

This pack contains synthetic and educational finance data generated to help train, index, and test a finance chatbot.

## Files
- finance_definitions.jsonl
- finance_formulas.jsonl
- finance_qa.jsonl
- company_fundamentals.csv
- ratio_interpretations.jsonl
- risk_and_regulation.jsonl
- microfinance_and_banking.jsonl
- market_timeseries.csv

## Notes
- These datasets are synthetic / generated for development and evaluation.
- They are useful for:
  - glossary / concept retrieval
  - formula retrieval
  - company comparison prompts
  - risk explanations
  - microfinance and banking questions
  - simple market-data pattern tests
- Recommended ingestion:
  1. Convert CSV rows to text chunks
  2. Keep JSONL entries as standalone documents
  3. Add metadata tags to improve filtering
  4. Re-rank by category + entity

## Suggested chunking
- Definitions/formulas: 1 entry = 1 chunk
- Q&A: 1 Q&A pair = 1 chunk
- Company fundamentals: chunk by company-year
- Market time series: chunk by ticker-year or ticker-quarter