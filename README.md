# Nova Finance

A self-hosted personal finance tracker. Available as an **Android APK** (React Native / Expo) and a **React web app** (`novaweb.iamlaura.dev`). The backend is Node.js + Express + SQLite, designed to run on a homelab or any small server.

## Features

- **Multi-account management** — checking, savings, and custom accounts with balance tracking
- **Transactions** — income, expenses, and transfers between accounts with 100+ category icons
- **Recurring items** — track fixed periodic commitments (rent, subscriptions, salary) with push notification reminders before each due date
- **Debts & loans** — track money you owe and money owed to you, with payment history
- **Savings goals** — set targets and fund them with savings transfers
- **Envelope budgeting** — allocate budgets per category per month
- **Statistics** — monthly summaries, budget vs. actual, category breakdowns
- **Search** — full-text search across all transactions
- **Automatic category suggestion** — smart guessing based on description keywords
- **Auto-lock** — locks the app after 5 minutes in the background
- **Privacy mask** — hides financial data in the system app switcher
- **Offline banner** — detects connection loss and queues actions
- **Dark / light theme** — neon-dark default with a clean light mode
- **Biometric unlock** — Face ID / fingerprint via Expo Local Authentication
- **Push notifications** — reminders for upcoming recurring payments
- **Onboarding flow** — first-run guide for new users

## Tech stack

| Layer | Technology |
|---|---|
| Mobile app | React Native 0.74, Expo 51 |
| Navigation | React Navigation v6 (bottom tabs + native stack) |
| State management | React Context + custom hooks |
| Secure storage | Expo SecureStore (tokens), AsyncStorage (prefs) |
| Backend API | Node.js, Express 4, JWT auth with refresh tokens |
| Database | SQLite via better-sqlite3 |
| Containerisation | Docker + Docker Compose |
| Reverse proxy | Traefik (optional) |
| CI / CD | GitHub Actions (tests + APK build) |
| Error tracking | Sentry (optional) |

## Architecture

```
nova/
├── App.js                    # Entry point, navigation, auth gate, lock logic
├── src/
│   ├── screens/              # One file per screen (Home, Accounts, Transactions, Stats…)
│   ├── context/              # Global state (FinanceContext, AuthContext, ThemeContext…)
│   ├── components/           # Shared UI components
│   ├── hooks/                # Custom hooks
│   ├── utils/                # Auto-category, offline queue, haptics…
│   ├── services/api.js       # Thin fetch wrapper with auto token refresh
│   ├── categories/           # Category icon assets
│   └── emotes/               # Emoji / decoration icon assets
└── backend/
    ├── server.js             # Express app setup
    ├── routes/               # One file per resource (accounts, transactions, debts…)
    ├── middleware/           # Auth (JWT verify) + rate limiting
    ├── db.js                 # SQLite schema and connection
    └── config.js             # Env-based configuration
```

## Self-hosting

### Requirements

- Node.js 18+
- Docker (recommended for deployment)
- A `JWT_SECRET` environment variable — the server refuses to start without it

### Run with Docker Compose

```bash
# Copy the example env and fill in your secret
echo "JWT_SECRET=$(openssl rand -base64 48)" > .env

docker-compose up -d
```

The API listens on port 3000. Mount `./nova-data` for persistent storage.

### Run without Docker

```bash
cd backend
npm install
JWT_SECRET=your_secret_here node server.js
```

## Building the Android app

### Option A — Expo Go (quick test, no compilation)

1. Install **Expo Go** from Google Play
2. In the project root:
   ```bash
   npm install
   npx expo start
   ```
3. Scan the QR code with Expo Go
4. Make sure `src/config.js` points to your backend URL

### Option B — APK via EAS Build (recommended)

Requires a free [expo.dev](https://expo.dev) account.

```bash
npm install
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

EAS builds the APK in the cloud (~10–15 min) and gives you a download link.

### Option C — Local APK build (GitHub Actions)

The repo includes a `build.yml` workflow. Trigger it manually from the **Actions** tab to get a release APK as a build artifact (no signing key required for a debug/unsigned release build).

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | Yes | — | Secret used to sign JWT tokens |
| `PORT` | No | `3000` | Port the API listens on |
| `SENTRY_DSN` | No | — | Sentry DSN for error reporting |
| `EXPO_PUBLIC_API_BASE_URL` | No | `https://nova.iamlaura.dev` | API base URL used by the app at build time |

## Running tests

```bash
cd backend
npm test
```

The test suite uses Jest + Supertest against an in-memory SQLite database.

## License

MIT — see [LICENSE](LICENSE).
