# Mengs Sinking Fund 2026

A private, mobile-friendly member portal for tracking contributions, loans, repayments, interest shares, and the overall fund balance.

## Roles

- **Admin:** registers members, assigns email/PIN access, and manages roles.
- **Treasurer:** adds contributions and loans, edits loan details, and records repayments.
- **Member:** read-only access to the live fund standing and transaction history.

## Technology

Built with Next.js, React, TypeScript, Drizzle ORM, Neon Postgres, and Vercel.

## Development

```bash
npm install
npm run build
```

The app expects a `DATABASE_URL` environment variable. Database migrations are stored in `drizzle/`.
