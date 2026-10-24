(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HatsuNiaTvBusiness = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STATUSES = Object.freeze([
    "idle", "ready", "generating_1", "playing_1", "awaiting_continue_1",
    "generating_2", "playing_2", "awaiting_continue_2",
    "generating_3", "playing_3", "awaiting_producer_instruction",
    "generating_4", "playing_4", "awaiting_settlement", "retryable_failed", "settled"
  ]);
  const text = (value, limit = 1000) => String(value == null ? "" : value).trim().slice(0, limit);
  const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const integer = (value, min, max, fallback = min) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.floor(number))) : fallback;
  };

  function getTvSegmentCount(raw) {
    const source = object(raw);
    if (source.segmentCount === 4) return 4;
    if (source.segmentCount === 2 || source.schemaVersion === 2) return 2;
    if (source.schemaVersion === 1) return 4;
    return text(source.businessId, 160) ? 4 : 2;
  }

  function normalizeTvRuntime(raw) {
    const source = object(raw);
    const businessId = text(source.businessId, 160);
    const segmentCount = getTvSegmentCount(source);
    const segments = Array.isArray(source.segments) ? source.segments.slice(0, segmentCount).map((item) => ({ ...object(item) })) : [];
    return {
      schemaVersion: segmentCount === 2 ? 2 : 1,
      segmentCount,
      businessId,
      status: STATUSES.includes(source.status) ? source.status : (businessId ? "ready" : "idle"),
      segmentIndex: integer(source.segmentIndex, 0, segmentCount, segments.length),
      pendingSegmentIndex: integer(source.pendingSegmentIndex, 0, segmentCount, 0),
      retrySegmentIndex: integer(source.retrySegmentIndex, 0, segmentCount, 0),
      activeRequest: source.activeRequest ? { ...object(source.activeRequest) } : null,
      segments,
      playbackLineIndex: integer(source.playbackLineIndex, 0, 48, 0),
      playedLines: Array.isArray(source.playedLines) ? source.playedLines.slice(-192).map(line => ({ ...object(line) })) : [],
      producerInstruction: text(source.producerInstruction, 1200),
      strategyId: text(source.strategyId, 80),
      selectedTopics: Array.isArray(source.selectedTopics) ? source.selectedTopics.map((item) => text(item, 160)).filter(Boolean).slice(0, 5) : [],
      baseFans: integer(source.baseFans, 0, 9999999, 0),
      settledBusinessId: text(source.settledBusinessId, 160),
      progressionApplied: Boolean(source.progressionApplied),
      result: source.result ? { ...object(source.result) } : null,
      lastError: text(source.lastError, 500),
      updatedAt: Math.max(0, Number(source.updatedAt) || 0)
    };
  }

  function createTvRuntime(options = {}) {
    return normalizeTvRuntime({ schemaVersion: 2, segmentCount: 2, businessId: options.businessId, status: options.businessId ? "ready" : "idle", baseFans: options.baseFans, strategyId: options.strategyId, selectedTopics: options.selectedTopics });
  }

  function expectedStatus(index, segmentCount) {
    if (index === 1) return "ready";
    if (index === segmentCount) return "awaiting_producer_instruction";
    return 'awaiting_continue_' + (index - 1);
  }

  function beginSegmentGeneration(raw, segmentIndex, request = {}) {
    const runtime = normalizeTvRuntime(raw);
    const index = Number(segmentIndex);
    if (!Number.isInteger(index) || index < 1 || index > runtime.segmentCount) return { ok: false, reason: "invalid_segment_index", runtime };
    if (!runtime.businessId) return { ok: false, reason: "business_id_missing", runtime };
    if (runtime.status === "retryable_failed" ? runtime.retrySegmentIndex !== index : runtime.status !== expectedStatus(index, runtime.segmentCount)) return { ok: false, reason: "illegal_status", runtime };
    if (index === runtime.segmentCount && !runtime.producerInstruction) return { ok: false, reason: "producer_instruction_missing", runtime };
    return { ok: true, runtime: { ...runtime, status: `generating_${index}`, pendingSegmentIndex: index, retrySegmentIndex: 0, activeRequest: { ...object(request) }, playbackLineIndex: 0, playedLines: runtime.playedLines.filter(line => Number(line.segmentIndex) !== index), lastError: "", updatedAt: Date.now() } };
  }

  function applySegmentPayload(raw, payload = {}) {
    const runtime = normalizeTvRuntime(raw); const segment = object(payload);
    if (text(segment.businessId, 160) !== runtime.businessId) return { ok: false, reason: "business_id_mismatch", runtime };
    if (Number(segment.segmentIndex) !== runtime.pendingSegmentIndex || runtime.pendingSegmentIndex < 1 || runtime.status !== `generating_${runtime.pendingSegmentIndex}`) return { ok: false, reason: "segment_mismatch", runtime };
    const segments = runtime.segments.slice(); segments[runtime.pendingSegmentIndex - 1] = { ...segment };
    return { ok: true, runtime: { ...runtime, status: `playing_${runtime.pendingSegmentIndex}`, segmentIndex: runtime.pendingSegmentIndex, pendingSegmentIndex: 0, activeRequest: null, segments, playbackLineIndex: 0, lastError: "", updatedAt: Date.now() } };
  }

  function completeSegmentPlayback(raw) {
    const runtime = normalizeTvRuntime(raw); const index = runtime.segmentIndex;
    if (runtime.status !== `playing_${index}`) return { ok: false, reason: "illegal_status", runtime };
    return { ok: true, runtime: { ...runtime, status: index === runtime.segmentCount ? "awaiting_settlement" : index === runtime.segmentCount - 1 ? "awaiting_producer_instruction" : `awaiting_continue_${index}`, updatedAt: Date.now() } };
  }

  function submitProducerInstruction(raw, instruction) {
    const runtime = normalizeTvRuntime(raw); const value = text(instruction, 1200);
    if (runtime.status !== "awaiting_producer_instruction") return { ok: false, reason: "illegal_status", runtime };
    if (!value) return { ok: false, reason: "instruction_missing", runtime };
    return { ok: true, runtime: { ...runtime, producerInstruction: value, updatedAt: Date.now() } };
  }

  function recoverInterruptedTv(raw) {
    const runtime = normalizeTvRuntime(raw); const match = runtime.status.match(/^generating_([1-4])$/);
    return match ? { ...runtime, status: "retryable_failed", retrySegmentIndex: Number(match[1]), pendingSegmentIndex: 0, activeRequest: null, lastError: "电视节目生成被中断，请重试。" } : runtime;
  }

  function settleTvOnce(raw, businessId) {
    const runtime = normalizeTvRuntime(raw); const id = text(businessId, 160);
    if (!id || id !== runtime.businessId) return { ok: false, reason: "business_id_mismatch", runtime };
    if (runtime.status === "settled" || runtime.settledBusinessId === id) return { ok: false, reason: "already_settled", runtime };
    if (runtime.status !== "awaiting_settlement") return { ok: false, reason: "illegal_status", runtime };
    const final = object(runtime.segments[runtime.segmentCount - 1]); const tier = ["none", "small", "medium", "large"].includes(final.bonusTier) ? final.bonusTier : "none";
    const bonus = { none: 0, small: 3000, medium: 4000, large: 5000 }[tier];
    const result = { fanGain: bonus, bonusTier: tier, highlight: text(final.highlight, 800), audienceResponse: text(final.audienceResponse, 800), impressionChange: text(final.impressionChange, 800), followupHook: text(final.followupHook, 800), resultSummary: text(final.resultSummary, 1000) };
    return { ok: true, result, runtime: { ...runtime, status: "settled", settledBusinessId: id, result, updatedAt: Date.now() } };
  }

  return Object.freeze({ STATUSES, getTvSegmentCount, createTvRuntime, normalizeTvRuntime, beginSegmentGeneration, applySegmentPayload, completeSegmentPlayback, submitProducerInstruction, recoverInterruptedTv, settleTvOnce });
});
