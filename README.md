# Economics Question Bank

Single-page Economics Question Bank with Firebase Firestore saving and OpenRouter AI keyword/extract generation through a Vercel API proxy.

## Files

- `index.html` — main app
- `api/openrouter.js` — Vercel serverless function that protects your OpenRouter API key
- `package.json` — minimal project file for Vercel

## Firebase setup

1. Go to Firebase Console.
2. Create or open your project.
3. Go to **Build > Firestore Database**.
4. Click **Create database**.
5. Start in test mode first while checking deployment.
6. Go to **Project settings > General > Your apps > Web app**.
7. Copy the Firebase config.
8. In `index.html`, replace this block:

```js
const firebaseConfig = {
  apiKey: "PASTE_FIREBASE_API_KEY",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_MESSAGING_SENDER_ID",
  appId: "PASTE_APP_ID"
};
```

with your actual Firebase config.

## Temporary Firestore rules for testing

Use this only while testing:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /questions/{docId} {
      allow read, write: if true;
    }
  }
}
```

After testing, secure the app with Firebase Authentication or restrict writes.

## GitHub upload

1. Create a new GitHub repository, e.g. `econs-question-bank`.
2. Upload all files and folders in this package.
3. Commit changes.

## Vercel deployment

1. Go to Vercel.
2. Add New Project.
3. Import your GitHub repository.
4. Framework preset: **Other**.
5. Build command: leave blank.
6. Output directory: leave blank.
7. Add Environment Variable:
   - Name: `OPENROUTER_API_KEY`
   - Value: your OpenRouter key
8. Deploy.

## Local testing with Vercel CLI

```bash
npm i -g vercel
vercel dev
```

Then open the local URL shown in the terminal.
