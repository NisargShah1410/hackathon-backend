require("dotenv").config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  mcp: {
    serverUrl: process.env.MCP_SERVER_URL || "https://placeholder.ai/mcp",
    headers: {
      "x-api-key": process.env.MCP_API_KEY || "",
      "x-cockpit-api-key": process.env.MCP_COCKPIT_API_KEY || "",
      "x-cockpit-license-id": process.env.MCP_COCKPIT_LICENSE_ID || "",
      "x-cockpit-namespace-id": process.env.MCP_COCKPIT_NAMESPACE_ID || "",
      "x-cockpit-utility-agent-id":
        process.env.MCP_COCKPIT_UTILITY_AGENT_ID || "",
    },
    agent: {
      serverUrl: process.env.MCP_AGENT_SERVER_URL || "",
      typeId: process.env.MCP_AGENT_TYPE_ID || "",
      model: process.env.MCP_AGENT_MODEL || "",
      isMcpEnabled: process.env.MCP_AGENT_MCP_ENABLED === "true",
    },
  },
};

module.exports = config;
