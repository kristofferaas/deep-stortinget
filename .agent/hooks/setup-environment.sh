#!/bin/bash

# Only run in remote environments
if [ "$CLAUDE_CODE_REMOTE" = "true" ]; then
  echo "Installing dependencies in remote environment..."

  # Install dependencies
  pnpm install

  echo "Remote environment setup complete"
fi

exit 0
