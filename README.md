# OpenLearn Pro v2 (Firebase LMS)

## Features
- Roles: owner/admin/instructor/ta/student
- Auth: Email/Password + Forgot Password
- Bootstrap Admin: `admin@openlearn.local` auto-admin, or Admin Key = `ADMIN2025`
- Catalog (search/filter/sort + pagination)
- Courses/lessons (video+article), uploads (Storage)
- Quizzes + attempts, Gradebook (basic), Analytics (totals + recent signups)
- Enrollments & My Learning
- Comments per course
- Assignments + student submissions
- Progress per lesson + Certificate (Canvas PNG)

## Setup
1. `firebase.js` → replace SDK config (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `appId`).
2. **Authentication**
   - Sign-in method → **Email/Password** = Enable
   - Settings → **Authorized domains** → add your `*.web.app`, `*.firebaseapp.com`, custom domain
   - Dev only: reCAPTCHA enforcement **Off/Optional**
3. **Firestore → Rules** → paste `firestore.rules` → **Publish**
4. **Storage → Rules** → paste `storage.rules` → **Publish**
5. **Hosting** (SPA rewrite recommended)
   ```json
   {
     "hosting": {
       "public": ".",
       "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
       "rewrites": [{ "source": "**", "destination": "/index.html" }]
     }
   }