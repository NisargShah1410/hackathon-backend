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

    // mcpResult is the JSON-RPC "result" object.
    // Structure: result.content[0].text → JSON string with { type, content: "<json>" }
    //            → content is another JSON string with the actual keys.
    let responseData = mcpResult;

    if (Array.isArray(mcpResult?.content)) {
      const textItem = mcpResult.content.find((c) => c.type === "text");
      if (textItem) {
        try {
          const outer = JSON.parse(textItem.text);
          // The actual data is inside outer.content as another JSON string
          if (typeof outer.content === "string") {
            responseData = JSON.parse(outer.content);
          } else {
            responseData = outer;
          }
        } catch {
          responseData = mcpResult;
        }
      }
    }

    const extracted = extractKeys(responseData);
    res.json(extracted);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/create-agent
//
// Frontend sends the same JSON structure returned by /api/analyze.
// The agent_blueprint is used to build the create_utility_agent MCP call.
// ---------------------------------------------------------------------------
router.post("/create-agent", async (req, res, next) => {
  try {
    const { should_create_agent, agent_blueprint } = req.body;

    if (!should_create_agent) {
      return res.status(400).json({
        error: "should_create_agent is false or missing; agent creation skipped.",
      });
    }

    if (!agent_blueprint || !agent_blueprint.name || !agent_blueprint.instruction) {
      return res.status(400).json({
        error:
          "Missing required field: agent_blueprint must include at least name and instruction.",
      });
    }

    const config = require("../config");

    // Build the MCP call arguments from the blueprint
    const mcpResult = await mcpClient.callTool(
      "create_utility_agent",
      {
        name: agent_blueprint.name,
        description: agent_blueprint.objective || agent_blueprint.name,
        objective: agent_blueprint.objective || "",
        instruction: JSON.stringify(agent_blueprint),
        type_id: config.mcp.agent.typeId,
        model: config.mcp.agent.model,
        is_mcp_enabled: config.mcp.agent.isMcpEnabled,
      },
      { serverUrl: config.mcp.agent.serverUrl }
    );

    // Return the raw MCP response for the create call
    res.json(mcpResult);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
