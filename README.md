# AI Quiz App

AI Quiz App is a Next.js-based quiz platform that generates questions using an AI provider, allows users to take quizzes interactively, and stores score history for signed-in users.

<img width="1919" height="998" alt="image" src="https://github.com/user-attachments/assets/ee583596-4596-4da4-9eff-f454e71d9a08" />

## Tech Stack

- Framework: Next.js 14 (App Router)
- Language: TypeScript
- UI: React 18 + Tailwind CSS
- State Management: Zustand
- Authentication: NextAuth (Google sign-in)
- Backend/API: Next.js Route Handlers
- AI Integration: OpenAI-compatible chat completion API
- Database: Supabase (quiz history persistence)
- PWA: Web App Manifest + Service Worker
- Hosting/Deployment: Vercel

## Setup Instructions

1. Install prerequisites:
   - Node.js 20+
   - npm 10+
   - Access to your chosen AI provider, authentication provider, and database project

2. Install dependencies:

```bash
npm install
```

3. Configure environment values:
   - Create `.env.local` in the project root.
   - Add all required runtime values for auth, AI provider, and database integration.
   - Do not commit `.env.local`.

4. Prepare data storage:
   - Create a history table for quiz attempts in your database.
   - Ensure the server can insert and read quiz attempts for the signed-in user.

5. Run the app locally:

```bash
npm run dev
```

6. Optional checks:

```bash
npm run lint
npm run build
```

## AI Service Integration Details

- AI quiz generation is handled by [app/api/generate-quiz/route.ts](app/api/generate-quiz/route.ts).
- Follow-up explanations are handled by [app/api/follow-up/route.ts](app/api/follow-up/route.ts).
- Both routes use server-side configuration (never exposed to the client).
- The generation route enforces structured JSON output and validates question shape before returning data.
- The app normalizes questions into supported formats:
  - multiple choice
  - true/false
  - fill in the blank
- Basic resilience is included (for example, retry behavior and defensive parsing) to reduce failures from inconsistent model output.

## Architecture Decisions

- Next.js App Router was chosen for colocating UI and server routes in one TypeScript codebase.
- Zustand was chosen for quiz workflow state in [store/useQuizStore.ts](store/useQuizStore.ts), including status transitions and local persistence.
- Dynamic imports in [app/page.tsx](app/page.tsx) reduce initial load by loading heavy quiz screens on demand.
- NextAuth is used for session handling, while server routes gate user-specific operations.
- Database writes and reads for history are routed through server endpoints to keep credentials server-side.
- Component-level and screen-level error boundaries improve stability and recovery UX.

## Features Implemented

- Topic-based AI quiz generation
- Difficulty and question-count customization
- Question type mix controls with auto-balancing to keep total at 100%
- Quiz-taking flow with progress state
- Results view with scoring summary
- Quiz history view for signed-in users
- Google sign-in and sign-out
- In-app Help modal plus floating Help shortcut
- Error alerts and retry patterns
- Progressive Web App assets (manifest and service worker)

## Known Limitations

- No full automated test suite is included yet.
- AI responses can still vary by provider/model quality.
- Strict schema validation may reject some malformed model responses.
- In-memory caching is process-local and not shared across multiple instances.
- History requires valid external auth and database setup.
