import os
import re
import tempfile
import subprocess
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageChops

tmp_cards_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/.tmp/cards"
os.makedirs(tmp_cards_dir, exist_ok=True)

CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

CSS_HEADER = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
  :root {
    --sb-green-dark: #152822;
    --sb-green-light: #4A6C5C;
    --sb-beige: #F0EAD6;
    --sb-cream: #F9F9F7;
    --sb-black: #0A1210;
    --sb-accent: #E2DCCC;
    --gold: #C5A065;
  }
  * { box-sizing: border-box; }
  body {
    background-color: #ffffff;
    color: var(--sb-green-dark);
    font-family: 'Montserrat', sans-serif;
    line-height: 1.5;
    margin: 0;
    padding: 10px;
    -webkit-font-smoothing: antialiased;
  }
  .tool-title-box {
    background: var(--sb-cream);
    border: 1px solid var(--sb-accent);
    padding: 22px 25px;
    margin: 0;
    border-left: 6px solid var(--gold);
  }
  .tool-title-box h2 {
    font-family: 'Playfair Display', serif;
    font-size: 25px;
    color: var(--sb-green-dark);
    margin: 0 0 8px 0;
  }
  .tool-clause {
    display: inline-block;
    background: var(--sb-green-dark);
    color: var(--gold);
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 2px;
    margin-bottom: 10px;
  }
  .consultant-themes-box {
    background: #f7f9f8;
    border: 1px solid var(--sb-green-light);
    border-left: 6px solid var(--sb-green-dark);
    padding: 22px 25px;
    margin: 0;
    border-radius: 2px;
  }
  .consultant-themes-box h3 {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    color: var(--sb-green-dark);
    margin: 0 0 10px 0;
    border-bottom: 1px solid var(--sb-accent);
    padding-bottom: 5px;
  }
  .consultant-advice {
    font-size: 12.5px;
    margin-bottom: 12px;
    background: #ffffff;
    padding: 10px 14px;
    border: 1px solid var(--sb-accent);
  }
  .themes-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    font-size: 12px;
  }
  .theme-card {
    background: #ffffff;
    padding: 10px 12px;
    border: 1px solid var(--sb-accent);
  }
  .theme-card strong {
    color: var(--sb-green-dark);
    display: block;
    margin-bottom: 3px;
  }
  .why-box {
    background: #fdfbf7;
    border: 1px solid var(--gold);
    padding: 20px 22px;
    margin: 0;
    border-radius: 2px;
  }
  .why-box h3 {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    color: var(--sb-green-dark);
    margin: 0 0 10px 0;
    border-bottom: 1px solid var(--gold);
    padding-bottom: 5px;
  }
  .why-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    font-size: 12.5px;
  }
  .why-column ul { margin: 4px 0 0 0; padding-left: 18px; }
  .why-column.gains { color: #1b5e20; }
  .why-column.risques { color: #b71c1c; }
  .guide-box {
    background: #ffffff;
    border: 1px solid var(--sb-accent);
    padding: 20px 22px;
    margin: 0;
    font-size: 12.5px;
    border-radius: 2px;
    border-left: 4px solid var(--sb-green-dark);
  }
  .guide-box h3 {
    font-family: 'Playfair Display', serif;
    font-size: 17px;
    color: var(--sb-green-dark);
    margin: 0 0 10px 0;
  }
  .guide-box ol { margin: 0; padding-left: 20px; }
  .guide-box li { margin-bottom: 6px; }
  .next-steps-box {
    background: var(--sb-cream);
    border: 1px solid var(--gold);
    padding: 20px 22px;
    margin: 0;
    font-size: 12.5px;
    border-radius: 2px;
  }
  .next-steps-box h3 {
    font-family: 'Playfair Display', serif;
    font-size: 17px;
    color: var(--sb-green-dark);
    margin: 0 0 10px 0;
  }
  .next-steps-box ul { margin: 0; padding-left: 20px; }
  h3.section-subtitle {
    font-family: 'Playfair Display', serif;
    font-size: 19px;
    color: var(--sb-green-dark);
    border-bottom: 2px solid var(--gold);
    padding-bottom: 6px;
    margin: 0;
  }
</style>
</head>
<body>
"""

def render_html_snippet_to_png(item):
    snippet_html, out_png_path, width = item
    if os.path.exists(out_png_path) and os.path.getsize(out_png_path) > 3000:
        return out_png_path

    html_file = out_png_path.replace(".png", ".html")
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(CSS_HEADER + snippet_html + "\n</body>\n</html>")
    
    td = os.path.join(tmp_cards_dir, "chrome_tmp_" + os.path.basename(out_png_path).replace(".png", ""))
    os.makedirs(td, exist_ok=True)
    
    cmd = [
        CHROME_BIN,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        f"--user-data-dir={td}",
        f"--screenshot={out_png_path}",
        f"--window-size={width},1200",
        "--force-device-scale-factor=2",
        f"file://{html_file}"
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, close_fds=True, timeout=5)
    except Exception:
        pass
    
    if os.path.exists(out_png_path):
        try:
            im = Image.open(out_png_path)
            bg = Image.new(im.mode, im.size, (255, 255, 255, 255))
            diff = ImageChops.difference(im.convert("RGBA"), bg)
            bbox = diff.getbbox()
            if bbox:
                left, upper, right, lower = bbox
                lower = min(im.height, lower + 15)
                upper = max(0, upper - 5)
                cropped = im.crop((0, upper, im.width, lower))
                cropped.save(out_png_path)
        except Exception as e:
            pass
    return out_png_path

def process_all_html_files():
    html_dir = "/Users/delacourmelchior/Site Internet Cabinet Delacour/Projet-QHSE/OUTILS_QUALITE_DELACOUR/SEQUENCE_1_STRATEGIE_ET_PILOTAGE/HTML"
    render_tasks = []
    
    for fname in sorted(os.listdir(html_dir)):
        if not fname.endswith(".html"): continue
        hpath = os.path.join(html_dir, fname)
        tool_id = fname.replace(".html", "")
        with open(hpath, "r", encoding="utf-8") as f:
            html_content = f.read()

        # 1. Tool Title Box
        m_title = re.search(r'(<div class="tool-title-box">.*?</div>)', html_content, re.DOTALL)
        if m_title:
            png_path = os.path.join(tmp_cards_dir, f"{tool_id}_title_card.png")
            render_tasks.append((m_title.group(1), png_path, 1080))

        # 2. Consultant Box
        m_consultant = re.search(r'(<div class="consultant-themes-box">.*?</div>\s*</div>)', html_content, re.DOTALL)
        if not m_consultant:
            m_consultant = re.search(r'(<div class="consultant-themes-box">.*?</div>)', html_content, re.DOTALL)
        if m_consultant:
            png_path = os.path.join(tmp_cards_dir, f"{tool_id}_consultant_card.png")
            render_tasks.append((m_consultant.group(1), png_path, 1080))

        # 3. Why Box
        m_why = re.search(r'(<div class="why-box">.*?</div>\s*</div>)', html_content, re.DOTALL)
        if not m_why:
            m_why = re.search(r'(<div class="why-box">.*?</div>)', html_content, re.DOTALL)
        if m_why:
            png_path = os.path.join(tmp_cards_dir, f"{tool_id}_why_card.png")
            render_tasks.append((m_why.group(1), png_path, 1080))

        # 4. Guide Box
        m_guide = re.search(r'(<div class="guide-box">.*?</div>)', html_content, re.DOTALL)
        if m_guide:
            png_path = os.path.join(tmp_cards_dir, f"{tool_id}_guide_card.png")
            render_tasks.append((m_guide.group(1), png_path, 1080))

        # 5. Next Steps Box
        m_next = re.search(r'(<div class="next-steps-box">.*?</div>)', html_content, re.DOTALL)
        if m_next:
            png_path = os.path.join(tmp_cards_dir, f"{tool_id}_next_card.png")
            render_tasks.append((m_next.group(1), png_path, 1080))

        # 6. Subtitles
        subtitles = re.findall(r'(<h3 class="section-subtitle">.*?</h3>)', html_content, re.DOTALL)
        for idx, sub_html in enumerate(subtitles, 1):
            png_path = os.path.join(tmp_cards_dir, f"{tool_id}_subtitle_{idx}.png")
            render_tasks.append((sub_html, png_path, 1080))

    print(f"Total render tasks: {len(render_tasks)}")
    for item in render_tasks:
        render_html_snippet_to_png(item)
    print("FINISHED RENDERING ALL VECTOR CARDS")

if __name__ == "__main__":
    process_all_html_files()
