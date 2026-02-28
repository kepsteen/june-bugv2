# JuneBug UI/UX Specification

This document captures the layout, style, color scheme, and component structure of the JuneBug application so the UI can be recreated with a different tech stack.

---

## 1. Application Overview

- **Name:** JuneBug
- **Tagline:** Your Personal Journal
- **Type:** Personal journaling app for developers
- **Modes:** Demo Mode (local storage, unauthenticated) and authenticated mode (Convex backend)
- **SEO title:** JuneBug - Your Personal Journal
- **SEO description:** JuneBug is your personal journaling companion, helping you capture thoughts, memories, and moments.

---

## 2. Color Scheme

Colors are defined in **OKLCH** and exposed as CSS variables. Theme is applied via a class on the root (`light` or `dark`).

### 2.1 Light Mode (`:root`)

| Token | Value |
|-------|--------|
| `--background` | oklch(0.91 0.05 82.78) |
| `--foreground` | oklch(0.41 0.08 78.86) |
| `--card` | oklch(0.96 0.02 84.56) |
| `--card-foreground` | oklch(0.41 0.08 74.04) |
| `--popover` | oklch(0.92 0.04 84.56) |
| `--popover-foreground` | oklch(0.41 0.08 74.04) |
| `--primary` | oklch(0.71 0.1 111.96) |
| `--primary-foreground` | oklch(0.98 0.01 2.18) |
| `--secondary` | oklch(0.88 0.05 83.32) |
| `--secondary-foreground` | oklch(0.51 0.08 78.21) |
| `--muted` | oklch(0.86 0.06 82.94) |
| `--muted-foreground` | oklch(0.51 0.08 74.78) |
| `--accent` | oklch(0.86 0.05 85.12) |
| `--accent-foreground` | oklch(0.26 0.02 356.72) |
| `--destructive` | oklch(0.63 0.24 29.21) |
| `--border` | oklch(0.74 0.06 79.64) |
| `--input` | oklch(0.74 0.06 79.64) |
| `--ring` | oklch(0.51 0.08 74.78) |
| `--sidebar` | oklch(0.87 0.06 84.46) |
| `--sidebar-foreground` | oklch(0.41 0.08 78.86) |
| `--sidebar-primary` | oklch(0.26 0.02 356.72) |
| `--sidebar-primary-foreground` | oklch(0.98 0.01 2.18) |
| `--sidebar-accent` | oklch(0.83 0.06 84.44) |
| `--sidebar-accent-foreground` | oklch(0.26 0.02 356.72) |
| `--sidebar-border` | oklch(0.91 0 0) |
| `--sidebar-ring` | oklch(0.71 0 0) |

**Chart colors:** chart-1 through chart-5 are also defined for data viz if needed.

### 2.2 Dark Mode (`.dark`)

| Token | Value |
|-------|--------|
| `--background` | oklch(0.2 0.01 52.89) |
| `--foreground` | oklch(0.88 0.05 79.11) |
| `--card` | oklch(0.25 0.01 48.28) |
| `--card-foreground` | oklch(0.88 0.05 79.11) |
| `--popover` | oklch(0.25 0.01 48.28) |
| `--popover-foreground` | oklch(0.88 0.05 79.11) |
| `--primary` | oklch(0.64 0.05 114.58) |
| `--primary-foreground` | oklch(0.98 0.01 2.18) |
| `--secondary` | oklch(0.33 0.02 60.7) |
| `--secondary-foreground` | oklch(0.88 0.05 83.32) |
| `--muted` | oklch(0.27 0.01 39.35) |
| `--muted-foreground` | oklch(0.74 0.06 79.64) |
| `--accent` | oklch(0.33 0.02 60.7) |
| `--accent-foreground` | oklch(0.86 0.05 85.12) |
| `--destructive` | oklch(0.63 0.24 29.21) |
| `--border` | oklch(0.33 0.02 60.7) |
| `--input` | oklch(0.33 0.02 60.7) |
| `--ring` | oklch(0.64 0.05 114.58) |
| `--sidebar` | oklch(0.23 0.01 60.9) |
| `--sidebar-foreground` | oklch(0.88 0.05 79.11) |
| `--sidebar-primary` | oklch(0.64 0.05 114.58) |
| `--sidebar-primary-foreground` | oklch(0.98 0.01 2.18) |
| `--sidebar-accent` | oklch(0.33 0.02 60.7) |
| `--sidebar-accent-foreground` | oklch(0.86 0.05 85.12) |
| `--sidebar-border` | oklch(0.33 0.02 60.7) |
| `--sidebar-ring` | oklch(0.64 0.05 114.58) |

### 2.3 Semantic Usage

- **Primary:** Buttons (New Entry, Sign In), selected list items (e.g. "Today"), links in editor, focus rings.
- **Background:** Page and sidebar base.
- **Card:** Main content panel (editor area), modals, cards on auth/settings.
- **Accent:** Hover/selected states (e.g. entry in sidebar), text selection in editor.
- **Muted / muted-foreground:** Placeholders, secondary text, "Last saved", section headers like "Last 7 Days".
- **Links (auth):** Orange accent in dark mode for "Sign up" / "Forgot password" (e.g. `text-orange-400` / `dark:text-orange-300`).

---

## 3. Typography

### 3.1 Font Families

| Role | Value |
|------|--------|
| Sans (UI, body) | `Nunito, sans-serif` |
| Serif | `PT Serif, serif` |
| Mono | `JetBrains Mono, monospace` |

CSS variables: `--font-sans`, `--font-serif`, `--font-mono`.

### 3.2 Usage

- **App title ("JuneBug"):** Bold, large (e.g. `text-2xl font-bold`), centered in sidebar.
- **Date in editor:** Bold, prominent (e.g. `text-2xl font-bold`).
- **Section headers (e.g. "Last 7 Days"):** Small, semibold, muted (e.g. `text-xs font-semibold text-muted-foreground`).
- **Body / editor:** Prose-style; editor uses `prose prose-sm` with custom overrides.
- **Buttons:** Medium weight, small size (`text-sm font-medium`).
- **Placeholders:** Muted foreground.

### 3.3 Editor Prose (TipTap)

- Base font size in editor: `0.75rem` (12px).
- **H1:** 1.75rem, weight 700, margin top 1rem, bottom 0.5rem.
- **H2:** 1.4rem, weight 600, margin top 0.875rem, bottom 0.5rem.
- **H3:** 1.15rem, weight 600, margin top 0.75rem, bottom 0.5rem.
- **Paragraphs:** margin top/bottom 0.5rem.
- **Lists:** padding-left 1.5rem; ul disc, ol decimal.
- **Blockquote:** border-left 4px solid `--border`, padding-left 1rem, `--muted-foreground`.
- **Code (inline):** `--muted` background, small padding, rounded, no backticks.
- **Code block:** `--muted` background, 1rem padding, rounded.
- **Links:** `--primary`, underline, offset 4px.

---

## 4. Layout and Spacing

### 4.1 Border Radius

- Base: `--radius: 0.625rem` (10px).
- Derived: `--radius-sm` (radius - 4px), `--radius-md` (radius - 2px), `--radius-lg` (radius), `--radius-xl` (radius + 4px).
- Buttons, inputs, cards: rounded-md (uses theme radius).

### 4.2 Shadows

- System shadows from `--shadow-2xs` through `--shadow-2xl`; use for cards, popovers, and command palette.
- Buttons use `shadow-xs`.

### 4.3 Main App Layout (Journal View)

- **Container:** Full viewport, flex row, `h-screen w-full`.
- **Left sidebar:** Resizable width (default ~280px or similar), collapsible to 0. When collapsed, a small top-left button group (expand, search, new entry) is shown.
- **Resize handle:** 4px wide between sidebar and main; hover uses `primary/20`.
- **Main content:** Flex-1, overflow hidden. Inner card has rounded top-left corner (`rounded-tl-lg`), left border, subtle top border that stops before a “notch” on the top-right.
- **Notch (top-right of main content):** SVG curve so the theme toggle sits in the notch; only when left sidebar is open.
- **Editor padding:** Horizontal padding depends on right sidebar: when prompts sidebar open `14rem`, when closed `4rem`; transition 300ms.
- **Right sidebar (prompts):** Fixed width 320px when open, 0 when collapsed; transition 300ms; border-left.

### 4.3.1 Top-right notch (main content)

The main content card has a **notch** in the top-right so the theme toggle sits visually inside the card edge. This is achieved with:

1. **Main content structure** — The main area uses a page background (`bg-background`) with top padding; the inner “card” has `bg-card`, rounded top-left only, and a left border. The notch is part of this card’s top-right: the card does not extend into the notch; instead an SVG fills that region with the **page** background so the theme toggle (positioned above the card in the DOM) appears to sit in a cutout.

2. **Top border that stops before the notch** — A separate 0.5px line runs along the top of the card but stops short of the notch so the border doesn’t cross the curve:

```tsx
{/* Top border that stops before the notch */}
{!isCollapsed && (
  <div
    className="absolute top-0 left-0 right-0 h-[0.5px] bg-border transition-opacity duration-500 ease-in-out"
    style={{ right: '65px', left: '8px' }}
  />
)}
```

3. **Notch SVG** — A right-aligned SVG draws the notch shape. The **fill** uses the page background (`--background`) so it looks like the card is cut away; the **stroke** uses `--border` for the visible edge. The path is a smooth curve from the top edge down into the card and back out to the bottom edge. Use `preserveAspectRatio="none"` so the path stretches with the SVG size, and `vectorEffect="non-scaling-stroke"` on the stroke so the border stays a consistent thickness:

```tsx
{/* Notch background - Only visible when sidebar is open */}
{!isCollapsed && (
  <div className="absolute top-0 right-0 transition-opacity duration-500 ease-in-out">
    <svg
      className="absolute top-0 right-0 w-21 h-10 pointer-events-none"
      viewBox="0 0 96 48"
      preserveAspectRatio="none"
    >
      <path
        d="M 96,0 L 0,0 C 20,0 32,9 32,24 C 32,39 44,48 64,48 L 96,48 Z"
        className="fill-background"
      />
      <path
        d="M 0,0 C 20,0 32,9 32,24 C 32,39 44,48 64,48 L 96,48"
        className="stroke-border fill-none"
        strokeWidth="0.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  </div>
)}
```

- **viewBox:** `0 0 96 48` — aspect ratio 2:1; the notch curve is in the left half (0–48), the rest is flat top/bottom/right.
- **Fill path:** From top-right (96,0) line to top-left (0,0), then a cubic Bezier down the left side of the notch: controls (20,0),(32,9) to (32,24), then (32,39),(44,48) to (64,48), then line to (96,48) and close. So the “cutout” is a smooth inward curve.
- **Stroke path:** Same curve (no close) so only the curved edge and bottom get the border; the stroke path does not include the top or right edges (they are the card’s normal boundary).
- **Sizing:** `w-21 h-10` (Tailwind) — e.g. 5.25rem × 2.5rem; the exact pixel size can be tuned so the theme toggle fits inside the notch.

4. **Theme toggle position** — The theme toggle is absolutely positioned so it sits in the notch. When the left sidebar is open it’s at top-right of the viewport; when the right (prompts) sidebar is open, its `right` is offset by the sidebar width:

```tsx
{/* When left sidebar is open: theme toggle in notch */}
<div
  className="absolute top-[0.75rem] z-10 transition-[right] duration-300 ease-in-out"
  style={{ right: rightSidebarCollapsed ? '0.75rem' : 'calc(320px + 0.75rem)' }}
>
  <ThemeToggle />
</div>
```

- Use `rightSidebarCollapsed ? '0.75rem' : 'calc(320px + 0.75rem)'` so the toggle stays just inside the viewport when the right sidebar is open (320px = prompts sidebar width).
- The notch SVG is inside the main content card; the theme toggle is a sibling (in the same full-screen flex container), so it sits above the card and aligns with the notch visually.

5. **When to show** — The notch and the short top border are only rendered when the left sidebar is **not** collapsed (`!isCollapsed`). When the sidebar is collapsed, the main area is full-width and the theme toggle moves to a different layout (e.g. a small button group), so the notch is hidden.

### 4.4 Auth Pages (Sign In, Sign Up, Reset Password)

- Centered layout (e.g. flex center, min-height screen).
- Card: max-width ~28rem (`max-w-md`), rounded, standard card padding.
- Single column form; Sign Up has two-column row for First name / Last name.

### 4.5 Settings

- Container with horizontal padding, vertical padding.
- "Back to entries" link at top (arrow + text).
- Header row: "Settings" title, theme toggle, Sign Out button.
- Grid: narrow left column (~300px) for profile card, rest for settings card with tabs (Profile, Preferences, Notifications).

### 4.6 Onboarding

- Full height; optional left column (e.g. `w-64`) with "Your Journey" and vertical timeline (Profile Info → Goals & Style → Tech Stack → Journal Schedule).
- Main area: scrollable chat with assistant messages, user messages, typing indicator, and current question input (text, number, select, radio, checkbox-group, etc.).

---

## 5. Screens and Components

### 5.1 Main Journal View (`/entries`, `/entries/:entryId`)

- **Left sidebar (EntriesSidebar):**
  - App title: "JuneBug" (h1, centered).
  - Optional "Demo Mode" badge (secondary, small) when unauthenticated.
  - "New Entry" button: primary, full width, plus icon.
  - Search input: placeholder "search your entries", search icon left.
  - Entries list grouped by "Last 7 Days", "Last 30 Days", "Older". Each entry is a button; selected state uses accent background.
  - Bottom: Sign In button (guests) or avatar + name link to Settings (authenticated).
  - Scrollable entries area with hidden scrollbar; fade gradient at bottom above the bottom CTA.

- **Top-left (when sidebar open):** Single collapse (panel) icon to collapse sidebar.
- **Top-left (when sidebar collapsed):** Button group: expand, search (opens command palette), new entry.

- **Top-right:** Theme toggle (sun/moon). Position shifts with right sidebar open/closed (e.g. `right: 0.75rem` or `right: calc(320px + 0.75rem)`).

- **Main content:**
  - Loading state: "Loading entry..." centered.
  - When loaded: Date (e.g. "Sat, February 28th, 2026") and "Last saved HH:MM AM/PM" on the right.
  - Rich text editor with placeholder "Type \"/\" for commands...".
  - Editor supports slash commands and bubble menu (see below).

- **Right sidebar (PromptsSidebar):**
  - When no category selected: Header "What's on your mind?" with close (X). Subtext: "Choose a category to see helpful writing prompts." Grid of category cards:
    - What are you working on? (briefcase icon)
    - Celebrate a win (trophy)
    - Track a bug (bug)
    - Capture a lesson (bulb)
  - Each card: icon, title, short description; gradient backgrounds by category (blue, green, red, yellow at low opacity); hover scale and shadow.
  - When category selected: Back chevron, category icon and title, close (X). List of "Writing Prompts" as clickable/copyable prompt cards.

- **Floating June Bug button:**
  - Fixed bottom-right (`bottom-6 right-6`), z above content.
  - Circular button with app icon (e.g. `/apple-touch-icon.png`), rounded, border and shadow; aria-label "Open entry prompts".
  - On first "New Entry" can show bounce + tooltip "Click me for prompts!"
  - When prompts sidebar opens: brief "happy wiggle" animation.

- **Search command menu (Cmd+K):**
  - Modal/dialog: title "Search Entries", description "Search through your journal entries".
  - Search input, list of entries (recent or filtered); selecting an entry navigates to that entry and closes the dialog.

### 5.2 Sign In (`/sign-in`)

- Centered card.
- Title: "Sign In". Description: "Enter your email below to login to your account."
- Form: Email (placeholder "m@example.com"), Password (placeholder "password"), "Forgot your password?" link.
- Primary button: "Sign in with Password".
- Secondary button: "Sign in with Github" (GitHub icon + text).
- Footer: "Powered by better-auth." (link).
- Below card: "Don't have an account? Sign up" (Sign up as link).

### 5.3 Sign Up (`/sign-up`)

- Centered card.
- Title: "Sign Up". Description: "Enter your information to create an account."
- Form: First name, Last name (side by side); Email; Password; Confirm Password; optional "Profile Image (optional)" with file picker.
- Primary button: "Create an account".
- Divider: "Or continue with".
- "Sign up with Github" button.
- Footer: "Secured by better-auth."; "Already have an account? Sign in".

### 5.4 Reset Password (`/reset-password`)

- Simple form for reset flow (link sent via email).

### 5.5 Settings (`/settings`) — authenticated only

- Back link: "Back to entries" with arrow.
- Header: "Settings" (h1), Theme toggle, "Sign Out" (outline button).
- Left column: Profile card with avatar, name, email; if onboarded, details (Full Name, Role, Experience Level, Work Environment).
- Right: Card "Settings" with description "Manage your preferences and account settings"; tabs: Profile, Preferences, Notifications (content placeholders).

### 5.6 Onboarding (`/onboarding`) — authenticated, not yet onboarded

- Conversational chat UI.
- Left (desktop): "Your Journey" + vertical timeline (Profile Info, Goals & Style, Tech Stack, Journal Schedule) with completed/current states.
- Main: Welcome message, then a series of questions (text, number, select, radio, checkbox-group, time, etc.) with typing indicator and user answers.
- On completion: summary message and redirect to `/entries`.

---

## 6. Editor Behavior and UI

### 6.1 Slash Commands (type "/")

- Menu items with icon + title + short description. Options:
  - Text — "Just start typing with plain text."
  - Heading 1, 2, 3 — "Big / Medium / Small section heading."
  - Bullet List, Numbered List, Task List
  - Code Block, Inline Code, Quote
- Styled as popover (e.g. Tippy): background `--background`, border `--border`, rounded, shadow.

### 6.2 Bubble Menu (text selection)

- Shown on selection; toolbar with: Bold (Cmd+B), Italic (Cmd+I), Underline (Cmd+U), Strikethrough, Code.
- Same popover styling as slash menu.

### 6.3 Editor Content Features

- Headings (1–3), paragraphs, bullet list, ordered list, task list (checkboxes), code block, inline code, blockquote, links, images.
- Task list: checkboxes use `--border` and `--primary` when checked; custom checkbox checkmark SVG.
- Placeholder: "Type \"/\" for commands..." in muted color when first block is empty.
- Auto-save with debounce (e.g. 1s, max wait 2s); "Saving..." / "Last saved HH:MM" shown.

---

## 7. Component Inventory (UI Primitives)

- **Button:** Variants — default (primary), destructive, outline, secondary, ghost, link. Sizes: default, sm, lg, icon. Rounded, focus ring.
- **Input:** Rounded, border, placeholder; with optional left icon (e.g. search).
- **Label:** For form fields.
- **Card:** CardHeader, CardTitle, CardDescription, CardContent, CardFooter.
- **Badge:** e.g. "Demo Mode" — secondary variant, small text.
- **Avatar:** Image + fallback (e.g. User icon on primary/10 background).
- **Tabs:** TabsList, TabsTrigger, TabsContent.
- **Dialog/Modal:** For command palette and confirmations.
- **Dropdown menu, Select, Checkbox, Radio group:** Used in onboarding and forms.
- **Theme toggle:** Sun (light) / Moon (dark) icon button; toggles `light`/`dark` on document root and persists to localStorage.

---

## 8. Interactive Behaviors

- **Left sidebar:** Resizable by dragging the vertical handle; collapse/expand via icon; when collapsed, key actions in a small top-left group.
- **Right sidebar:** Toggle by floating June Bug button; open shows categories then prompts list with back/close.
- **Theme:** Toggle in top-right; class on `<html>`; preference stored in localStorage.
- **Search:** Sidebar filter + global Cmd+K command palette to jump to entry.
- **Navigation:** Entry selection in sidebar or via command palette navigates to `/entries/:entryId`.
- **Auth:** Sign In / Sign Up / Sign out; after sign-in, redirect to entries; if not onboarded, redirect to onboarding.
- **beforeunload:** Warn when there are unsaved changes (dirty state) on entry.

---

## 9. Animations

- **Blob (background orbs):** Optional; 7s infinite keyframes (translate + scale).
- **Happy wiggle (June Bug):** 0.6s ease-in-out; rotation -15° to 15° and back; used when prompts sidebar opens.
- **Bounce:** Floating button first-time prompt.
- **Pulse / ping:** Optional for first-time prompt state on floating button.
- **Transition:** Sidebar width and editor padding 300ms ease-in-out; theme toggle position same.
- **Animation delays:** e.g. `animation-delay-2000`, `animation-delay-4000` if needed for staggered effects.

---

## 10. Assets and References

- **Favicon:** `/favicon.ico`
- **Apple touch icon (also June Bug mascot in UI):** `/apple-touch-icon.png`
- **Screenshots (if generated):** Can live in `/screenshots/` for reference:
  - Main journal view (light/dark)
  - Sign In, Sign Up
  - Slash commands menu
  - Bubble menu (text selection)
  - Search command dialog
  - Prompts sidebar (optional)

---

## 11. Accessibility and UX Notes

- Use semantic HTML (main, aside, header, nav where appropriate).
- Buttons and links have clear labels; floating button has `aria-label="Open entry prompts"`.
- Focus styles: ring using `--ring` (e.g. focus-visible:ring-3).
- Theme respects `prefers-color-scheme` only indirectly via default "light"; user choice overrides.
- Scrollable regions (entries list) can hide scrollbar for cleaner look but remain keyboard scrollable.
- Dialog for search traps focus and closes on Escape.

---

This specification, together with the referenced CSS variables and layout descriptions, is sufficient to recreate the JuneBug UI and UX in another stack (e.g. different framework, design system, or backend).
