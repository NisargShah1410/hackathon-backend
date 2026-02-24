const express = require("express");
const mcpClient = require("../services/mcpClient");

const router = express.Router();

// Keys to extract from the MCP response and return to the frontend
const RESPONSE_KEYS = [
  "risk_score",
  "risk_level",
  "risk_reasons",
  "detected_items",
  "sanitized_content",
  "recommended_action",
  "intent_key",
  "intent_label",
  "intent_confidence",
  "should_create_agent",
  "agent_blueprint",
];

/**
 * Pick only the required keys from the MCP response object.
 */
function extractKeys(source) {
  const extracted = {};
  for (const key of RESPONSE_KEYS) {
    if (key in source) {
      extracted[key] = source[key];
    }
  }
  return extracted;
}

// ---------------------------------------------------------------------------
// POST /api/mcp/execute
//
// Frontend sends:
// {
//   "user_input": "<text>",
//   "interaction_type": "paste"          // optional, defaults to "paste"
// }
//
// Backend calls the MCP server with method "tools/call", tool "execute_agent",
// extracts the required keys from the MCP response and returns them.
// ---------------------------------------------------------------------------
router.post("/analyze", async (req, res, next) => {
  try {
    const { user_input, interaction_type } = req.body;

    if (!user_input) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: user_input",
      });
    }

    // Call the MCP server's execute_agent tool
    const mcpResult = await mcpClient.callTool("execute_agent", {
      user_input,
      interaction_type: interaction_type || "paste",
    });

    // mcpResult is the JSON-RPC "result" object returned by the MCP server.
    // It may contain the data directly, or nested inside a content array.
    let responseData = mcpResult;

    // If the MCP server wraps the result in a content array (common pattern),
    // try to parse the first text content item.
    if (Array.isArray(mcpResult?.content)) {
      const textItem = mcpResult.content.find((c) => c.type === "text");
      if (textItem) {
        try {
          responseData = JSON.parse(textItem.text);
        } catch {
          responseData = mcpResult;
        }
      }
    }

    const extracted = extractKeys(responseData);
    res.json({ success: true, data: extracted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
