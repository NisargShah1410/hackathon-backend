# MCP Backend Service

A lightweight Node.js + Express backend that receives JSON requests from a frontend, forwards them to an MCP (Model Context Protocol) server via JSON-RPC 2.0, and returns the extracted response.

## Architecture

```
Frontend  ──►  Backend (Express)  ──►  MCP Server (JSON-RPC 2.0)
              POST /api/analyze        POST https://placeholder.ai/mcp
              { user_input, ... }      { jsonrpc, method: "tools/call", ... }
              ◄── extracted JSON  ◄──  JSON-RPC result
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy the example env file and configure it
cp .env.example .env
# Edit .env with your MCP server URL and auth headers

# 3. Start the server
npm start

# Or in development with auto-reload (Node 18+)
npm run dev
```

## Configuration (.env)

| Variable                       | Description                          | Default                        |
| ------------------------------ | ------------------------------------ | ------------------------------ |
| `PORT`                         | Port the backend listens on          | `3000`                         |
| `MCP_SERVER_URL`               | JSON-RPC 2.0 endpoint of MCP server | `https://placeholder.ai/mcp`  |
| `MCP_API_KEY`                  | `x-api-key` header value             | —                              |
| `MCP_COCKPIT_API_KEY`          | `x-cockpit-api-key` header value     | —                              |
| `MCP_COCKPIT_LICENSE_ID`       | `x-cockpit-license-id` header value  | —                              |
| `MCP_COCKPIT_NAMESPACE_ID`     | `x-cockpit-namespace-id` header value| —                              |
| `MCP_COCKPIT_UTILITY_AGENT_ID` | `x-cockpit-utility-agent-id` header value | —                         |

## API Endpoints

### Health Check

```
GET /health
```

### Analyze

```
POST /api/analyze
Content-Type: application/json

{
  "user_input": "Service failing in staging.\njava.lang.IllegalStateException at OrderService.java:118",
  "interaction_type": "paste"
}
```

The backend wraps this into a JSON-RPC 2.0 request to the MCP server:

```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "method": "tools/call",
  "params": {
    "name": "execute_agent",
    "arguments": {
      "user_input": "...",
      "interaction_type": "paste"
    }
  }
}
```

### Response

The backend extracts the following keys from the MCP response and returns them:

```json
{
  "success": true,
  "data": {
    "risk_score": 0,
    "risk_level": "LOW",
    "risk_reasons": ["..."],
    "detected_items": [],
    "sanitized_content": "...",
    "recommended_action": "WARN",
    "intent_key": "debug_logs",
    "intent_label": "debug_logs",
    "intent_confidence": 0.9,
    "should_create_agent": true,
    "agent_blueprint": { "..." }
  }
}
```

On error:

```json
{
  "success": false,
  "error": "Error message"
}
```

## Project Structure

```
mcp-backend-service/
├── .env.example          # Environment variable template
├── package.json
├── src/
│   ├── config.js         # Loads config & MCP auth headers from env
│   ├── server.js         # Express app entry point
│   ├── routes/
│   │   └── mcp.js        # POST /api/analyze route handler
│   └── services/
│       └── mcpClient.js  # JSON-RPC 2.0 HTTP client for MCP server
```
