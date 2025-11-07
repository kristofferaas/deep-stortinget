#!/bin/bash

# Only run in remote environments
if [ "$CLAUDE_CODE_REMOTE" = "true" ]; then
  echo "Installing dependencies in remote environment..."

  # Install dependencies
  pnpm install

  # Initialize local backend first to generate config
  CONVEX_AGENT_MODE=anonymous pnpm convex dev --local --once

  # Find the most recent backend config
  BACKEND_DIR=$(ls -td ~/.convex/anonymous-convex-backend-state/anonymous-agent-* 2>/dev/null | head -1)

  if [ -n "$BACKEND_DIR" ] && [ -f "$BACKEND_DIR/config.json" ]; then
    # Extract admin key and port from config
    ADMIN_KEY=$(jq -r '.adminKey' "$BACKEND_DIR/config.json")
    BACKEND_PORT=$(jq -r '.ports.cloud' "$BACKEND_DIR/config.json")
    BACKEND_URL="http://127.0.0.1:${BACKEND_PORT}"

    echo "Starting Convex dev with local backend at $BACKEND_URL"

    # Start Convex dev with explicit backend connection
    CONVEX_AGENT_MODE=anonymous pnpm convex dev --url "$BACKEND_URL" --admin-key "$ADMIN_KEY" &
  else
    echo "Warning: Could not find backend config, starting without explicit connection"
    CONVEX_AGENT_MODE=anonymous pnpm convex dev &
  fi

  echo "Remote environment setup complete"
fi

exit 0
