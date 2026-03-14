# React + Express Starter

A production-ready full-stack starter application with React, Vite, Express, Neon Postgres, Better Auth, Drizzle ORM, and Shadcn UI.

## Features

- 🎨 **React 19** with Vite for fast development
- ⚡ **Express** backend with TypeScript
- 🔐 **Better Auth** for email/password authentication
- 🗄️ **Neon Postgres** serverless database
- 🛠️ **Drizzle ORM** for type-safe database queries
- 🎭 **Shadcn UI** for beautiful components
- 🧪 **Vitest** for fast testing
- 📦 **pnpm workspaces** monorepo structure
- 🔒 **ESM modules** throughout

## Project Structure

```
react-express-starter/
├── apps/
│   ├── web/          # React + Vite frontend
│   └── api/          # Express backend
├── packages/
│   └── shared/       # Shared types
└── package.json      # Root workspace config
```

## Getting Started

### Prerequisites

- Node.js 20+ or 22+ (LTS)
- pnpm 9+
- Neon database account (https://neon.tech)

### Setup

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Create Neon database:**
   - Sign up at https://neon.tech
   - Create a new project
   - Copy the connection string

3. **Configure environment variables:**

   ```bash
   # In apps/api/.env
   cp apps/api/.env.example apps/api/.env
   ```

   Edit `apps/api/.env` and add:
   - `DATABASE_URL`: Your Neon connection string
   - `BETTER_AUTH_SECRET`: Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

4. **Setup database:**

   ```bash
   cd apps/api
   pnpm db:push
   ```

5. **Start development servers:**

   ```bash
   # From root
   pnpm dev
   ```

   This starts:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

## Development

### Available Scripts

- `pnpm dev` - Run all dev servers in parallel
- `pnpm build` - Build all packages
- `pnpm test` - Run all tests
- `pnpm lint` - Lint all packages
- `pnpm type-check` - Type check all packages

### Backend Scripts (apps/api)

- `pnpm dev` - Start development server with watch mode
- `pnpm db:generate` - Generate database migrations
- `pnpm db:push` - Push schema to database
- `pnpm db:studio` - Open Drizzle Studio

### Frontend Scripts (apps/web)

- `pnpm dev` - Start Vite dev server
- `pnpm build` - Build for production
- `pnpm test` - Run Vitest tests
- `pnpm test:ui` - Run Vitest with UI

## Testing

The application includes Vitest for testing:

```bash
# Run all tests
pnpm test

# Run tests in a specific workspace
cd apps/web
pnpm test

# Run tests with UI
pnpm test:ui
```

## Tech Stack

- **Frontend:** React 19, Vite 7, TypeScript 5.7, Tailwind CSS 3.4, Shadcn UI
- **Backend:** Express 4, Node.js 20+, TypeScript 5.7
- **Database:** Neon Postgres, Drizzle ORM 0.37
- **Auth:** Better Auth 1.4
- **Testing:** Vitest 3.0, Testing Library
- **Package Manager:** pnpm 9+

## Adding Shadcn Components

To add more Shadcn components:

```bash
cd apps/web
pnpm dlx shadcn@latest add [component-name]
```

## Roadmap

- AI-generated prompts that learn from you
- Voice input
- Export all notes as markdown
- Mobile app
- Weekly / monthly reflections

## License

MIT
