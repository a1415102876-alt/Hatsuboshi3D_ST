import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import worker from "../worker.js";

const workerSource = readFileSync(new URL("../worker.js", import.meta.url), "utf8");
const stSource = readFileSync(new URL("../st.html", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../style.css", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function injectStHtmlAssetBase(html, origin) {
  const base = origin.endsWith("/") ? origin : `${origin}/`;
  let out = html;
  const marker = "/* HATSU_WORKER_INJECT_ASSET_BASE */";
  if (out.includes(marker)) {
    out = out.replace(marker, `window.HATSU_ASSET_BASE = "${base}";`);
  }
  out = out.replaceAll('data-asset-base=""', `data-asset-base="${base}"`);
  return out;
}

test("st.html exposes a unique worker injection marker", () => {
  assert.match(stSource, /\/\* HATSU_WORKER_INJECT_ASSET_BASE \*\//);
});

test("local ST loader points Fish TTS at the Worker instead of ST /api", () => {
  assert.match(stSource, /HATSU_FISH_TTS_PROXY/);
  assert.match(stSource, /https:\/\/hatsuboshitest\.a1415102876\.workers\.dev\/api\/fish-tts/);
});

test("system console exposes Fish TTS model and proxy settings", () => {
  assert.match(indexSource, /fishTtsModel/);
  assert.match(indexSource, /fishTtsProxyUrl/);
  assert.match(indexSource, /fishTtsApiKey/);
  assert.match(appSource, /s2\.1-pro-free/);
});

test("worker injects asset base via marker, not a loose includes check", () => {
  assert.match(workerSource, /HATSU_WORKER_INJECT_ASSET_BASE/);
  assert.doesNotMatch(workerSource, /includes\("window\.HATSU_ASSET_BASE"\)/);
});

test("worker exposes the Fish Audio proxy without embedding a user key", () => {
  assert.match(workerSource, /\/api\/fish-tts/);
  assert.match(workerSource, /api\.fish\.audio\/v1\/tts/);
  assert.match(workerSource, /forwardedKey/);
  assert.match(workerSource, /FISH_AUDIO_API_KEY/);
  assert.doesNotMatch(workerSource, /e4887b71abdc465eb96398c1cacf1c27.{0,80}(?:sk-|api[_-]?key)/i);
  assert.match(workerSource, /s2\.1-pro-free/);
  assert.match(workerSource, /model:\s*fishPayload\.model/);
});

test("Worker forwards the in-memory Fish key and free model to Fish Audio", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamRequest;
  globalThis.fetch = async (input, init) => {
    upstreamRequest = { input, init };
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "content-type": "audio/mpeg" }
    });
  };
  try {
    const request = new Request("https://hatsuboshitest.a1415102876.workers.dev/api/fish-tts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test-key" },
      body: JSON.stringify({ text: "test" })
    });
    const response = await worker.fetch(request, {});
    assert.equal(response.status, 200);
    const body = JSON.parse(upstreamRequest.init.body);
    assert.equal(body.model, "s2.1-pro-free");
    assert.equal(upstreamRequest.init.headers.Authorization, "Bearer test-key");
    assert.equal(upstreamRequest.init.headers.model, "s2.1-pro-free");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Worker preserves Fish Audio 403 JSON details without treating them as ST login", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    message: "Invalid token",
    status: 403,
    reason: "token rejected"
  }), {
    status: 403,
    headers: { "content-type": "application/json" }
  });
  try {
    const request = new Request("https://hatsuboshitest.a1415102876.workers.dev/api/fish-tts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test-key" },
      body: JSON.stringify({ text: "test" })
    });
    const response = await worker.fetch(request, {});
    assert.equal(response.status, 403);
    const payload = await response.json();
    assert.equal(payload.error, "Fish Audio HTTP 403");
    assert.match(payload.detail, /Invalid token/);
    assert.match(payload.detail, /token rejected/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("task panel overlay has scrollable body layout", () => {
  assert.match(styleSource, /\.event-panel\.task-panel[\s\S]*min-height:\s*min\(520px/);
  assert.match(styleSource, /\.task-panel-body \.task-panel-sections[\s\S]*min-height:\s*180px/);
});

test("st.html overlay shields idol list cards from host button resets", () => {
  assert.match(stSource, /#hatsu-fullscreen-overlay \.idol-card/);
  assert.match(stSource, /display:\s*grid !important/);
});

test("st.html embed loader skips vercel and probes world modules", () => {
  assert.match(stSource, /isDeprecatedRemoteBase/);
  assert.match(stSource, /probeEmbedAssetBase/);
  assert.match(stSource, /酒馆内嵌忽略 Vercel 资源根/);
  assert.match(stSource, /world\/cast-track\.js/);
});

test("injectStHtmlAssetBase sets HATSU_ASSET_BASE and data-asset-base", () => {
  const origin = "https://hatsuboshitest.a1415102876.workers.dev";
  const injected = injectStHtmlAssetBase(stSource, origin);
  assert.match(
    injected,
    /window\.HATSU_ASSET_BASE = "https:\/\/hatsuboshitest\.a1415102876\.workers\.dev\/";/
  );
  assert.match(
    injected,
    /data-asset-base="https:\/\/hatsuboshitest\.a1415102876\.workers\.dev\/"/
  );
  assert.doesNotMatch(injected, /\/\* HATSU_WORKER_INJECT_ASSET_BASE \*\//);
});
