# BimClub Developer Guide

## 1. Project Overview
BimClub is a web application for a university club focused on Building Information Modeling (Bim). It allows users to register, enroll in courses, take quizzes, earn certificates, and build a public portfolio.
It also has an admin CMS and instructor roles for managing courses.

### Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JS, Web Components (for Navbar/Footer).
- **Backend**: Node.js, Express.js.
- **Database**: MariaDB 10.11.
- **Authentication**: `express-session`, `express-mysql-session`, `bcryptjs`.
- **Infrastructure**: Docker Compose (app + db + phpmyadmin).

---

## 2. Architecture

### Directory Structure
- `public/`: Frontend assets (HTML, CSS, JS, images).
  - `page/`: Subpages (about, courses, admin, etc.).
  - `js/`: Frontend logic (`auth.js`, `navbar-component.js`).
  - `css/`: Stylesheets (`global.css`, page-specific CSS).
- `routes/`: Backend API routes.
- `database/`: SQL schemas and seed data.
- `middleware/`: Auth and role-based access control.

### Key Workflows
- **Authentication**: `POST /api/auth/register` (creates user, generates OTP) → `POST /api/auth/verify-otp` (activates user) → `POST /api/auth/login` (sets session cookie).
- **Courses**: Instructors create courses → Users enroll → Users watch videos with embedded stops (questions) → Users take final quiz → Pass quiz (>= pass_score) → Issue certificate.
- **Portfolios**: Publicly accessible `portfolio_public.html?id=...`. Pulls system certificates and manual certificates.

---

## 3. Database Documentation

### Users & Auth
- `users`: id, email, username, password_hash, role (user/instructor/admin), is_verified.
- `sessions`: Managed by `express-mysql-session`.

### Courses & Learning
- `courses`: id, instructor_id, title, video_url, pass_score, is_published.
- `course_video_stops`: Questions that pause the video at specific timestamps.
- `course_quiz_questions`: Final exam questions.
- `course_quiz_attempts`: Tracks user scores.
- `certificates`: Auto-generated when user passes a course quiz (linked to `courses`).

### Portfolio
- `portfolios`: User's profile summary and settings (is_public).
- `portfolio_experiences`, `portfolio_education`, `portfolio_projects`.
- `portfolio_certificates`: Manual certificates uploaded by the user from external sources.

### Community
- `activities`: Club events.
- `achievements`: Member accomplishments.
- `honors`: Hall of Fame alumni.

---

## 4. API Endpoints

### Auth
- `POST /api/auth/login`: Accepts `email` or `username`, and `password`.
- `POST /api/auth/register`: Requires full_name, username, email, password.
- `POST /api/auth/verify-otp`: Requires email, otp.
- `GET /api/auth/me`: Returns current user session info.

### Courses
- `GET /api/courses`: List published courses.
- `GET /api/courses/:id/preview`: Guest preview (no answers).
- `GET /api/courses/:id`: Full course data (requires login).
- `POST /api/courses/:id/quiz/submit`: Evaluate exam, issues certificate if passed.

### Portfolio
- `GET /api/portfolios/me`: Authenticated user's portfolio.
- `GET /api/portfolios/public/:userId`: Public portfolio view.
- `POST /api/portfolios/me/certificates`: Add external certificate.

---

## 5. Security Context
- **Passwords**: Hashed with `bcryptjs`.
- **Sessions**: Stored in DB, cleared on expiration.
- **Rate Limiting**: Applied to `/api/auth` endpoints (max 50 requests / 15 min).
- **Headers**: Secured with `helmet`.
- **File Uploads**: Validated by `multer` (images only) in `/api/upload`.

---

## 6. Maintenance Guide

### Local Development
1. Start containers: `docker-compose up -d --build`
2. Backend is NOT volume-mapped in docker-compose for this env. You must run `docker-compose up -d --build app` after changing any backend code (`server.js`, `routes/`, `middleware/`).
3. Frontend changes (`public/`) ARE volume-mapped and reflect immediately on refresh.
4. Database is on port 3306. Adminer/PHPMyAdmin on port 8080.

### Database Recovery
If Docker crashes or volumes are lost, the database initializes automatically from `database/schema.sql` on the next `docker-compose up`. Ensure `schema.sql` is always up-to-date with schema changes.
