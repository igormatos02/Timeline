# AGENTS.md - Chrono Timeline Project

## Project Overview
Financial timeline management application for tracking income, expenses, investments, and loans.

## Tech Stack
- **Frontend**: React 19 + Vite 8
- **Backend**: Express.js 5 + Node.js
- **Database**: Supabase (PostgreSQL)
- **Styling**: CSS Modules
- **State**: React hooks (useState, useEffect, useCallback, useMemo)
- **Date handling**: date-fns
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Linting**: oxlint

## Project Structure

### Backend (Clean Architecture)
```
server/
├── application/services/    # Use cases / business logic
├── domain/
│   ├── entities/           # Domain models
│   ├── enums/              # Domain enumerations
│   ├── repositories/       # Repository interfaces
│   └── services/           # Domain services
├── infrastructure/
│   └── database/           # Database implementation
├── interfaces/
│   └── http/routes/        # Express routes
├── data/                   # Data access layer
└── app.js                  # Express app setup
```

### Frontend
```
src/
├── components/             # React components
├── constants/              # App constants
├── context/                # React contexts (Toast, etc.)
├── enums/                  # Frontend enumerations
├── i18n/                   # Internationalization (PT, EN)
├── services/               # API client functions
├── utils/                  # Utility functions
├── App.jsx                 # Main app component
└── main.jsx                # Entry point
```

### Shared
```
shared/
├── config/                 # Shared configurations
├── dtos/                   # Data Transfer Objects
└── enums/                  # Shared enumerations (frontend + backend)
```

## API Routes
- `/api/auth` - Authentication (Google OAuth)
- `/api/timeboards` - Timeboard CRUD
- `/api/timelines` - Timeline CRUD
- `/api/events` - Event CRUD
- `/api/loans` - Loan contracts
- `/api/persons` - Person management

## Commands
- `npm run dev` - Start server + client concurrently
- `npm run server` - Start backend only (with --watch)
- `npm run dev:client` - Start frontend only
- `npm run build` - Build for production
- `npm run lint` - Run oxlint
- `npm run seed` - Seed database
- `npm run release` - Bump version (standard-version: feat->minor, fix->patch) + CHANGELOG + git tag vX.Y.Z
- `npm run release:minor` - Force minor bump
- `npm run release:major` - Force major bump

## Commit Convention (enforced by commitlint hook)
Commits MUST use Conventional Commits so `npm run release` bumps versions correctly:
- `feat: ...` - new feature -> bumps middle segment (features)
- `fix: ...` - bug fix -> bumps last segment (bugs)
- `chore:` / `refactor:` / `docs:` / `performance:` - no version bump (except perf if type declared)
- `BREAKING CHANGE` footer -> bumps major

Version is stamped in the header via `VersionBadge` (Vite `define __APP_VERSION__` from package.json).

## Code Conventions
- Use ES modules (import/export)
- Use `date-fns` for date operations (never native Date for formatting)
- Use `generateUUID()` from `src/utils/uuid.js` for new IDs
- Toast notifications via `useToast()` hook
- Translation via `useTranslation()` hook
- Prefer functional components with hooks
- Use React.memo for performance-critical components

## Database Schema (Supabase)
Main tables: timeboards, timelines, events, loan_contracts, persons

## Environment Variables
Server requires `.env` file with:
- `PORT` (default: 3001)
- Supabase credentials
- Brevo API key (email)

## Language
- UI is primarily in Portuguese (PT)
- Code comments in English
- i18n support for PT and EN
