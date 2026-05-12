# Directive: Scrape Website (Example)

## Goal
Extract the main headline and all paragraph text from a given URL and save it to a text file in `.tmp/`.

## Inputs
- `url`: The URL of the website to scrape.
- `output_filename`: The name of the file to save the content into (inside `.tmp/`).

## Tools / Scripts to Use
- `execution/example_scrape.py`

## Expected Outputs
- A text file located at `.tmp/<output_filename>` containing the extracted text.
- If the website cannot be reached, the script should fail gracefully with an informative error message.

## Edge Cases
- Invalid URL provided: Script should exit with an error.
- Website returns 404 or 403: Script should exit with an error.
- No textual content found: Save an empty file and log a warning.

## Notes for Orchestration (You)
- If `execution/example_scrape.py` does not exist, you must create it or ask the user to provide it.
- After running the script, verify that the file was created in `.tmp/`.
- If the scrape fails due to a timeout, you may retry once before giving up.
