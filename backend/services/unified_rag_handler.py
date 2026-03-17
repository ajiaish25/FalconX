"""
Unified RAG Handler - Single vector store for Jira, Confluence, GitHub
Routes queries based on semantic similarity, not keywords
"""
import os
import logging
from typing import Dict, List, Any, Optional
from enum import Enum
from dataclasses import dataclass
import httpx
import math

logger = logging.getLogger(__name__)

class SourceType(str, Enum):
    JIRA = "jira"
    CONFLUENCE = "confluence"
    GITHUB = "github"

@dataclass
class UnifiedDocument:
    """Unified document format for all sources"""
    id: str
    text: str
    source_type: SourceType
    metadata: Dict[str, Any]
    embedding: Optional[List[float]] = None
    similarity_score: Optional[float] = None

class UnifiedRAGHandler:
    """
    Unified RAG handler that indexes and searches across:
    - Jira issues (title, description, comments)
    - Confluence pages
    - GitHub PRs, issues, README files
    
    Now uses persistent storage (SQLite) for vector embeddings.
    """
    
    def __init__(self):
        self.vector_store: Dict[str, UnifiedDocument] = {}
        self.embedding_endpoint = os.getenv(
            "DATABRICKS_EMBEDDING_ENDPOINT",
            os.getenv(
                "OPENAI_EMBEDDINGS_API_ENDPOINT",
                "https://dbc-46217bae-ef1b.cloud.databricks.com/serving-endpoints/databricks-gte-large-en/invocations"
            )
        )
        self.api_key = os.getenv("OPENAI_EMBEDDINGS_API_KEY") or os.getenv("OPENAI_API_KEY")
        self._initialized = False
        
        # Initialize persistent storage
        try:
            from services.vector_storage import VectorStorage
            self.storage = VectorStorage()
            logger.info("✅ Unified RAG Handler initialized with persistent storage")
        except Exception as e:
            logger.warning(f"⚠️ Failed to initialize persistent storage: {e}. Using in-memory only.")
            self.storage = None
    
    async def initialize(self):
        """Initialize vector store and load existing indices from persistent storage"""
        if self._initialized:
            return
        
        # Load documents from persistent storage
        if self.storage:
            try:
                logger.info("📂 Loading documents from persistent storage...")
                stored_docs = self.storage.load_all_documents()
                self.vector_store.update(stored_docs)
                logger.info(f"✅ Loaded {len(stored_docs)} documents from persistent storage")
            except Exception as e:
                logger.warning(f"⚠️ Failed to load from persistent storage: {e}")
        
        self._initialized = True
        logger.info(f"✅ Unified RAG Handler ready ({len(self.vector_store)} documents in memory)")
    
    async def index_document(
        self,
        text: str,
        source_type: SourceType,
        metadata: Dict[str, Any]
    ) -> str:
        """Index a document from any source and persist to storage"""
        doc_id = f"{source_type.value}_{metadata.get('id', 'unknown')}"
        
        # Get embedding
        try:
            embedding = await self._get_embedding(text)
        except Exception as e:
            logger.warning(f"Failed to get embedding for {doc_id}: {e}")
            embedding = None
        
        # Create document
        doc = UnifiedDocument(
            id=doc_id,
            text=text,
            source_type=source_type,
            metadata=metadata,
            embedding=embedding
        )
        
        # Store in memory (for fast access)
        self.vector_store[doc_id] = doc
        
        # Persist to storage
        if self.storage:
            try:
                self.storage.save_document(doc)
                logger.debug(f"Indexed and persisted document: {doc_id}")
            except Exception as e:
                logger.warning(f"Failed to persist document {doc_id}: {e}")
        else:
            logger.debug(f"Indexed document (in-memory only): {doc_id}")
        
        return doc_id
    
    async def similarity_search(
        self,
        query: str,
        top_k: int = 10,
        source_filter: Optional[List[SourceType]] = None,
        min_score: float = 0.0
    ) -> List[UnifiedDocument]:
        """
        Global similarity search across all sources
        
        Args:
            query: Search query
            top_k: Number of results
            source_filter: Filter by source types (for manual mode)
            min_score: Minimum similarity score
        
        Returns:
            List of documents sorted by similarity
        """
        if not self._initialized:
            await self.initialize()
        
        # Get query embedding
        try:
            query_embedding = await self._get_embedding(query)
        except Exception as e:
            logger.warning(f"Failed to get query embedding: {e}")
            return []
        
        # Filter documents if source_filter provided
        documents = list(self.vector_store.values())
        if source_filter:
            documents = [d for d in documents if d.source_type in source_filter]
        
        if not documents:
            logger.warning("No documents in vector store")
            return []
        
        # Calculate similarities in parallel batches for better performance
        scored_docs = []
        
        # Use batch processing for large document sets
        batch_size = 100
        for i in range(0, len(documents), batch_size):
            batch = documents[i:i + batch_size]
            for doc in batch:
                if doc.embedding:
                    similarity = self._cosine_similarity(query_embedding, doc.embedding)
                    if similarity >= min_score:
                        doc.similarity_score = similarity
                        scored_docs.append(doc)
            
            # Early termination if we have enough high-scoring results
            if len(scored_docs) >= top_k * 2:
                scored_docs.sort(key=lambda x: x.similarity_score or 0.0, reverse=True)
                return scored_docs[:top_k]
        
        # Sort by similarity and return top_k
        scored_docs.sort(key=lambda x: x.similarity_score or 0.0, reverse=True)
        return scored_docs[:top_k]
    
    def detect_dominant_source(self, results: List[UnifiedDocument]) -> Optional[SourceType]:
        """
        Determine dominant source from top results
        
        Args:
            results: Top similarity search results
        
        Returns:
            Dominant source type or None if uncertain
        """
        if not results:
            return None
        
        # Count sources in top 3 results
        top_3 = results[:3]
        source_counts = {}
        for doc in top_3:
            source = doc.source_type
            source_counts[source] = source_counts.get(source, 0) + 1
        
        # If one source dominates (2+ out of 3), return it
        if len(source_counts) == 1:
            return list(source_counts.keys())[0]
        
        # If top result has high score and is clear, use it
        if top_3[0].similarity_score and top_3[0].similarity_score > 0.8:
            return top_3[0].source_type
        
        # Otherwise, return most common in top 3
        return max(source_counts.items(), key=lambda x: x[1])[0] if source_counts else None
    
    async def _get_embedding(self, text: str) -> List[float]:
        """Get embedding for text using Databricks endpoint with caching"""
        from services.performance_cache import get_performance_cache
        
        cache = get_performance_cache()
        cache_key = cache.get_embedding_key(text)
        
        # Check cache first
        cached_embedding = cache.get(cache_key)
        if cached_embedding is not None:
            logger.debug("Using cached embedding")
            return cached_embedding
        
        if not self.api_key or not self.embedding_endpoint:
            raise ValueError("API key or embedding endpoint not configured")
        
        # Ensure endpoint URL is correct
        endpoint_url = self.embedding_endpoint
        if "/api/2.0/serving-endpoints/" in endpoint_url:
            endpoint_url = endpoint_url.replace("/api/2.0/serving-endpoints/", "/serving-endpoints/")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "input": [text] if isinstance(text, str) else text
        }
        
        try:
            # Use shorter timeout for faster failure
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    endpoint_url,
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()
                
                # Parse response format
                if "data" in result:
                    sorted_data = sorted(result["data"], key=lambda x: x.get("index", 0))
                    embedding = [item["embedding"] for item in sorted_data][0]
                elif "embeddings" in result:
                    embedding = result["embeddings"][0]
                else:
                    logger.error(f"Unexpected embedding response format: {list(result.keys())}")
                    raise ValueError("Unexpected response format")
                
                # Cache the embedding (24 hour TTL for embeddings)
                cache.set(cache_key, embedding, ttl=86400)
                return embedding
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error getting embeddings: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Failed to get embeddings: {e}")
            raise
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        if len(vec1) != len(vec2):
            return 0.0
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(a * a for a in vec2))
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        return dot_product / (magnitude1 * magnitude2)

# Global instance
_unified_rag_handler: Optional[UnifiedRAGHandler] = None

def get_unified_rag_handler() -> Optional[UnifiedRAGHandler]:
    """Get or create unified RAG handler instance"""
    global _unified_rag_handler
    if _unified_rag_handler is None:
        _unified_rag_handler = UnifiedRAGHandler()
    return _unified_rag_handler

