"""
Document Indexer Service
Indexes documents from all sources into unified vector store
"""
import logging
from typing import List, Dict, Any
from services.unified_rag_handler import UnifiedRAGHandler, SourceType

logger = logging.getLogger(__name__)

class DocumentIndexer:
    """Service to index documents from all sources into unified vector store"""
    
    def __init__(self, unified_rag: UnifiedRAGHandler):
        self.unified_rag = unified_rag
    
    def _extract_jira_text(self, issue: Dict[str, Any]) -> str:
        """Extract searchable text from a Jira issue"""
        fields = issue.get('fields', {})
        summary = fields.get('summary', '')
        description = fields.get('description', '') or ''
        
        # Extract comments
        comments = fields.get('comment', {}).get('comments', [])
        comment_texts = [c.get('body', '') for c in comments if isinstance(c.get('body'), str)]
        comments_text = ' '.join(comment_texts)
        
        # Combine all searchable fields
        text_parts = [
            summary,
            description,
            comments_text
        ]
        
        return " ".join(filter(None, text_parts))
    
    async def index_jira_issues(self, issues: List[Dict], jira_base_url: str = ""):
        """Index Jira issues"""
        logger.info(f"Indexing {len(issues)} Jira issues...")
        
        for issue in issues:
            try:
                text = self._extract_jira_text(issue)
                if not text.strip():
                    continue
                
                fields = issue.get('fields', {})
                
                # Safely extract nested fields with None checks
                project_obj = fields.get('project')
                project = project_obj.get('key', '') if project_obj and isinstance(project_obj, dict) else ''
                
                status_obj = fields.get('status')
                status = status_obj.get('name', '') if status_obj and isinstance(status_obj, dict) else ''
                
                assignee_obj = fields.get('assignee')
                assignee = assignee_obj.get('displayName', 'Unassigned') if assignee_obj and isinstance(assignee_obj, dict) else 'Unassigned'
                
                reporter_obj = fields.get('reporter')
                reporter = reporter_obj.get('displayName', 'Unknown') if reporter_obj and isinstance(reporter_obj, dict) else 'Unknown'
                
                metadata = {
                    'id': issue.get('key'),
                    'url': f"{jira_base_url}/browse/{issue.get('key')}" if jira_base_url else "",
                    'project': project,
                    'status': status,
                    'assignee': assignee,
                    'reporter': reporter,
                    'created': fields.get('created', ''),
                    'summary': fields.get('summary', '')
                }
                
                await self.unified_rag.index_document(
                    text=text,
                    source_type=SourceType.JIRA,
                    metadata=metadata
                )
            except Exception as e:
                logger.error(f"Failed to index Jira issue {issue.get('key', 'unknown')}: {e}")
        
        logger.info(f"✅ Indexed {len(issues)} Jira issues")
    
    def _extract_confluence_text(self, page: Dict[str, Any]) -> str:
        """Extract searchable text from a Confluence page"""
        title = page.get('title', '')
        body = page.get('body', {}).get('storage', {}).get('value', '')
        
        # Remove HTML tags (basic)
        import re
        body = re.sub(r'<[^>]+>', '', body)
        
        return f"{title} {body}".strip()
    
    async def index_confluence_pages(self, pages: List[Dict], confluence_base_url: str = ""):
        """Index Confluence pages"""
        logger.info(f"Indexing {len(pages)} Confluence pages...")
        
        for page in pages:
            try:
                text = self._extract_confluence_text(page)
                if not text.strip():
                    continue
                
                page_id = page.get('id', '')
                space_key = page.get('space', {}).get('key', '')
                
                metadata = {
                    'id': page_id,
                    'url': f"{confluence_base_url}/pages/viewpage.action?pageId={page_id}" if confluence_base_url else "",
                    'title': page.get('title', ''),
                    'space': space_key
                }
                
                await self.unified_rag.index_document(
                    text=text,
                    source_type=SourceType.CONFLUENCE,
                    metadata=metadata
                )
            except Exception as e:
                logger.error(f"Failed to index Confluence page {page.get('id', 'unknown')}: {e}")
        
        logger.info(f"✅ Indexed {len(pages)} Confluence pages")
    
    def _extract_github_text(self, item: Dict[str, Any]) -> str:
        """Extract searchable text from a GitHub issue or PR"""
        title = item.get('title', '')
        body = item.get('body', '') or ''
        labels = [label.get('name', '') for label in item.get('labels', [])]
        
        return f"{title} {body} {' '.join(labels)}".strip()
    
    async def index_github_items(self, items: List[Dict], github_base_url: str = ""):
        """Index GitHub issues/PRs"""
        logger.info(f"Indexing {len(items)} GitHub items...")
        
        for item in items:
            try:
                text = self._extract_github_text(item)
                if not text.strip():
                    continue
                
                item_type = 'pull_request' if 'pull_request' in item else 'issue'
                item_id = str(item.get('number', ''))
                repo = item.get('repository_url', '').split('/')[-1] if item.get('repository_url') else ''
                
                metadata = {
                    'id': item_id,
                    'url': item.get('html_url', ''),
                    'title': item.get('title', ''),
                    'type': item_type,
                    'repository': repo,
                    'state': item.get('state', '')
                }
                
                await self.unified_rag.index_document(
                    text=text,
                    source_type=SourceType.GITHUB,
                    metadata=metadata
                )
            except Exception as e:
                logger.error(f"Failed to index GitHub item {item.get('number', 'unknown')}: {e}")
        
        logger.info(f"✅ Indexed {len(items)} GitHub items")

