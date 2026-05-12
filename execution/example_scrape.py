import sys
import os
import requests

def scrape_website(url: str, output_filename: str):
    """
    Example script to fetch HTML from a URL.
    In a real scenario, this would use BeautifulSoup to parse headers and paragraphs.
    """
    print(f"Starting scrape for {url}")
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        # Ensure .tmp directory exists
        tmp_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".tmp")
        os.makedirs(tmp_dir, exist_ok=True)
        
        output_path = os.path.join(tmp_dir, output_filename)
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(response.text[:1000] + "\n... (truncated for example)")
            
        print(f"Successfully wrote first 1000 chars to {output_path}")
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python example_scrape.py <url> <output_filename>", file=sys.stderr)
        sys.exit(1)
        
    url = sys.argv[1]
    output_filename = sys.argv[2]
    scrape_website(url, output_filename)
