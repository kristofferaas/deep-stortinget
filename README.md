# Deep Stortinget

This project uses [TanStack Start](https://tanstack.com/router/latest/docs/framework/react/start/overview) with [Convex](https://convex.dev) for data syncing and storage.

## Getting Started

First, install dependencies:

```bash
pnpm install
```

Then, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Create a `.env` file with the following:

```bash
VITE_CONVEX_URL=your-convex-url
```

Get your Convex URL from the [Convex dashboard](https://dashboard.convex.dev).

## Project Structure

- `app/` - TanStack Start application code
  - `routes/` - File-based routing
  - `components/` - Reusable React components
  - `styles/` - Global styles
- `convex/` - Convex backend functions and schema

## Learn More

To learn more about the technologies used in this project:

- [TanStack Start Documentation](https://tanstack.com/router/latest/docs/framework/react/start/overview)
- [TanStack Router Documentation](https://tanstack.com/router/latest)
- [Convex Documentation](https://docs.convex.dev)
