"""
Regression Automation Analyzer Module

Analyzes regression test automation metrics for portfolios by comparing 
automated vs manual regression tests across different time periods.

Formula: Regression Automation % = Automated Regression Tests / Total Regression Tests × 100

Author: FalconX Team
Created: 2025-12-06
"""

from typing import Dict, List, Optional
from datetime import datetime
import logging
from openai import AsyncOpenAI
import os

logger = logging.getLogger(__name__)

class RegressionAutomationAnalyzer:
    """
    Analyze regression automation metrics for quality reporting
    
    Regression Automation measures the percentage of regression test cases
    that are automated vs manual.
    
    Higher automation = Better CI/CD readiness and faster feedback
    Target: > 80% (industry standard)
    """
    
    def __init__(self, jira_client):
        """
        Initialize analyzer with Jira client
        
        Args:
            jira_client: JiraClient instance for querying issues
        """
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
        
        # Portfolio → project mapping
        self.portfolio_projects: Dict[str, Dict[str, str]] = {
            # Data Solutions → CDK Intelligence Suite (NDP)
            "Data Solutions": {"name": "CDK Intelligence Suite", "key": "NDP"},
            # Data Platforms → CRM - Artificial Intelligence (CRM)
            "Data Platforms": {"name": "CRM - Artificial Intelligence", "key": "CRM"},
            # Additional explicit project under Data Solutions
            "ELSCRM": {"name": "CLS-CRM", "key": "ELSCRM"}
        }
    
    async def _resolve_project_key(self, portfolio: str) -> str:
        """
        Resolve project key from project name or key
        
        Args:
            portfolio: Project name (e.g., "CDK Intelligence Suite") or key
        
        Returns:
            Project key for JQL queries
        """
        # Check explicit mapping first
        for label, cfg in self.portfolio_projects.items():
            if portfolio.lower() in {label.lower(), cfg["name"].lower(), cfg["key"].lower()}:
                return cfg["key"]
        # If it's already a probable key, accept it as-is
        if len(portfolio) <= 6 and portfolio.isupper():
            return portfolio
        
        # Otherwise, search for project by name
        try:
            projects = await self.jira.get_projects()
            portfolio_upper = portfolio.upper()
            
            # Find matching project
            for project in projects:
                project_name = (project.get('name', '') or '').upper()
                project_key = project.get('key', '') or ''
                
                if portfolio_upper in project_name or portfolio_upper == project_key.upper():
                    logger.info(f"✅ Resolved '{portfolio}' → project key '{project_key}'")
                    return project_key
            
            # If exact match not found, look for "CDK Intelligence Suite"
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
        """
        Fetch all issues from Jira with pagination support
        
        Args:
            jql: JQL query string
        
        Returns:
            List of all issues
        """
        all_issues = []
        start_at = 0
        max_results_per_page = 2000  # Jira API limit per page
        total_count = None
        
        while True:
            try:
                results = await self.jira.search(jql, max_results=max_results_per_page, start_at=start_at)
                
                if isinstance(results, dict):
                    issues = results.get('issues', [])
                    # Get total count from first page
                    if total_count is None:
                        total_count = results.get('total', 0)
                        logger.info(f"📊 Total issues available: {total_count}")
                else:
                    issues = results if isinstance(results, list) else []
                    if total_count is None:
                        total_count = len(issues)
                
                if not issues:
                    break
                
                all_issues.extend(issues)
                logger.info(f"📄 Fetched page: {len(issues)} issues (Total so far: {len(all_issues)}/{total_count if total_count else 'unknown'})")
                
                # Check if we've fetched all issues
                if total_count and len(all_issues) >= total_count:
                    break
                
                # Check if this was the last page (fewer results than requested)
                if len(issues) < max_results_per_page:
                    break
                
                start_at += max_results_per_page
                
                # Safety limit to prevent infinite loops
                if len(all_issues) > 100000:  # Max 100k issues
                    logger.warning(f"⚠️ Reached safety limit of 100k issues, stopping pagination")
                    break
                    
            except Exception as e:
                logger.error(f"❌ Error fetching page at start_at={start_at}: {e}")
                break
        
        logger.info(f"✅ Total issues fetched: {len(all_issues)}")
        return all_issues
    
    async def _get_regression_tests_snapshot(self, project_key: str, end_date: str, automated: bool = True) -> int:
        """
        Get count of regression tests as of a specific date (snapshot approach - Option A)
        
        Args:
            project_key: Jira project key
            end_date: End date in YYYY-MM-DD format (snapshot as of this date)
            automated: True for automated tests, False for manual (non-automated) tests
        
        Returns:
            Count of regression tests
        """
        if automated:
            # Automated regression tests as of end_date
            jql = f'project = "{project_key}" AND type = Test AND "Test Type" = "Regression Testing" AND "Test Status" = Automated AND updatedDate <= "{end_date} 23:59"'
        else:
            # Manual (non-automated) regression tests as of end_date
            jql = f'project = "{project_key}" AND type = Test AND "Test Type" = "Regression Testing" AND "Test Status" != Automated AND updatedDate <= "{end_date} 23:59"'
        
        try:
            all_issues = await self._fetch_all_issues(jql)
            count = len(all_issues)
            logger.info(f"📊 Found {count} {'automated' if automated else 'manual'} regression tests as of {end_date}")
            return count
        except Exception as e:
            logger.error(f"❌ Error querying regression tests: {e}")
            return 0
    
    async def _get_total_regression_tests(self, project_key: str) -> int:
        """
        Get total count of regression test cases (current total)
        
        Args:
            project_key: Jira project key
        
        Returns:
            Total count of regression tests
        """
        jql = f'project = "{project_key}" AND type = Test AND "Test Type" = "Regression Testing"'
        
        try:
            all_issues = await self._fetch_all_issues(jql)
            count = len(all_issues)
            logger.info(f"📊 Found {count} total regression tests for {project_key}")
            return count
        except Exception as e:
            logger.error(f"❌ Error querying total regression tests: {e}")
            return 0
    
    async def analyze_single_period(self,
                                   portfolio: str,
                                   period_from: str,
                                   period_to: str) -> Dict:
        """
        Analyze regression automation metrics for a single period (no comparison)
        
        Args:
            portfolio: Jira project name or key
            period_from: Period start date (YYYY-MM-DD)
            period_to: Period end date (YYYY-MM-DD) - snapshot as of this date
        
        Returns:
            Dict containing:
            - total_regression_tests: Total regression test cases
            - period_automated: Automated tests as of period end
            - period_manual: Manual tests as of period end
            - period_percentage: Automation % for period
            - ai_analysis: AI-generated insights
        """
        logger.info(f"📊 Analyzing regression automation for {portfolio} (single period)")
        logger.info(f"   Period: {period_from} to {period_to}")
        
        try:
            # Resolve project key
            project_key = await self._resolve_project_key(portfolio)
            logger.info(f"🔑 Using project key: {project_key}")
            
            # Get total regression tests (current total)
            total_regression_tests = await self._get_total_regression_tests(project_key)
            
            # Get snapshot counts for the period (as of period_to)
            period_automated = await self._get_regression_tests_snapshot(project_key, period_to, automated=True)
            period_manual = await self._get_regression_tests_snapshot(project_key, period_to, automated=False)
            
            # Calculate percentage
            period_percentage = (period_automated / total_regression_tests * 100) if total_regression_tests > 0 else 0
            
            # Generate AI analysis for single period
            ai_analysis = await self._generate_single_period_ai_analysis(
                total_regression_tests=total_regression_tests,
                period_automated=period_automated,
                period_manual=period_manual,
                period_percentage=period_percentage,
                period_label=f"{period_to}"
            )
            
            result = {
                "portfolio": portfolio,
                "project_key": project_key,
                "total_regression_tests": total_regression_tests,
                "period": {
                    "from": period_from,
                    "to": period_to,
                    "automated_count": period_automated,
                    "manual_count": period_manual,
                    "automation_percentage": round(period_percentage, 1)
                },
                "ai_analysis": ai_analysis
            }
            
            logger.info(f"✅ Regression automation analysis completed")
            logger.info(f"   Period: {period_automated}/{total_regression_tests} ({period_percentage:.1f}%)")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Regression automation analysis failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise
    
    async def compare_periods(self,
                            portfolio: str,
                            period1_from: str,
                            period1_to: str,
                            period2_from: str,
                            period2_to: str) -> Dict:
        """
        Compare regression automation metrics between two periods (Option A - Snapshot)
        
        Args:
            portfolio: Jira project name or key
            period1_from: First period start date (YYYY-MM-DD)
            period1_to: First period end date (YYYY-MM-DD) - snapshot as of this date
            period2_from: Second period start date (YYYY-MM-DD)
            period2_to: Second period end date (YYYY-MM-DD) - snapshot as of this date
        
        Returns:
            Dict containing:
            - total_regression_tests: Total regression test cases
            - period1_automated: Automated tests as of period1 end
            - period1_manual: Manual tests as of period1 end
            - period1_percentage: Automation % for period1
            - period2_automated: Automated tests as of period2 end
            - period2_manual: Manual tests as of period2 end
            - period2_percentage: Automation % for period2
            - progress: Change in automation percentage
            - new_automated: New tests automated between periods
            - ai_analysis: AI-generated insights
        """
        logger.info(f"📊 Analyzing regression automation for {portfolio}")
        logger.info(f"   Period 1: {period1_from} to {period1_to}")
        logger.info(f"   Period 2: {period2_from} to {period2_to}")
        
        try:
            # Resolve project key
            project_key = await self._resolve_project_key(portfolio)
            logger.info(f"🔑 Using project key: {project_key}")
            
            # Get total regression tests (current total)
            total_regression_tests = await self._get_total_regression_tests(project_key)
            
            # Get snapshot counts for period 1 (as of period1_to)
            period1_automated = await self._get_regression_tests_snapshot(project_key, period1_to, automated=True)
            period1_manual = await self._get_regression_tests_snapshot(project_key, period1_to, automated=False)
            
            # Get snapshot counts for period 2 (as of period2_to)
            period2_automated = await self._get_regression_tests_snapshot(project_key, period2_to, automated=True)
            period2_manual = await self._get_regression_tests_snapshot(project_key, period2_to, automated=False)
            
            # Calculate percentages
            period1_percentage = (period1_automated / total_regression_tests * 100) if total_regression_tests > 0 else 0
            period2_percentage = (period2_automated / total_regression_tests * 100) if total_regression_tests > 0 else 0
            
            # Calculate progress
            progress = period2_percentage - period1_percentage
            new_automated = period2_automated - period1_automated
            
            # Generate AI analysis
            ai_analysis = await self._generate_ai_analysis(
                total_regression_tests=total_regression_tests,
                period1_automated=period1_automated,
                period1_manual=period1_manual,
                period1_percentage=period1_percentage,
                period2_automated=period2_automated,
                period2_manual=period2_manual,
                period2_percentage=period2_percentage,
                progress=progress,
                new_automated=new_automated,
                period1_label=f"{period1_to}",
                period2_label=f"{period2_to}"
            )
            
            result = {
                "portfolio": portfolio,
                "project_key": project_key,
                "total_regression_tests": total_regression_tests,
                "period1": {
                    "from": period1_from,
                    "to": period1_to,
                    "automated_count": period1_automated,
                    "manual_count": period1_manual,
                    "automation_percentage": round(period1_percentage, 1)
                },
                "period2": {
                    "from": period2_from,
                    "to": period2_to,
                    "automated_count": period2_automated,
                    "manual_count": period2_manual,
                    "automation_percentage": round(period2_percentage, 1)
                },
                "progress": {
                    "percentage_change": round(progress, 1),
                    "new_automated_tests": new_automated,
                    "trend": "improving" if progress > 0 else "declining" if progress < 0 else "stable"
                },
                "ai_analysis": ai_analysis
            }
            
            logger.info(f"✅ Regression automation analysis completed")
            logger.info(f"   Period 1: {period1_automated}/{total_regression_tests} ({period1_percentage:.1f}%)")
            logger.info(f"   Period 2: {period2_automated}/{total_regression_tests} ({period2_percentage:.1f}%)")
            logger.info(f"   Progress: {progress:+.1f} percentage points")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Regression automation analysis failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise
    
    async def _generate_ai_analysis(self,
                                   total_regression_tests: int,
                                   period1_automated: int,
                                   period1_manual: int,
                                   period1_percentage: float,
                                   period2_automated: int,
                                   period2_manual: int,
                                   period2_percentage: float,
                                   progress: float,
                                   new_automated: int,
                                   period1_label: str,
                                   period2_label: str) -> str:
        """
        Generate human-friendly AI analysis for regression automation progress
        
        Args:
            All metrics from comparison
        
        Returns:
            Human-friendly analysis text
        """
        try:
            # Format dates for display
            try:
                period1_date = datetime.strptime(period1_label, "%Y-%m-%d").strftime("%B %d, %Y")
            except:
                period1_date = period1_label
            
            try:
                period2_date = datetime.strptime(period2_label, "%Y-%m-%d").strftime("%B %d, %Y")
            except:
                period2_date = period2_label
            
            prompt = f"""You are a Senior Quality Engineering Manager analyzing regression test automation progress. Provide a clear, human-friendly analysis.

Current Situation:
- Total Regression Tests: {total_regression_tests}
- As of {period1_date}: {period1_automated} automated ({period1_percentage:.1f}%), {period1_manual} manual
- As of {period2_date}: {period2_automated} automated ({period2_percentage:.1f}%), {period2_manual} manual
- Progress: {"+" if progress >= 0 else ""}{progress:.1f} percentage points
- New Tests Automated: {new_automated} tests

Provide a concise, professional analysis (2-3 sentences) that:
1. Summarizes the progress (improved/declined/stayed same)
2. Highlights key numbers in a natural way
3. Provides actionable next steps based on the trend

Be conversational and human-friendly. Avoid jargon. Focus on what matters to leadership.

Example format:
"Regression automation has improved from {period1_percentage:.1f}% to {period2_percentage:.1f}%, with {new_automated} new tests automated. This represents strong progress toward our automation goals. [Next steps based on trend]"

Write the analysis:"""

            response = await self.openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert Quality Engineering Manager providing clear, actionable insights."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=300
            )
            
            analysis = response.choices[0].message.content.strip()
            logger.info(f"✅ AI analysis generated: {analysis[:100]}...")
            return analysis
            
        except Exception as e:
            logger.error(f"❌ AI analysis generation failed: {e}")
            # Fallback to simple analysis
            if progress > 0:
                return f"Regression automation improved from {period1_percentage:.1f}% to {period2_percentage:.1f}% (+{progress:.1f} points). {new_automated} new tests were automated. Continue this positive trend by focusing on remaining {period2_manual} manual tests."
            elif progress < 0:
                return f"Regression automation declined from {period1_percentage:.1f}% to {period2_percentage:.1f}% ({progress:.1f} points). Review automation strategy and prioritize automating the {period2_manual} remaining manual tests."
            else:
                return f"Regression automation remained stable at {period2_percentage:.1f}%. {period2_automated} tests are automated, with {period2_manual} still requiring automation. Consider accelerating automation efforts to improve CI/CD readiness."
    
    async def _generate_single_period_ai_analysis(self,
                                                  total_regression_tests: int,
                                                  period_automated: int,
                                                  period_manual: int,
                                                  period_percentage: float,
                                                  period_label: str) -> str:
        """
        Generate human-friendly AI analysis for single period regression automation
        
        Args:
            All metrics from single period analysis
        
        Returns:
            Human-friendly analysis text
        """
        try:
            # Format date for display
            try:
                period_date = datetime.strptime(period_label, "%Y-%m-%d").strftime("%B %d, %Y")
            except:
                period_date = period_label
            
            prompt = f"""You are a Senior Quality Engineering Manager analyzing regression test automation status. Provide a clear, human-friendly analysis.

Current Situation:
- Total Regression Tests: {total_regression_tests}
- As of {period_date}: {period_automated} automated ({period_percentage:.1f}%), {period_manual} manual

Provide a concise, professional analysis (2-3 sentences) that:
1. Summarizes the current automation status
2. Highlights key numbers in a natural way
3. Provides actionable next steps based on the current state

Be conversational and human-friendly. Avoid jargon. Focus on what matters to leadership.

Example format:
"Regression automation is at {period_percentage:.1f}% with {period_automated} tests automated out of {total_regression_tests} total. [Status assessment and next steps]"

Write the analysis:"""

            response = await self.openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert Quality Engineering Manager providing clear, actionable insights."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=300
            )
            
            analysis = response.choices[0].message.content.strip()
            logger.info(f"✅ AI analysis generated: {analysis[:100]}...")
            return analysis
            
        except Exception as e:
            logger.error(f"❌ AI analysis generation failed: {e}")
            # Fallback to simple analysis
            if period_percentage >= 80:
                return f"Regression automation is excellent at {period_percentage:.1f}% with {period_automated} tests automated. Continue maintaining this high automation coverage. Focus on the remaining {period_manual} manual tests if they are critical for regression coverage."
            elif period_percentage >= 60:
                return f"Regression automation is good at {period_percentage:.1f}% with {period_automated} tests automated. Focus on automating high-priority tests from the remaining {period_manual} manual tests to improve CI/CD readiness."
            elif period_percentage >= 40:
                return f"Regression automation is moderate at {period_percentage:.1f}% with {period_automated} tests automated. Consider increasing automation investment for the {period_manual} remaining manual tests to strengthen regression coverage."
            else:
                return f"Regression automation needs improvement at {period_percentage:.1f}% with {period_automated} tests automated. Prioritize automating critical regression scenarios from the {period_manual} manual tests to enhance test coverage and CI/CD readiness."

