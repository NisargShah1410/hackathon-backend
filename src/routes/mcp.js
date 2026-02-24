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

/* UPDATE /api/mcp/update_artifact
Frontend sends:
"artifact_fields": {                 
  "intent":"debug_logs",                      //debug_logs, summarize, generate_docs, explain_code, draft_message, other
  "risk_summary":"LOW|MEDIUM|HIGH|PROMPT",
  "risk_reason": "<text>",                    // optional
  "detected_item": "<text>",                  // optional
  "intent_reason": "<text>",                  // optional
  "recommended_action": "ALLOW|WARN|REDACT",
  "agent_created: bool,                       // optional
}
*/

router.put("/update_artifact", async (req, res, next) => {
  try {
    const { intent, risk_summary, risk_reason, detected_item,
            intent_reason, recommended_action, agent_created
    } = req.body.artifact_fields;

    if (!intent) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: intent",
      });
    }

    // Get the artifact via the mcp api
    const artifactResult = await mcpClient.callTool("get_artifact", {
      "key_pattern": process.env.ARTIFACT_NAME,
    });
    const artifactResultText=JSON.parse(artifactResult.content[0].text);
    const artifactValueJSON=JSON.parse(artifactResultText.artifacts[0].value);

    // Increment the intent count
    artifactValueJSON.intent_counts[intent]+=1;

    console.warn(artifactValueJSON);
    // Increment the risk summary count
    const artifactRiskSummaryJSON = artifactValueJSON.risk_summary;
    console.warn(risk_summary);
    if (risk_summary == "LOW" ) {
      artifactRiskSummaryJSON.low_risk_interactions+=1;
    } else if (risk_summary == "MEDIUM"){
      artifactRiskSummaryJSON.medium_risk_interactions+=1;
    } else if (risk_summary == "HIGH"){
      artifactRiskSummaryJSON.high_risk_interactions+=1;
    } else if (risk_summary == "PROMPT"){
      artifactRiskSummaryJSON.prompt_injections+=1;
    }

    // Append to risk reasons
    if (risk_reason) {
      artifactValueJSON.risk_reasons.push(risk_reason);
    }
    
    // Add detected item
    if (detected_item) {
      artifactValueJSON.detected_items.push(detected_item);
    }

    // Add intent reason
    if (intent_reason){
      artifactValueJSON.intent_reasons.push(intent_reason);
    }

    // Increment recommended action
    artifactValueJSON.recommended_actions[recommended_action]+=1;

    // Increment agent created
    if (agent_created) artifactValueJSON.agents_created_from_intents+=1;

    
    // Update the artifact with our changes
    const updateResult = await mcpClient.callTool("update_artifact", {
      "id": process.env.ARTIFACT_ID,
      "value": JSON.stringify(artifactValueJSON),
    });

    if (JSON.parse(updateResult.content[0].text).success == false) {
      return res.status(500).json({
        success:false,
        error: "Request to MCP failed"
      });
    }
    console.warn(updateResult);

    res.json({sucess:true, intent:this.intent, new_count: artifactValueJSON[intent]})
  } catch (err) {
    next(err);
  }
});

router.get("/get_artifact", async (req, res, next) => {
  try {
  const artifactResult = await mcpClient.callTool("get_artifact", {
    "key_pattern": process.env.ARTIFACT_NAME,
  });

  const artifactResultText=JSON.parse(artifactResult.content[0].text);
  const artifactValueJSON=JSON.parse(artifactResultText.artifacts[0].value);

  console.warn(artifactValueJSON);

  res.json(artifactValueJSON);
  } catch (err) {
    next(err);
  } 
});


module.exports = router;
