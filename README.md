# Mengs Sinking Fund 2026

A private, mobile-friendly member portal for tracking contributions, loans, repayments, interest shares, and the overall fund balance.

## Access

- Registered members can sign in with their email and private PIN.
- Members can view the complete fund history and member summaries.
- Administrators can register members, add transactions, and maintain records.

## Technology

Built with Next.js/Vinext, React, TypeScript, Cloudflare Workers, and D1.

## Development

```bash
npm run install:ci
npm run build
```

The deployed database is managed through the D1 binding declared in `.openai/hosting.json`.
