import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("declares the sandbox phone app and its two views", () => {
  assert.match(html, /id="phoneSandboxConsoleApp"/);
  assert.match(html, /id="sandboxConsoleMainView"/);
  assert.match(html, /id="sandboxConsoleAdvancedView"/);
  assert.match(html, /id="sandboxConsoleDraftForm"/);
  assert.match(html, /id="sandboxConsoleApplyBtn"/);
  assert.match(html, /id="sandboxConsoleUndoBtn"/);
  assert.match(html, /id="sandboxConsoleAdvancedBtn"/);
});

test("registers and launches the sandbox console only for sandbox mode", () => {
  assert.match(source, /id:\s*"sandbox-console"/);
  assert.match(source, /sandbox-console[\s\S]{0,500}isSandboxLaunch/);
  assert.match(source, /appId === "sandbox-console"/);
  assert.match(source, /function openSandboxConsoleApp\(/);
  assert.match(source, /function renderSandboxConsole\(/);
  assert.match(source, /function bindSandboxConsoleEvents\(/);
});

test("wires the console form to the validated state adapter and saveState", () => {
  assert.match(source, /applySandboxConsoleDraft\(/);
  assert.match(source, /saveState\("sandbox\.console\.apply"\)/);
  assert.match(source, /sandboxConsoleAdvancedView/);
  assert.match(source, /sandboxConsoleRefreshWorldBtn/);
});

test("renders every numeric draft field with its real state key", () => {
  assert.match(source, /sandboxConsoleStamina[\s\S]{0,180}draft\.stamina/);
  assert.match(source, /sandboxConsoleStress[\s\S]{0,180}draft\.stress/);
  assert.match(source, /sandboxConsoleTrust[\s\S]{0,180}draft\.(affinity|trust)/);
});
