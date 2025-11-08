#!/bin/bash

# Only run in remote environments
if [ "$CLAUDE_CODE_REMOTE" = "true" ]; then
  echo "Installing dependencies in remote environment..."

  # Install dependencies
  pnpm install
  apt-get install expect -y

  # Configure local convex through interactive shell
  echo "Configuring Convex..."

  # Use expect to automate the interactive prompts
  expect <<'EOF'
set timeout 60
spawn pnpm convex dev --once

# First prompt: "Welcome to Convex! Would you like to login to your account?"
# Press Enter to select default "Start without an account (run Convex locally)"
expect "Use arrow keys"
send "\r"

# Second prompt: "Choose a name:"
expect "Choose a name:"
send "deep-stortinget\r"

# Third prompt: "Continue? (Y/n)"
expect "Continue?"
send "Y\r"

# Wait for completion
expect eof
EOF

  echo "Remote environment setup complete"
fi

exit 0
