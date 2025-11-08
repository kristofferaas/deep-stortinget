#!/bin/bash

# Only run in remote environments
if [ "$CLAUDE_CODE_REMOTE" = "true" ]; then
  echo "Installing dependencies in remote environment..."

  # Install dependencies
  pnpm install

  # Setup a local anonyomus convex deployment
  export CONVEX_AGENT_MODE=anonymous 
  pnpm convex dev --configure new --project deep-stortinget --dev-deployment local --team kristoffer-aas

  echo "Remote environment setup complete"
fi

exit 0
