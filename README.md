# Chile Tech Week

The decentralized tech week in Santiago, Chile.

**November 17-23, 2025**

## What is Chile Tech Week?

Chile's top tech companies host private events across Santiago during one week. This website showcases all these events in one place.

## Features

- 📅 Event discovery and listings
- 🏢 Company-hosted events
- 🎫 Registration and RSVP
- 📱 Mobile-friendly interface
- 🔗 Luma integration for calendar events

## Tech Stack

- **Framework**: Next.js 15
- **Database**: PostgreSQL + Drizzle ORM
- **Styling**: Tailwind CSS v4
- **UI**: shadcn/ui components
- **Auth**: NextAuth.js v5
- **Deployment**: Vercel

## Development

```bash
# Setup
pnpm install

# Development
pnpm dev

# Database
pnpm db:generate:migrate

# Code quality
pnpm typecheck
pnpm lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following the coding conventions in `CLAUDE.md`
4. Run `pnpm typecheck` and `pnpm lint`
5. Submit a pull request

---

Made for Santiago's tech community 🇨🇱
