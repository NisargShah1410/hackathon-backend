const config = require("../config");

let requestId = 0;

/**
 * Send a JSON-RPC 2.0 request to the MCP server.
 * @param {string} method  - The MCP method (e.g. "tools/call", "tools/list").
 * @param {object} params  - The params object for the method.
 * @param {object} [options]         - Optional overrides.
 * @param {string} [options.serverUrl] - Override the default MCP server URL.
 * @returns {Promise<object>} The parsed JSON-RPC result.
 */
async function sendRequest(method, params = {}, options = {}) {
  requestId += 1;

  const body = {
    jsonrpc: "2.0",
    id: `req-${requestId}`,
    method,
    params,
  };

  // Merge fixed custom headers with Content-Type / Accept
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...config.mcp.headers,
  };

  const targetUrl = options.serverUrl || config.mcp.serverUrl;

  const response = await fetch(targetUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `MCP server responded with HTTP ${response.status}: ${text}`
    );
  }

  const json = await response.json();

  if (json.error) {
    const err = new Error(json.error.message || "MCP server error");
    err.code = json.error.code;
    err.data = json.error.data;
    throw err;
  }

  return json.result;
}

/**
 * Call a tool on the MCP server.
 * @param {string} name - The tool name.
 * @param {object} args - The tool arguments.
 * @param {object} [options]         - Optional overrides.
 * @param {string} [options.serverUrl] - Override the default MCP server URL.
 */
async function callTool(name, args = {}, options = {}) {
  return sendRequest("tools/call", { name, arguments: args }, options);
}

module.exports = {
  callTool,
};
