import hashlib
import json
from decouple import config
from redis import Redis

REDIS_URL = config("REDIS_URL")

redis_client = Redis.from_url(
    REDIS_URL,
    decode_responses=True,
    socket_connect_timeout=5,
    socket_timeout=5,
    health_check_interval=30,
)

CACHE_TTL = 3600  # 1 hour in seconds
CACHE_PREFIX = "rag:answer:"


def normalize_question(question: str) -> str:
    return " ".join(question.strip().lower().split())

def make_cache_key(question: str) -> str:
    normalized = normalize_question(question)

    question_hash = hashlib.sha256(
        normalized.encode("utf-8")
    ).hexdigest()

    return f"{CACHE_PREFIX}{question_hash}"

def get_cached_response(question: str):
    key = make_cache_key(question)

    cached = redis_client.get(key)

    if cached is None:
        return None

    return json.loads(cached)

def set_cached_response(question: str, response: dict) -> None:
    key = make_cache_key(question)

    redis_client.setex(
        key,
        CACHE_TTL,
        json.dumps(response),
    )