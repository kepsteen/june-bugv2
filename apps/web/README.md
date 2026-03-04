# JuneBug Frontend

React-based journaling application frontend built with Vite, React Router, and Tailwind CSS.

## Architecture Overview

### Technology Stack

- **Build Tool**: Vite with HMR and optimized builds
- **Routing**: React Router with protected route patterns
- **Styling**: Tailwind CSS v4 with OKLCH color variables
- **UI Components**: Shadcn/ui (New York style)
- **Authentication**: Better Auth with session-based auth
- **Data Fetching**: React Query for server state management
- **Editor**: Tiptap v3 with custom slash commands

### Directory Structure

```
src/
├── App.tsx              # Root component with route definitions
├── main.tsx             # Application entry point
├── pages/               # Route-level page components
├── components/          # Reusable UI components
│   ├── editor/          # Rich text editor components
│   ├── sidebar/         # Navigation sidebar components
│   └── ui/              # Shadcn/ui base components
├── hooks/               # Custom React hooks
│   ├── api/             # React Query hooks for API resources
│   └── *.ts             # Feature hooks (auth, theme)
├── lib/                 # Utility libraries
│   ├── api.ts           # API client functions
│   ├── auth-client.ts   # Better Auth client setup
│   └── utils.ts         # General utilities
└── index.css            # Global styles and CSS variables
```

### Key Patterns

**Routing & Authentication**
- Routes defined in `App.tsx` with protected and auth route wrappers
- Session-based authentication via Better Auth
- Automatic redirects based on auth state

**Data Layer**
- API functions in `lib/api.ts` organized by resource
- React Query hooks in `hooks/api/` for caching and mutations
- Credentials automatically included in all requests

**Component Organization**
- Page components handle route-level concerns
- Feature components grouped by domain (editor, sidebar)
- UI components are unstyled primitives from Shadcn

**Styling**
- Tailwind CSS with custom OKLCH color variables
- Dark mode support via CSS variables
- Component styling through Tailwind utility classes

**State Management**
- Server state managed via React Query
- Client state handled with React hooks
- Authentication state from Better Auth's `useSession()`

### Development

```bash
# Start development server
pnpm dev

# Run tests
pnpm test:run

# Open Vitest UI
pnpm test:ui
```

The dev server runs at `http://localhost:5174` and proxies API requests to the backend at `http://localhost:3000`.
