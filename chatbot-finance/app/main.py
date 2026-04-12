from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import httpx
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

app = FastAPI(title="Finance Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Config ---
QDRANT_URL = "https://3a4bb531-ece8-4692-be46-503e6d16a10a.sa-east-1-0.aws.cloud.qdrant.io:6333"
QDRANT_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6MzJmYmMwMGMtZDAyZC00NTBhLWFlMTEtNjcyZWE0Yjk2OWUxIn0.BeDoLbbwDe2pgxd4bf6h5GaB1KlNXU3LvzYHPyLhQys"
COLLECTION = "finance_chatbot"
OLLAMA_URL = "http://localhost:11434"
OLLAMA_MODEL = "llama3"
EMBED_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"
TOP_K = 5

# --- Init at startup ---
qdrant: QdrantClient = None
embedder: SentenceTransformer = None


@app.on_event("startup")
def startup():
    global qdrant, embedder
    qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=30)
    embedder = SentenceTransformer(EMBED_MODEL)
    print(f"✅ Qdrant: {qdrant.get_collection(COLLECTION).points_count} points")
    print(f"✅ Embedder: {EMBED_MODEL}")


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


class ChatResponse(BaseModel):
    answer: str
    sources: list[dict]


def retrieve_context(query: str, top_k: int = TOP_K) -> list[dict]:
    query_vec = embedder.encode(query, normalize_embeddings=True).tolist()
    results = qdrant.query_points(
        collection_name=COLLECTION,
        query=query_vec,
        limit=top_k,
    )
    contexts = []
    for r in results.points:
        contexts.append({
            "text": r.payload.get("text", ""),
            "source": r.payload.get("source_file", ""),
            "score": round(r.score, 4),
        })
    return contexts


def build_prompt(question: str, contexts: list[dict], history: list[dict]) -> str:
    context_block = "\n\n".join(
        f"[Source: {c['source']} | score: {c['score']}]\n{c['text']}"
        for c in contexts
    )

    history_block = ""
    for msg in history[-6:]:  # Keep last 6 messages for context
        role = msg.get("role", "user")
        content = msg.get("content", "")
        history_block += f"{role.capitalize()}: {content}\n"

    return f"""Tu es un assistant financier expert. Réponds en français de manière claire et précise.
Utilise UNIQUEMENT les informations du contexte ci-dessous pour répondre.
Si l'information n'est pas dans le contexte, dis-le honnêtement.

=== CONTEXTE ===
{context_block}

=== HISTORIQUE ===
{history_block}

=== QUESTION ===
{question}

=== RÉPONSE ==="""


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


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    contexts = retrieve_context(req.message)
    prompt = build_prompt(req.message, contexts, req.history)
    answer = await call_ollama(prompt)
    return ChatResponse(answer=answer.strip(), sources=contexts)


@app.get("/health")
def health():
    count = qdrant.get_collection(COLLECTION).points_count
    return {"status": "ok", "qdrant_points": count, "model": OLLAMA_MODEL}
