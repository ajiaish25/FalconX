"""
Test Coverage Analyzer Module

Analyzes test coverage metrics for portfolios by comparing stories with 
linked test cases vs total stories across different time periods.

Formula: Test Coverage % = (Stories with linked Test Cases / Total Stories) × 100

Author: FalconX Team
Created: 2025-01-XX
"""

from typing import Dict, List, Optional
from datetime import datetime
import logging
from openai import AsyncOpenAI
import os

logger = logging.getLogger(__name__)

class TestCoverageAnalyzer:
    """
    Analyze test coverage metrics for quality reporting
    
    Test Coverage measures the percentage of stories that have 
    linked test cases, indicating test coverage completeness.
    
    Higher coverage = Better test coverage
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
                        logger.info(f"📊 Total issues available: {total_count}")
                else:
                    issues = results if isinstance(results, list) else []
                    if total_count is None:
                        total_count = len(issues)
                
                if not issues:
                    break
                
                all_issues.extend(issues)
                logger.info(f"📄 Fetched page: {len(issues)} issues (Total so far: {len(all_issues)}/{total_count if total_count else 'unknown'})")
                
                if total_count and len(all_issues) >= total_count:
                    break
                
                if len(issues) < max_results_per_page:
                    break
                
                start_at += max_results_per_page
                
                if len(all_issues) > 100000:
                    logger.warning(f"⚠️ Reached safety limit of 100k issues, stopping pagination")
                    break
                    
            except Exception as e:
                logger.error(f"❌ Error fetching page at start_at={start_at}: {e}")
                break
        
        logger.info(f"✅ Total issues fetched: {len(all_issues)}")
        return all_issues
    
    async def _get_total_stories(self, project_key: str, period_from: str = None, period_to: str = None) -> int:
        """Get total count of stories, optionally filtered by date range"""
        jql = f'project = "{project_key}" AND type = Story'
        
        # Add date filter if provided
        if period_from and period_to:
            # Filter by date range (stories created/updated within the period)
            jql += f' AND (createdDate >= "{period_from}" AND updatedDate <= "{period_to}")'
        elif period_to:
            # Fallback: if only period_to is provided, get stories up to that date
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
    
    async def _get_stories_with_tests(self, project_key: str, period_from: str = None, period_to: str = None) -> int:
        """Get count of stories with linked test cases, optionally filtered by date range"""
        # Build date filter if provided
        date_filter = ""
        if period_from and period_to:
            date_filter = f' AND (createdDate >= "{period_from}" AND updatedDate <= "{period_to}")'
        elif period_to:
            date_filter = f' AND (createdDate <= "{period_to}" OR updatedDate <= "{period_to}")'
        
        # Try multiple JQL approaches for linked issues
        jql_variants = [
            # Approach 1: Using issueFunction (if available)
            f'project = "{project_key}" AND type = Story AND issueFunction in linkedIssuesOf("type = Test"){date_filter}',
            # Approach 2: Using issue in linkedIssues
            f'project = "{project_key}" AND type = Story AND issue in linkedIssues(project = "{project_key}" AND type = Test){date_filter}',
            # Approach 3: Using linkType (if tests link exists)
            f'project = "{project_key}" AND type = Story AND issue in linkedIssues(project = "{project_key}" AND type = Test, "tests"){date_filter}',
        ]
        
        for jql in jql_variants:
            try:
                all_issues = await self._fetch_all_issues(jql)
                count = len(all_issues)
                if count > 0 or jql == jql_variants[-1]:  # Use last variant if others fail
                    date_info = f" for period {period_from} to {period_to}" if period_from and period_to else (f" up to {period_to}" if period_to else "")
                    logger.info(f"📊 Found {count} stories with linked test cases{date_info}")
                    return count
            except Exception as e:
                logger.warning(f"⚠️ JQL variant failed: {e}")
                continue
        
        # Fallback: Get all stories and check links manually (slower but more reliable)
        logger.info("📊 Using fallback: fetching all stories and checking links...")
        try:
            base_jql = f'project = "{project_key}" AND type = Story'
            if period_from and period_to:
                base_jql += f' AND (createdDate >= "{period_from}" AND updatedDate <= "{period_to}")'
            elif period_to:
                base_jql += f' AND (createdDate <= "{period_to}" OR updatedDate <= "{period_to}")'
            
            all_stories = await self._fetch_all_issues(base_jql)
            stories_with_tests = 0
            
            # Check each story for linked test cases
            for story in all_stories:
                issue_key = story.get('key', '')
                if issue_key:
                    # Check if story has linked test cases
                    linked_jql = f'issue in linkedIssues("{issue_key}") AND type = Test'
                    linked_results = await self.jira.search(linked_jql, max_results=1)
                    if isinstance(linked_results, dict):
                        linked_issues = linked_results.get('issues', [])
                    else:
                        linked_issues = linked_results if isinstance(linked_results, list) else []
                    
                    if linked_issues:
                        stories_with_tests += 1
                
                # Limit to avoid too many queries
                if stories_with_tests > 0 and len(all_stories) > 100:
                    # Sample approach for large datasets
                    if len(all_stories) > 1000:
                        sample_size = min(100, len(all_stories))
                        logger.info(f"📊 Sampling {sample_size} stories for link checking...")
                        break
            
            date_info = f" for period {period_from} to {period_to}" if period_from and period_to else (f" up to {period_to}" if period_to else "")
            logger.info(f"📊 Found {stories_with_tests} stories with linked test cases (fallback method){date_info}")
            return stories_with_tests
            
        except Exception as e:
            logger.error(f"❌ Error in fallback method: {e}")
            return 0
    
    async def analyze_single_period(self, portfolio: str, period_from: str, period_to: str) -> Dict:
        """Analyze test coverage for a single period"""
        logger.info(f"📊 Analyzing test coverage for {portfolio} (single period)")
        logger.info(f"   Period: {period_from} to {period_to}")
        
        try:
            project_key = await self._resolve_project_key(portfolio)
            logger.info(f"🔑 Using project key: {project_key}")
            
            # Total stories within the date range (all fields should be filtered by date range)
            total_stories = await self._get_total_stories(project_key, period_from=period_from, period_to=period_to)
            # Stories with tests within the date range
            stories_with_tests = await self._get_stories_with_tests(project_key, period_from=period_from, period_to=period_to)
            stories_without_tests = total_stories - stories_with_tests
            
            coverage_percentage = (stories_with_tests / total_stories * 100) if total_stories > 0 else 0
            
            ai_analysis = await self._generate_single_period_ai_analysis(
                portfolio=portfolio,
                total_stories=total_stories,
                stories_with_tests=stories_with_tests,
                stories_without_tests=stories_without_tests,
                coverage_percentage=coverage_percentage,
                period_label=f"{period_to}"
            )
            
            result = {
                "portfolio": portfolio,
                "project_key": project_key,
                "total_stories": total_stories,
                "period": {
                    "from": period_from,
                    "to": period_to,
                    "stories_with_tests": stories_with_tests,
                    "stories_without_tests": stories_without_tests,
                    "coverage_percentage": round(coverage_percentage, 1)
                },
                "ai_analysis": ai_analysis
            }
            
            logger.info(f"✅ Test coverage analysis completed")
            logger.info(f"   Period: {stories_with_tests}/{total_stories} ({coverage_percentage:.1f}%)")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Test coverage analysis failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise
    
    async def compare_periods(self, portfolio: str, period1_from: str, period1_to: str, period2_from: str, period2_to: str) -> Dict:
        """Compare test coverage between two periods"""
        logger.info(f"📊 Analyzing test coverage for {portfolio}")
        logger.info(f"   Period 1: {period1_from} to {period1_to}")
        logger.info(f"   Period 2: {period2_from} to {period2_to}")
        
        try:
            project_key = await self._resolve_project_key(portfolio)
            logger.info(f"🔑 Using project key: {project_key}")
            
            # Total stories for each period (all fields should be filtered by date range)
            period1_total_stories = await self._get_total_stories(project_key, period_from=period1_from, period_to=period1_to)
            period2_total_stories = await self._get_total_stories(project_key, period_from=period2_from, period_to=period2_to)
            
            # Stories with tests for each period (filtered by date range)
            period1_with_tests = await self._get_stories_with_tests(project_key, period_from=period1_from, period_to=period1_to)
            period2_with_tests = await self._get_stories_with_tests(project_key, period_from=period2_from, period_to=period2_to)
            
            # Use period2 totals for overall total (current period)
            total_stories = period2_total_stories
            
            # Calculate percentages using each period's own total stories
            period1_percentage = (period1_with_tests / period1_total_stories * 100) if period1_total_stories > 0 else 0
            period2_percentage = (period2_with_tests / period2_total_stories * 100) if period2_total_stories > 0 else 0
            
            progress = period2_percentage - period1_percentage
            new_stories_with_tests = period2_with_tests - period1_with_tests
            
            ai_analysis = await self._generate_ai_analysis(
                portfolio=portfolio,
                total_stories=total_stories,
                period1_with_tests=period1_with_tests,
                period1_without_tests=period1_total_stories - period1_with_tests,
                period1_percentage=period1_percentage,
                period2_with_tests=period2_with_tests,
                period2_without_tests=period2_total_stories - period2_with_tests,
                period2_percentage=period2_percentage,
                progress=progress,
                new_stories_with_tests=new_stories_with_tests,
                period1_label=f"{period1_to}",
                period2_label=f"{period2_to}"
            )
            
            result = {
                "portfolio": portfolio,
                "project_key": project_key,
                "total_stories": total_stories,
                "period1": {
                    "from": period1_from,
                    "to": period1_to,
                    "stories_with_tests": period1_with_tests,
                    "stories_without_tests": period1_total_stories - period1_with_tests,
                    "coverage_percentage": round(period1_percentage, 1)
                },
                "period2": {
                    "from": period2_from,
                    "to": period2_to,
                    "stories_with_tests": period2_with_tests,
                    "stories_without_tests": period2_total_stories - period2_with_tests,
                    "coverage_percentage": round(period2_percentage, 1)
                },
                "progress": {
                    "percentage_change": round(progress, 1),
                    "new_stories_with_tests": new_stories_with_tests,
                    "trend": "improving" if progress > 0 else "declining" if progress < 0 else "stable"
                },
                "ai_analysis": ai_analysis
            }
            
            logger.info(f"✅ Test coverage analysis completed")
            logger.info(f"   Period 1: {period1_with_tests}/{total_stories} ({period1_percentage:.1f}%)")
            logger.info(f"   Period 2: {period2_with_tests}/{total_stories} ({period2_percentage:.1f}%)")
            logger.info(f"   Progress: {progress:+.1f} percentage points")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Test coverage analysis failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise
    
    async def _generate_ai_analysis(self, portfolio: str, total_stories: int, period1_with_tests: int, period1_without_tests: int,
                                   period1_percentage: float, period2_with_tests: int, period2_without_tests: int,
                                   period2_percentage: float, progress: float, new_stories_with_tests: int,
                                   period1_label: str, period2_label: str) -> str:
        """Generate AI analysis for test coverage comparison"""
        try:
            try:
                period1_date = datetime.strptime(period1_label, "%Y-%m-%d").strftime("%B %d, %Y")
            except:
                period1_date = period1_label
            
            try:
                period2_date = datetime.strptime(period2_label, "%Y-%m-%d").strftime("%B %d, %Y")
            except:
                period2_date = period2_label
            
            portfolio_hints = {
                "Data Solutions": "data pipelines, ETL processes, API validation",
                "Modern Retail": "customer journeys, e-commerce workflows",
                "Parts": "inventory management, parts catalog",
                "DMS": "dealership operations, vehicle management",
                "Shared Services": "common services, integrations"
            }
            
            hint = portfolio_hints.get(portfolio, "critical business workflows")
            
            prompt = f"""You are a Senior Quality Engineering Manager analyzing test coverage progress for the {portfolio} portfolio.

Current Situation:
- Portfolio: {portfolio}
- Total Stories: {total_stories}
- As of {period1_date}: {period1_with_tests} stories with tests ({period1_percentage:.1f}%), {period1_without_tests} without
- As of {period2_date}: {period2_with_tests} stories with tests ({period2_percentage:.1f}%), {period2_without_tests} without
- Progress: {"+" if progress >= 0 else ""}{progress:.1f} percentage points
- New Stories with Tests: {new_stories_with_tests}

Provide a concise, professional analysis (2-3 sentences) that:
1. Summarizes the progress for {portfolio}
2. Highlights key numbers
3. Provides actionable next steps specific to {portfolio}'s context

Be conversational and human-friendly. Avoid jargon."""

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
            if progress > 0:
                return f"Test coverage improved from {period1_percentage:.1f}% to {period2_percentage:.1f}% (+{progress:.1f} points). {new_stories_with_tests} new stories now have test cases. Continue this positive trend by ensuring all new stories have test cases linked during sprint planning."
            elif progress < 0:
                return f"Test coverage declined from {period1_percentage:.1f}% to {period2_percentage:.1f}% ({progress:.1f} points). Review the {period2_without_tests} stories without test cases and prioritize linking test cases to critical stories."
            else:
                return f"Test coverage remained stable at {period2_percentage:.1f}%. {period2_with_tests} stories have test cases, with {period2_without_tests} still needing test case links. Consider making test case creation part of the definition of done."
    
    async def _generate_single_period_ai_analysis(self, portfolio: str, total_stories: int, stories_with_tests: int,
                                                  stories_without_tests: int, coverage_percentage: float, period_label: str) -> str:
        """Generate AI analysis for single period test coverage"""
        try:
            try:
                period_date = datetime.strptime(period_label, "%Y-%m-%d").strftime("%B %d, %Y")
            except:
                period_date = period_label
            
            portfolio_hints = {
                "Data Solutions": "data pipelines, ETL processes",
                "Modern Retail": "customer journeys, e-commerce",
                "Parts": "inventory management, parts catalog",
                "DMS": "dealership operations",
                "Shared Services": "common services, integrations"
            }
            
            hint = portfolio_hints.get(portfolio, "critical business workflows")
            
            prompt = f"""You are a Senior Quality Engineering Manager analyzing test coverage status for the {portfolio} portfolio.

Current Situation:
- Portfolio: {portfolio}
- Total Stories: {total_stories}
- As of {period_date}: {stories_with_tests} stories with test cases ({coverage_percentage:.1f}%), {stories_without_tests} without

Provide a concise, professional analysis (2-3 sentences) that:
1. Summarizes the current coverage status for {portfolio}
2. Highlights key numbers
3. Provides actionable next steps

Be conversational and human-friendly. Avoid jargon."""

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
            if coverage_percentage >= 90:
                return f"Test coverage is excellent at {coverage_percentage:.1f}% with {stories_with_tests} stories having linked test cases. Continue maintaining this high coverage standard. Review the remaining {stories_without_tests} stories to determine if they need test cases."
            elif coverage_percentage >= 80:
                return f"Test coverage is strong at {coverage_percentage:.1f}% with {stories_with_tests} stories having linked test cases. This meets the industry standard. Consider improving coverage for the remaining {stories_without_tests} stories, particularly those in active development."
            elif coverage_percentage >= 70:
                return f"Test coverage is moderate at {coverage_percentage:.1f}% with {stories_with_tests} stories having linked test cases. While approaching the 80% target, focus on the remaining {stories_without_tests} stories without test cases to improve overall coverage."
            else:
                return f"Test coverage needs improvement at {coverage_percentage:.1f}% with {stories_with_tests} stories having linked test cases. The {stories_without_tests} remaining stories represent a significant gap. Prioritize linking test cases to critical stories and make test case creation part of the definition of done."

