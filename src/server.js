/**
 * Express server for MCP (Model Context Protocol) Backend Service
 * 
 * This module initializes and configures an Express application that:
 * - Enables CORS for cross-origin requests
 * - Parses JSON request bodies
 * - Provides a health check endpoint
 * - Routes MCP-related API requests to dedicated handlers
 * - Implements global error handling
 * - Listens on a configured port
 * 
 * @module server
 * @requires express - Web application framework
 * @requires cors - Cross-Origin Resource Sharing middleware
 * @requires ./config - Application configuration
 * @requires ./routes/mcp - MCP route handlers
 */
const express = require("express");
const cors = require("cors");
const config = require("./config");
const mcpRoutes = require("./routes/mcp");

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ---------------------------------------------------------------------------
// MCP routes
// ---------------------------------------------------------------------------
app.use("/api", mcpRoutes);

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(config.port, () => {
  console.log(`MCP Backend Service running on http://localhost:${config.port}`);
  console.log(`MCP server URL: ${config.mcp.serverUrl}`);
});
