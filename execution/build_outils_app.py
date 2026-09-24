#!/usr/bin/env python3
"""
Build the self-contained Delacour tools app (OUTILS_RENTABILITE_DELACOUR/livrable/).

Sources  : OUTILS_RENTABILITE_DELACOUR/app/index.html, tool_page.html (use CDNs for quick editing)
Output   : OUTILS_RENTABILITE_DELACOUR/livrable/ — same pages with NO external call:
           - Tailwind CSS compiled once and inlined (replaces cdn.tailwindcss.com + inline config)
           - SheetJS inlined (replaces cdn.jsdelivr.net)
           - Google Fonts links removed (system fonts)
           - Content-Security-Policy meta that blocks any network request

Prerequisite (once): cd OUTILS_RENTABILITE_DELACOUR/build && npm install
                    cd OUTILS_RENTABILITE_DELACOUR/pilotage && npm install && npm run build   (tool 1.1)
Usage             : python3 execution/build_outils_app.py
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "OUTILS_RENTABILITE_DELACOUR"
APP, BUILD, OUT = ROOT / "app", ROOT / "build", ROOT / "livrable"
PAGES = ["index.html", "tool_page.html"]

# Inline scripts/styles are allowed (the whole app is inline); everything that leaves the page is not.
CSP = ("default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; "
       "img-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; "
       "form-action 'none'; base-uri 'none'")


def compile_css() -> str:
    tw = BUILD / "node_modules" / ".bin" / "tailwindcss"
    if not tw.exists():
        sys.exit(f"Tailwind missing: run `npm install` in {BUILD}")
    src = BUILD / "input.css"
    src.write_text("@tailwind base;\n@tailwind components;\n@tailwind utilities;\n")
    out = BUILD / "tailwind.generated.css"
    subprocess.run([str(tw), "-c", "tailwind.config.js", "-i", src.name, "-o", out.name, "--minify"],
                   cwd=BUILD, check=True, capture_output=True)
    return out.read_text()


def build_page(html: str, css: str, xlsx_js: str) -> str:
    # Tailwind CDN + its inline config
    html = re.sub(r'\s*<script src="https://cdn\.tailwindcss\.com"></script>', "", html)
    html, n = re.subn(r'\s*<script>\s*tailwind\.config\s*=.*?</script>', "", html, count=1, flags=re.S)
    if n != 1:
        sys.exit("tailwind.config block not found")
    # Google Fonts
    html = re.sub(r'\s*<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>', "", html)
    # SheetJS
    html = re.sub(r'\s*<!-- XLSX for Excel Export -->', "", html)
    html = html.replace('<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>',
                        f"<script>{xlsx_js}</script>")
    head_inject = (f'\n  <meta http-equiv="Content-Security-Policy" content="{CSP}">'
                   f"\n  <style>{css}</style>")
    html = html.replace("<head>", "<head>" + head_inject, 1)
    leftovers = re.findall(r'(?:src|href)="https?://[^"]+"', html)
    if leftovers:
        sys.exit(f"External references left: {leftovers[:5]}")
    return html


def main():
    css = compile_css()
    xlsx_js = (BUILD / "node_modules" / "xlsx" / "dist" / "xlsx.full.min.js").read_text()
    # A literal "</script>" inside the inlined library would close our tag early
    xlsx_js = xlsx_js.replace("</script", "<\\/script")
    OUT.mkdir(exist_ok=True)
    for name in PAGES:
        page = build_page((APP / name).read_text(encoding="utf-8"), css, xlsx_js if name == "tool_page.html" else "")
        (OUT / name).write_text(page, encoding="utf-8")
        print(f"{name}: {len(page) // 1024} Ko")
    # Tool 1.1 rebuilt as its own app (OUTILS_RENTABILITE_DELACOUR/pilotage, React + TypeScript, built by Vite)
    pilotage = ROOT / "pilotage" / "dist" / "index.html"
    if pilotage.exists():
        (OUT / "pilotage.html").write_text(pilotage.read_text(encoding="utf-8"), encoding="utf-8")
        idx = OUT / "index.html"
        html = idx.read_text(encoding="utf-8").replace("tool_page.html?tool=1.1", "pilotage.html")
        # tool cards are built in JS: send tool 1.1 to the new app
        html = html.replace("window.location.href='tool_page.html?tool=${t.id}'",
                            "window.location.href=(t.id === '1.1' ? 'pilotage.html' : 'tool_page.html?tool=' + t.id)")
        if "pilotage.html' : 'tool_page.html?tool='" not in html:
            sys.exit("index.html: tool card link not found, tool 1.1 would open the old version")
        idx.write_text(html, encoding="utf-8")
        print(f"pilotage.html: {pilotage.stat().st_size // 1024} Ko (outil 1.1 reconstruit)")
    else:
        print("pilotage/dist absent : lancer `npm run build` dans OUTILS_RENTABILITE_DELACOUR/pilotage")
    print(f"OK -> {OUT}")


if __name__ == "__main__":
    main()
