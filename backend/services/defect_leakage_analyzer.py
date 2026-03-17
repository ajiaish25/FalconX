"""
Defect Leakage Analyzer Module

Analyzes defect leakage metrics for portfolios by comparing bugs found in 
lower environments vs defects that escaped to production.

Formula: Defect Leakage = Defects / (Defects + Bugs) × 100

Author: FalconX Team
Created: 2025-10-29
"""

from typing import Dict, List, Optional
from datetime import datetime
import logging
from openai import AsyncOpenAI
import os

logger = logging.getLogger(__name__)

class DefectLeakageAnalyzer:
    """
    Analyze defect leakage for quality metrics reporting
    
    Defect Leakage measures the percentage of issues that escape testing
    and are found in production vs those caught during development/testing.
    
    Lower leakage = Better testing effectiveness
    Target: < 30% (industry standard)
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
        # Unified status filter used for both bugs and defects (requested to mirror)
        self.status_filter = (
            '("IN PROGRESS","PENDING APPROVAL","READY TO START","DEVELOPMENT COMPLETE","IN TEST","TEST COMPLETE","IN REVIEW","Canceled")'
        )
    
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
    
    async def analyze_week(self, 
                          portfolio: str,
                          date_from: str,
                          date_to: str) -> Dict:
        """
        Analyze defect leakage for a single week
        
        Args:
            portfolio: Jira project name or key (e.g., "CDK Intelligence Suite", "DATA_SOLUTIONS")
            date_from: Start date in YYYY-MM-DD format
            date_to: End date in YYYY-MM-DD format
        
        Returns:
            Dict containing:
            - bugs_count: Number of bugs found in lower environments
            - defects_count: Number of defects found in production
            - leakage_percentage: Calculated defect leakage %
            - total_issues: Total bugs + defects
            - bugs_list: List of bug issue objects
            - defects_list: List of defect issue objects
        """
        logger.info(f"📊 Analyzing defect leakage for {portfolio} ({date_from} to {date_to})")
        
        try:
            # Resolve project key from name
            project_key = await self._resolve_project_key(portfolio)
            logger.info(f"🔑 Using project key: {project_key}")
            
            # Query 1: Bugs found in lower environments (Dev, QA, Staging)
            # These are issues caught BEFORE production
            jql_bugs = f"""
                project = "{project_key}"
                AND type IN (Bug)
                AND updatedDate >= "{date_from}"
                AND updatedDate <= "{date_to}"
                AND status IN {self.status_filter}
                ORDER BY created DESC
            """
            
            logger.info(f"🔍 Querying bugs in lower environments...")
            bugs_result = await self.jira.search(jql_bugs, max_results=3000)
            bugs = bugs_result.get('issues', [])
            bugs_count = len(bugs)
            logger.info(f"✅ Found {bugs_count} bugs in lower environments")
            
            # Query 2: Defects (mirror statuses used for bugs as requested)
            jql_defects = f"""
                project = "{project_key}"
                AND type IN (Defect)
                AND updatedDate >= "{date_from}"
                AND updatedDate <= "{date_to}"
                AND status IN {self.status_filter}
                ORDER BY priority DESC, created DESC
            """
            
            logger.info(f"🔍 Querying defects in production...")
            defects_result = await self.jira.search(jql_defects, max_results=3000)
            defects = defects_result.get('issues', [])
            defects_count = len(defects)
            logger.info(f"✅ Found {defects_count} defects in production")
            
            # Calculate leakage
            total = bugs_count + defects_count
            leakage = (defects_count / total * 100) if total > 0 else 0
            
            logger.info(f"📈 Defect Leakage: {leakage:.1f}% ({defects_count}/{total})")

            bug_keys = [issue.get('key') for issue in bugs if issue.get('key')]
            defect_keys = [issue.get('key') for issue in defects if issue.get('key')]

            # Compact JQL to single line for easier sharing/debugging
            bugs_jql_compact = " ".join(line.strip() for line in jql_bugs.splitlines() if line.strip())
            defects_jql_compact = " ".join(line.strip() for line in jql_defects.splitlines() if line.strip())
            
            return {
                "portfolio": portfolio,
                "projectKey": project_key,
                "bugs_count": bugs_count,
                "defects_count": defects_count,
                "leakage_percentage": round(leakage, 1),
                "total_issues": total,
                "bugs_list": bugs[:10],  # First 10 for display
                "defects_list": defects[:10],  # First 10 for display
                "bugs_keys": bug_keys,
                "defects_keys": defect_keys,
                "bugs_jql": bugs_jql_compact,
                "defects_jql": defects_jql_compact,
                "date_range": f"{date_from} to {date_to}",
                "ai_metadata": {
                    "is_ai_generated": False,
                    "provider": "openai",
                    "model": self.model
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to analyze week: {e}")
            raise
    
    async def compare_weeks(self,
                           portfolio: str,
                           current_week_from: str,
                           current_week_to: str,
                           previous_week_from: str,
                           previous_week_to: str) -> Dict:
        """
        Compare defect leakage between two weeks
        
        Args:
            portfolio: Jira project key
            current_week_from: Current week start date (YYYY-MM-DD)
            current_week_to: Current week end date (YYYY-MM-DD)
            previous_week_from: Previous week start date (YYYY-MM-DD)
            previous_week_to: Previous week end date (YYYY-MM-DD)
        
        Returns:
            Dict containing:
            - current_week: Current week metrics
            - previous_week: Previous week metrics
            - comparison: WoW changes and trends
            - ai_insights: AI-generated analysis
            - severity: critical/warning/attention/normal
        """
        logger.info(f"🔄 Comparing weeks for {portfolio}")
        
        try:
            # Analyze both weeks
            current = await self.analyze_week(portfolio, current_week_from, current_week_to)
            previous = await self.analyze_week(portfolio, previous_week_from, previous_week_to)
            
            # Calculate changes
            leakage_change = current['leakage_percentage'] - previous['leakage_percentage']
            leakage_change_pct = ((leakage_change / previous['leakage_percentage']) * 100) if previous['leakage_percentage'] > 0 else 0
            
            bugs_change = current['bugs_count'] - previous['bugs_count']
            defects_change = current['defects_count'] - previous['defects_count']
            
            # Classify trend
            if leakage_change > 2:
                trend = "worsening"
            elif leakage_change < -2:
                trend = "improving"
            else:
                trend = "stable"
            
            # Classify severity
            severity = self._classify_severity(current['leakage_percentage'], leakage_change)
            
            logger.info(f"📊 WoW Change: {leakage_change:+.1f}% | Trend: {trend} | Severity: {severity}")
            
            # Generate AI insights
            logger.info("🤖 Generating AI insights...")
            ai_insights = await self._generate_ai_insights(
                portfolio, current, previous, leakage_change, severity
            )
            
            ai_metadata = {
                "is_ai_generated": bool(ai_insights.strip()),
                "model": self.model,
                "provider": "openai",
                "generated_at": datetime.utcnow().isoformat()
            }

            return {
                "portfolio": portfolio,
                "current_week": current,
                "previous_week": previous,
                "comparison": {
                    "leakage_change": round(leakage_change, 1),
                    "leakage_change_percentage": round(leakage_change_pct, 1),
                    "bugs_change": bugs_change,
                    "defects_change": defects_change,
                    "trend": trend,
                    "severity": severity
                },
            "ai_insights": ai_insights,
            "ai_metadata": ai_metadata,
            "generated_at": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"❌ Failed to compare weeks: {e}")
            raise

    async def analyze_multiple(self, portfolios: List[str], date_from: str, date_to: str) -> Dict:
        """Analyze multiple portfolios and return row-per-portfolio structure."""
        rows: List[Dict] = []
        for p in portfolios:
            try:
                rows.append(await self.analyze_week(p, date_from, date_to))
            except Exception as e:
                logger.error(f"Failed analysis for '{p}': {e}")
                rows.append({
                    "portfolio": p,
                    "error": str(e),
                    "bugs_count": 0,
                    "defects_count": 0,
                    "leakage_percentage": 0.0,
                    "total_issues": 0,
                    "bugs_keys": [],
                    "defects_keys": []
                })
        return {"rows": rows}
    
    def _classify_severity(self, current_leakage: float, change: float) -> str:
        """
        Classify severity based on current leakage and change
        
        Args:
            current_leakage: Current week leakage percentage
            change: Week-over-week change in percentage points
        
        Returns:
            Severity level: "critical", "warning", "attention", or "normal"
        """
        # Critical: High leakage or large negative change
        if current_leakage > 50 or change > 15:
            return "critical"
        
        # Warning: Above target or moderate negative change
        elif current_leakage > 40 or change > 10:
            return "warning"
        
        # Attention: Near target or small negative change
        elif current_leakage > 30 or change > 5:
            return "attention"
        
        # Normal: Below target and stable/improving
        else:
            return "normal"
    
    async def _generate_ai_insights(self,
                                    portfolio: str,
                                    current: Dict,
                                    previous: Dict,
                                    change: float,
                                    severity: str) -> str:
        """
        Generate AI-powered insights and recommendations
        
        Args:
            portfolio: Portfolio name
            current: Current week metrics
            previous: Previous week metrics
            change: WoW change in percentage points
            severity: Severity classification
        
        Returns:
            Formatted AI analysis with insights and recommendations
        """
        try:
            prompt = f"""You are a Senior Quality Engineering Manager analyzing defect leakage metrics.

PORTFOLIO: {portfolio}
SEVERITY: {severity.upper()}

METRIC: Weekly Defect Leakage
Formula: Defects / (Defects + Bugs) × 100
Target: < 30% (industry standard for quality software)

PREVIOUS WEEK DATA:
- Bugs (found in Dev/QA/Staging): {previous['bugs_count']}
- Defects (found in Production): {previous['defects_count']}
- Leakage: {previous['leakage_percentage']}%
- Total Issues: {previous['total_issues']}

CURRENT WEEK DATA:
- Bugs (found in Dev/QA/Staging): {current['bugs_count']}
- Defects (found in Production): {current['defects_count']}
- Leakage: {current['leakage_percentage']}%
- Total Issues: {current['total_issues']}

WEEK-OVER-WEEK CHANGE:
- Leakage: {'+' if change > 0 else ''}{change:.1f} percentage points
- Bugs: {'+' if (current['bugs_count'] - previous['bugs_count']) > 0 else ''}{current['bugs_count'] - previous['bugs_count']}
- Defects: {'+' if (current['defects_count'] - previous['defects_count']) > 0 else ''}{current['defects_count'] - previous['defects_count']}

Provide a comprehensive analysis with:

1. **SEVERITY ASSESSMENT**
   - Is this critical, concerning, or acceptable?
   - What's the immediate risk to customers/business?

2. **ROOT CAUSE ANALYSIS**
   - Why is defect leakage at this level?
   - What testing gaps exist?
   - Are there process or tool issues?

3. **TREND INTERPRETATION**
   - What does the WoW change indicate?
   - Is the team improving or declining?

4. **BUSINESS IMPACT**
   - Customer experience implications
   - Support/operational costs
   - Brand reputation risks

5. **IMMEDIATE ACTIONS** (Next 48 hours)
   - 5 specific, actionable recommendations
   - Who should do what
   - Expected outcomes

6. **LONGER-TERM STRATEGY** (Next 2-4 weeks)
   - Process improvements needed
   - Tool/automation investments
   - Training or staffing needs

7. **SUCCESS METRICS**
   - What should we see next week?
   - Timeline to reach <30% target?

Be direct, specific, and actionable. Use bullet points for clarity. Focus on root causes and concrete solutions, not generic advice."""

            response = await self.openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert Quality Engineering Manager with 15+ years of experience in software quality, testing strategy, and defect prevention."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2000
            )
            
            insights = response.choices[0].message.content
            logger.info("✅ AI insights generated successfully")
            
            return insights
            
        except Exception as e:
            logger.error(f"❌ Failed to generate AI insights: {e}")
            return f"Failed to generate AI insights: {str(e)}"
    
    def format_issue_summary(self, issues: List[Dict]) -> str:
        """
        Format issue list for display
        
        Args:
            issues: List of Jira issue objects
        
        Returns:
            Formatted string with issue summaries
        """
        if not issues:
            return "No issues found"
        
        summary = []
        for issue in issues[:5]:  # Top 5 only
            key = issue.get('key', 'N/A')
            fields = issue.get('fields', {})
            summary_text = fields.get('summary', 'No summary')
            priority = fields.get('priority', {}).get('name', 'N/A')
            status = fields.get('status', {}).get('name', 'N/A')
            
            summary.append(f"• {key}: {summary_text} [Priority: {priority}, Status: {status}]")
        
        return "\n".join(summary)

