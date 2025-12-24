This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment

Copy `.env.example` to `.env.local` and set the required values:

- `NEXT_PUBLIC_PRIVY_APP_ID` and `PRIVY_APP_ID` (must match)
- `PRIVY_VERIFICATION_KEY` (from the Privy dashboard)
- `PRIVY_APP_SECRET` (required for profile metadata updates)
- Optional: `NEXT_PUBLIC_PRIVY_CLIENT_ID`
- Optional: `NEXIS_CLOUD_API_URL` / `NEXIS_CLOUD_API_VERSION`
- Optional service adapters: `NEXIS_BILLING_API_URL`, `NEXIS_TEAMS_API_URL`, `NEXIS_AGENTS_API_URL`
- Optional API adapters: `NEXIS_API_KEYS_API_URL`, `NEXIS_API_USAGE_URL`, `NEXIS_TRUST_CENTER_API_URL`
- Optional observability: `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`

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

## Database Setup

This project uses PostgreSQL with Prisma ORM.

### Local Development

1. Ensure you have a PostgreSQL database running.
2. Update `.env.local` with your `DATABASE_URL`.
3. Run migrations:

```bash
npx prisma migrate dev
```

### Deployment (Railway)

This project is configured for deployment on Railway.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new?template=https%3A%2F%2Fgithub.com%2FNexis-AI%2Fnexis-cloud-console&plugins=postgresql&envs=DATABASE_URL)

1. Click the "Deploy on Railway" button.
2. Railway will import the repository and automatically provision a PostgreSQL database.
3. The `DATABASE_URL` environment variable will be automatically linked.
4. Required environment variables will be prompted (refer to `.env.example`).

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
