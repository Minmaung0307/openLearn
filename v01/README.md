# OpenLearn Pro — Firebase Mini LMS

A Coursera-like single-page LMS with Firebase backend:
- Email/Password Auth (Firebase Auth) with password reset
- Fine-grained roles: `owner`, `admin`, `instructor`, `ta`, `student`
- Multi-user management (list users, change roles, activate/deactivate)
- Course CRUD with image upload (Firebase Storage)
- Lessons (video/article) with order, duration, publish flag
- Video player (mp4 or YouTube link) + Storage upload
- Quizzes per course (MCQ) + auto grading + attempts
- Gradebook (paginate attempts by course)
- Catalog search, filters, sorting + pagination
- Enrollments + My Learning
- Dark/Light theme

## 1) Firebase Setup
1. Create a Firebase project (console.firebase.google.com).
2. **Web App** → get config and paste into `firebase.js`:
   ```js
   const firebaseConfig = { apiKey:"...", authDomain:"...", projectId:"...", storageBucket:"...", messagingSenderId:"...", appId:"..." };
   ```
3. Firestore: **Start in production mode**. Create collections as needed (the app will create docs).
4. Deploy **Security Rules**:
   - Firestore: open **Rules**, paste from `firestore.rules`, publish.
   - Storage: open **Rules**, paste from `storage.rules`, publish.
5. Authentication → **Email/Password: Enable**.

## 2) Run Locally
Use a local server (module imports require HTTP):
- VS Code **Live Server** or `python -m http.server` in the folder.
- Open `http://localhost:8000` (or Live Server URL).

## 3) Roles
- On sign up, default role is `student`.
- Use **Admin Access Key** `ADMIN2025` during sign-up to auto-assign `admin`.
- Admin/instructor/owner can manage courses/lessons/quizzes and see Gradebook.
- Admin can manage users (change roles, deactivate).

## 4) Demo Data
`Admin → Load Demo Data` to create a few sample courses.

## 5) Notes
- Users list is from the `users` collection (client-writable profile docs). This is not the same as Firebase Auth Users list but works for role/gradebook purposes.
- You can upload **images** for courses and **videos** for lessons to Firebase Storage (watch usage/cost).
- Quiz supports single-correct MCQ. Attempts are stored in `attempts` collection.
- Catalog uses naive keyword array `k` for search.

## Troubleshooting
- If modules fail to load from `gstatic`, serve via local HTTP(S).
- If write operations fail, ensure you published the provided **security rules** and your signed-in user has a privileged role.
