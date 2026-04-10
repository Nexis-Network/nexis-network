#!/bin/bash
# Script to run Moralis MCP server locally or in production

# Default to port 1337 or use PORT env var
export PORT="${MCP_MORALIS_PORT:-1337}"

echo "Starting Moralis MCP Server on port $PORT..."
echo "Transport: streamable-http (SSE)"

# Use the custom runner script to support configurable ports
node ./scripts/start-moralis-mcp.mjs
