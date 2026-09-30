import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("install-cursor merges mcp.json, writes the rule, and the server works without XAI_API_KEY", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "slavlint-install-"));
  fs.mkdirSync(path.join(dir, ".cursor"));
  fs.writeFileSync(path.join(dir, ".cursor/mcp.json"), JSON.stringify({ mcpServers: { other: { command: "x" } } }));

  const env = { ...process.env } as Record<string, string>;
  delete env.XAI_API_KEY;
  const out = execFileSync(process.execPath, [path.join(root, "dist/cli.js"), "install-cursor", dir], { env, encoding: "utf8" });
  assert.match(out, /XAI_API_KEY is not set/);

  const config = JSON.parse(fs.readFileSync(path.join(dir, ".cursor/mcp.json"), "utf8"));
  assert.deepEqual(Object.keys(config.mcpServers).sort(), ["other", "slavlint"]);
  assert.equal(config.mcpServers.slavlint.env.XAI_API_KEY, "${env:XAI_API_KEY}");
  assert.ok(fs.existsSync(path.join(dir, ".cursor/rules/slavlint.mdc")));

  const { command, args } = config.mcpServers.slavlint;
  const client = new Client({ name: "install-test", version: "0" });
  await client.connect(new StdioClientTransport({ command, args, env: { ...env, XAI_API_KEY: "" } }));
  const res = await client.callTool({ name: "plural_forms", arguments: { word: "soubor", lang: "cs" } });
  assert.equal((res.structuredContent as any).source, "dictionary");
  await client.close();

  fs.rmSync(dir, { recursive: true });
});
