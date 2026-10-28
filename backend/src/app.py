import logging
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


from src.rag import get_answer_and_docs
from src.qdrant import upload_website_to_collection
from src.cache import get_cached_response, set_cached_response

# 1. Configure the logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

MAX_QUESTION_LENGTH = 500


app = FastAPI(
    title="RAG API",
    description= "A Simple RAG API",
    version= "0.1"
)

origins = [
    "http://localhost:3000",
     "http://localhost:5173",
     "http://localhost:5174",
     "https://frontend-eta-six-36.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    # allow those urls to have access to the endpoints
    allow_origins=origins,
    # allow all http methods like POST, GET, DELETE...
    allow_methods=["*"]
)

class ChatRequest(BaseModel):
    message: str


@app.post("/chat", description="Chat with the RAG API")
def chat(request: ChatRequest):
    message = request.message.strip()

    if not message:
        return JSONResponse(content={"error": "Message cannot be empty."}, status_code=400)

    if len(message) > MAX_QUESTION_LENGTH:
        return JSONResponse(content={"error": "Message is too long."}, status_code=400)

    try:
        cached_response = get_cached_response(message)
        if cached_response is not None:
            return JSONResponse(content=cached_response, status_code=200)
    except Exception as e:
        logger.error(f"Cache read failed: {e}")
        # print(f"Cache read failed: {e}")

    response = get_answer_and_docs(message)
    response_content = {
        "question": message,
        "answer": response["answer"],
        "documents": [doc.dict() for doc in response["context"]]
    }

    cacheable_response = jsonable_encoder(response_content)

    try:
        set_cached_response(message, cacheable_response)
    except Exception as e:
        logger.error(f"Cache write failed: {e}")
        # print(f"Cache write failed: {e}")

    return JSONResponse(content=cacheable_response, status_code=200)

@app.post("/indexing", description="Index a website through this endpoint")
def indexing(url:str):
    try:
        response = upload_website_to_collection(url)
        return JSONResponse(content={"response": response}, status_code=200)
    except Exception as e:
        logger.error(f"Indexing failed for URL {url}: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=400)