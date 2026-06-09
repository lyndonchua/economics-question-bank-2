# Economics Question Bank

Upload to GitHub and deploy with Vercel.

## Files
- `index.html` — main app shell with Firebase loading, editing, and JSON import
- `api/openrouter.js` — Vercel API proxy for OpenRouter
- `package.json` — Vercel helper file
- `sample-questions-template.json` — sample JSON format

## JSON schema
Use only these fields:

```json
{
  "Year": "2025",
  "JC": "SAJC",
  "Level": "H2",
  "Group": "FE/CSQ1",
  "Keywords": ["Healthcare", "Positive Externalities"],
  "Extracts": "...",
  "Question": "...",
  "Answer": "",
  "ExaminerComments": ""
}
```

Do not use `PaperType`, `QuestionNumber`, or `Title`. The app will ignore/remove them during import.

## Import workflow
1. Open the app.
2. Choose a JSON file.
3. Click **Preview JSON**.
4. Review and edit the full entry in the modal.
5. Click **Import Edited Records to Firebase**.
