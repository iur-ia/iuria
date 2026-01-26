"""
ScraperAPI integration for bypassing tribunal blocking
Uses residential proxies from Brazil to access tribunal portals
"""
import os
import requests
from typing import Optional
from bs4 import BeautifulSoup


class ScraperAPIClient:
    """Client for making requests through ScraperAPI with Brazilian proxies"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get('SCRAPER_API_KEY')
        self.base_url = "https://api.scraperapi.com/"
        self.enabled = bool(self.api_key)
    
    def fetch_html(self, url: str, render_js: bool = True, premium: bool = True) -> Optional[str]:
        """
        Fetch HTML content from a URL using ScraperAPI
        
        Args:
            url: The URL to scrape
            render_js: Whether to render JavaScript (uses more credits)
            premium: Whether to use premium residential proxies (10x credits)
        
        Returns:
            HTML content as string, or None if failed
        """
        if not self.enabled:
            raise ValueError("ScraperAPI key not configured. Set SCRAPER_API_KEY environment variable.")
        
        params = {
            'api_key': self.api_key,
            'url': url,
            'country_code': 'br',
        }
        
        if render_js:
            params['render'] = 'true'
        
        if premium:
            params['premium'] = 'true'
        
        try:
            response = requests.get(
                self.base_url,
                params=params,
                timeout=60
            )
            
            if response.status_code == 200:
                return response.text
            elif response.status_code == 403:
                print(f"ScraperAPI: Access forbidden for {url}")
                return None
            elif response.status_code == 500:
                print(f"ScraperAPI: Server error for {url}")
                return None
            else:
                print(f"ScraperAPI: Unexpected status {response.status_code} for {url}")
                return None
                
        except requests.RequestException as e:
            print(f"ScraperAPI request failed: {e}")
            return None
    
    def parse_html(self, html: str) -> BeautifulSoup:
        """Parse HTML content with BeautifulSoup"""
        return BeautifulSoup(html, 'html.parser')
    
    def fetch_and_parse(self, url: str, render_js: bool = True, premium: bool = True) -> Optional[BeautifulSoup]:
        """
        Fetch and parse HTML from a URL
        
        Args:
            url: The URL to scrape
            render_js: Whether to render JavaScript
            premium: Whether to use premium proxies
        
        Returns:
            BeautifulSoup object, or None if failed
        """
        html = self.fetch_html(url, render_js, premium)
        if html:
            return self.parse_html(html)
        return None
    
    def check_credits(self) -> dict:
        """
        Check remaining API credits
        
        Returns:
            Dictionary with credit information
        """
        if not self.enabled:
            return {"error": "API key not configured"}
        
        try:
            response = requests.get(
                "https://api.scraperapi.com/account",
                params={'api_key': self.api_key},
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {"error": f"Failed to check credits: {response.status_code}"}
                
        except requests.RequestException as e:
            return {"error": str(e)}


def get_scraper_api_client() -> ScraperAPIClient:
    """Get a configured ScraperAPI client"""
    return ScraperAPIClient()


def is_scraper_api_available() -> bool:
    """Check if ScraperAPI is configured"""
    return bool(os.environ.get('SCRAPER_API_KEY'))
