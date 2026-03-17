"""
Test to Story Ratio Analyzer Module

Analyzes test to story ratio metrics for portfolios by comparing 
total test cases vs total stories.

Formula: Test to Story Ratio = Total Test Cases / Total Stories

Author: FalconX Team
Created: 2025-01-XX
"""

from typing import Dict, List
from datetime import datetime
import logging
from openai import AsyncOpenAI
import os

logger = logging.getLogger(__name__)

class TestStoryRatioAnalyzer:
    """
    Analyze test to story ratio metrics for quality reporting
    
    Test to Story Ratio measures the average number of test cases 
    per story, indicating test coverage depth.
    
    Higher ratio = More comprehensive testing
    Target: 3-5 tests per story (industry standard)
    """
    
    def __init__(self, jira_client):
        self.jira = jira_client
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_API_ENDPOINT")
        if base_url and api_key:
            from services.ai_engine import create_databricks_async_openai_client
            self.openai = create_databricks_async_openai_client(api_key, base_url)
        elif api_key:
            self.openai = AsyncOpenAI(api_key=api_key)
        else:
            self.openai = AsyncOpenAI()
        self.model = os.getenv("OPENAI_MODEL", "databricks-gpt-5-1")
        
        self.portfolio_projects: Dict[str, Dict[str, str]] = {
            "Data Solutions": {"name": "CDK Intelligence Suite", "key": "NDP"},
            "Data Platforms": {"name": "CRM - Artificial Intelligence", "key": "CRM"},
            "ELSCRM": {"name": "CLS-CRM", "key": "ELSCRM"}
        }
    
    async def _resolve_project_key(self, portfolio: str) -> str:
        """Resolve project key from project name or key"""
        for label, cfg in self.portfolio_projects.items():
            if portfolio.lower() in {label.lower(), cfg["name"].lower(), cfg["key"].lower()}:
                return cfg["key"]
        if len(portfolio) <= 6 and portfolio.isupper():
            return portfolio
        
        try:
            projects = await self.jira.get_projects()
            portfolio_upper = portfolio.upper()
            
            for project in projects:
                project_name = (project.get('name', '') or '').upper()
                project_key = project.get('key', '') or ''
                
                if portfolio_upper in project_name or portfolio_upper == project_key.upper():
                    logger.info(f"✅ Resolved '{portfolio}' → project key '{project_key}'")
                    return project_key
            
            if 'CDK' in portfolio_upper or 'INTELLIGENCE' in portfolio_upper:
                for project in projects:
                    project_name = (project.get('name', '') or '').upper()
                    if 'CDK' in project_name and 'INTELLIGENCE' in project_name:
                        project_key = project.get('key', '')
                        logger.info(f"✅ Found CDK Intelligence Suite → project key '{project_key}'")
                        return project_key
            
            logger.warning(f"⚠️ Could not resolve project key for '{portfolio}', using as-is")
            return portfolio
            
        except Exception as e:
            logger.error(f"❌ Failed to resolve project key: {e}")
            return portfolio
    
    async def _fetch_all_issues(self, jql: str) -> List[Dict]:
        """Fetch all issues from Jira with pagination support"""
        all_issues = []
        start_at = 0
        max_results_per_page = 2000
        total_count = None
        
        while True:
            try:
                results = await self.jira.search(jql, max_results=max_results_per_page, start_at=start_at)
                
                if isinstance(results, dict):
                    issues = results.get('issues', [])
                    if total_count is None:
                        total_count = results.get('total', 0)
                else:
                    issues = results if isinstance(results, list) else []
                    if total_count is None:
                        total_count = len(issues)
                
                if not issues:
                    break
                
                all_issues.extend(issues)
                
                if total_count and len(all_issues) >= total_count:
                    break
                
                if len(issues) < max_results_per_page:
                    break
                
                start_at += max_results_per_page
                
                if len(all_issues) > 100000:
                    break
                    
            except Exception as e:
                logger.error(f"❌ Error fetching page at start_at={start_at}: {e}")
                break
        
        return all_issues
    
    async def _get_total_test_cases(self, project_key: str, period_from: str = None, period_to: str = None) -> int:
        """Get total count of test cases, optionally filtered by date range"""
        jql = f'project = "{project_key}" AND type = Test'
        
        # Add date filter if provided
        if period_from and period_to:
            jql += f' AND (createdDate >= "{period_from}" AND createdDate <= "{period_to}")'
        elif period_to:
            jql += f' AND (createdDate <= "{period_to}" OR updatedDate <= "{period_to}")'
        
        try:
            all_issues = await self._fetch_all_issues(jql)
            count = len(all_issues)
            date_info = f" for period {period_from} to {period_to}" if period_from and period_to else (f" up to {period_to}" if period_to else "")
            logger.info(f"📊 Found {count} total test cases for {project_key}{date_info}")
            return count
        except Exception as e:
            logger.error(f"❌ Error querying total test cases: {e}")
            return 0
    
    async def _get_total_stories(self, project_key: str, period_from: str = None, period_to: str = None) -> int:
        """Get total count of stories, optionally filtered by date range"""
        jql = f'project = "{project_key}" AND type = Story'
        
        # Add date filter if provided
        if period_from and period_to:
            jql += f' AND (createdDate >= "{period_from}" AND updatedDate <= "{period_to}")'
        elif period_to:
            jql += f' AND (createdDate <= "{period_to}" OR updatedDate <= "{period_to}")'
        
        try:
            all_issues = await self._fetch_all_issues(jql)
            count = len(all_issues)
            date_info = f" for period {period_from} to {period_to}" if period_from and period_to else (f" up to {period_to}" if period_to else "")
            logger.info(f"📊 Found {count} total stories for {project_key}{date_info}")
            return count
        except Exception as e:
            logger.error(f"❌ Error querying total stories: {e}")
            return 0
    
    async def analyze_single_period(self, portfolio: str, period_from: str, period_to: str) -> Dict:
        """Analyze test to story ratio for a single period"""
        logger.info(f"📊 Analyzing test to story ratio for {portfolio} (single period)")
        logger.info(f"   Period: {period_from} to {period_to}")
        
        try:
            project_key = await self._resolve_project_key(portfolio)
            logger.info(f"🔑 Using project key: {project_key}")
            
            # Get test cases and stories filtered by date range
            total_test_cases = await self._get_total_test_cases(project_key, period_from=period_from, period_to=period_to)
            total_stories = await self._get_total_stories(project_key, period_from=period_from, period_to=period_to)
            
            ratio = (total_test_cases / total_stories) if total_stories > 0 else 0
            
            ai_analysis = await self._generate_single_period_ai_analysis(
                portfolio=portfolio,
                total_test_cases=total_test_cases,
                total_stories=total_stories,
                ratio=ratio,
                period_label=f"{period_to}"
            )
            
            result = {
                "portfolio": portfolio,
                "project_key": project_key,
                "period": {
                    "from": period_from,
                    "to": period_to,
                    "total_test_cases": total_test_cases,
                    "total_stories": total_stories,
                    "ratio": round(ratio, 2)
                },
                "ai_analysis": ai_analysis
            }
            
            logger.info(f"✅ Test to story ratio analysis completed")
            logger.info(f"   Ratio: {total_test_cases}/{total_stories} = {ratio:.2f}:1")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Test to story ratio analysis failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise
    
    async def compare_periods(self, portfolio: str, period1_from: str, period1_to: str, period2_from: str, period2_to: str) -> Dict:
        """Compare test to story ratio between two periods"""
        logger.info(f"📊 Analyzing test to story ratio for {portfolio}")
        logger.info(f"   Period 1: {period1_from} to {period1_to}")
        logger.info(f"   Period 2: {period2_from} to {period2_to}")
        
        try:
            project_key = await self._resolve_project_key(portfolio)
            logger.info(f"🔑 Using project key: {project_key}")
            
            # Get test cases and stories for each period (filtered by date range)
            period1_test_cases = await self._get_total_test_cases(project_key, period_from=period1_from, period_to=period1_to)
            period1_stories = await self._get_total_stories(project_key, period_from=period1_from, period_to=period1_to)
            period2_test_cases = await self._get_total_test_cases(project_key, period_from=period2_from, period_to=period2_to)
            period2_stories = await self._get_total_stories(project_key, period_from=period2_from, period_to=period2_to)
            
            period1_ratio = (period1_test_cases / period1_stories) if period1_stories > 0 else 0
            period2_ratio = (period2_test_cases / period2_stories) if period2_stories > 0 else 0
            
            ratio_change = period2_ratio - period1_ratio
            test_cases_change = period2_test_cases - period1_test_cases
            stories_change = period2_stories - period1_stories
            
            ai_analysis = await self._generate_ai_analysis(
                portfolio=portfolio,
                period1_test_cases=period1_test_cases,
                period1_stories=period1_stories,
                period1_ratio=period1_ratio,
                period2_test_cases=period2_test_cases,
                period2_stories=period2_stories,
                period2_ratio=period2_ratio,
                ratio_change=ratio_change,
                test_cases_change=test_cases_change,
                stories_change=stories_change,
                period1_label=f"{period1_to}",
                period2_label=f"{period2_to}"
            )
            
            result = {
                "portfolio": portfolio,
                "project_key": project_key,
                "period1": {
                    "from": period1_from,
                    "to": period1_to,
                    "total_test_cases": period1_test_cases,
                    "total_stories": period1_stories,
                    "ratio": round(period1_ratio, 2)
                },
                "period2": {
                    "from": period2_from,
                    "to": period2_to,
                    "total_test_cases": period2_test_cases,
                    "total_stories": period2_stories,
                    "ratio": round(period2_ratio, 2)
                },
                "progress": {
                    "ratio_change": round(ratio_change, 2),
                    "test_cases_change": test_cases_change,
                    "stories_change": stories_change,
                    "trend": "improving" if ratio_change > 0 else "declining" if ratio_change < 0 else "stable"
                },
                "ai_analysis": ai_analysis
            }
            
            logger.info(f"✅ Test to story ratio analysis completed")
            logger.info(f"   Period 1: {period1_ratio:.2f}:1 | Period 2: {period2_ratio:.2f}:1 | Change: {ratio_change:+.2f}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Test to story ratio analysis failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise
    
    async def _generate_ai_analysis(self, portfolio: str, period1_test_cases: int, period1_stories: int, period1_ratio: float,
                                   period2_test_cases: int, period2_stories: int, period2_ratio: float,
                                   ratio_change: float, test_cases_change: int, stories_change: int,
                                   period1_label: str, period2_label: str) -> str:
        """Generate AI analysis for test to story ratio comparison"""
        try:
            try:
                period1_date = datetime.strptime(period1_label, "%Y-%m-%d").strftime("%B %d, %Y")
            except:
                period1_date = period1_label
            
            try:
                period2_date = datetime.strptime(period2_label, "%Y-%m-%d").strftime("%B %d, %Y")
            except:
                period2_date = period2_label
            
            prompt = f"""You are a Senior Quality Engineering Manager analyzing test to story ratio progress for the {portfolio} portfolio.

Current Situation:
- Portfolio: {portfolio}
- As of {period1_date}: {period1_test_cases} test cases, {period1_stories} stories, ratio {period1_ratio:.2f}:1
- As of {period2_date}: {period2_test_cases} test cases, {period2_stories} stories, ratio {period2_ratio:.2f}:1
- Ratio Change: {"+" if ratio_change >= 0 else ""}{ratio_change:.2f}
- Test Cases Change: {"+" if test_cases_change >= 0 else ""}{test_cases_change}
- Stories Change: {"+" if stories_change >= 0 else ""}{stories_change}

Provide a concise, professional analysis (2-3 sentences) that:
1. Summarizes the ratio trend
2. Highlights key numbers
3. Provides actionable next steps

Be conversational and human-friendly."""

            response = await self.openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert Quality Engineering Manager providing clear, actionable insights."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=300
            )
            
            analysis = response.choices[0].message.content.strip()
            logger.info(f"✅ AI analysis generated: {analysis[:100]}...")
            return analysis
            
        except Exception as e:
            logger.error(f"❌ AI analysis generation failed: {e}")
            if ratio_change > 0:
                return f"Test to story ratio improved from {period1_ratio:.2f}:1 to {period2_ratio:.2f}:1 (+{ratio_change:.2f}). This indicates stronger test coverage with more test cases per story. Continue maintaining this ratio to ensure comprehensive testing."
            elif ratio_change < 0:
                return f"Test to story ratio declined from {period1_ratio:.2f}:1 to {period2_ratio:.2f}:1 ({ratio_change:.2f}). Current status: {period2_test_cases} test cases for {period2_stories} stories. Review recent story additions to ensure they have adequate test coverage."
            else:
                return f"Test to story ratio remained stable at {period2_ratio:.2f}:1. Current status: {period2_test_cases} test cases for {period2_stories} stories. This ratio meets the industry standard of 3-5 tests per story. Continue maintaining this level of test coverage."
    
    async def _generate_single_period_ai_analysis(self, portfolio: str, total_test_cases: int, total_stories: int,
                                                  ratio: float, period_label: str) -> str:
        """Generate AI analysis for single period test to story ratio"""
        try:
            try:
                period_date = datetime.strptime(period_label, "%Y-%m-%d").strftime("%B %d, %Y")
            except:
                period_date = period_label
            
            prompt = f"""You are a Senior Quality Engineering Manager analyzing test to story ratio status for the {portfolio} portfolio.

Current Situation:
- Portfolio: {portfolio}
- Total Test Cases: {total_test_cases}
- Total Stories: {total_stories}
- As of {period_date}: Ratio {ratio:.2f}:1

Provide a concise, professional analysis (2-3 sentences) that:
1. Summarizes the current ratio status
2. Highlights key numbers
3. Provides actionable next steps

Be conversational and human-friendly."""

            response = await self.openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert Quality Engineering Manager providing clear, actionable insights."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=300
            )
            
            analysis = response.choices[0].message.content.strip()
            logger.info(f"✅ AI analysis generated: {analysis[:100]}...")
            return analysis
            
        except Exception as e:
            logger.error(f"❌ AI analysis generation failed: {e}")
            if ratio >= 5:
                return f"Test to story ratio is excellent at {ratio:.2f}:1, with {total_test_cases} test cases covering {total_stories} stories. This indicates comprehensive test coverage. Continue maintaining this high ratio for critical stories."
            elif ratio >= 3:
                return f"Test to story ratio is strong at {ratio:.2f}:1, with {total_test_cases} test cases covering {total_stories} stories. This meets the industry standard of 3-5 tests per story. Continue maintaining this level of coverage."
            elif ratio >= 2:
                return f"Test to story ratio is moderate at {ratio:.2f}:1, with {total_test_cases} test cases covering {total_stories} stories. While below the 3-5 target, consider adding more test cases for complex or high-risk stories to improve coverage depth."
            else:
                return f"Test to story ratio needs improvement at {ratio:.2f}:1, with {total_test_cases} test cases covering {total_stories} stories. This is below the industry standard. Prioritize adding test cases for critical stories to reach the 3-5 tests per story target."

