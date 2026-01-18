# Contributing to openwork

Thank you for your interest in contributing to openwork! This document provides guidelines for development and contribution.

## Development Setup

### Prerequisites

- Node.js 20+
- npm 10+
- Git

### Getting Started

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/YOUR_USERNAME/openwork.git
   cd openwork
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
openwork/
├── src/
│   ├── main/               # Electron main process
│   │   ├── index.ts        # App entry point
│   │   ├── agent/          # DeepAgents runtime
│   │   ├── checkpointer/   # LangGraph checkpointing
│   │   ├── db/             # SQLite database
│   │   ├── ipc/            # IPC handlers
│   │   └── services/       # Business logic services
│   ├── preload/            # Electron preload/context bridge
│   │   └── index.ts
│   └── renderer/           # React frontend
│       └── src/
│           ├── App.tsx
│           ├── index.css   # Tailwind + design system
│           ├── components/
│           │   ├── ui/     # Base shadcn components
│           │   ├── chat/   # Chat interface
│           │   ├── sidebar/# Thread sidebar
│           │   ├── panels/ # Right panel tabs
│           │   ├── hitl/   # Human-in-the-loop dialogs
│           │   ├── settings/
│           │   └── tabs/
│           └── lib/        # Utilities and store
├── bin/                    # CLI launcher
├── public/                 # Static assets
└── resources/              # Electron resources
```

## Code Style

### TypeScript

- Use strict TypeScript with no `any` types
- Prefer interfaces over types for object shapes
- Export types alongside implementations

### React

- Use functional components with hooks
- Prefer named exports
- Keep components focused and composable

### CSS

- Use Tailwind CSS with the tactical design system
- Follow the color system defined in `src/index.css`
- Use `cn()` utility for conditional classes

## Design System

openwork uses a tactical/SCADA-inspired design system:

### Colors

| Role       | Variable                | Hex       |
| ---------- | ----------------------- | --------- |
| Background | `--background`          | `#0D0D0F` |
| Elevated   | `--background-elevated` | `#141418` |
| Border     | `--border`              | `#2A2A32` |
| Critical   | `--status-critical`     | `#E53E3E` |
| Warning    | `--status-warning`      | `#F59E0B` |
| Nominal    | `--status-nominal`      | `#22C55E` |
| Info       | `--status-info`         | `#3B82F6` |

### Typography

- Primary font: JetBrains Mono
- Section headers: 11px, uppercase, tracked
- Data values: Tabular nums for alignment

### Spacing

- Use the Tailwind spacing scale
- Prefer 4px increments (p-1, p-2, p-3, p-4)
- Consistent 3px border radius

## Testing

```bash
# Run linting
npm run lint

# Run type checking
npm run typecheck

# Build for all platforms
npm run build
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear commit messages
3. Ensure all checks pass (`npm run lint && npm run typecheck`)
4. Submit a PR with a description of changes
5. Address any review feedback

## Commit Messages

Use conventional commits:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Build/tooling changes

## Issue Labels

We use labels to organize issues:

| Label              | Description                   |
| ------------------ | ----------------------------- |
| `bug`              | Something isn't working       |
| `enhancement`      | New feature or improvement    |
| `good first issue` | Good for newcomers            |
| `help wanted`      | Extra attention needed        |
| `documentation`    | Documentation improvements    |
| `question`         | Further information requested |
| `wontfix`          | This will not be worked on    |

## Questions?

Open an issue or start a discussion on GitHub.
changes

- `chore:` Build/tooling changes

## Questions?

Open an issue or start a discussion on GitHub.
