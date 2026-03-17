import httpx
import logging
from typing import Any, Dict, List, Optional


logger = logging.getLogger(__name__)


class ConfluenceConfig:
    def __init__(self, base_url: str, email: str, api_token: str):
        # Confluence Cloud base will typically be https://<site>.atlassian.net/wiki
        self.base_url = base_url.rstrip("/")
        self.email = email
        self.api_token = api_token


class ConfluenceClient:
    def __init__(self, cfg: ConfluenceConfig):
        self.cfg = cfg
        self._client: Optional[httpx.AsyncClient] = None

    async def initialize(self):
        if not self._client:
            auth = (self.cfg.email, self.cfg.api_token)
            timeout = httpx.Timeout(30.0, read=30.0)
            self._client = httpx.AsyncClient(auth=auth, timeout=timeout)

    async def close(self):
        if self._client:
            try:
                await self._client.aclose()
            except Exception:
                pass
            self._client = None

    def _headers(self) -> Dict[str, str]:
        return {"Accept": "application/json"}

    async def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search Confluence using CQL for full-text across pages."""
        if not self._client:
            await self.initialize()

        # Confluence Cloud search API
        url = f"{self.cfg.base_url}/rest/api/search"
        cql = f'text ~ "{query}"'
        params = {
            "cql": cql,
            "limit": str(limit),
        }
        try:
            resp = await self._client.get(url, params=params, headers=self._headers())
            resp.raise_for_status()
            data = resp.json()
            # Results contain content with id/type, and excerpt
            results = data.get("results", [])
            return results
        except Exception as e:
            logger.error(f"[Confluence] search failed: {e}")
            return []

    async def search_pages(self, title_query: str, space: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
        """Search pages by title (CQL)."""
        if not self._client:
            await self.initialize()

        url = f"{self.cfg.base_url}/rest/api/search"
        # Build CQL string
        parts = ["type = page"]
        if title_query:
            parts.append(f'title ~ "{title_query}"')
        if space:
            parts.append(f'space = "{space}"')
        cql = " AND ".join(parts)
        params = {"cql": cql, "limit": str(limit)}
        try:
            resp = await self._client.get(url, params=params, headers=self._headers())
            resp.raise_for_status()
            return resp.json().get("results", [])
        except Exception as e:
            logger.error(f"[Confluence] search_pages failed: {e}")
            return []

    async def search_in_space(self, query: str, space: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for content within a specific space using comprehensive search strategies."""
        if not self._client:
            await self.initialize()

        url = f"{self.cfg.base_url}/rest/api/search"
        all_results = []
        seen_ids = set()
        
        # Strategy 1: Exact title match (highest priority)
        if query:
            try:
                parts_exact = ["type = page", f'space = "{space}"', f'title = "{query}"']
                cql_exact = " AND ".join(parts_exact)
                params_exact = {"cql": cql_exact, "limit": str(limit)}
                resp_exact = await self._client.get(url, params=params_exact, headers=self._headers())
                resp_exact.raise_for_status()
                exact_results = resp_exact.json().get("results", [])
                for result in exact_results:
                    content_id = result.get('content', {}).get('id') if isinstance(result.get('content'), dict) else None
                    if content_id and content_id not in seen_ids:
                        all_results.append(result)
                        seen_ids.add(content_id)
                logger.info(f"Exact title match found {len(exact_results)} results")
            except Exception as e:
                logger.debug(f"Exact title search failed: {e}")
        
        # Strategy 2: Title contains (high priority)
        if query and len(all_results) < limit:
            try:
                parts_title = ["type = page", f'space = "{space}"', f'title ~ "{query}"']
                cql_title = " AND ".join(parts_title)
                params_title = {"cql": cql_title, "limit": str(limit)}
                resp_title = await self._client.get(url, params=params_title, headers=self._headers())
                resp_title.raise_for_status()
                title_results = resp_title.json().get("results", [])
                for result in title_results:
                    content_id = result.get('content', {}).get('id') if isinstance(result.get('content'), dict) else None
                    if content_id and content_id not in seen_ids:
                        all_results.append(result)
                        seen_ids.add(content_id)
                        if len(all_results) >= limit:
                            break
                logger.info(f"Title contains search found {len(title_results)} results")
            except Exception as e:
                logger.debug(f"Title contains search failed: {e}")
        
        # Strategy 3: Full-text search (broader, lower priority)
        if query and len(all_results) < limit:
            try:
                parts_text = ["type = page", f'space = "{space}"', f'text ~ "{query}"']
                cql_text = " AND ".join(parts_text)
                params_text = {"cql": cql_text, "limit": str(limit * 2)}  # Get more to filter
                resp_text = await self._client.get(url, params=params_text, headers=self._headers())
                resp_text.raise_for_status()
                text_results = resp_text.json().get("results", [])
                for result in text_results:
                    content_id = result.get('content', {}).get('id') if isinstance(result.get('content'), dict) else None
                    if content_id and content_id not in seen_ids:
                        all_results.append(result)
                        seen_ids.add(content_id)
                        if len(all_results) >= limit:
                            break
                logger.info(f"Full-text search found {len(text_results)} results")
            except Exception as e:
                logger.debug(f"Full-text search failed: {e}")
        
        # Return top results, prioritizing exact matches
        return all_results[:limit]

    async def get_spaces(self, limit: int = 1) -> List[Dict[str, Any]]:
        """List Confluence spaces (used as a lightweight health check)."""
        if not self._client:
            await self.initialize()

        url = f"{self.cfg.base_url}/rest/api/space"
        params = {"limit": str(limit)}
        try:
            resp = await self._client.get(url, params=params, headers=self._headers())
            resp.raise_for_status()
            data = resp.json()
            # Cloud returns { results: [...] }, DC may vary
            return data.get("results", []) or data.get("spaces", []) or []
        except Exception as e:
            logger.error(f"[Confluence] get_spaces failed: {e}")
            return []

    @staticmethod
    def storage_html_to_text(storage_html: str) -> str:
        """Very simple HTML to text conversion for Confluence storage format."""
        try:
            import re, html
            # Replace <br/> and </p> with newlines
            text = storage_html.replace("<br/>", "\n").replace("<br>", "\n")
            text = re.sub(r"</p>", "\n\n", text)
            # Strip all remaining tags
            text = re.sub(r"<[^>]+>", "", text)
            # Unescape HTML entities
            text = html.unescape(text)
            # Normalize spaces
            text = re.sub(r"\n{3,}", "\n\n", text).strip()
            return text
        except Exception:
            return storage_html

    async def get_page(self, content_id: str) -> Optional[Dict[str, Any]]:
        """Get a Confluence page with comprehensive content including latest version."""
        if not self._client:
            await self.initialize()

        url = f"{self.cfg.base_url}/rest/api/content/{content_id}"
        # Expand all relevant fields for complete page data
        # body.storage: Full storage format (HTML)
        # body.view: View format (cleaner HTML)
        # version: Version info to ensure we have latest
        # space: Space metadata
        # metadata: Page metadata
        # children.page: Child pages if any
        params = {
            "expand": "body.storage,body.view,version,space,metadata,children.page",
            "status": "current"  # Only get current version, not historical
        }
        try:
            resp = await self._client.get(url, params=params, headers=self._headers())
            resp.raise_for_status()
            page_data = resp.json()
            
            # Log version info to ensure we're getting latest
            version_info = page_data.get('version', {})
            if version_info:
                logger.debug(f"Retrieved page {content_id} version {version_info.get('number')} (modified: {version_info.get('when')})")
            
            return page_data
        except Exception as e:
            logger.error(f"[Confluence] get_page failed for {content_id}: {e}")
            return None
    
    async def get_page_by_title(self, title: str, space: str) -> Optional[Dict[str, Any]]:
        """Get a Confluence page by exact title match - more reliable than search."""
        if not self._client:
            await self.initialize()
        
        # First search for exact title match
        results = await self.search_in_space(title, space, limit=1)
        
        if results:
            # Get the first result's content ID
            content_obj = results[0].get('content', {})
            content_id = content_obj.get('id') if isinstance(content_obj, dict) else None
            
            if content_id:
                # Fetch full page content
                return await self.get_page(content_id)
        
        return None
    
    async def get_all_spaces(self) -> List[Dict[str, Any]]:
        """Get all Confluence spaces (paginated)"""
        if not self._client:
            await self.initialize()
        
        all_spaces = []
        start = 0
        limit = 100  # Confluence API limit
        
        while True:
            url = f"{self.cfg.base_url}/rest/api/space"
            params = {
                "limit": str(limit),
                "start": str(start),
                "expand": "metadata"
            }
            try:
                resp = await self._client.get(url, params=params, headers=self._headers())
                resp.raise_for_status()
                data = resp.json()
                spaces = data.get("results", []) or data.get("spaces", [])
                
                if not spaces:
                    break
                
                all_spaces.extend(spaces)
                
                # Check if there are more results
                if len(spaces) < limit:
                    break
                
                start += limit
            except Exception as e:
                logger.error(f"[Confluence] get_all_spaces failed at start={start}: {e}")
                break
        
        logger.info(f"Retrieved {len(all_spaces)} Confluence spaces")
        return all_spaces
    
    async def get_all_pages_in_space(self, space_key: str) -> List[Dict[str, Any]]:
        """Get all pages from a specific space (paginated)"""
        if not self._client:
            await self.initialize()
        
        all_pages = []
        start = 0
        limit = 100  # Confluence API limit
        
        while True:
            url = f"{self.cfg.base_url}/rest/api/content"
            params = {
                "spaceKey": space_key,
                "type": "page",
                "limit": str(limit),
                "start": str(start),
                "expand": "body.storage,body.view,version,space,metadata"
            }
            try:
                resp = await self._client.get(url, params=params, headers=self._headers())
                resp.raise_for_status()
                data = resp.json()
                pages = data.get("results", [])
                
                if not pages:
                    break
                
                all_pages.extend(pages)
                
                # Check if there are more results
                if len(pages) < limit:
                    break
                
                start += limit
                
                # Log progress for large spaces
                if start % 500 == 0:
                    logger.info(f"  Retrieved {len(all_pages)} pages from space {space_key}...")
                    
            except Exception as e:
                logger.error(f"[Confluence] get_all_pages_in_space failed for {space_key} at start={start}: {e}")
                break
        
        logger.info(f"Retrieved {len(all_pages)} pages from space {space_key}")
        return all_pages
    
    async def get_all_pages(self, space_keys: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Get all pages from all spaces (or specified spaces)
        
        Args:
            space_keys: Optional list of space keys to index. If None, indexes all spaces.
        
        Returns:
            List of all pages from all spaces
        """
        if not self._client:
            await self.initialize()
        
        all_pages = []
        
        # Get spaces to index
        if space_keys:
            spaces_to_index = [{"key": key} for key in space_keys]
        else:
            spaces = await self.get_all_spaces()
            spaces_to_index = spaces
        
        logger.info(f"Indexing {len(spaces_to_index)} Confluence spaces...")
        
        for space in spaces_to_index:
            space_key = space.get("key") or space.get("name", "")
            if not space_key:
                continue
            
            try:
                pages = await self.get_all_pages_in_space(space_key)
                all_pages.extend(pages)
                logger.info(f"  Space {space_key}: {len(pages)} pages")
            except Exception as e:
                logger.error(f"Failed to get pages from space {space_key}: {e}")
                continue
        
        logger.info(f"✅ Retrieved {len(all_pages)} total pages from {len(spaces_to_index)} spaces")
        return all_pages


