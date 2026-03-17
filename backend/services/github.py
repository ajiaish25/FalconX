import os
import httpx
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class GitHubConfig:
    def __init__(self):
        self.api_token = os.getenv("GITHUB_TOKEN", "")
        self.email = os.getenv("GITHUB_EMAIL", "ajith.ramesh@cdk.com")
        self.base_url = "https://api.github.com"
        # Default org can be overridden via env when the repo lives elsewhere
        self.org = os.getenv("GITHUB_ORG", "cdk-prod")
        # SSL / cert handling
        # GITHUB_VERIFY=false to skip verification (not recommended)
        # GITHUB_CA_BUNDLE=/path/to/ca-bundle.pem to trust custom CA
        # Default to false (temporary) until proper CA bundle is provided
        verify_env = os.getenv("GITHUB_VERIFY", "false").lower()
        self.verify = False if verify_env in ["false", "0", "no", "off"] else True
        self.ca_bundle = os.getenv("GITHUB_CA_BUNDLE")

class GitHubClient:
    """
    Client for interacting with GitHub REST API
    """
    def __init__(self, config: GitHubConfig = None):
        self.config = config or GitHubConfig()
        self._client = None
        self._headers = None

    async def initialize(self):
        """Initialize the HTTP client"""
        if not self._client:
            # Determine verification setting
            verify_setting: Any = self.config.verify
            if self.config.ca_bundle:
                verify_setting = self.config.ca_bundle
                logger.info(f"Using custom CA bundle for GitHub: {self.config.ca_bundle}")
            if verify_setting is False:
                logger.warning("GitHub SSL verification is DISABLED (GITHUB_VERIFY=false). Enable it or provide GITHUB_CA_BUNDLE if possible.")

            self._client = httpx.AsyncClient(timeout=30.0, verify=verify_setting, trust_env=True)
            self._headers = {
                'Authorization': f'Bearer {self.config.api_token}',
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'FalconX-Leadership-Engine'
            }

    async def _get(self, endpoint: str, params: Dict = None) -> Dict[str, Any]:
        """Internal GET helper with detailed logging"""
        if not self._client:
            logger.info("   - HTTP client not initialized, initializing now...")
            await self.initialize()
        
        # Handle full URLs vs endpoints
        url = endpoint if endpoint.startswith('http') else f"{self.config.base_url}{endpoint}"
        
        logger.debug(f"   - Making GET request to: {url}")
        if params:
            logger.debug(f"   - Query params: {params}")
        
        try:
            response = await self._client.get(url, headers=self._headers, params=params)
            logger.debug(f"   - Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                logger.debug(f"   - Response data keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                return data
            elif response.status_code == 401:
                logger.error(f"❌ GitHub API authentication failed (401)")
                logger.error(f"   - Check if GITHUB_TOKEN is valid and has required permissions")
                logger.error(f"   - Response: {response.text[:200]}")
                return {}
            elif response.status_code == 403:
                logger.error(f"❌ GitHub API forbidden (403)")
                logger.error(f"   - Token may not have required permissions")
                logger.error(f"   - Response: {response.text[:200]}")
                return {}
            elif response.status_code == 404:
                logger.warning(f"⚠️ GitHub API endpoint not found (404): {url}")
                return {}
            else:
                logger.error(f"❌ GitHub API error {response.status_code}: {response.text[:500]}")
                return {}
        except httpx.TimeoutException as e:
            logger.error(f"❌ GitHub API request timeout: {e}")
            logger.error(f"   - URL: {url}")
            return {}
        except httpx.ConnectError as e:
            logger.error(f"❌ GitHub API connection error: {e}")
            logger.error(f"   - URL: {url}")
            logger.error(f"   - Check network connectivity and base_url configuration")
            return {}
        except Exception as e:
            logger.error(f"❌ GitHub API request failed: {e}")
            logger.error(f"   - Error type: {type(e).__name__}")
            logger.error(f"   - URL: {url}")
            import traceback
            logger.debug(f"   - Traceback: {traceback.format_exc()}")
            return {}

    async def get_status(self) -> Dict[str, Any]:
        """Check connection status - only logs errors to reduce log clutter"""
        # Only log errors, not successful status checks (to reduce log clutter)
        try:
            if not self._client:
                await self.initialize()
            data = await self._get("/user")
            if data:
                # Only log on success if explicitly requested (e.g., manual status check)
                # For periodic checks, return silently to reduce log clutter
                return {
                    "connected": True, 
                    "user": data.get("login"),
                    "email": self.config.email,
                    "config": {
                        "org": self.config.org,
                        "base_url": self.config.base_url,
                        "verify_ssl": self.config.verify
                    }
                }
            else:
                logger.warning("⚠️ GitHub connection failed: Invalid credentials or no user data returned.")
                return {"connected": False, "error": "Invalid credentials or no user data returned"}
        except httpx.HTTPStatusError as e:
            logger.error(f"❌ GitHub API HTTP error during status check: {e.response.status_code} - {e.response.text}", exc_info=True)
            return {"connected": False, "error": f"API error: {e.response.status_code} - {e.response.text}"}
        except httpx.RequestError as e:
            logger.error(f"❌ GitHub network error during status check: {e}", exc_info=True)
            return {"connected": False, "error": f"Network error: {e}"}
        except Exception as e:
            logger.error(f"❌ Unexpected error during GitHub status check: {e}", exc_info=True)
            return {"connected": False, "error": str(e)}

    async def list_repositories(self, per_page: int = 100) -> Dict[str, Any]:
        """List repositories for the authenticated user/org."""
        try:
            params = {"per_page": per_page}
            data = await self._get("/user/repos", params=params)
            if not data:
                return {"success": False, "repos": [], "error": "No data returned"}
            repos = []
            for repo in data:
                repos.append({
                    "id": repo.get("id"),
                    "name": repo.get("name"),
                    "full_name": repo.get("full_name"),
                    "private": repo.get("private", False),
                    "owner": repo.get("owner", {}).get("login"),
                    "html_url": repo.get("html_url"),
                    "default_branch": repo.get("default_branch"),
                })
            return {"success": True, "repos": repos}
        except Exception as e:
            logger.error(f"❌ Failed to list repositories: {e}", exc_info=True)
            return {"success": False, "repos": [], "error": str(e)}

    async def get_workflow_runs(self, repo: str, days: int = 30, workflow: Optional[str] = None) -> Dict[str, Any]:
        """Get automation run counts for a repo or specific workflow file/id"""
        # Calculate date window
        since_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        
        # Fetch runs
        # Allow callers to pass either "repo-name" or "owner/repo-name"
        owner_repo = repo if "/" in repo else f"{self.config.org}/{repo}"
        if workflow:
            # GitHub accepts workflow file name (e.g., is-smoke-dev.yml) or workflow id
            endpoint = f"/repos/{owner_repo}/actions/workflows/{workflow}/runs"
        else:
            endpoint = f"/repos/{owner_repo}/actions/runs"
        params = {
            "created": f">{since_date}",
            "per_page": 100
        }
        
        data = await self._get(endpoint, params)
        runs = data.get("workflow_runs", [])
        
        # Aggregate statistics
        total = len(runs)
        successful = sum(1 for r in runs if r.get('conclusion') == 'success')
        failed = sum(1 for r in runs if r.get('conclusion') == 'failure')
        
        return {
            "repo": repo,
            "total_runs": total,
            "successful": successful,
            "failed": failed,
            "success_rate": (successful / total * 100) if total > 0 else 0,
            "runs": runs[:10] # Return top 10 for display
        }

    async def search_issues_and_prs(self, query: str, use_semantic: bool = True) -> List[Dict[str, Any]]:
        """
        Search for issues and PRs based on natural language
        Uses semantic search (RAG) if available, falls back to GitHub API search
        """
        # Try semantic search first if enabled
        if use_semantic:
            try:
                from services.github_rag_handler import get_github_rag_handler
                rag_handler = get_github_rag_handler()
                if rag_handler:
                    # First, get recent issues/PRs to search through
                    # GitHub search API for recent items
                    search_query = f"org:{self.config.org} sort:updated-desc"
                    data = await self._get("/search/issues", {"q": search_query, "per_page": 100})
                    recent_issues = data.get("items", [])
                    
                    if recent_issues:
                        # Use semantic search on recent issues
                        similar = await rag_handler.find_similar_issues(
                            query=query,
                            issues=recent_issues,
                            top_k=10
                        )
                        if similar:
                            logger.info(f"✅ Found {len(similar)} similar issues using semantic search")
                            return similar
            except Exception as rag_err:
                logger.warning(f"Semantic search for GitHub failed, falling back to API: {rag_err}")
        
        # Fallback to GitHub API search (keyword-based)
        search_query = f"org:{self.config.org} {query}"
        data = await self._get("/search/issues", {"q": search_query})
        return data.get("items", [])
