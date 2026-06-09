# Economics Question Bank - Firebase Shell

This version keeps the app small. It loads questions from Firebase and can import new JSON files directly into Firestore.

## Files to upload to GitHub

- index.html
- api/openrouter.js
- package.json
- sample-questions-template.json optional, for reference only

## Firebase collection

The app reads and writes to Firestore collection:

questions

## Importing new questions

1. Open the deployed app.
2. Use the "Import New Questions from JSON" section.
3. Choose a JSON file.
4. Click "Preview JSON".
5. If the preview looks correct, click "Import to Firebase".
6. Click "Reload Firebase".

## Accepted JSON formats

The file can be:

1. A direct array:

[
  { "Year": "2026", "JC": "SAJC", "Level": "H2", "Group": "EQ1", "Question": "..." }
]

2. An object with one of these arrays:

{
  "questions": [ ... ]
}

{
  "firebaseQuestions": [ ... ]
}

{
  "data": [ ... ]
}

## Supported field names

Preferred fields:

- id
- YearFilter
- Year
- JCFilter
- JC
- Level
- Group
- Keywords
- Extracts
- Question

The importer also accepts lowercase versions like year, jc, level, group, keywords, extracts, question.
