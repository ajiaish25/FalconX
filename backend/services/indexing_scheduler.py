"""
Automated Indexing Scheduler
Periodically indexes documents from Jira, Confluence, and GitHub
"""
import os
import logging
import asyncio
from typing import Optional
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from services.unified_rag_handler import get_unified_rag_handler
from services.document_indexer import DocumentIndexer

logger = logging.getLogger(__name__)

class IndexingScheduler:
    """Scheduler for automated document indexing"""
    
    def __init__(self):
        self.scheduler: Optional[AsyncIOScheduler] = None
        self.unified_rag = get_unified_rag_handler()
        self.indexer = DocumentIndexer(self.unified_rag) if self.unified_rag else None
        self._running = False
        
        # Get clients from main app (will be set via set_clients)
        self.jira_client = None
        self.confluence_client = None
        self.github_client = None
    
    def set_clients(self, jira_client=None, confluence_client=None, github_client=None):
        """Set API clients for indexing"""
        self.jira_client = jira_client
        self.confluence_client = confluence_client
        self.github_client = github_client
        logger.info("✅ Indexing clients configured")
    
    async def _index_recent_jira_issues(self):
        """Index recent Jira issues (last 7 days)"""
        if not self.jira_client or not self.indexer:
            logger.warning("⚠️ Jira client not available for indexing")
            return
        
        try:
            logger.info("🔄 Starting automated Jira indexing...")
            
            # Get issues updated in last 7 days
            date_from = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
            jql = f"updated >= {date_from} ORDER BY updated DESC"
            
            # Limit to 500 most recent issues to avoid overload
            search_result = await self.jira_client.search(jql, max_results=500)
            issues = search_result.get('issues', [])
            
            if issues:
                jira_base_url = os.getenv("JIRA_BASE_URL", "")
                await self.indexer.index_jira_issues(issues, jira_base_url)
                logger.info(f"✅ Indexed {len(issues)} recent Jira issues")
            else:
                logger.info("ℹ️ No recent Jira issues to index")
                
        except Exception as e:
            logger.error(f"❌ Failed to index Jira issues: {e}", exc_info=True)
    
    async def _index_full_confluence(self):
        """Index ALL Confluence pages from all spaces (full index)"""
        if not self.confluence_client or not self.indexer:
            logger.warning("⚠️ Confluence client not available for indexing")
            return
        
        try:
            logger.info("🔄 Starting FULL Confluence indexing (all pages)...")
            base_url = os.getenv("CONFLUENCE_BASE_URL", "").rstrip("/")
            
            # Get all pages from all spaces
            all_pages = await self.confluence_client.get_all_pages()
            
            if all_pages:
                await self.indexer.index_confluence_pages(all_pages, base_url)
                logger.info(f"✅ FULL INDEX: Indexed {len(all_pages)} Confluence pages from all spaces")
            else:
                logger.warning("⚠️ No Confluence pages found to index")
                
        except Exception as e:
            logger.error(f"❌ Failed to perform full Confluence indexing: {e}", exc_info=True)
    
    async def _index_recent_confluence_pages(self):
        """Index recent Confluence pages (last 7 days) - incremental update"""
        if not self.confluence_client or not self.indexer:
            logger.warning("⚠️ Confluence client not available for indexing")
            return
        
        try:
            logger.info("🔄 Starting incremental Confluence indexing (recent pages)...")
            
            # Get pages updated in last 7 days using CQL
            date_from = (datetime.now() - timedelta(days=7)).strftime('%Y/%m/%d')
            cql = f'lastModified >= "{date_from}" ORDER BY lastModified DESC'
            
            # Use Confluence API to search
            base_url = os.getenv("CONFLUENCE_BASE_URL", "").rstrip("/")
            if not base_url:
                logger.warning("⚠️ CONFLUENCE_BASE_URL not set")
                return
            
            import httpx
            from services.encryption import get_encrypted_env
            
            email = os.getenv("CONFLUENCE_SERVICE_EMAIL")
            raw_token = os.getenv("CONFLUENCE_SERVICE_API_TOKEN")
            
            if raw_token and raw_token.startswith('gAAAAA'):
                try:
                    api_token = get_encrypted_env("CONFLUENCE_SERVICE_API_TOKEN")
                except:
                    api_token = raw_token
            else:
                api_token = raw_token
            
            if not (email and api_token):
                logger.warning("⚠️ Confluence credentials not available")
                return
            
            search_url = f"{base_url}/rest/api/search"
            params = {"cql": cql, "limit": "500"}  # Increased limit for incremental updates
            
            async with httpx.AsyncClient(auth=(email, api_token), timeout=60.0) as client:
                response = await client.get(search_url, params=params)
                response.raise_for_status()
                results = response.json().get("results", [])
            
            if results:
                await self.indexer.index_confluence_pages(results, base_url)
                logger.info(f"✅ Incremental: Indexed {len(results)} recent Confluence pages")
            else:
                logger.info("ℹ️ No recent Confluence pages to index")
                
        except Exception as e:
            logger.error(f"❌ Failed to index recent Confluence pages: {e}", exc_info=True)
    
    async def _index_recent_github_items(self):
        """Index recent GitHub issues/PRs (last 7 days)"""
        if not self.github_client or not self.indexer:
            logger.warning("⚠️ GitHub client not available for indexing")
            return
        
        try:
            logger.info("🔄 Starting automated GitHub indexing...")
            
            # Get issues/PRs updated in last 7 days
            since_date = (datetime.now() - timedelta(days=7)).isoformat()
            
            # This would need to be implemented based on your GitHub client
            # For now, we'll log that it's not fully implemented
            logger.info("ℹ️ GitHub indexing not fully implemented yet")
            
        except Exception as e:
            logger.error(f"❌ Failed to index GitHub items: {e}", exc_info=True)
    
    async def _full_index(self):
        """Perform full indexing of all sources"""
        logger.info("🔄 Starting full indexing cycle...")
        
        # Index recent items from all sources
        await self._index_recent_jira_issues()
        await self._index_recent_confluence_pages()
        await self._index_recent_github_items()
        
        logger.info("✅ Full indexing cycle completed")
    
    def start(self):
        """Start the indexing scheduler"""
        if self._running:
            logger.warning("⚠️ Scheduler already running")
            return
        
        if not self.indexer:
            logger.error("❌ Indexer not initialized. Cannot start scheduler.")
            return
        
        self.scheduler = AsyncIOScheduler()
        
        # Schedule incremental Jira indexing every 15 minutes (recent items only)
        self.scheduler.add_job(
            self._index_recent_jira_issues,
            trigger=IntervalTrigger(minutes=15),
            id='incremental_jira',
            name='Incremental Jira Indexing',
            replace_existing=True
        )
        
        # Schedule incremental Confluence indexing every 1 hour (recent items only)
        self.scheduler.add_job(
            self._index_recent_confluence_pages,
            trigger=IntervalTrigger(hours=1),
            id='incremental_confluence',
            name='Incremental Confluence Indexing (Hourly)',
            replace_existing=True
        )
        
        # Schedule full re-indexing daily at 2 AM
        self.scheduler.add_job(
            self._full_index,
            trigger=CronTrigger(hour=2, minute=0),
            id='full_index',
            name='Full Daily Re-indexing',
            replace_existing=True
        )
        
        self.scheduler.start()
        self._running = True
        logger.info("✅ Indexing scheduler started")
        logger.info("   - Incremental Jira: Every 15 minutes")
        logger.info("   - Incremental Confluence: Every 1 hour")
        logger.info("   - Full re-indexing: Daily at 2:00 AM")
    
    def stop(self):
        """Stop the indexing scheduler"""
        if not self._running or not self.scheduler:
            return
        
        self.scheduler.shutdown()
        self._running = False
        logger.info("✅ Indexing scheduler stopped")
    
    def is_running(self) -> bool:
        """Check if scheduler is running"""
        return self._running

# Global instance
_indexing_scheduler: Optional[IndexingScheduler] = None

def get_indexing_scheduler() -> Optional[IndexingScheduler]:
    """Get or create indexing scheduler instance"""
    global _indexing_scheduler
    if _indexing_scheduler is None:
        _indexing_scheduler = IndexingScheduler()
    return _indexing_scheduler

