#!/bin/bash

# Only run in remote environments
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

echo "Installing dependencies in remote environment..."

# Install dependencies
pnpm install

# Setup a local anonyomus convex deployment
# `CONVEX_AGENT_MODE=anonymous` env var should be set in remote environment

pnpm convex dev --once --configure new --project deep-stortinget --dev-deployment local --team kristoffer-aas

echo "Remote environment setup complete"
