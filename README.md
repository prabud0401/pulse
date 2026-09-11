# Pulse

Pulse is a modern full-stack monorepo.

## Quick Start

1. Start databases:
   ```bash
   cd docker && docker compose up -d
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start development servers:
   ```bash
   pnpm dev
   ```

## Project Structure

- `apps/web`: Next.js web application
- `apps/mobile`: Expo mobile application
- `packages/api`: Express API server
- `packages/core`: Shared business logic
- `packages/db`: Drizzle ORM
- `packages/auth`: Auth module
- `packages/ui`: Shared UI components
- `packages/config`: Shared configurations

## License

AGPL-3.0
