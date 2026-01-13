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
├── electron/           # Electron main process
│   ├── main.ts         # App entry point
│   ├── preload.ts      # Context bridge
│   ├── ipc/            # IPC handlers
│   ├── db/             # SQLite/Drizzle schema
│   └── agent/          # DeepAgentsJS runtime
├── src/                # React renderer
│   ├── components/     # UI components
│   │   ├── ui/         # Base shadcn components
│   │   ├── chat/       # Chat interface
│   │   ├── sidebar/    # Thread sidebar
│   │   ├── panels/     # Right panel tabs
│   │   └── hitl/       # Approval dialogs
│   ├── lib/            # Utilities and store
│   └── types.ts        # TypeScript types
├── public/             # Static assets
└── bin/                # CLI launcher
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

| Role | Variable | Hex |
|------|----------|-----|
| Background | `--background` | `#0D0D0F` |
| Elevated | `--background-elevated` | `#141418` |
| Border | `--border` | `#2A2A32` |
| Critical | `--status-critical` | `#E53E3E` |
| Warning | `--status-warning` | `#F59E0B` |
| Nominal | `--status-nominal` | `#22C55E` |
| Info | `--status-info` | `#3B82F6` |

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

## Questions?

Open an issue or start a discussion on GitHub.
