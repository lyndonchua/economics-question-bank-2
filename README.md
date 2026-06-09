# Economics Question Bank V5

## What this version supports

- Upload PDF, Word, Excel, TXT, or JSON
- PDF/DOCX/XLSX are converted to text in the browser
- OpenRouter processes documents into clean JSON
- Review & Edit before importing
- JSON upload skips AI and goes directly to Review & Edit
- Firebase Firestore is used as the permanent database
- Clean schema only:
  - Year
  - JC
  - Level
  - Group
  - Keywords
  - Extracts
  - Question
  - Answer
  - ExaminerComments
  - SourceFile
  - DateImported
  - Verified

## Vercel Environment Variable

Add this in Vercel:

OPENROUTER_API_KEY = your OpenRouter key

Then redeploy.

## Firestore collection

The app saves to:

questions

## Important

Do not paste your OpenRouter API key into index.html.
