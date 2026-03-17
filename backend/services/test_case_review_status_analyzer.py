"""
Test Case Review Status Analyzer Module

Analyzes test case review status metrics for portfolios by comparing 
stories with "Test Case Reviewed" = Yes vs total stories.

Formula: Test Case Review Status % = (Stories with "Test Case Reviewed" = Yes / Total Stories) × 100

Author: FalconX Team
Created: 2025-01-XX
"""

from typing import Dict, List
from datetime import datetime
import logging
from openai import AsyncOpenAI
import os

logger = logging.getLogger(__name__)

class TestCaseReviewStatusAnalyzer:
    """
    Analyze test case review status metrics for quality reporting
    
    Test Case Review Status measures the percentage of stories that have 
    had their test cases reviewed, indicating quality assurance maturity.
    
    Higher percentage = Better review coverage
    Target: > 90% (industry standard)
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
    
    async def _get_reviewed_stories(self, project_key: str, period_from: str = None, period_to: str = None, reviewed: bool = True) -> int:
        """Get count of stories with Test Case Reviewed = Yes or != Yes, optionally filtered by date range"""
        # Build date filter if provided
        date_filter = ""
        if period_from and period_to:
            date_filter = f' AND (createdDate >= "{period_from}" AND updatedDate <= "{period_to}")'
        elif period_to:
            date_filter = f' AND (createdDate <= "{period_to}" OR updatedDate <= "{period_to}")'
        
        if reviewed:
            jql = f'project = "{project_key}" AND type = Story AND "Test Case Reviewed" = Yes{date_filter}'
        else:
            # Use != "Yes" to include both "No" and null/empty values
            jql = f'project = "{project_key}" AND type = Story AND "Test Case Reviewed" != "Yes"{date_filter}'
        
        try:
            all_issues = await self._fetch_all_issues(jql)
            count = len(all_issues)
            date_info = f" for period {period_from} to {period_to}" if period_from and period_to else (f" up to {period_to}" if period_to else "")
            logger.info(f"📊 Found {count} stories with Test Case Reviewed {'= Yes' if reviewed else '!= Yes'}{date_info}")
            return count
        except Exception as e:
            logger.error(f"❌ Error querying reviewed stories: {e}")
            return 0
    
    async def analyze_single_period(self, portfolio: str, period_from: str, period_to: str) -> Dict:
        """Analyze test case review status for a single period"""
        logger.info(f"📊 Analyzing test case review status for {portfolio} (single period)")
        logger.info(f"   Period: {period_from} to {period_to}")
        
        try:
            project_key = await self._resolve_project_key(portfolio)
            logger.info(f"🔑 Using project key: {project_key}")
            
            # Get stories and reviewed counts filtered by date range
            total_stories = await self._get_total_stories(project_key, period_from=period_from, period_to=period_to)
            reviewed_yes = await self._get_reviewed_stories(project_key, period_from=period_from, period_to=period_to, reviewed=True)
            reviewed_no = await self._get_reviewed_stories(project_key, period_from=period_from, period_to=period_to, reviewed=False)
            not_set = total_stories - reviewed_yes - reviewed_no
            
            review_percentage = (reviewed_yes / total_stories * 100) if total_stories > 0 else 0
            
            ai_analysis = await self._generate_single_period_ai_analysis(
                portfolio=portfolio,
                total_stories=total_stories,
                reviewed_yes=reviewed_yes,
                reviewed_no=reviewed_no,
                not_set=not_set,
                review_percentage=review_percentage,
                period_label=f"{period_to}"
            )
            
            result = {
                "portfolio": portfolio,
                "project_key": project_key,
                "total_stories": total_stories,
                "period": {
                    "from": period_from,
                    "to": period_to,
                    "reviewed_yes": reviewed_yes,
                    "reviewed_no": reviewed_no,
                    "not_set": not_set,
                    "review_percentage": round(review_percentage, 1)
                },
                "ai_analysis": ai_analysis
            }
            
            logger.info(f"✅ Test case review status analysis completed")
            logger.info(f"   Period: {reviewed_yes}/{total_stories} ({review_percentage:.1f}%)")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Test case review status analysis failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise
    
    async def compare_periods(self, portfolio: str, period1_from: str, period1_to: str, period2_from: str, period2_to: str) -> Dict:
        """Compare test case review status between two periods"""
        logger.info(f"📊 Analyzing test case review status for {portfolio}")
        logger.info(f"   Period 1: {period1_from} to {period1_to}")
        logger.info(f"   Period 2: {period2_from} to {period2_to}")
        
        try:
            project_key = await self._resolve_project_key(portfolio)
            logger.info(f"🔑 Using project key: {project_key}")
            
            # Get totals and reviewed counts for each period (filtered by date range)
            period1_total_stories = await self._get_total_stories(project_key, period_from=period1_from, period_to=period1_to)
            period2_total_stories = await self._get_total_stories(project_key, period_from=period2_from, period_to=period2_to)
            
            period1_reviewed_yes = await self._get_reviewed_stories(project_key, period_from=period1_from, period_to=period1_to, reviewed=True)
            period1_reviewed_no = await self._get_reviewed_stories(project_key, period_from=period1_from, period_to=period1_to, reviewed=False)
            period2_reviewed_yes = await self._get_reviewed_stories(project_key, period_from=period2_from, period_to=period2_to, reviewed=True)
            period2_reviewed_no = await self._get_reviewed_stories(project_key, period_from=period2_from, period_to=period2_to, reviewed=False)
            
            period1_not_set = period1_total_stories - period1_reviewed_yes - period1_reviewed_no
            period2_not_set = period2_total_stories - period2_reviewed_yes - period2_reviewed_no
            
            # Use period2 totals for overall total (current period)
            total_stories = period2_total_stories
            
            # Calculate percentages using each period's own total stories
            period1_percentage = (period1_reviewed_yes / period1_total_stories * 100) if period1_total_stories > 0 else 0
            period2_percentage = (period2_reviewed_yes / period2_total_stories * 100) if period2_total_stories > 0 else 0
            
            progress = period2_percentage - period1_percentage
            new_reviewed = period2_reviewed_yes - period1_reviewed_yes
            
            ai_analysis = await self._generate_ai_analysis(
                portfolio=portfolio,
                total_stories=total_stories,
                period1_reviewed_yes=period1_reviewed_yes,
                period1_reviewed_no=period1_reviewed_no,
                period1_not_set=period1_not_set,
                period1_percentage=period1_percentage,
                period2_reviewed_yes=period2_reviewed_yes,
                period2_reviewed_no=period2_reviewed_no,
                period2_not_set=period2_not_set,
                period2_percentage=period2_percentage,
                progress=progress,
                new_reviewed=new_reviewed,
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
                    "reviewed_yes": period1_reviewed_yes,
                    "reviewed_no": period1_reviewed_no,
                    "not_set": period1_not_set,
                    "review_percentage": round(period1_percentage, 1)
                },
                "period2": {
                    "from": period2_from,
                    "to": period2_to,
                    "reviewed_yes": period2_reviewed_yes,
                    "reviewed_no": period2_reviewed_no,
                    "not_set": period2_not_set,
                    "review_percentage": round(period2_percentage, 1)
                },
                "progress": {
                    "percentage_change": round(progress, 1),
                    "new_reviewed": new_reviewed,
                    "trend": "improving" if progress > 0 else "declining" if progress < 0 else "stable"
                },
                "ai_analysis": ai_analysis
            }
            
            logger.info(f"✅ Test case review status analysis completed")
            logger.info(f"   Period 1: {period1_reviewed_yes}/{total_stories} ({period1_percentage:.1f}%)")
            logger.info(f"   Period 2: {period2_reviewed_yes}/{total_stories} ({period2_percentage:.1f}%)")
            logger.info(f"   Progress: {progress:+.1f} percentage points")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Test case review status analysis failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise
    
    async def _generate_ai_analysis(self, portfolio: str, total_stories: int,
                                   period1_reviewed_yes: int, period1_reviewed_no: int, period1_not_set: int, period1_percentage: float,
                                   period2_reviewed_yes: int, period2_reviewed_no: int, period2_not_set: int, period2_percentage: float,
                                   progress: float, new_reviewed: int,
                                   period1_label: str, period2_label: str) -> str:
        """Generate AI analysis for test case review status comparison"""
        try:
            try:
                period1_date = datetime.strptime(period1_label, "%Y-%m-%d").strftime("%B %d, %Y")
            except:
                period1_date = period1_label
            
            try:
                period2_date = datetime.strptime(period2_label, "%Y-%m-%d").strftime("%B %d, %Y")
            except:
                period2_date = period2_label
            
            prompt = f"""You are a Senior Quality Engineering Manager analyzing test case review status progress for the {portfolio} portfolio.

Current Situation:
- Portfolio: {portfolio}
- Total Stories: {total_stories}
- As of {period1_date}: {period1_reviewed_yes} reviewed Yes ({period1_percentage:.1f}%), {period1_reviewed_no} No, {period1_not_set} not set
- As of {period2_date}: {period2_reviewed_yes} reviewed Yes ({period2_percentage:.1f}%), {period2_reviewed_no} No, {period2_not_set} not set
- Progress: {"+" if progress >= 0 else ""}{progress:.1f} percentage points
- New Reviewed: {new_reviewed} stories

Provide a concise, professional analysis (2-3 sentences) that:
1. Summarizes the review status progress
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
            if progress > 0:
                return f"Test case review status improved from {period1_percentage:.1f}% to {period2_percentage:.1f}% (+{progress:.1f} points). {new_reviewed} new stories now have test cases reviewed. Continue this positive trend by making test case review a mandatory step in the definition of done."
            elif progress < 0:
                return f"Test case review status declined from {period1_percentage:.1f}% to {period2_percentage:.1f}% ({progress:.1f} points). Current status: {period2_reviewed_yes} stories reviewed out of {total_stories} total. Review the {period2_not_set + period2_reviewed_no} stories without review and prioritize reviewing test cases for critical stories."
            else:
                return f"Test case review status remained stable at {period2_percentage:.1f}%. Current status: {period2_reviewed_yes} stories reviewed out of {total_stories} total, with {period2_not_set + period2_reviewed_no} still needing review. Consider making test case review a mandatory step to improve this metric."
    
    async def _generate_single_period_ai_analysis(self, portfolio: str, total_stories: int, reviewed_yes: int,
                                                  reviewed_no: int, not_set: int, review_percentage: float, period_label: str) -> str:
        """Generate AI analysis for single period test case review status"""
        try:
            try:
                period_date = datetime.strptime(period_label, "%Y-%m-%d").strftime("%B %d, %Y")
            except:
                period_date = period_label
            
            prompt = f"""You are a Senior Quality Engineering Manager analyzing test case review status for the {portfolio} portfolio.

Current Situation:
- Portfolio: {portfolio}
- Total Stories: {total_stories}
- As of {period_date}: {reviewed_yes} reviewed Yes ({review_percentage:.1f}%), {reviewed_no} No, {not_set} not set

Provide a concise, professional analysis (2-3 sentences) that:
1. Summarizes the current review status
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
            if review_percentage >= 90:
                return f"Test case review status is excellent at {review_percentage:.1f}% with {reviewed_yes} stories having test cases reviewed. Continue maintaining this high review coverage. Review the remaining {reviewed_no + not_set} stories to determine if they need test case review."
            elif review_percentage >= 80:
                return f"Test case review status is strong at {review_percentage:.1f}% with {reviewed_yes} stories having test cases reviewed. This is approaching the 90% target. Focus on reviewing the remaining {reviewed_no + not_set} stories, particularly those in active sprints, to reach the target."
            elif review_percentage >= 70:
                return f"Test case review status is moderate at {review_percentage:.1f}% with {reviewed_yes} stories having test cases reviewed. While good, there's opportunity to reach the 90% target. Prioritize reviewing test cases for the remaining {reviewed_no + not_set} stories, especially critical ones."
            else:
                return f"Test case review status needs improvement at {review_percentage:.1f}% with {reviewed_yes} stories having test cases reviewed. The {reviewed_no + not_set} remaining stories represent a significant gap. Make test case review a mandatory step in the definition of done to improve this metric."

