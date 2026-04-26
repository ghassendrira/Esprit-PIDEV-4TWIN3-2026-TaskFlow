import json
import logging
import os
import re
import unicodedata
from enum import Enum
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np
import httpx
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

app = FastAPI(title="Finance Chatbot API")

logger = logging.getLogger("finance-chatbot")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Config ---
BASE_DIR = Path(__file__).resolve().parents[1]
EMBEDDINGS_DIR = BASE_DIR / "data" / "embeddings"

QDRANT_URL = os.getenv(
     "QDRANT_URL",
     "https://3a4bb531-ece8-4692-be46-503e6d16a10a.sa-east-1-0.aws.cloud.qdrant.io:6333",
)
QDRANT_API_KEY = os.getenv(
     "QDRANT_API_KEY",
     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6MzJmYmMwMGMtZDAyZC00NTBhLWFlMTEtNjcyZWE0Yjk2OWUxIn0.BeDoLbbwDe2pgxd4bf6h5GaB1KlNXU3LvzYHPyLhQys",
)
COLLECTION = os.getenv("QDRANT_COLLECTION", "finance_chatbot")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
EMBED_MODEL = os.getenv("EMBED_MODEL", "paraphrase-multilingual-MiniLM-L12-v2")
TOP_K = int(os.getenv("TOP_K", "5"))
GATEWAY_URL = os.getenv("GATEWAY_URL", "http://localhost:3000")

# --- Init at startup ---
qdrant: QdrantClient = None
embedder: SentenceTransformer = None
local_documents: list[dict] = []
local_embeddings: np.ndarray | None = None
startup_errors: list[str] = []


# ─────────────────────────────────────────────
# TOOLS SYSTEM — Chatbot calls backend APIs
# ─────────────────────────────────────────────

TOOLS: dict[str, dict[str, Any]] = {}


def normalize_text(text: str) -> str:
    lowered = text.lower()
    return "".join(
        ch for ch in unicodedata.normalize("NFKD", lowered) if not unicodedata.combining(ch)
    )


def contains_term(text: str, term: str) -> bool:
    if not term:
        return False
    if " " in term:
        return term in text
    if len(term) <= 3:
        return re.search(rf"\b{re.escape(term)}\b", text) is not None
    # Prefix-friendly match for stems like "rentabil".
    return re.search(rf"\b{re.escape(term)}\w*\b", text) is not None


class Intent(str, Enum):
    FINANCE_GENERAL = "FINANCE_GENERAL"
    CLIENT_DATA = "CLIENT_DATA"
    INVOICE_DATA = "INVOICE_DATA"
    PAYMENT_DATA = "PAYMENT_DATA"
    BUSINESS_ANALYTICS = "BUSINESS_ANALYTICS"
    MIXED = "MIXED"
    UNKNOWN = "UNKNOWN"


def register_tool(name: str, description: str, keywords: list[str], gateway_path: str):
    """Register a tool that calls a gateway endpoint."""
    TOOLS[name] = {
        "description": description,
        "keywords": [k.lower() for k in keywords],
        "gateway_path": gateway_path,
    }


# Register all available tools
register_tool(
    "get_business_info",
    "Informations générales sur le business (nom, devise, taux de taxe, catégorie)",
    ["business", "entreprise", "société", "info", "informations", "profil", "detail"],
    "/ai/tools/business",
)
register_tool(
    "get_invoices",
    "Liste des factures du business (statut, montant, dates, client)",
    ["facture", "invoice", "paiement", "paid", "impay", "overdue", "dû", "status", "statut", "facturation"],
    "/ai/tools/invoices",
)
register_tool(
    "get_expenses",
    "Liste des dépenses du business (montants, catégories, statuts)",
    ["dépense", "expense", "budget", "categorie", "category", "depense", "charge"],
    "/ai/tools/expenses",
)
register_tool(
    "get_clients",
    "Liste des clients du business (nom, email, téléphone)",
    ["client", "customer", "clientèle", "acheteur"],
    "/ai/tools/clients",
)


async def call_tool(tool_name: str, business_id: str, token: str | None = None) -> dict:
    """Call a registered tool via the API gateway."""
    tool = TOOLS.get(tool_name)
    if not tool:
        raise ValueError(f"Unknown tool: {tool_name}")

    url = f"{GATEWAY_URL}{tool['gateway_path']}?businessId={business_id}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            return {
                "tool": tool_name,
                "description": tool["description"],
                "data": data,
                "count": len(data) if isinstance(data, list) else 0,
            }
        except Exception as error:
            return {
                "tool": tool_name,
                "description": tool["description"],
                "error": str(error),
                "count": 0,
            }


def determine_tools(message: str) -> list[str]:
    """Decide which tools to call based on message keywords."""
    message_lower = normalize_text(message)
    matched = []
    for name, tool in TOOLS.items():
        for kw in tool["keywords"]:
            if contains_term(message_lower, normalize_text(kw)):
                matched.append(name)
                break
    return matched if matched else list(TOOLS.keys())


def classify_intent(message: str) -> Intent:
    q = normalize_text(message)

    has_finance = any(
        contains_term(q, k)
        for k in [
            "van", "tri", "capm", "ebitda", "ratio", "duration", "rentabil", "finance", "sharpe",
            "wacc", "cash flow", "actif", "passif", "bfr", "amortissement",
        ]
    )
    has_client = any(contains_term(q, k) for k in ["client", "customer", "acheteur", "contact"])
    has_invoice = any(contains_term(q, k) for k in ["facture", "invoice", "impay", "unpaid", "retard", "overdue"])
    has_payment = any(contains_term(q, k) for k in ["paiement", "payment", "encaisse", "en attente", "pending"])
    has_analytics = any(contains_term(q, k) for k in ["chiffre d'affaires", "ca", "rentable", "top", "stat", "analyse"])

    data_hits = sum([has_client, has_invoice, has_payment, has_analytics])

    if has_finance and data_hits:
        return Intent.MIXED
    if has_invoice:
        return Intent.INVOICE_DATA
    if has_payment:
        return Intent.PAYMENT_DATA
    if has_client:
        return Intent.CLIENT_DATA
    if has_analytics:
        return Intent.BUSINESS_ANALYTICS
    if has_finance:
        return Intent.FINANCE_GENERAL
    return Intent.UNKNOWN


def tools_for_intent(intent: Intent, message: str) -> list[str]:
    q = normalize_text(message)
    # If user mentions both invoice/payment AND a client name → fetch both
    has_invoice_kw = any(contains_term(q, k) for k in ["facture", "invoice", "impay", "unpaid", "retard", "overdue", "paiement", "payment"])
    has_client_kw = any(contains_term(q, k) for k in ["client", "customer", "acheteur", "contact"])
    if has_invoice_kw and has_client_kw:
        return ["get_invoices", "get_clients"]
    if intent == Intent.CLIENT_DATA:
        return ["get_clients"]
    if intent == Intent.INVOICE_DATA:
        return ["get_invoices", "get_clients"]
    if intent == Intent.PAYMENT_DATA:
        return ["get_invoices", "get_clients"]
    if intent in {Intent.BUSINESS_ANALYTICS, Intent.MIXED}:
        return ["get_business_info", "get_invoices", "get_expenses", "get_clients"]
    if intent == Intent.UNKNOWN:
        # "informations sur le business" → fetch everything
        if any(contains_term(q, k) for k in ["business", "entreprise", "societe", "tout", "informations", "info"]):
            return ["get_business_info", "get_invoices", "get_expenses", "get_clients"]
        return determine_tools(message)
    return []


def retrieve_context_lexical(query: str, top_k: int = TOP_K) -> list[dict]:
    # Fallback retrieval when embedding model is unavailable.
    terms = [t for t in re.findall(r"\w+", query.lower()) if len(t) > 2]
    if not terms or not local_documents:
        return []

    scored: list[tuple[float, dict]] = []
    for doc in local_documents:
        text = (doc.get("text_for_embedding", "") or "").lower()
        if not text:
            continue
        score = 0.0
        for term in terms:
            if term in text:
                score += 1.0
        if score > 0:
            scored.append((score / max(len(terms), 1), doc))

    scored.sort(key=lambda x: x[0], reverse=True)
    contexts = []
    for score, doc in scored[:top_k]:
        contexts.append(
            {
                "text": doc.get("text_for_embedding", ""),
                "source": doc.get("source_file", doc.get("metadata", {}).get("source_file", "")),
                "score": round(float(score), 4),
            }
        )
    return contexts


# ─────────────────────────────────────────────
# RAG PIPELINE (unchanged)
# ─────────────────────────────────────────────

@app.on_event("startup")
def startup():
    global qdrant, embedder, local_documents, local_embeddings

    try:
         # Use the already downloaded model first. This avoids startup failures when
         # Hugging Face is slow/unreachable, while still allowing online download if needed.
        embedder = SentenceTransformer(EMBED_MODEL, local_files_only=True)
        print(f"Embedder local: {EMBED_MODEL}")
    except Exception as local_error:
        try:
            embedder = SentenceTransformer(EMBED_MODEL)
            print(f"Embedder downloaded: {EMBED_MODEL}")
        except Exception as error:
            startup_errors.append(f"Embedder unavailable: {error}")
            print(f"Error Embedder unavailable: {error} (local error: {local_error})")

    try:
        docs_path = EMBEDDINGS_DIR / "documents.jsonl"
        embeddings_path = EMBEDDINGS_DIR / "embeddings.npy"
        with docs_path.open("r", encoding="utf-8") as f:
            local_documents = [json.loads(line) for line in f if line.strip()]
        local_embeddings = np.load(embeddings_path)
        print(f"Local vector store: {len(local_documents)} documents")
    except Exception as error:
        startup_errors.append(f"Local embeddings unavailable: {error}")
        print(f"Error Local embeddings unavailable: {error}")

    try:
        qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=10)
        count = qdrant.get_collection(COLLECTION).points_count
        print(f"Qdrant: {count} points")
    except Exception as error:
        qdrant = None
        startup_errors.append(f"Qdrant unavailable: {error}")
        print(f"Error Qdrant unavailable, local search will be used: {error}")


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = Field(default_factory=list)


class ChatRequestWithDb(BaseModel):
    message: str
    history: list[dict] = Field(default_factory=list)
    businessId: str
    tenantId: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[dict]


def retrieve_context(query: str, top_k: int = TOP_K) -> list[dict]:
    if embedder is None:
        logger.warning("Embedding model unavailable, using lexical fallback retrieval")
        contexts = retrieve_context_lexical(query, top_k)
        if contexts:
            return contexts
        raise RuntimeError("Embedding model is not loaded")

    query_vec = embedder.encode(query, normalize_embeddings=True).tolist()

    if qdrant is not None:
        try:
            results = qdrant.query_points(
                collection_name=COLLECTION,
                query=query_vec,
                limit=top_k,
             )
            return [
                 {
                     "text": r.payload.get("text", ""),
                     "source": r.payload.get("source_file", ""),
                     "score": round(r.score, 4),
                 }
                for r in results.points
             ]
        except Exception as error:
            print(f"Qdrant query failed, falling back to local search: {error}")

    if local_embeddings is None or not local_documents:
        contexts = retrieve_context_lexical(query, top_k)
        if contexts:
            return contexts
        raise RuntimeError("No vector store is available")

    query_array = np.asarray(query_vec, dtype=np.float32)
    scores = local_embeddings @ query_array
    best_indexes = np.argsort(scores)[-top_k:][::-1]

    contexts = []
    for idx in best_indexes:
        doc = local_documents[int(idx)]
        contexts.append({
             "text": doc.get("text_for_embedding", ""),
             "source": doc.get("source_file", doc.get("metadata", {}).get("source_file", "")),
             "score": round(float(scores[int(idx)]), 4),
         })
    return contexts


def build_prompt(question: str, contexts: list[dict], history: list[dict]) -> str:
    context_block = "\n\n".join(
        f"[Source: {c['source']} | score: {c['score']}]\n{c['text']}"
        for c in contexts
     )

    history_block = ""
    for msg in history[-6:]:   # Keep last 6 messages for context
        role = msg.get("role", "user")
        content = msg.get("content", "")
        history_block += f"{role.capitalize()}: {content}\n"

    return f"""
# RÔLE
Tu es un expert financier senior (niveau CFO), spécialisé en :
- analyse financière
- gestion des risques
- cash flow & rentabilité
- finance opérationnelle des PME

Tu réponds comme un conseiller stratégique, clair et fiable.

# OBJECTIF
Fournir une réponse exacte, exploitable, sans hallucination et adaptée au contexte métier.

# CONTEXTE
{context_block}

# HISTORIQUE
{history_block}

# QUESTION
{question}

# ANALYSE INTERNE (NE PAS AFFICHER)
Déterminer :
- Type = GENERAL / CLIENT / MIXTE
- Intention = INFORMATION / ANALYSE / RECOMMANDATION / CALCUL

Règles :
- GENERAL → connaissance finance (RAG / Qdrant)
- CLIENT → données spécifiques (Postgres)
- MIXTE → combiner intelligemment

# RÈGLES STRICTES
- Utiliser UNIQUEMENT le CONTEXTE
- Ne JAMAIS inventer
- Si info absente → dire clairement que l'information n'est pas disponible
- Prioriser les données CLIENT sur les données générales
- Vérifier la cohérence des chiffres et des dates
- Refuser toute contradiction

# COMPORTEMENT
- Répondre de manière fluide, naturelle et professionnelle
- Ne pas utiliser de titres ou de sections visibles
- Ne pas afficher les étapes d’analyse
- Donner directement une réponse claire avec explication si nécessaire
- Ajouter une recommandation seulement si pertinente
- Mentionner les limites de manière naturelle dans la réponse

# INTERDICTIONS
Inventer des données  
Utiliser des connaissances hors contexte  
Répondre de manière vague  
Ignorer les données clients  

# RÉPONSE
"""

async def call_ollama(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                 "model": OLLAMA_MODEL,
                 "prompt": prompt,
                 "stream": False,
                 "options": {"temperature": 0.3, "num_predict": 1024},
             },
         )
        response.raise_for_status()
        return response.json()["response"]


def build_extract_answer(question: str, contexts: list[dict]) -> str:
    if not contexts:
        return (
             "Je n'ai pas trouvé d'information pertinente dans la base de connaissances "
             "pour répondre à cette question."
         )

    snippets = []
    for context in contexts[:3]:
        text = context["text"].strip()
        if len(text) > 700:
            text = text[:700].rsplit(" ", 1)[0] + "..."
        snippets.append(f"- {text}")

    return (
         "Le modèle IA local n'est pas disponible pour formuler une réponse complète, "
         "mais voici les informations les plus pertinentes trouvées dans la base finance "
        f"pour votre question: {question}\n\n" + "\n".join(snippets)
     )


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    intent = classify_intent(req.message)
    logger.info("chat request received intent=%s message=%s", intent.value, req.message[:120])
    try:
        contexts = retrieve_context(req.message)
    except Exception as error:
        logger.exception("RAG retrieval failed")
        raise HTTPException(
            status_code=503,
            detail=f"Le moteur de recherche du chatbot n'est pas prêt: {error}",
         ) from error

    try:
        prompt = build_prompt(req.message, contexts, req.history)
        answer = await call_ollama(prompt)
    except Exception as error:
        logger.warning("Ollama unavailable, returning extractive answer: %s", error)
        answer = build_extract_answer(req.message, contexts)

    return ChatResponse(answer=answer.strip(), sources=contexts)


# ─────────────────────────────────────────────
# NEW: /ai/chat-with-db — Chatbot with real data
# ─────────────────────────────────────────────

@app.post("/ai/chat-with-db", response_model=ChatResponse)
async def chat_with_db(req: ChatRequestWithDb, request: Request):
    """Chat endpoint that combines RAG with real business data from tools."""
    business_id = req.businessId
    tenant_id = req.tenantId
    message = req.message
    intent = classify_intent(message)

    logger.info(
        "chat-with-db request intent=%s tenantId=%s businessId=%s message=%s",
        intent.value,
        tenant_id,
        business_id,
        message[:120],
    )

    data_intents = {
        Intent.CLIENT_DATA,
        Intent.INVOICE_DATA,
        Intent.PAYMENT_DATA,
        Intent.BUSINESS_ANALYTICS,
        Intent.MIXED,
    }

    if intent in data_intents and not business_id:
        raise HTTPException(
            status_code=400,
            detail="businessId est requis pour les questions sur les données métier.",
        )

    should_use_tools = intent in data_intents or intent == Intent.UNKNOWN
    should_use_rag = intent in {Intent.FINANCE_GENERAL, Intent.MIXED, Intent.BUSINESS_ANALYTICS, Intent.UNKNOWN}

    # 1. Determine which tools to call based on intent + keywords
    tool_names = tools_for_intent(intent, message) if should_use_tools else []

    # 2. Call the tools in parallel
    tool_results = {}
    auth_header = request.headers.get("authorization")

    async with httpx.AsyncClient(timeout=30) as client:
        tasks = []
        for tool_name in tool_names:
            tool = TOOLS[tool_name]
            url = f"{GATEWAY_URL}{tool['gateway_path']}?businessId={business_id}"
            headers = {"Content-Type": "application/json"}
            if auth_header:
                headers["Authorization"] = auth_header
            if tenant_id:
                headers["X-Tenant-Id"] = tenant_id
            tasks.append((tool_name, client.get(url, headers=headers)))

        for tool_name, task in tasks:
            try:
                resp = await task
                resp.raise_for_status()
                data = resp.json()
                tool_results[tool_name] = {
                    "description": TOOLS[tool_name]["description"],
                    "count": len(data) if isinstance(data, list) else 0,
                    "data": data,
                }
            except Exception as error:
                logger.warning("Tool call failed tool=%s error=%s", tool_name, error)
                tool_results[tool_name] = {
                    "description": TOOLS[tool_name]["description"],
                    "error": str(error),
                    "count": 0,
                    "data": None,
                }

    # 3. Format tool results for the prompt — structured summaries, not raw JSON dumps

    # Build clientId → clientName lookup for invoice enrichment
    client_map: dict[str, str] = {}
    clients_result = tool_results.get("get_clients")
    if clients_result and isinstance(clients_result.get("data"), list):
        for cli in clients_result["data"]:
            cid = cli.get("id", "")
            cname = cli.get("name", "")
            if cid and cname:
                client_map[cid] = cname

    tool_block = ""
    if tool_results:
        tool_block = "=== DONNÉES RÉELLES DU BUSINESS ===\n"
        for tool_name, result in tool_results.items():
            tool_block += f"\n--- {result['description']} ---\n"
            data = result.get("data")
            if result.get("error"):
                tool_block += f"[Erreur: {result['error']}]\n"
            elif isinstance(data, dict):
                # Single object (e.g. business info)
                for k, v in data.items():
                    if v is not None and v != "":
                        tool_block += f"  {k}: {v}\n"
            elif isinstance(data, list):
                count = result["count"]
                tool_block += f"Nombre total: {count}\n"
                if tool_name == "get_invoices":
                    paid = [i for i in data if str(i.get("status", "")).upper() == "PAID"]
                    unpaid = [i for i in data if str(i.get("status", "")).upper() in ("UNPAID", "PENDING", "OVERDUE")]
                    total_amount = sum(float(i.get("totalAmount", i.get("amount", 0)) or 0) for i in data)
                    paid_amount = sum(float(i.get("totalAmount", i.get("amount", 0)) or 0) for i in paid)
                    tool_block += f"Montant total facturé: {total_amount:.2f}\n"
                    tool_block += f"Factures payées: {len(paid)} (montant: {paid_amount:.2f})\n"
                    tool_block += f"Factures impayées/en attente: {len(unpaid)}\n"
                    tool_block += "Toutes les factures (num | client | statut | montant | date):\n"
                    for inv in data:
                        num = inv.get("invoiceNumber", inv.get("id", "?"))
                        status = inv.get("status", "?")
                        amt = inv.get("totalAmount", inv.get("amount", "?"))
                        date = str(inv.get("issueDate", inv.get("createdAt", "")))[:10]
                        cid = inv.get("clientId", "")
                        client_name = client_map.get(cid, cid[:8] if cid else "Inconnu")
                        tool_block += f"  - {num} | {client_name} | {status} | {amt} | {date}\n"
                elif tool_name == "get_expenses":
                    total_exp = sum(float(i.get("amount", 0) or 0) for i in data)
                    tool_block += f"Montant total des dépenses: {total_exp:.2f}\n"
                    tool_block += "Dernières dépenses (max 15):\n"
                    for exp in data[:15]:
                        desc = exp.get("description", exp.get("title", "?"))
                        amt = exp.get("amount", "?")
                        cat = exp.get("category", exp.get("categoryName", ""))
                        date = str(exp.get("date", exp.get("createdAt", "")))[:10]
                        tool_block += f"  - {desc} | {cat} | {amt} | {date}\n"
                elif tool_name == "get_clients":
                    tool_block += f"Nombre total de clients: {count}\n"
                    tool_block += "Liste des clients (max 30):\n"
                    for cli in data[:30]:
                        name = cli.get("name", "?")
                        email = cli.get("email", "")
                        phone = cli.get("phone", "")
                        address = cli.get("address", "")
                        tax = cli.get("taxNumber", "")
                        line = f"  - {name} | {email} | {phone}"
                        if address:
                            line += f" | {address}"
                        if tax:
                            line += f" | TVA:{tax}"
                        tool_block += line + "\n"
                else:
                    for item in data[:20]:
                        tool_block += f"  {json.dumps(item, default=str, ensure_ascii=False)}\n"
            else:
                tool_block += "[Pas de données]\n"
    else:
        tool_block = "\n=== AUCUN OUTIL PERTINENT DÉTECTÉ ===\n"

    tool_errors = [str(result.get("error", "")) for result in tool_results.values() if result.get("error")]
    if should_use_tools and tool_names and len(tool_errors) == len(tool_names):
        denied = any("401" in e or "403" in e for e in tool_errors)
        if denied:
            return ChatResponse(
                answer=(
                    "Accès refusé aux données métier demandées. "
                    "Vérifiez vos droits et le tenant actif."
                ),
                sources=[],
            )
        return ChatResponse(
            answer=(
                "Impossible d'accéder aux données métier pour le moment "
                "(service de données indisponible ou paramètres invalides)."
            ),
            sources=[],
        )

    # 4. Get RAG context (always, for financial knowledge)
    try:
        rag_contexts = retrieve_context(message) if should_use_rag else []
    except Exception as error:
        logger.warning("RAG retrieval failed for chat-with-db: %s", error)
        rag_contexts = []

    # 5. Build enriched prompt with both RAG and tool data
    context_block = "\n\n".join(
        f"[Source: {c['source']} | score: {c['score']}]\n{c['text']}"
        for c in rag_contexts
     )

    history_block = ""
    for msg in req.history[-6:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        history_block += f"{role.capitalize()}: {content}\n"

    enriched_prompt = f"""
# RÔLE
Tu es un expert financier senior (niveau CFO), spécialisé en analyse financière, gestion de trésorerie et performance des PME.

# OBJECTIF
Fournir une réponse fiable, précise et directement exploitable à partir des données réelles fournies.

# CONTEXTE (DONNÉES RÉELLES UNIQUEMENT)
{tool_block}

# HISTORIQUE (à utiliser uniquement si pertinent)
{history_block}

# QUESTION
{message}

# ANALYSE INTERNE (NE PAS AFFICHER)
- Identifier si la question est :
  • INFORMATION (extraction simple)
  • ANALYSE (interprétation)
  • RECOMMANDATION (conseil)
  • CALCUL (opération numérique)
- Prioriser les données les plus précises et récentes
- Vérifier la cohérence des chiffres avant réponse

# RÈGLES STRICTES
- Utiliser EXCLUSIVEMENT les données du CONTEXTE
- Ne JAMAIS inventer de valeurs
- Si une information est absente → dire clairement qu’elle n’est pas disponible
- Toujours utiliser des données concrètes (montants, noms, dates, quantités)
- Ne jamais généraliser sans preuve dans les données

# COMPORTEMENT DE RÉPONSE
- Répondre en français uniquement
- Réponse fluide et naturelle (pas de titres, pas de sections visibles)
- Aller droit au point
- Structurer avec des phrases claires ou listes si nécessaire
- Intégrer directement les chiffres dans la réponse
- Donner une interprétation si utile (ex : hausse, baisse, risque, anomalie)
- Ajouter une recommandation seulement si pertinente
- Mentionner les limites de façon naturelle

# INTERDICTIONS
- Inventer des données
- Utiliser des connaissances externes
- Faire des réponses vagues
- Répéter inutilement le contexte
- Créer des listes génériques non présentes dans les données

# RÉPONSE
"""

    # 6. Call Ollama with the enriched prompt
    try:
        answer = await call_ollama(enriched_prompt)
    except Exception as error:
        logger.warning("Ollama unavailable for chat-with-db, falling back: %s", error)
        # Fallback: return RAG context only
        if rag_contexts:
            answer = build_extract_answer(message, rag_contexts)
        else:
            answer = (
                "Je n'ai pas pu traiter votre question. "
                "Vérifiez que le serveur IA est démarré."
            )

    # 7. Return with combined sources (RAG + tools)
    sources = []
    for ctx in rag_contexts:
        sources.append(ctx)
    for tool_name, result in tool_results.items():
        if result.get("data") and isinstance(result["data"], list):
            sources.append({
                "text": f"[Outil: {tool_name}] {result['count']} éléments retournés",
                "source": "business_data",
                "score": 1.0,
            })

    logger.info(
        "chat-with-db response intent=%s tools=%d rag_sources=%d returned_sources=%d",
        intent.value,
        len(tool_names),
        len(rag_contexts),
        len(sources),
    )

    return ChatResponse(answer=answer.strip(), sources=sources)


@app.get("/health")
def health():
    qdrant_points = None
    if qdrant is not None:
        try:
            qdrant_points = qdrant.get_collection(COLLECTION).points_count
        except Exception as error:
            startup_errors.append(f"Qdrant health failed: {error}")

    ready = embedder is not None and (qdrant_points is not None or local_embeddings is not None)
    return {
         "status": "ok" if ready else "degraded",
         "ready": ready,
         "model": OLLAMA_MODEL,
         "embed_model": EMBED_MODEL,
         "qdrant_points": qdrant_points,
         "local_documents": len(local_documents),
         "tools_registered": len(TOOLS),
         "errors": startup_errors[-5:],
     }
