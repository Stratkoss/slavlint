import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const MCP_ENTRY = path.join(here, "mcp.js");
export const RULE_SOURCE = path.resolve(here, "../.cursor/rules/slavlint.mdc");

export interface InstallResult {
  mcpJson: string;
  rule: string;
  actions: string[];
}

/**
 * Registers the slavlint MCP server in <projectDir>/.cursor/mcp.json (keeping
 * other servers) and copies the agent rule. The API key is only referenced as
 * ${env:XAI_API_KEY}, never written; without it plural_forms uses the dictionary.
 */
export function installCursor(projectDir: string): InstallResult {
  const cursorDir = path.join(path.resolve(projectDir), ".cursor");
  const mcpJson = path.join(cursorDir, "mcp.json");
  const rule = path.join(cursorDir, "rules", "slavlint.mdc");
  const actions: string[] = [];

  let config: { mcpServers?: Record<string, unknown> } = {};
  if (fs.existsSync(mcpJson)) {
    try {
      config = JSON.parse(fs.readFileSync(mcpJson, "utf8"));
    } catch (err) {
      throw new Error(`${mcpJson} is not valid JSON (${(err as Error).message}); fix it first, nothing was changed.`);
    }
  }

  const existed = Boolean(config.mcpServers?.slavlint);
  config.mcpServers = {
    ...config.mcpServers,
    slavlint: {
      command: process.execPath,
      args: [MCP_ENTRY],
      env: { XAI_API_KEY: "${env:XAI_API_KEY}" },
    },
  };
  fs.mkdirSync(path.dirname(rule), { recursive: true });
  fs.writeFileSync(mcpJson, JSON.stringify(config, null, 2) + "\n");
  actions.push(`${existed ? "Updated" : "Added"} "slavlint" server in ${mcpJson}`);

  fs.copyFileSync(RULE_SOURCE, rule);
  actions.push(`Wrote agent rule ${rule}`);

  return { mcpJson, rule, actions };
}
