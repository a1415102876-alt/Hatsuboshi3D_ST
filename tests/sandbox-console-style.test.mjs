import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const style = readFileSync(new URL("../style.css", import.meta.url), "utf8");

test("defines the sandbox console layout and state styles", () => {
  assert.match(style, /\.sandbox-console-app/);
  assert.match(style, /\.sandbox-console-section/);
  assert.match(style, /\.sandbox-console-scroll/);
  assert.match(style, /\.sandbox-console-warning/);
  assert.match(style, /\.sandbox-console-status\.is-error/);
  assert.match(style, /\.sandbox-console-status\.is-success/);
  assert.match(style, /\.sandbox-console-button:focus-visible/);
});

test("provides a narrow phone layout for the sandbox console", () => {
  assert.match(style, /@media[^{]*max-width[^{}]*[\s\S]*\.sandbox-console-field-grid/);
  assert.match(style, /\.sandbox-console-field-grid[\s\S]*grid-template-columns/);
  assert.match(style, /\.sandbox-console-check-list/);
});
