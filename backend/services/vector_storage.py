"""
Persistent Vector Storage
Stores vector embeddings and document metadata in SQLite database
"""
import os
import json
import sqlite3
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from dataclasses import dataclass, asdict
from services.unified_rag_handler import UnifiedDocument, SourceType

logger = logging.getLogger(__name__)

class VectorStorage:
    """Persistent storage for vector embeddings using SQLite"""
    
    def __init__(self, db_path: str = None):
        """
        Initialize vector storage
        
        Args:
            db_path: Path to SQLite database file. Defaults to backend/data/vector_store.db
        """
        if db_path is None:
            # Default to backend/data/vector_store.db
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            data_dir = os.path.join(backend_dir, 'data')
            os.makedirs(data_dir, exist_ok=True)
            db_path = os.path.join(data_dir, 'vector_store.db')
        
        self.db_path = db_path
        self._init_database()
        logger.info(f"✅ Vector Storage initialized: {db_path}")
    
    def _init_database(self):
        """Initialize database schema"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create documents table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                source_type TEXT NOT NULL,
                metadata TEXT NOT NULL,
                embedding TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create index for faster lookups
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_source_type ON documents(source_type)
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_updated_at ON documents(updated_at)
        ''')
        
        conn.commit()
        conn.close()
        logger.debug("Database schema initialized")
    
    def save_document(self, doc: UnifiedDocument) -> bool:
        """
        Save or update a document in the database
        
        Args:
            doc: UnifiedDocument to save
            
        Returns:
            True if successful, False otherwise
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Serialize embedding and metadata
            embedding_json = json.dumps(doc.embedding) if doc.embedding else None
            metadata_json = json.dumps(doc.metadata)
            
            # Insert or replace document
            cursor.execute('''
                INSERT OR REPLACE INTO documents 
                (id, text, source_type, metadata, embedding, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                doc.id,
                doc.text,
                doc.source_type.value,
                metadata_json,
                embedding_json,
                datetime.utcnow().isoformat()
            ))
            
            conn.commit()
            conn.close()
            logger.debug(f"Saved document: {doc.id}")
            return True
        except Exception as e:
            logger.error(f"Failed to save document {doc.id}: {e}", exc_info=True)
            return False
    
    def load_document(self, doc_id: str) -> Optional[UnifiedDocument]:
        """
        Load a document from the database
        
        Args:
            doc_id: Document ID to load
            
        Returns:
            UnifiedDocument if found, None otherwise
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, text, source_type, metadata, embedding
                FROM documents
                WHERE id = ?
            ''', (doc_id,))
            
            row = cursor.fetchone()
            conn.close()
            
            if not row:
                return None
            
            doc_id_db, text, source_type_str, metadata_json, embedding_json = row
            
            # Deserialize
            metadata = json.loads(metadata_json)
            embedding = json.loads(embedding_json) if embedding_json else None
            source_type = SourceType(source_type_str)
            
            return UnifiedDocument(
                id=doc_id_db,
                text=text,
                source_type=source_type,
                metadata=metadata,
                embedding=embedding
            )
        except Exception as e:
            logger.error(f"Failed to load document {doc_id}: {e}", exc_info=True)
            return None
    
    def load_all_documents(self) -> Dict[str, UnifiedDocument]:
        """
        Load all documents from the database
        
        Returns:
            Dictionary mapping doc_id to UnifiedDocument
        """
        documents = {}
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, text, source_type, metadata, embedding
                FROM documents
            ''')
            
            for row in cursor.fetchall():
                try:
                    doc_id, text, source_type_str, metadata_json, embedding_json = row
                    
                    # Deserialize
                    metadata = json.loads(metadata_json)
                    embedding = json.loads(embedding_json) if embedding_json else None
                    source_type = SourceType(source_type_str)
                    
                    doc = UnifiedDocument(
                        id=doc_id,
                        text=text,
                        source_type=source_type,
                        metadata=metadata,
                        embedding=embedding
                    )
                    documents[doc_id] = doc
                except Exception as e:
                    logger.warning(f"Failed to deserialize document {row[0]}: {e}")
                    continue
            
            conn.close()
            logger.info(f"Loaded {len(documents)} documents from database")
        except Exception as e:
            logger.error(f"Failed to load documents: {e}", exc_info=True)
        
        return documents
    
    def delete_document(self, doc_id: str) -> bool:
        """
        Delete a document from the database
        
        Args:
            doc_id: Document ID to delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('DELETE FROM documents WHERE id = ?', (doc_id,))
            conn.commit()
            conn.close()
            
            logger.debug(f"Deleted document: {doc_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete document {doc_id}: {e}", exc_info=True)
            return False
    
    def get_document_count(self) -> int:
        """Get total number of documents in storage"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM documents')
            count = cursor.fetchone()[0]
            conn.close()
            return count
        except Exception as e:
            logger.error(f"Failed to get document count: {e}", exc_info=True)
            return 0
    
    def get_documents_by_source(self, source_type: SourceType) -> List[UnifiedDocument]:
        """
        Get all documents of a specific source type
        
        Args:
            source_type: Source type to filter by
            
        Returns:
            List of UnifiedDocument objects
        """
        documents = []
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, text, source_type, metadata, embedding
                FROM documents
                WHERE source_type = ?
            ''', (source_type.value,))
            
            for row in cursor.fetchall():
                try:
                    doc_id, text, source_type_str, metadata_json, embedding_json = row
                    
                    metadata = json.loads(metadata_json)
                    embedding = json.loads(embedding_json) if embedding_json else None
                    
                    doc = UnifiedDocument(
                        id=doc_id,
                        text=text,
                        source_type=SourceType(source_type_str),
                        metadata=metadata,
                        embedding=embedding
                    )
                    documents.append(doc)
                except Exception as e:
                    logger.warning(f"Failed to deserialize document {row[0]}: {e}")
                    continue
            
            conn.close()
        except Exception as e:
            logger.error(f"Failed to get documents by source: {e}", exc_info=True)
        
        return documents

