#!/usr/bin/env node

console.log("Environment Variables Check:");
console.log("APPLE_ID:", process.env.APPLE_ID ? "Set" : "Not set");
console.log("APPLE_PASSWORD:", process.env.APPLE_PASSWORD ? "Set" : "Not set");
console.log("APPLE_TEAM_ID:", process.env.APPLE_TEAM_ID || "Not set");

console.log("\nCondition check:");
console.log(
  "process.env.APPLE_ID && process.env.APPLE_PASSWORD:",
  !!(process.env.APPLE_ID && process.env.APPLE_PASSWORD)
);
