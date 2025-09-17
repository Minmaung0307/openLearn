# OpenLearn – Developer Setup & Architecture Guide

> **Audience:** Developers maintaining or extending this app  
> **Files referenced:** `index.html`, `styles.css`, `app.js`, `firebase.js`, and optional `/data` content

---

## 1) Overview

OpenLearn is a single‑page, front‑end web app (no bundler required) that delivers a course catalog, in‑browser reader, quizzes, certificates, announcements, global search, and live chat.

- **HTML**: semantic sections for pages (`#page-…`) + dialogs/modals.
- **CSS**: a themeable design with CSS variables controlled by JS (`applyPalette`, `applyFont`).
- **JS**: a single file (`app.js`) organized by “Parts” (1/6 → 6/6). Each part groups related features (auth, catalog, reader, admin, etc.).
- **Firebase**: used for Auth, Firestore (progress & enroll sync), and Realtime Database (live chat). The app also supports localStorage fallbacks for offline/simple demos.

The entry points live in `DOMContentLoaded` blocks and the `showPage(id)` router which toggles `visible` on page sections.

---

## 2) Project Structure

```
/                 # static site root
├── index.html    # all UI markup, topbar/sidebar/pages/modals
├── styles.css    # base styles + components + responsive rules
├── app.js        # core app logic (ES module)
├── firebase.js   # your Firebase config + exported SDK bindings
└── /data
    ├── catalog.json            # course metadata list
    └── /courses/<courseId>/
        ├── meta.json           # course modules/lessons manifest
        ├── quiz.json|quiz1..N  # question bank(s)
        └── *.html              # lesson bodies (optional)
```

**`catalog.json` example:**

```json
{
  "items": [
    { "id": "js-essentials", "title": "JavaScript Essentials", "category": "Web", "level": "Beginner", "price": 0, "rating": 4.7, "hours": 10, "credits": 3, "summary": "Start JavaScript from zero." }
  ]
}
```

**`meta.json` (per course):**

```json
{
  "cover": "/images/js-cover.png",
  "description": "Full intro to JS",
  "modules": [
    {
      "title": "Basics",
      "lessons": [
        { "type": "html", "src": "lesson1.html", "title": "Hello JS" },
        { "type": "quiz", "src": "quiz.json" },
        { "type": "project" }
      ]
    }
  ]
}
```

---

## 3) Firebase Setup

Create `firebase.js` that exports exactly what `app.js` imports:

```js
// firebase.js (example shape)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getDatabase, ref, push, onChildAdded, query, orderByChild, get, remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const app = initializeApp({ /* your config */ });
export const auth = getAuth(app);
export const db   = getFirestore(app);

// Realtime DB for chat
export { getDatabase, ref, push, onChildAdded, query, orderByChild, get, remove };

// Auth exports
export { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut };

// Firestore exports for progress/enrolls
export { doc, getDoc, setDoc };
```

> **Note:** We intentionally do **not** export `endAt()` to avoid naming mismatches—`app.js` prunes old chat items client‑side via `get(roomRef)` and checks `ts` manually.

### Suggested Security Rules (sketch)
- **Auth**: email/password.  
- **Firestore**: `progress/{uid}`, `enrolls/{uid}` → users can read/write only their own doc.  
- **RTDB**: `/chats/global` and `/chats/{courseId}` → write requires auth, read public/limited (per need).

*(Write precise rules per your org’s policy.)*

---

## 4) Application Modules (inside `app.js`)

### 4.1 Part 1 — Core Helpers / Theme / State
- Shorthand DOM helpers: `$`, `$$`, `esc`, `toast`.
- Theme & font (`applyPalette`, `applyFont`).
- Local state wrappers: `_read/_write` + getters like `getCourses`, `getEnrolls`, `getProfile`.
- Role helpers: `isLogged`, `getRole`.
- Certificates registry: `ensureCertIssued`, `getIssuedCert`.
- Quiz utilities and constants: `QUIZ_PASS`, `QUIZ_RANDOMIZE`, etc.

### 4.2 Part 2 — Data, Catalog, Sidebar/Topbar, Search
- Auto resolves `/data` base and pulls `catalog.json`.
- Renders course cards with filters/sorting.
- Sidebar toggling and mobile burger menu.
- **Global Search**: builds an index from multiple sources and renders a dropdown under the top search input.

### 4.3 Part 3 — Auth & Catalog Actions
- Builds Login/Signup modal at runtime (`ensureAuthModalMarkup`).
- `initAuthModal` wires all auth events and updates UI via `setLogged()`.
- Enroll flow (`markEnrolled`, `handleEnroll`) with optional PayPal modal.

### 4.4 Part 4 — Profile, Transcript, Reader + Quiz
- Profile panel rendering and inline edit modal.
- **Reader**: in‑page course reading with `RD` state; supports lesson types (`lesson/reading/quiz/project`).
- Quiz render/check logic (`renderQuiz`) with pass gating and fireworks 🎆.
- Finish flow issues certificates and opens a congrats dialog.
- **Progress Sync**:
  - `progressDocRef()` → Firestore doc `progress/{uid|email}`
  - `loadProgressCloud`, `saveProgressCloud` (merge:true)
  - `syncProgressBothWays()` merges {completed[], quiz{}, certs{}}
  - `migrateProgressKey()` merges legacy `email`-keyed doc into `uid`

### 4.5 Part 5 — Gradebook, Admin, Import/Export, Announcements, Chat
- Gradebook: summarizes completed courses.
- Admin table: view/edit/delete courses; import/export JSON for custom courses.
- Announcements CRUD (localStorage) + topbar badge.
- **Chat**: RTDB rooms (`/chats/global`, `/chats/{courseId}`) with 10‑day TTL pruning (`pruneOldChatsRTDB` + local fallback).

### 4.6 Part 6 — Settings & Boot
- Theme/Font selectors.
- Router boot, initial rendering & sync on `DOMContentLoaded`.
- Auth UI gating (disables clicks until logged in).

---

## 5) Data Model

### Firestore
- `enrolls/{uid}` → `{ courses: [courseId], ts }`
- `progress/{uid}` →
  ```json
  {
    "completed": [ { "id": "courseId", "ts": 1710000000000, "score": 0.9 } ],
    "quiz": { "js-essentials:0": { "best": 0.8, "passed": true } },
    "certs": { "<uid>|<courseId>": { "id": "OL-ABCD1234", "issuedAt": 171..., "score": 0.92 } },
    "ts": 171...
  }
  ```
  *(Plus optional per‑course snapshot `{ [courseId]: { status, lesson, ts } }` if you decide to store per‑course cursors.)*

### Realtime Database
- `/chats/global` → `{ uid, user, text, ts }` items  
- `/chats/{courseId}` → same structure per course

### LocalStorage
- `ol_courses`, `ol_enrolls`, `ol_profile`, transcript keys: `ol_completed_v2`, `ol_quiz_state`, `ol_certs_v1`

---

## 6) Reader/Quiz Flow

1. Open a course → `buildPagesForCourse(course)` constructs `RD.pages` from `/data/courses/<id>/meta.json` + quizzes.
2. `renderPage()` draws the current lesson:
   - For `quiz`: user answers → `Check` computes score → pass mark persisted via `setPassedQuiz()` (local + cloud).
   - For `project`: requires file upload before Next/Finish.
3. Last page shows **Finish** button → `markCourseComplete()` + `ensureCertIssued()` then `showCongrats()`.

**Cross‑browser tip:** After finish/save, the UI re‑renders “Review” in My Learning; a small post‑render cloud check ensures the label updates even if localStorage sync races on Firefox.

---

## 7) Global Search

- Index gathered from `getAnns()`, `getCourses()`, optional inventory/vendor/tasks datasets, and users.
- Renders a dropdown right under the top search input.
- Clicking a result navigates via `showPage(item.page)`.

To extend, add your new collection to `buildIndex()`.

---

## 8) UI Lock / Auth Gating

- `setAppLocked(true)` disables clickable elements (except login) and shows an overlay until Firebase auth resolves.
- Router guard prevents visiting protected pages while locked.

---

## 9) Announcements

- Stored in localStorage for simplicity.  
- Edit/Delete inline; updates topbar badge (count).  
- You can later move this to Firestore if you need multi‑user sync.

---

## 10) Payments (Optional)

- PayPal smart buttons are rendered into `#paypal-container` and on `onApprove` we call `markEnrolled(course.id)`.

---

## 11) Extending Courses

- Add entry to `/data/catalog.json`.
- Create `/data/courses/<id>/meta.json` with `modules[].lessons[]` referencing `html`/`quiz`/`project`.
- Add `quiz.json` or `quiz1..N.json` with the question bank. The app supports both a structured format and a simple array format via `normalizeQuiz()`.

---

## 12) Deployment

- Static hosting is enough (Firebase Hosting, Netlify, Vercel static, S3, nginx, etc.).
- Ensure the app is served as ES modules (regular `<script type="module" src="app.js">`).

---

## 13) Common Pitfalls

- **Missing exports in `firebase.js`**: Ensure every symbol used by `app.js` is exported (no `endAt`).
- **CORS/paths**: The app probes `/data/catalog.json` from multiple base candidates; host your `data` folder at one of them.
- **Firefox label race**: Keep the post‑render cloud label update in `renderMyLearning()` to show **Review** consistently.

---

## 14) Quick Start

1. Create Firebase project → fill `firebase.js` as above.
2. Put your `data/` folder with `catalog.json` and course subfolders.
3. Open `index.html` via a local static server (e.g. `python -m http.server`).
4. Sign up, enroll, open a course, take a quiz → finish to receive a certificate.

---

## 15) Where to Change Things

- Theme presets: `PALETTES` in Part 1.
- Passing score: `QUIZ_PASS`.
- Quiz sample size: `QUIZ_SAMPLE_SIZE`.
- Chat retention: `TEN_DAYS` in Part 5.
- Auth gating exceptions: `ALLOW_PAGES_WHEN_LOCKED` in Part 5/6.
- Global search sources: `setupGlobalSearch()` → `buildIndex()`.


---

## 18) Creating & Structuring Courses

This section explains **how to build a full course** that shows up on the **Courses page**, allows learners to **enroll**, **read lessons**, **take quizzes/projects**, and **receive certificates**.

---

### 📂 Folder & File Layout

All course content lives under:

```
public/data/courses/<courseId>/
```

Where `<courseId>` is a short, unique identifier (e.g. `js-essentials`, `pali-basics`, `web-foundations`).

A typical course folder contains:

```
/public/data/courses/js-essentials/
│
├── meta.json           # course manifest (modules & lessons)
├── quiz1.json          # quiz question bank(s)
├── lesson1.html        # HTML lesson content
├── lesson2.html        # more lessons
├── cover.png           # optional course cover image
└── assets/             # optional images/media for lessons
```

---

### 🗂 Step 1: Add to `catalog.json`

The course must appear in the global catalog:

**`public/data/catalog.json`**
```json
{
  "items": [
    {
      "id": "js-essentials",
      "title": "JavaScript Essentials",
      "category": "Web",
      "level": "Beginner",
      "price": 0,
      "rating": 4.7,
      "hours": 10,
      "credits": 3,
      "summary": "Start JavaScript from zero.",
      "image": "/data/courses/js-essentials/cover.png"
    },
    {
      "id": "pali-basics",
      "title": "Pali Basics",
      "category": "Languages",
      "level": "Beginner",
      "price": 0,
      "rating": 4.5,
      "hours": 8,
      "credits": 2,
      "summary": "Introduction to the Pali language.",
      "image": "/data/courses/pali-basics/cover.png"
    }
  ]
}
```

---

### 🗂 Step 2: Create `meta.json`

Every course folder must have a `meta.json`. This tells the app what lessons/quizzes to show.

**`public/data/courses/js-essentials/meta.json`**
```json
{
  "cover": "/data/courses/js-essentials/cover.png",
  "description": "Full introduction to JavaScript programming.",
  "modules": [
    {
      "title": "Getting Started",
      "lessons": [
        { "type": "html", "src": "lesson1.html", "title": "Hello JavaScript" },
        { "type": "html", "src": "lesson2.html", "title": "Variables & Types" },
        { "type": "quiz", "src": "quiz1.json", "title": "Quiz: Basics" }
      ]
    },
    {
      "title": "Control Flow",
      "lessons": [
        { "type": "html", "src": "lesson3.html", "title": "If/Else & Loops" },
        { "type": "quiz", "src": "quiz2.json", "title": "Quiz: Control Flow" }
      ]
    }
  ]
}
```

- **modules[]**: groups of lessons  
- **lessons[]**: can be `"html"`, `"quiz"`, or `"project"`  
- **src**: filename inside the course folder  
- **title**: shown in Reader navigation  

---

### 🗂 Step 3: Lesson Files

Each lesson is just an HTML snippet.

**`public/data/courses/js-essentials/lesson1.html`**
```html
<h2>Hello JavaScript</h2>
<p>JavaScript is the language of the web. Let's begin with a simple example:</p>
<pre><code>console.log("Hello, world!");</code></pre>
```

---

### 🗂 Step 4: Quiz Files

Quizzes can be single/multiple choice or short answers.

**`public/data/courses/js-essentials/quiz1.json`**
```json
[
  {
    "q": "What keyword declares a variable in JavaScript?",
    "options": ["var", "let", "const", "all of the above"],
    "answer": [3]
  },
  {
    "q": "What will `console.log(2 + '2')` print?",
    "options": ["22", "4", "NaN"],
    "answer": [0]
  }
]
```

- `"answer": [index]` ⇒ array of correct option indexes  
- Multiple correct answers allowed: `"answer": [0,2]`  

---

### 🗂 Step 5: Projects (optional)

For practice tasks where learners must upload a file:

```json
{ "type": "project", "title": "Final Project" }
```

The app will enforce “Upload before Finish”.

---

### 🔄 How it Works in the App

1. **Courses Page** → app reads `catalog.json`, renders course cards with title, category, level, etc.  
2. **Enroll** → click *Enroll* → adds course to user’s enrollments (stored in Firestore/Local).  
3. **Reader** → when opening course:
   - loads `meta.json`
   - builds navigation (Prev/Next buttons)
   - loads each lesson (`html`), quiz (`quiz.json`), or project  
4. **Quizzes** → scored; must pass ≥70% (default) to continue  
5. **Completion** → when all lessons passed, certificate auto-issued (with QR + cert no.)  
6. **Transcript** → Profile → Transcript lists completed courses, credits, scores  

---

### 📂 Example Course Folders You Already Have

- `public/data/courses/js-essentials/`  
- `public/data/courses/pali-basics/`  
- `public/data/courses/web-foundations/`  

Each should follow the **same pattern**:  
`meta.json` → lesson HTMLs → quiz JSONs → optional cover image.

---

### ✅ Checklist to Add a New Course

1. Make a new folder under `/public/data/courses/<courseId>/`  
2. Add `meta.json`, lesson HTMLs, quizzes  
3. Add cover image (optional but recommended)  
4. Add entry to `catalog.json`  
5. Hard refresh → New course appears on Courses page
