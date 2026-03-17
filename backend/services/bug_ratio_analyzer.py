"""
Bug Discovery Ratio Analyzer Module

Analyzes bug discovery ratio metrics for portfolios by comparing 
bugs found vs test cases executed in a given period.

Formula: Bug Discovery Ratio = Bugs Found / Test Cases Executed

Author: FalconX Team
Created: 2025-01-XX
"""

from typing import Dict, List
from datetime import datetime
import logging
from openai import AsyncOpenAI
import os

logger = logging.getLogger(__name__)

class BugRatioAnalyzer:
    """
    Analyze bug discovery ratio metrics for quality reporting
    
    Bug Discovery Ratio measures how many bugs are found per test case 
    executed, indicating test effectiveness and code quality.
    
    Lower ratio = Better code quality or more effective tests
    Target: 0.02-0.05 (2-5 bugs per 100 tests)
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
    
    async def _get_bugs_in_period(self, project_key: str, date_from: str, date_to: str) -> int:
        """Get count of bugs found in date range"""
        jql = f'project = "{project_key}" AND type = Bug AND createdDate >= "{date_from}" AND createdDate <= "{date_to}"'
        try:
            all_issues = await self._fetch_all_issues(jql)
            count = len(all_issues)
            logger.info(f"📊 Found {count} bugs in period {date_from} to {date_to}")
            return count
        except Exception as e:
            logger.error(f"❌ Error querying bugs: {e}")
            return 0
    
    async def _get_executed_test_cases(self, project_key: str, date_from: str, date_to: str) -> int:
        """Get count of test cases executed in date range"""
        # Test cases that were executed (completed status = Accepted)
        # For test cases: execution status uses the Jira status field
        # Completed execution: Accepted
        # In-progress execution: Pending Approval, In Progress
        jql = f'project = "{project_key}" AND type = Test AND status = "Accepted" AND updatedDate >= "{date_from}" AND updatedDate <= "{date_to}"'
        try:
            all_issues = await self._fetch_all_issues(jql)
            count = len(all_issues)
            logger.info(f"📊 Found {count} executed test cases in period {date_from} to {date_to}")
            return count
        except Exception as e:
            logger.error(f"❌ Error querying executed test cases: {e}")
            return 0
    
    async def analyze_single_period(self, portfolio: str, period_from: str, period_to: str) -> Dict:
        """Analyze bug discovery ratio for a single period"""
        logger.info(f"📊 Analyzing bug discovery ratio for {portfolio} (single period)")
        logger.info(f"   Period: {period_from} to {period_to}")
        
        try:
            project_key = await self._resolve_project_key(portfolio)
            logger.info(f"🔑 Using project key: {project_key}")
            
            bugs_found = await self._get_bugs_in_period(project_key, period_from, period_to)
            test_cases_executed = await self._get_executed_test_cases(project_key, period_from, period_to)
            
            ratio = (bugs_found / test_cases_executed) if test_cases_executed > 0 else 0
            
            ai_analysis = await self._generate_single_period_ai_analysis(
                portfolio=portfolio,
                bugs_found=bugs_found,
                test_cases_executed=test_cases_executed,
                ratio=ratio,
                period_label=f"{period_to}"
            )
            
            result = {
                "portfolio": portfolio,
                "project_key": project_key,
                "period": {
                    "from": period_from,
                    "to": period_to,
                    "bugs_found": bugs_found,
                    "test_cases_executed": test_cases_executed,
                    "ratio": round(ratio, 4)
                },
                "ai_analysis": ai_analysis
            }
            
            logger.info(f"✅ Bug discovery ratio analysis completed")
            logger.info(f"   Ratio: {bugs_found}/{test_cases_executed} = {ratio:.4f}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Bug discovery ratio analysis failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise
    
    async def compare_periods(self, portfolio: str, period1_from: str, period1_to: str, period2_from: str, period2_to: str) -> Dict:
        """Compare bug discovery ratio between two periods"""
        logger.info(f"📊 Analyzing bug discovery ratio for {portfolio}")
        logger.info(f"   Period 1: {period1_from} to {period1_to}")
        logger.info(f"   Period 2: {period2_from} to {period2_to}")
        
        try:
            project_key = await self._resolve_project_key(portfolio)
            logger.info(f"🔑 Using project key: {project_key}")
            
            period1_bugs = await self._get_bugs_in_period(project_key, period1_from, period1_to)
            period1_tests = await self._get_executed_test_cases(project_key, period1_from, period1_to)
            period2_bugs = await self._get_bugs_in_period(project_key, period2_from, period2_to)
            period2_tests = await self._get_executed_test_cases(project_key, period2_from, period2_to)
            
            period1_ratio = (period1_bugs / period1_tests) if period1_tests > 0 else 0
            period2_ratio = (period2_bugs / period2_tests) if period2_tests > 0 else 0
            
            ratio_change = period2_ratio - period1_ratio
            bugs_change = period2_bugs - period1_bugs
            tests_change = period2_tests - period1_tests
            
            ai_analysis = await self._generate_ai_analysis(
                portfolio=portfolio,
                period1_bugs=period1_bugs,
                period1_tests=period1_tests,
                period1_ratio=period1_ratio,
                period2_bugs=period2_bugs,
                period2_tests=period2_tests,
                period2_ratio=period2_ratio,
                ratio_change=ratio_change,
                bugs_change=bugs_change,
                tests_change=tests_change,
                period1_label=f"{period1_to}",
                period2_label=f"{period2_to}"
            )
            
            result = {
                "portfolio": portfolio,
                "project_key": project_key,
                "period1": {
                    "from": period1_from,
                    "to": period1_to,
                    "bugs_found": period1_bugs,
                    "test_cases_executed": period1_tests,
                    "ratio": round(period1_ratio, 4)
                },
                "period2": {
                    "from": period2_from,
                    "to": period2_to,
                    "bugs_found": period2_bugs,
                    "test_cases_executed": period2_tests,
                    "ratio": round(period2_ratio, 4)
                },
                "progress": {
                    "ratio_change": round(ratio_change, 4),
                    "bugs_change": bugs_change,
                    "tests_change": tests_change,
                    "trend": "improving" if ratio_change < 0 else "declining" if ratio_change > 0 else "stable"
                },
                "ai_analysis": ai_analysis
            }
            
            logger.info(f"✅ Bug discovery ratio analysis completed")
            logger.info(f"   Period 1: {period1_ratio:.4f} | Period 2: {period2_ratio:.4f} | Change: {ratio_change:+.4f}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Bug discovery ratio analysis failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise
    
    async def _generate_ai_analysis(self, portfolio: str, period1_bugs: int, period1_tests: int, period1_ratio: float,
                                   period2_bugs: int, period2_tests: int, period2_ratio: float,
                                   ratio_change: float, bugs_change: int, tests_change: int,
                                   period1_label: str, period2_label: str) -> str:
        """Generate AI analysis for bug discovery ratio comparison"""
        try:
            try:
                period1_date = datetime.strptime(period1_label, "%Y-%m-%d").strftime("%B %d, %Y")
            except:
                period1_date = period1_label
            
            try:
                period2_date = datetime.strptime(period2_label, "%Y-%m-%d").strftime("%B %d, %Y")
            except:
                period2_date = period2_label
            
            prompt = f"""You are a Senior Quality Engineering Manager analyzing bug discovery ratio progress for the {portfolio} portfolio.

Current Situation:
- Portfolio: {portfolio}
- As of {period1_date}: {period1_bugs} bugs, {period1_tests} tests executed, ratio {period1_ratio:.4f} ({period1_ratio*100:.2f} bugs per 100 tests)
- As of {period2_date}: {period2_bugs} bugs, {period2_tests} tests executed, ratio {period2_ratio:.4f} ({period2_ratio*100:.2f} bugs per 100 tests)
- Ratio Change: {"+" if ratio_change >= 0 else ""}{ratio_change:.4f}
- Bugs Change: {"+" if bugs_change >= 0 else ""}{bugs_change}
- Tests Change: {"+" if tests_change >= 0 else ""}{tests_change}

Note: Lower ratio is better (fewer bugs per test). Ratio change < 0 means improvement.

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
            if ratio_change < 0:
                return f"Bug discovery ratio improved from {period1_ratio:.4f} to {period2_ratio:.4f} ({ratio_change:.4f}). This indicates fewer bugs found per test executed, suggesting improved code quality or more effective testing. Continue maintaining this trend."
            elif ratio_change > 0:
                return f"Bug discovery ratio increased from {period1_ratio:.4f} to {period2_ratio:.4f} (+{ratio_change:.4f}). Current status: {period2_bugs} bugs found during {period2_tests} test executions. Review the bugs to identify patterns and improve code quality or test effectiveness."
            else:
                return f"Bug discovery ratio remained stable at {period2_ratio:.4f}. Current status: {period2_bugs} bugs found during {period2_tests} test executions. This ratio is within the acceptable range of 0.02-0.05. Continue monitoring to ensure it stays within acceptable limits."
    
    async def _generate_single_period_ai_analysis(self, portfolio: str, bugs_found: int, test_cases_executed: int,
                                                  ratio: float, period_label: str) -> str:
        """Generate AI analysis for single period bug discovery ratio"""
        try:
            try:
                period_date = datetime.strptime(period_label, "%Y-%m-%d").strftime("%B %d, %Y")
            except:
                period_date = period_label
            
            prompt = f"""You are a Senior Quality Engineering Manager analyzing bug discovery ratio status for the {portfolio} portfolio.

Current Situation:
- Portfolio: {portfolio}
- Bugs Found: {bugs_found}
- Test Cases Executed: {test_cases_executed}
- As of {period_date}: Ratio {ratio:.4f} ({ratio*100:.2f} bugs per 100 tests)

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
            if ratio < 0.02:
                return f"Bug discovery ratio is excellent at {ratio:.4f} ({ratio*100:.2f} bugs per 100 tests), with {bugs_found} bugs found during {test_cases_executed} test executions. This indicates very good code quality or highly effective testing. Continue maintaining this low ratio."
            elif ratio <= 0.05:
                return f"Bug discovery ratio is acceptable at {ratio:.4f} ({ratio*100:.2f} bugs per 100 tests), with {bugs_found} bugs found during {test_cases_executed} test executions. This is within the industry standard range of 2-5 bugs per 100 tests. Continue monitoring to ensure it stays within acceptable limits."
            else:
                return f"Bug discovery ratio is high at {ratio:.4f} ({ratio*100:.2f} bugs per 100 tests), with {bugs_found} bugs found during {test_cases_executed} test executions. This exceeds the acceptable range. Review the bugs to identify patterns, improve code quality, or enhance test effectiveness to reduce the ratio."

