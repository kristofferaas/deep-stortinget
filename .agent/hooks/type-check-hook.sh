#!/bin/bash

# Run all checks and capture output
FORMAT_OUTPUT=$(pnpm run format 2>&1)
FORMAT_EXIT=$?

LINT_OUTPUT=$(pnpm run lint 2>&1)
LINT_EXIT=$?

TYPE_OUTPUT=$(pnpm run type-check 2>&1)
TYPE_EXIT=$?

# Check if any checks failed
if [ $FORMAT_EXIT -ne 0 ] || [ $LINT_EXIT -ne 0 ] || [ $TYPE_EXIT -ne 0 ]; then
    # Build error message parts
    ERROR_PARTS=()

    if [ $FORMAT_EXIT -ne 0 ]; then
        ERROR_PARTS+=("**Formatting Issues:**\n\`\`\`\n${FORMAT_OUTPUT}\n\`\`\`")
    fi

    if [ $LINT_EXIT -ne 0 ]; then
        ERROR_PARTS+=("**Lint Errors:**\n\`\`\`\n${LINT_OUTPUT}\n\`\`\`")
    fi

    if [ $TYPE_EXIT -ne 0 ]; then
        ERROR_PARTS+=("**Type Errors:**\n\`\`\`\n${TYPE_OUTPUT}\n\`\`\`")
    fi

    # Join error parts with double newlines
    ERROR_MSG="Code quality checks failed. Please fix the following issues:\n\n"
    ERROR_MSG+=$(IFS=$'\n\n'; echo "${ERROR_PARTS[*]}")
    ERROR_MSG+="\n\nPlease fix all issues before completing the task."

    # Output JSON to block stopping - properly escape the message
    jq -n --arg msg "$ERROR_MSG" '{decision: "block", reason: $msg}'
else
    # All checks passed, allow stopping
    echo '{"decision": "allow"}'
fi
