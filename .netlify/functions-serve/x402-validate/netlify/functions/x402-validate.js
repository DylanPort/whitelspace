"use strict";

// netlify/functions/x402-validate.js
exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  try {
    const { accessToken } = JSON.parse(event.body || "{}");
    if (!accessToken) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: false, error: "missing_token" })
      };
    }
    if (accessToken === "FREE_ACCESS") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          expiresAt: 9999999999,
          note: "FREE_ACCESS granted for node/staking operations"
        })
      };
    }
    if (!accessToken.startsWith("atk_") || accessToken.length < 20) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: false, error: "invalid_token" })
      };
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        note: "Stateless validation - use JWT in production for expiry tracking"
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: "internal_error" })
    };
  }
};
//# sourceMappingURL=x402-validate.js.map
