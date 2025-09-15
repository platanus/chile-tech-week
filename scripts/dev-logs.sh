#!/bin/bash

# Default number of lines for context (good for LLM)
LINES=${1:-100}
LOG_FILE=".dev-server.log"

# Check if log file exists
if [ ! -f "$LOG_FILE" ]; then
    echo "Error: Log file not found. Start the dev server with 'pnpm dev' first."
    exit 1
fi

# Handle different log viewing modes
if [ "$1" = "follow" ] || [ "$1" = "-f" ]; then
    echo "Following dev server logs in real-time..."
    echo "Press Ctrl+C to exit"
    echo "----------------------------------------"
    tail -f "$LOG_FILE"
else
    echo "Showing last $LINES lines of dev server logs..."
    echo "Use 'pnpm dev:logs [number]' to specify different line count"
    echo "Use 'pnpm dev:logs follow' to follow logs in real-time"
    echo "----------------------------------------"
    # Remove ANSI escape codes for cleaner output and show last N lines
    tail -n "$LINES" "$LOG_FILE" | sed 's/\x1b\[[0-9;]*m//g'
fi