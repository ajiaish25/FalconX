"""
Jira Client for interacting with Jira REST API
"""

import os
import json
import logging
import asyncio
from typing import Dict, List, Any, Optional
import httpx
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class JiraConfig:
    base_url: str
    email: str
    api_token: str
    board_id: Optional[str] = None

class JiraClient:
    """
    Jira REST API client for searching issues and managing projects
    """
    
    def __init__(self, config: JiraConfig):
        self.cfg = config
        self._client = None
        self._headers = None
        self._headers_basic = None
        self._headers_bearer = None
        # Default to Cloud (v3) only for atlassian.net; otherwise prefer v2 (Server/DC)
        self._api_version = '3' if '.atlassian.net' in (config.base_url or '') else '2'
        
    async def initialize(self):
        """Initialize the HTTP client"""
        if not self._client:
            self._client = httpx.AsyncClient(timeout=30.0)
            # Prepare both auth header styles; we'll try Basic first, then Bearer (PAT)
            self._headers_basic = {
                'Authorization': f'Basic {self._get_auth_string()}',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
            self._headers_bearer = {
                'Authorization': f'Bearer {self.cfg.api_token}',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
            # Choose API version heuristically; override to v3 if cloud domain
            self._api_version = '3' if '.atlassian.net' in self.cfg.base_url else '2'
    
    def _get_auth_string(self) -> str:
        """Get base64 encoded auth string"""
        import base64
        auth_string = f"{self.cfg.email}:{self.cfg.api_token}"
        return base64.b64encode(auth_string.encode()).decode()
    
    def _url(self, path: str) -> str:
        """Build full URL"""
        return f"{self.cfg.base_url.rstrip('/')}{path}"

    def _api(self, path: str) -> str:
        """Build REST API path for detected version"""
        # Use generic /search and /project paths that exist in both v2 and v3
        return f"/rest/api/{self._api_version}{path}"
    
    async def search(self, jql: str, max_results: int = 50, fields=None, start_at: int = 0, expand=None):
        """
        Search issues using the correct Jira REST API v3 endpoints
        """
        if not self._client:
            await self.initialize()

        # Use the /search endpoint which exists in both v2 and v3
        try:
            url = f"{self.cfg.base_url.rstrip('/')}{self._api('/search')}"
            params = {
                "jql": jql,
                "maxResults": max_results,
                "startAt": start_at
            }
            # Always specify fields to ensure we get results
            if fields:
                params["fields"] = ",".join(fields) if isinstance(fields, list) else fields
            else:
                # Use a comprehensive set of default fields
                params["fields"] = "key,summary,status,type,assignee,project,created,updated,priority,description"
            if expand:
                params["expand"] = expand
            
            # Detailed logging for debugging
            logger.info("=" * 80)
            logger.info("🔍 EXECUTING JQL QUERY")
            logger.info(f"📋 JQL: {jql}")
            logger.info(f"⚙️  Parameters: maxResults={max_results}, startAt={start_at}, fields={params.get('fields', 'default')}")
            logger.info(f"🌐 API Version: v{self._api_version}, Endpoint: {url}")
            
            resp = await self._get_with_auth(url, params=params)
            
            if resp.status_code == 200:
                data = resp.json()
                total = data.get('total', 0)
                issues_count = len(data.get('issues', []))
                logger.info(f"✅ JQL EXECUTION SUCCESS")
                logger.info(f"📊 Results: {issues_count} issues returned (total matching: {total})")
                logger.info(f"📄 Response details: startAt={data.get('startAt', 0)}, maxResults={data.get('maxResults', 0)}")
                logger.info("=" * 80)
                return data
            else:
                logger.error("=" * 80)
                logger.error("❌ JQL EXECUTION FAILED")
                logger.error(f"📋 JQL: {jql}")
                logger.error(f"🔴 Status Code: {resp.status_code}")
                logger.error(f"📝 Error Response: {resp.text}")
                logger.error("=" * 80)
                return {"issues": [], "total": 0}
                
        except Exception as e:
            logger.error("=" * 80)
            logger.error("❌ JQL EXECUTION EXCEPTION")
            logger.error(f"📋 JQL: {jql}")
            logger.error(f"💥 Exception: {type(e).__name__}: {str(e)}")
            logger.error("=" * 80)
            return {"issues": [], "total": 0}
    
    async def count(self, jql: str) -> int:
        """Get count of issues matching JQL"""
        try:
            result = await self.search(jql, max_results=1)
            if isinstance(result, dict):
                return result.get('total', 0)
            return 0
        except Exception as e:
            logger.error(f"Count query failed: {e}")
            return 0
    
    async def get_projects(self) -> List[Dict[str, Any]]:
        """Get all projects using the correct project endpoint"""
        try:
            url = self._url(self._api('/project'))
            response = await self._get_with_retry(url)
            result = response.json()
            
            # The /rest/api/3/project endpoint returns a list directly, not wrapped in 'values'
            projects = result if isinstance(result, list) else result.get('values', [])
            logger.info(f"Successfully used API v{self._api_version} project endpoint: {len(projects)} projects found")
            return projects
            
        except Exception as e:
            logger.error(f"Failed to get projects: {e}")
            return []
    
    async def get_project_keys(self) -> List[str]:
        """Get list of project keys"""
        try:
            projects = await self.get_projects()
            return [project.get('key', '') for project in projects if project.get('key')]
        except Exception as e:
            logger.error(f"Failed to get project keys: {e}")
            return []

    async def get_assignable_users(self, project_key: str) -> List[Dict[str, Any]]:
        """Get assignable users for a project"""
        try:
            if not self._client:
                await self.initialize()
            path = self._api(f"/user/assignable/search")
            url = self._url(path)
            params = {"project": project_key, "maxResults": 1000}
            resp = await self._get_with_auth(url, params=params)
            if resp.status_code == 200:
                return resp.json()
            logger.error(f"Failed to get assignable users ({resp.status_code}): {resp.text}")
            return []
        except Exception as e:
            logger.error(f"Failed to get assignable users: {e}")
            return []
    
    async def _get_with_retry(self, url: str, max_retries: int = 3) -> httpx.Response:
        """Get with retry logic"""
        if not self._client:
            await self.initialize()
            
        for attempt in range(max_retries):
            try:
                response = await self._get_with_auth(url)
                response.raise_for_status()
                return response
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e
                logger.warning(f"Attempt {attempt + 1} failed: {e}, retrying...")
                await asyncio.sleep(1)

    async def _get_with_auth(self, url: str, params: Optional[dict] = None) -> httpx.Response:
        """Perform GET trying Basic first, then Bearer (PAT) when unauthorized"""
        # Try Basic auth
        resp = await self._client.get(url, headers=self._headers_basic, params=params)
        if resp.status_code == 401:
            # Retry with Bearer in case this is a PAT on Server/DC
            resp = await self._client.get(url, headers=self._headers_bearer, params=params)
        return resp
    
    def get_assignee_info(self, name: str) -> Optional[Dict[str, Any]]:
        """
        Get assignee information by searching LDAP first, then Jira.
        Returns dict with accountId, displayName, email, or None if not found.
        
        This method is synchronous to match the call pattern in jql_processor.
        It handles both sync and async contexts.
        """
        import asyncio
        try:
            # Try to get the current event loop
            try:
                loop = asyncio.get_running_loop()
                # If we're in an async context, we need to use a thread
                import concurrent.futures
                import threading
                
                result = None
                exception = None
                
                def run_in_thread():
                    nonlocal result, exception
                    try:
                        # Create a new event loop for this thread
                        new_loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(new_loop)
                        try:
                            result = new_loop.run_until_complete(self._get_assignee_info_async(name))
                        finally:
                            new_loop.close()
                    except Exception as e:
                        exception = e
                
                thread = threading.Thread(target=run_in_thread)
                thread.start()
                thread.join(timeout=10)  # 10 second timeout
                
                if thread.is_alive():
                    logger.warning(f"Timeout getting assignee info for '{name}'")
                    return None
                
                if exception:
                    raise exception
                return result
                
            except RuntimeError:
                # No running loop, we can use run_until_complete
                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                
                return loop.run_until_complete(self._get_assignee_info_async(name))
        except Exception as e:
            logger.error(f"Error getting assignee info for '{name}': {e}")
            return None
    
    async def _get_assignee_info_async(self, name: str) -> Optional[Dict[str, Any]]:
        """
        Async implementation of get_assignee_info.
        Searches LDAP first, then Jira to find user accountId.
        """
        try:
            # First, try to search LDAP for the user
            ldap_users = await self._search_ldap_users(name)
            
            if ldap_users:
                # Use the first match from LDAP
                ldap_user = ldap_users[0]
                display_name = ldap_user.get('displayName', name)
                
                # Now try to find this user in Jira by searching assignable users
                # We need a project key - try to get from config or use first available project
                project_keys = await self.get_project_keys()
                
                if project_keys:
                    # Search in the first project (or we could search all)
                    jira_users = await self.get_assignable_users(project_keys[0])
                    
                    # Try to match LDAP display name with Jira users
                    for jira_user in jira_users:
                        jira_display_name = jira_user.get('displayName', '')
                        jira_account_id = jira_user.get('accountId') or jira_user.get('key')
                        
                        # Check if names match (case-insensitive, partial match)
                        if display_name.lower() in jira_display_name.lower() or jira_display_name.lower() in display_name.lower():
                            return {
                                'accountId': jira_account_id,
                                'displayName': jira_display_name,
                                'email': jira_user.get('emailAddress', ldap_user.get('email')),
                                'source': 'ldap+jira'
                            }
                    
                    # If no exact match, try searching by email
                    ldap_email = ldap_user.get('email', '')
                    if ldap_email:
                        for jira_user in jira_users:
                            jira_email = jira_user.get('emailAddress', '')
                            if ldap_email.lower() == jira_email.lower():
                                return {
                                    'accountId': jira_user.get('accountId') or jira_user.get('key'),
                                    'displayName': jira_user.get('displayName', display_name),
                                    'email': jira_email,
                                    'source': 'ldap+jira'
                                }
                
                # If we found LDAP user but couldn't match in Jira, return LDAP info
                # The caller can use displayName for JQL matching
                return {
                    'displayName': display_name,
                    'email': ldap_user.get('email'),
                    'sAMAccountName': ldap_user.get('sAMAccountName'),
                    'source': 'ldap_only'
                }
            
            # Fallback: Try to find user directly in Jira by name
            project_keys = await self.get_project_keys()
            if project_keys:
                jira_users = await self.get_assignable_users(project_keys[0])
                
                # Search for name in Jira users
                name_lower = name.lower()
                for jira_user in jira_users:
                    jira_display_name = jira_user.get('displayName', '')
                    if name_lower in jira_display_name.lower() or jira_display_name.lower() in name_lower:
                        return {
                            'accountId': jira_user.get('accountId') or jira_user.get('key'),
                            'displayName': jira_display_name,
                            'email': jira_user.get('emailAddress'),
                            'source': 'jira_only'
                        }
            
            return None
            
        except Exception as e:
            logger.error(f"Error in _get_assignee_info_async for '{name}': {e}")
            return None
    
    async def _search_ldap_users(self, search_term: str, limit: int = 10) -> List[Dict[str, str]]:
        """
        Search LDAP for users matching the search term.
        Returns list of user dicts with displayName, email, sAMAccountName.
        """
        try:
            from services.ldap_auth import authenticate_user_from_ldap
            import os
            from ldap3 import Server, Connection, ALL, SUBTREE, Tls
            import ssl
            from services.encryption import get_encrypted_env
            
            # Get LDAP configuration
            LDAP_SERVICE_ACCOUNT_USERNAME = os.environ.get('LDAP_SERVICE_ACCOUNT_USERNAME')
            LDAP_SERVICE_ACCOUNT_PASSWORD_ENCRYPTED = os.environ.get('LDAP_SERVICE_ACCOUNT_PASSWORD')
            LDAP_SERVER_URL = os.environ.get('LDAP_SERVER_URL')
            
            if not all([LDAP_SERVICE_ACCOUNT_USERNAME, LDAP_SERVICE_ACCOUNT_PASSWORD_ENCRYPTED, LDAP_SERVER_URL]):
                logger.warning("LDAP not configured, cannot search for users")
                return []
            
            # Decrypt service account password
            try:
                LDAP_SERVICE_ACCOUNT_PASSWORD = get_encrypted_env('LDAP_SERVICE_ACCOUNT_PASSWORD')
            except Exception as e:
                logger.error(f"Failed to decrypt LDAP password: {e}")
                return []
            
            # Extract username from domain format
            ldap_username = LDAP_SERVICE_ACCOUNT_USERNAME
            if '\\' in LDAP_SERVICE_ACCOUNT_USERNAME:
                ldap_username = LDAP_SERVICE_ACCOUNT_USERNAME.split('\\')[-1]
            
            LDAP_USER = f"cn={ldap_username},ou=Service Accounts,ou=Security,ou=GIS,dc=global,dc=cdk,dc=com"
            BASE_DN = 'ou=User Accounts,dc=global,dc=cdk,dc=com'
            
            # Connect to LDAP
            is_ldaps = LDAP_SERVER_URL.startswith('ldaps://')
            tls_config = None
            if is_ldaps:
                tls_config = Tls(validate=ssl.CERT_NONE)
            
            server = Server(LDAP_SERVER_URL, get_info=ALL, use_ssl=is_ldaps, tls=tls_config)
            conn = Connection(server, user=LDAP_USER, password=LDAP_SERVICE_ACCOUNT_PASSWORD, auto_bind=True)
            
            # Handle comma-separated names like "Ramesh,Ajith" - search for the full name
            # Also try searching for individual parts
            search_terms = [search_term]
            if ',' in search_term:
                # Add the comma-separated name as-is, and also try reversed
                parts = [p.strip() for p in search_term.split(',')]
                if len(parts) == 2:
                    # Try "Last, First" format
                    search_terms.append(f"{parts[0]},{parts[1]}")
                    # Try "First Last" format
                    search_terms.append(f"{parts[1]} {parts[0]}")
                    # Try "Last First" format
                    search_terms.append(f"{parts[0]} {parts[1]}")
            
            users = []
            seen_display_names = set()
            
            for term in search_terms:
                # Search for users matching the term (in displayName, cn, or sAMAccountName)
                search_filter = f'(|(displayName=*{term}*)(cn=*{term}*)(sAMAccountName=*{term}*))'
                conn.search(
                    BASE_DN,
                    search_filter,
                    search_scope=SUBTREE,
                    attributes=['cn', 'mail', 'sAMAccountName', 'displayName'],
                    size_limit=limit
                )
                
                for entry in conn.entries:
                    display_name = entry.displayName.value if hasattr(entry, 'displayName') and entry.displayName else None
                    if not display_name or display_name in seen_display_names:
                        continue
                    
                    seen_display_names.add(display_name)
                    email = entry.mail.value if hasattr(entry, 'mail') and entry.mail else None
                    sam_account = entry.sAMAccountName.value if hasattr(entry, 'sAMAccountName') and entry.sAMAccountName else None
                    
                    users.append({
                        'displayName': display_name,
                        'email': email or f"{sam_account}@cdk.com" if sam_account else None,
                        'sAMAccountName': sam_account
                    })
                    
                    if len(users) >= limit:
                        break
                
                if len(users) >= limit:
                    break
            
            conn.unbind()
            return users[:limit]
            
        except Exception as e:
            logger.error(f"LDAP user search failed: {e}")
            return []
    
    async def close(self):
        """Close the HTTP client"""
        if self._client:
            await self._client.aclose()
            self._client = None
