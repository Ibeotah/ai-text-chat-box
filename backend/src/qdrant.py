import logging
import os

os.environ["USER_AGENT"] = "FastAPI-RAG-App/1.0"

import time
import warnings
from decouple import config
from qdrant_client import QdrantClient, models
from langchain_qdrant import QdrantVectorStore
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
# from langchain_community.document_loaders import WebBaseLoader
from langchain_community.document_loaders import SeleniumURLLoader

# 1. Environment & Warnings Configuration
warnings.filterwarnings("ignore", category=DeprecationWarning)

# Configure logging format so it outputs nicely to your server console
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# 2. Secure Configuration & Validation
QDRANT_API_KEY = config("QDRANT_API_KEY", default=None)
QDRANT_URL = config("QDRANT_URL", default=None)
GEMINI_API_KEY = config("GEMINI_API_KEY", default=None)
COLLECTION_NAME = "Websites_Gemini"

if not all([QDRANT_API_KEY, QDRANT_URL, GEMINI_API_KEY]):
    raise ValueError("Missing one or more required environment variables (QDRANT_API_KEY, QDRANT_URL, GEMINI_API_KEY). Check your .env file.")

# 3. Client & Collection Setup
client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

def init_collection(name: str) -> None:
    """Ensures Qdrant collection exists with vector size set to 1536 for Gemini embedding-001."""
    if not client.collection_exists(collection_name=name):
        client.create_collection(
            collection_name=name,
            vectors_config=models.VectorParams(size=1536, distance=models.Distance.COSINE)
        )
        logger.info(f"Collection '%s' created successfully.", name)
    else:
        logger.info(f"Collection '%s' already verified.", name)

init_collection(COLLECTION_NAME)

# 4. Vector Store & Splitter Initialization
embedding_model = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-001",
    google_api_key=GEMINI_API_KEY,
    output_dimensionality=1536
)

vector_store = QdrantVectorStore(
    client=client,
    collection_name=COLLECTION_NAME,
    embedding=embedding_model
)

# Chunk overlap increased to 100 to maintain context continuity across document boundaries
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000, 
    chunk_overlap=100, 
    length_function=len
)

# 5. Optimized Batched Upload Function
def upload_website_to_collection(url: str, batch_size: int = 10, delay_seconds: int = 30) -> str:
    """Scrapes, splits, and uploads documents in batches to stay within Gemini free-tier rate limits."""
    try:
        logger.info("Scraping: %s", url)
        # loader = WebBaseLoader(url)
        # docs = loader.load_and_split(text_splitter)
        # This opens a hidden web browser to load all the hidden website text properly
        loader = SeleniumURLLoader(urls=[url])
        raw_docs = loader.load()

        # Split the loaded text into smaller pieces
        docs = text_splitter.split_documents(raw_docs)

        if not docs:
            logger.warning("No documents were extracted from the URL: %s", url)
            return "No documents were extracted from the URL."

        for doc in docs:
            doc.metadata["source_url"] = url

        total_docs = len(docs)
        logger.info("Extracted %d chunks. Starting batch upload...", total_docs)

        # Process in batches to prevent hitting API Rate Limits (429 errors)
        for i in range(0, total_docs, batch_size):
            batch = docs[i : i + batch_size]
            vector_store.add_documents(batch)
            
            processed = min(i + batch_size, total_docs)
            logger.info("Progress: %d/%d chunks uploaded.", processed, total_docs)

            # Pause between batch calls to observe Google's 15 RPM free tier limit
            if processed < total_docs:
                time.sleep(delay_seconds)

        success_msg = f"Successfully finished uploading all {total_docs} chunks for '{url}'."
        logger.info(success_msg)
        return success_msg

    except Exception as e:
        logger.error("Failed to process %s: %s", url, str(e))
        raise e

# 6. Entry Point
# if __name__ == "__main__":
#     upload_website_to_collection("https://sec.gov.ng/")