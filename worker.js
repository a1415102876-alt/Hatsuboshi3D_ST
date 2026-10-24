const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
};

const FISH_TTS_URL = "https://api.fish.audio/v1/tts";
const FISH_REFERENCE_ID = "e4887b71abdc465eb96398c1cacf1c27";
const FISH_MODEL = "s2.1-pro-free";

const ASSET_BASE_MARKER = "/* HATSU_WORKER_INJECT_ASSET_BASE */";

function withCors(response) {
  const headers = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function injectStHtmlAssetBase(html, origin) {
  const base = origin.endsWith("/") ? origin : `${origin}/`;
  let out = html;
  if (out.includes(ASSET_BASE_MARKER)) {
    out = out.replace(
      ASSET_BASE_MARKER,
      `window.HATSU_ASSET_BASE = "${base}";`
    );
  }
  out = out.replaceAll('data-asset-base=""', `data-asset-base="${base}"`);
  return out;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    const url = new URL(request.url);
    if (url.pathname.replace(/\/+$/, "") === "/api/fish-tts") {
      if (request.method !== "POST") {
        return withCors(new Response(JSON.stringify({ error: "Fish TTS 代理只接受 POST" }), {
          status: 405,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }));
      }
      const forwardedKey = request.headers.get("Authorization") || "";
      const apiKey = String(
        env?.FISH_AUDIO_API_KEY
        || env?.FISH_API_KEY
        || forwardedKey.replace(/^Bearer\s+/i, "")
        || ""
      ).trim();
      if (!apiKey) {
        return withCors(new Response(JSON.stringify({ error: "未配置 Worker Secret：FISH_AUDIO_API_KEY" }), {
          status: 503,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }));
      }
      let payload;
      try {
        payload = await request.json();
      } catch (error) {
        return withCors(new Response(JSON.stringify({ error: "请求体必须是 JSON" }), {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }));
      }
      const text = String(payload?.text || "").trim();
      if (!text) {
        return withCors(new Response(JSON.stringify({ error: "text 不能为空" }), {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }));
      }
      const fishPayload = {
        text,
        reference_id: String(payload?.reference_id || FISH_REFERENCE_ID),
        format: String(payload?.format || "mp3"),
        model: String(payload?.model || FISH_MODEL)
      };
      if (Array.isArray(payload?.pronunciation_dictionary)) {
        fishPayload.pronunciation_dictionary = payload.pronunciation_dictionary;
      }
      const upstream = await fetch(FISH_TTS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          model: fishPayload.model,
          Accept: "audio/mpeg, audio/wav, application/octet-stream, application/json"
        },
        body: JSON.stringify(fishPayload)
      });
      if (!upstream.ok) {
        const detail = await upstream.text();
        return withCors(new Response(JSON.stringify({ error: `Fish Audio HTTP ${upstream.status}`, detail: detail.slice(0, 500) }), {
          status: upstream.status,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }));
      }
      const headers = new Headers(upstream.headers);
      headers.set("Cache-Control", "no-store");
      return withCors(new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers
      }));
    }
    let response = await env.ASSETS.fetch(request);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    const isStHtml = pathname.endsWith("/st.html") || pathname.endsWith("/st2.html");
    if (isStHtml && response.ok) {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("html")) {
        const html = injectStHtmlAssetBase(await response.text(), url.origin);
        response = new Response(html, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      }
    }
    return withCors(response);
  }
};
