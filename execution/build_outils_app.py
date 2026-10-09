#!/usr/bin/env python3
"""
Build the Delacour tools deliverable (OUTILS_RENTABILITE_DELACOUR/livrable/).

The 19 tools (1.1 to 5.4) are one React + TypeScript app (OUTILS_RENTABILITE_DELACOUR/pilotage), built by Vite into a single
self-contained HTML file with a Content-Security-Policy that blocks any network request.

Output : livrable/pilotage.html  the application (also copied to app/ for local review)
         livrable/index.html     entry page: opens the tool list of pilotage.html (kept for existing links and shortcuts)

Prerequisite (once): cd OUTILS_RENTABILITE_DELACOUR/pilotage && npm install
Usage             : python3 execution/build_outils_app.py            (builds the app, then copies it)
                    python3 execution/build_outils_app.py --no-build (copies the last build)
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "OUTILS_RENTABILITE_DELACOUR"
APP, OUT, PILOTAGE = ROOT / "app", ROOT / "livrable", ROOT / "pilotage"

CSP = ("default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; "
       "img-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; "
       "form-action 'none'; base-uri 'none'")

# No script needed: the browser follows the refresh, even from a file opened on disk
INDEX = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="{CSP}">
  <meta http-equiv="refresh" content="0; url=pilotage.html#accueil">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Outils Delacour</title>
  <style>body{{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#FDFBF7;color:#11352A;display:grid;place-items:center;min-height:100vh;margin:0}}a{{color:#1B4D3E;font-weight:600}}</style>
</head>
<body>
  <p>Ouverture des outils… <a href="pilotage.html#accueil">Ouvrir les outils Delacour</a></p>
</body>
</html>
"""


def main():
    if "--no-build" not in sys.argv:
        if not (PILOTAGE / "node_modules").exists():
            sys.exit(f"Dépendances absentes : lancer `npm install` dans {PILOTAGE}")
        subprocess.run(["npm", "run", "build"], cwd=PILOTAGE, check=True)
    built = PILOTAGE / "dist" / "index.html"
    if not built.exists():
        sys.exit("pilotage/dist/index.html absent : lancer `npm run build` dans OUTILS_RENTABILITE_DELACOUR/pilotage")
    html = built.read_text(encoding="utf-8")
    if 'http-equiv="Content-Security-Policy"' not in html:
        sys.exit("La règle de sécurité (CSP) manque dans le fichier construit")
    OUT.mkdir(exist_ok=True)
    for folder in (APP, OUT):
        (folder / "pilotage.html").write_text(html, encoding="utf-8")
        (folder / "index.html").write_text(INDEX, encoding="utf-8")
    print(f"pilotage.html : {len(html.encode('utf-8')) // 1024} Ko (outils 1.1 à 5.4)")
    print(f"OK -> {OUT}")


if __name__ == "__main__":
    main()
