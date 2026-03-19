This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Google Sign-In Setup

This app uses NextAuth for Google authentication.

1. Create a Google OAuth Client in Google Cloud Console.
2. Add `http://localhost:3000/api/auth/callback/google` to Authorized redirect URIs.
3. Create a `.env.local` file in the project root.
4. Fill in these environment variables in `.env.local`:

```bash
OPENAI_API_KEY=your-openai-compatible-api-key
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=llama-3.1-8b-instant

AUTH_SECRET=replace-with-a-long-random-string
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

You can generate `AUTH_SECRET` with:

```bash
npx auth secret
```

## Supabase History Setup

History is persisted in Supabase per signed-in user.

1. Create a Supabase project.
2. In SQL Editor, run:

```sql
create table if not exists public.quiz_attempts (
	id text primary key,
	user_email text not null,
	config jsonb not null,
	questions jsonb not null,
	score integer not null,
	total_questions integer not null,
	percentage integer not null,
	time_taken_seconds integer not null,
	completed_at timestamptz not null default now()
);

create index if not exists quiz_attempts_user_email_idx
	on public.quiz_attempts (user_email);

create index if not exists quiz_attempts_completed_at_idx
	on public.quiz_attempts (completed_at desc);
```

3. Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
