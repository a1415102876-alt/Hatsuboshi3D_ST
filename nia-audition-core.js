(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.HatsuNiaAudition = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STATUSES = Object.freeze([
    "idle", "ready",
    "generating_1", "playing_1", "awaiting_continue_1",
    "generating_2", "playing_2", "awaiting_continue_2",
    "generating_3", "playing_3", "awaiting_continue_3",
    "generating_4", "playing_4", "awaiting_settlement",
    "retryable_failed", "settled"
  ]);
  const POST_AUDITION_STATUSES = Object.freeze([
    "idle",
    "generating_opening",
    "awaiting_choice",
    "generating_resolution",
    "playing_resolution",
    "retryable_failed",
    "completed"
  ]);
  const NPC_NAMES = Object.freeze(["水濑凛", "相泽奈央", "篠原澪", "高濑千夏", "青木遥", "白石杏", "小川美月"]);
  const SCORE_ROWS = Object.freeze([
    [286, 331, 322, 310, 298, 276, 268, 260],
    [372, 390, 383, 376, 365, 354, 343, 335],
    [478, 486, 470, 462, 451, 443, 432, 421],
    [612, 603, 590, 579, 568, 554, 542, 531]
  ]);
  const FIRST_AUDITION_FAN_GAIN = 10000;
  const FIRST_AUDITION_BASE_STAT_GAIN = 120;

  const text = (value, limit = 1000) => String(value || "").trim().slice(0, limit);
  const integer = (value, min, max, fallback = min) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.floor(number))) : fallback;
  };
  const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

  function calculateFirstAuditionRewards(rawGrowth) {
    const growth = object(rawGrowth);
    const statGains = {};
    ["Vo", "Da", "Vi"].forEach((key) => {
      const rate = Math.max(0, Number(growth[key]) || 0);
      statGains[key] = Math.round(FIRST_AUDITION_BASE_STAT_GAIN * (1 + rate / 100));
    });
    return { fanGain: FIRST_AUDITION_FAN_GAIN, statGains };
  }

  function calculateAuditionRewards(rawGrowth, roundNumber = 1) {
    const rewards = calculateFirstAuditionRewards(rawGrowth);
    const multiplier = integer(roundNumber, 1, 99, 1) >= 2 ? 2 : 1;
    return {
      fanGain: rewards.fanGain * multiplier,
      statGains: Object.fromEntries(
        Object.entries(rewards.statGains).map(([key, value]) => [key, value * multiplier])
      )
    };
  }

  function normalizePostAudition(raw) {
    const source = object(raw);
    return {
      status: POST_AUDITION_STATUSES.includes(source.status) ? source.status : "idle",
      openingStory: text(source.openingStory, 8000),
      options: Array.isArray(source.options)
        ? source.options.slice(0, 3).map((item) => text(item, 240)).filter(Boolean)
        : [],
      selectedResponse: text(source.selectedResponse, 500),
      selectedResponseSource: ["generated_option", "free_input"].includes(source.selectedResponseSource)
        ? source.selectedResponseSource
        : "",
      resolutionStory: text(source.resolutionStory, 8000),
      recapSummary: text(source.recapSummary, 1000),
      activeRequest: source.activeRequest ? { ...object(source.activeRequest) } : null,
      retryPhase: ["opening", "resolution"].includes(source.retryPhase) ? source.retryPhase : "",
      lastError: text(source.lastError, 500),
      updatedAt: Math.max(0, Number(source.updatedAt) || 0)
    };
  }

  function buildCandidates(idolName, idolAvatar, configuredCandidates = []) {
    const fixedOpponents = Array.isArray(configuredCandidates)
      ? configuredCandidates.slice(0, 7).map((candidate, index) => ({
          id: text(candidate?.id, 160) || `audition-candidate-${index + 2}`,
          name: text(candidate?.name, 120) || `Candidate ${index + 2}`,
          avatar: text(candidate?.avatar, 500),
          isSelf: false
        }))
      : [];
    const usedNames = new Set(fixedOpponents.map((candidate) => candidate.name));
    const fallbackOpponents = NPC_NAMES
      .filter((name) => !usedNames.has(name))
      .slice(0, Math.max(0, 7 - fixedOpponents.length))
      .map((name, index) => ({ id: `audition-candidate-${fixedOpponents.length + index + 2}`, name, avatar: "", isSelf: false }));
    return [
      { id: "responsible-idol", name: text(idolName, 120) || "担当偶像", avatar: text(idolAvatar, 500), isSelf: true },
      ...fixedOpponents,
      ...fallbackOpponents
    ];
  }

  function buildRankings(candidates) {
    return SCORE_ROWS.map((scores, segmentIndex) => candidates
      .map((candidate, index) => ({ ...candidate, score: scores[index], rank: 0 }))
      .sort((a, b) => b.score - a.score)
      .map((candidate, index) => ({ ...candidate, rank: index + 1, segment: segmentIndex + 1 })));
  }

  function normalizeCandidates(value, idolName, idolAvatar) {
    const source = Array.isArray(value) && value.length === 8 ? value : buildCandidates(idolName, idolAvatar);
    return source.slice(0, 8).map((candidate, index) => ({
      id: text(candidate?.id, 160) || `audition-candidate-${index + 1}`,
      name: text(candidate?.name, 120) || `Candidate ${index + 1}`,
      avatar: text(candidate?.avatar, 500),
      isSelf: index === 0 ? true : Boolean(candidate?.isSelf)
    }));
  }

  function normalizeRankings(value, candidates) {
    if (!Array.isArray(value) || value.length !== 4) return buildRankings(candidates);
    return value.map((snapshot, segmentIndex) => {
      const byId = new Map((Array.isArray(snapshot) ? snapshot : []).map((item) => [text(item?.id, 160), item]));
      const normalized = candidates.map((candidate, candidateIndex) => ({
        ...candidate,
        score: integer(byId.get(candidate.id)?.score, 0, 999999, SCORE_ROWS[segmentIndex][candidateIndex]),
        rank: 0,
        segment: segmentIndex + 1
      }));
      return normalized.sort((a, b) => b.score - a.score).map((candidate, index) => ({ ...candidate, rank: index + 1 }));
    });
  }

  function createAuditionRuntime(options = {}) {
    return normalizeAuditionRuntime({
      auditionId: options.auditionId,
      idolName: options.idolName,
      idolAvatar: options.idolAvatar,
      roundNumber: options.roundNumber,
      flowVersion: options.flowVersion,
      candidates: buildCandidates(options.idolName, options.idolAvatar, options.candidates),
      context: options.context,
      status: options.auditionId ? "ready" : "idle"
    });
  }

  function normalizeAuditionRuntime(raw) {
    const source = object(raw);
    const auditionId = text(source.auditionId || source.audition_id, 160);
    const idolName = text(source.idolName, 120) || "担当偶像";
    const idolAvatar = text(source.idolAvatar, 500);
    const roundNumber = integer(source.roundNumber || source.context?.round, 1, 99, 1);
    const candidates = normalizeCandidates(source.candidates, idolName, idolAvatar);
    const rankings = normalizeRankings(source.rankings, candidates);
    const segments = Array.isArray(source.segments) ? source.segments.slice(0, 4).map((item) => ({ ...object(item) })) : [];
    return {
      schemaVersion: 1,
      flowVersion: Number(source.flowVersion) === 2 ? 2 : 1,
      beatFlow: Number(source.flowVersion) === 2 ? normalizeAuditionBeatFlow(source.beatFlow) : null,
      auditionId,
      idolName,
      idolAvatar,
      roundNumber,
      context: { ...object(source.context) },
      status: STATUSES.includes(source.status) ? source.status : (auditionId ? "ready" : "idle"),
      segmentIndex: integer(source.segmentIndex, 0, 4, segments.length),
      pendingSegmentIndex: integer(source.pendingSegmentIndex, 0, 4, 0),
      retrySegmentIndex: integer(source.retrySegmentIndex, 0, 4, 0),
      activeRequest: source.activeRequest ? { ...object(source.activeRequest) } : null,
      candidates,
      rankings,
      segments,
      settledAuditionId: text(source.settledAuditionId, 160),
      progressionApplied: Boolean(source.progressionApplied),
      result: source.result ? { ...object(source.result) } : null,
      postAudition: normalizePostAudition(source.postAudition),
      lastError: text(source.lastError, 500),
      updatedAt: Math.max(0, Number(source.updatedAt) || 0)
    };
  }

  function expectedReadyStatus(segmentIndex) {
    if (segmentIndex === 1) return "ready";
    if (segmentIndex >= 2 && segmentIndex <= 4) return `awaiting_continue_${segmentIndex - 1}`;
    return "";
  }

  function beginAuditionSegment(raw, segmentIndex, request = {}) {
    const runtime = normalizeAuditionRuntime(raw);
    const index = integer(segmentIndex, 1, 4, 0);
    if (!runtime.auditionId) return { ok: false, reason: "audition_id_missing", runtime };
    if (runtime.status === "retryable_failed") {
      if (runtime.retrySegmentIndex !== index) return { ok: false, reason: "retry_segment_mismatch", runtime };
    } else if (runtime.status !== expectedReadyStatus(index)) {
      return { ok: false, reason: "illegal_status", runtime };
    }
    return {
      ok: true,
      runtime: {
        ...runtime,
        status: `generating_${index}`,
        pendingSegmentIndex: index,
        retrySegmentIndex: 0,
        activeRequest: { ...object(request) },
        lastError: "",
        updatedAt: Date.now()
      }
    };
  }

  function applyAuditionSegment(raw, payload = {}) {
    const runtime = normalizeAuditionRuntime(raw);
    const segment = object(payload);
    if (text(segment.auditionId || segment.audition_id, 160) !== runtime.auditionId) {
      return { ok: false, reason: "audition_id_mismatch", runtime };
    }
    if (integer(segment.segmentIndex || segment.segment_index, 1, 4, 0) !== runtime.pendingSegmentIndex) {
      return { ok: false, reason: "segment_index_mismatch", runtime };
    }
    if (runtime.status !== `generating_${runtime.pendingSegmentIndex}`) {
      return { ok: false, reason: "illegal_status", runtime };
    }
    const index = runtime.pendingSegmentIndex;
    const segments = runtime.segments.slice();
    segments[index - 1] = { ...segment, auditionId: runtime.auditionId, segmentIndex: index };
    return {
      ok: true,
      runtime: {
        ...runtime,
        status: `playing_${index}`,
        segmentIndex: index,
        pendingSegmentIndex: 0,
        activeRequest: null,
        segments,
        lastError: "",
        updatedAt: Date.now()
      }
    };
  }

  function completeAuditionPlayback(raw) {
    const runtime = normalizeAuditionRuntime(raw);
    const index = runtime.segmentIndex;
    if (runtime.status !== `playing_${index}`) return { ok: false, reason: "illegal_status", runtime };
    return {
      ok: true,
      runtime: {
        ...runtime,
        status: index < 4 ? `awaiting_continue_${index}` : "awaiting_settlement",
        updatedAt: Date.now()
      }
    };
  }

  function recoverInterruptedAudition(raw) {
    const runtime = normalizeAuditionRuntime(raw);
    if (runtime.flowVersion === 2 && /^generating_(before|after)$/.test(runtime.beatFlow.status)) {
      const phase = runtime.beatFlow.status.slice("generating_".length);
      return { ...runtime, activeRequest: null, beatFlow: { ...runtime.beatFlow, status: "retryable_failed", retryPhase: phase, lastError: "生成中断，可重试当前剧情。" }, updatedAt: Date.now() };
    }
    const match = runtime.status.match(/^generating_([1-4])$/);
    if (match) {
      return {
        ...runtime,
        status: "retryable_failed",
        retrySegmentIndex: Number(match[1]),
        pendingSegmentIndex: 0,
        activeRequest: null,
        lastError: "Audition generation was interrupted. Retry the current segment.",
        updatedAt: Date.now()
      };
    }
    const recap = runtime.postAudition;
    const retryPhase = recap.status === "generating_opening"
      ? "opening"
      : recap.status === "generating_resolution"
        ? "resolution"
        : "";
    if (!retryPhase) return runtime;
    return {
      ...runtime,
      postAudition: {
        ...recap,
        status: "retryable_failed",
        activeRequest: null,
        retryPhase,
        lastError: `Post-audition ${retryPhase} generation was interrupted.`,
        updatedAt: Date.now()
      },
      updatedAt: Date.now()
    };
  }

  function beginPostAuditionOpening(raw, request = {}) {
    const runtime = normalizeAuditionRuntime(raw);
    const recap = runtime.postAudition;
    if (runtime.status !== "settled") return { ok: false, reason: "audition_not_settled", runtime };
    if (!runtime.progressionApplied) return { ok: false, reason: "progression_not_applied", runtime };
    const retrying = recap.status === "retryable_failed" && recap.retryPhase === "opening";
    if (recap.status !== "idle" && !retrying) return { ok: false, reason: "illegal_post_audition_status", runtime };
    return {
      ok: true,
      runtime: {
        ...runtime,
        postAudition: {
          ...recap,
          status: "generating_opening",
          activeRequest: { ...object(request) },
          retryPhase: "",
          lastError: "",
          updatedAt: Date.now()
        },
        updatedAt: Date.now()
      }
    };
  }

  function applyPostAuditionOpening(raw, payload = {}) {
    const runtime = normalizeAuditionRuntime(raw);
    const recap = runtime.postAudition;
    const data = object(payload);
    if (text(data.auditionId || data.audition_id, 160) !== runtime.auditionId) {
      return { ok: false, reason: "audition_id_mismatch", runtime };
    }
    if (recap.status !== "generating_opening") return { ok: false, reason: "illegal_post_audition_status", runtime };
    const openingStory = text(data.story, 8000);
    const options = Array.isArray(data.options) ? data.options.map((item) => text(item, 240)).filter(Boolean) : [];
    if (!openingStory) return { ok: false, reason: "opening_story_missing", runtime };
    if (options.length !== 3) return { ok: false, reason: "invalid_options", runtime };
    return {
      ok: true,
      runtime: {
        ...runtime,
        postAudition: {
          ...recap,
          status: "awaiting_choice",
          openingStory,
          options,
          selectedResponse: "",
          selectedResponseSource: "",
          activeRequest: null,
          retryPhase: "",
          lastError: "",
          updatedAt: Date.now()
        },
        updatedAt: Date.now()
      }
    };
  }

  function selectPostAuditionResponse(raw, selection = {}) {
    const runtime = normalizeAuditionRuntime(raw);
    const recap = runtime.postAudition;
    if (recap.status !== "awaiting_choice") return { ok: false, reason: "illegal_post_audition_status", runtime };
    const source = text(selection.source, 40);
    const response = text(selection.response, 500);
    if (!["generated_option", "free_input"].includes(source)) return { ok: false, reason: "invalid_response_source", runtime };
    if (!response) return { ok: false, reason: "response_missing", runtime };
    if (source === "generated_option" && !recap.options.includes(response)) {
      return { ok: false, reason: "generated_option_mismatch", runtime };
    }
    return {
      ok: true,
      runtime: {
        ...runtime,
        postAudition: {
          ...recap,
          selectedResponse: response,
          selectedResponseSource: source,
          updatedAt: Date.now()
        },
        updatedAt: Date.now()
      }
    };
  }

  function beginPostAuditionResolution(raw, request = {}) {
    const runtime = normalizeAuditionRuntime(raw);
    const recap = runtime.postAudition;
    const retrying = recap.status === "retryable_failed" && recap.retryPhase === "resolution";
    if (recap.status !== "awaiting_choice" && !retrying) return { ok: false, reason: "illegal_post_audition_status", runtime };
    if (!recap.selectedResponse || !recap.selectedResponseSource) return { ok: false, reason: "response_missing", runtime };
    return {
      ok: true,
      runtime: {
        ...runtime,
        postAudition: {
          ...recap,
          status: "generating_resolution",
          activeRequest: { ...object(request) },
          retryPhase: "",
          lastError: "",
          updatedAt: Date.now()
        },
        updatedAt: Date.now()
      }
    };
  }

  function applyPostAuditionResolution(raw, payload = {}) {
    const runtime = normalizeAuditionRuntime(raw);
    const recap = runtime.postAudition;
    const data = object(payload);
    if (text(data.auditionId || data.audition_id, 160) !== runtime.auditionId) {
      return { ok: false, reason: "audition_id_mismatch", runtime };
    }
    if (recap.status !== "generating_resolution") return { ok: false, reason: "illegal_post_audition_status", runtime };
    const resolutionStory = text(data.story, 8000);
    const recapSummary = text(data.recapSummary || data.recap_summary, 1000);
    if (!resolutionStory || !recapSummary) return { ok: false, reason: "invalid_resolution", runtime };
    return {
      ok: true,
      runtime: {
        ...runtime,
        postAudition: {
          ...recap,
          status: "playing_resolution",
          resolutionStory,
          recapSummary,
          activeRequest: null,
          retryPhase: "",
          lastError: "",
          updatedAt: Date.now()
        },
        updatedAt: Date.now()
      }
    };
  }

  function completePostAudition(raw) {
    const runtime = normalizeAuditionRuntime(raw);
    const recap = runtime.postAudition;
    if (recap.status === "completed") return { ok: false, reason: "already_completed", runtime };
    if (recap.status !== "playing_resolution") return { ok: false, reason: "illegal_post_audition_status", runtime };
    return {
      ok: true,
      runtime: {
        ...runtime,
        postAudition: {
          ...recap,
          status: "completed",
          activeRequest: null,
          retryPhase: "",
          lastError: "",
          updatedAt: Date.now()
        },
        updatedAt: Date.now()
      }
    };
  }

  function normalizeAuditionBeatFlow(raw) {
    const source = object(raw);
    const statuses = ["ready", "generating_before", "playing_before", "success_animation", "after_ready", "generating_after", "playing_after", "retryable_failed", "completed"];
    return {
      status: statuses.includes(source.status) ? source.status : "ready",
      beforeStory: text(source.beforeStory, 40000),
      afterStory: text(source.afterStory, 40000),
      beforeSummary: text(source.beforeSummary, 1000),
      afterSummary: text(source.afterSummary, 1000),
      retryPhase: ["before", "after"].includes(source.retryPhase) ? source.retryPhase : "",
      lastError: text(source.lastError, 500)
    };
  }

  function evaluateAuditionOutcome(rawStats) {
    const source = object(rawStats);
    return {
      policy: "temporary_success",
      qualified: true,
      stats: Object.fromEntries(["Vo", "Da", "Vi"].map(key => [key, Math.max(0, Math.round(Number(source[key]) || 0))]))
    };
  }

  function beginAuditionBeat(raw, phase, request = {}) {
    const runtime = normalizeAuditionRuntime(raw);
    const flow = runtime.beatFlow;
    if (runtime.flowVersion !== 2 || !runtime.auditionId || !["before", "after"].includes(phase)) return { ok: false, reason: "invalid_beat_audition", runtime };
    const expected = phase === "before" ? "ready" : "after_ready";
    if (flow.status !== expected && !(flow.status === "retryable_failed" && flow.retryPhase === phase)) return { ok: false, reason: "illegal_beat_audition_status", runtime };
    return { ok: true, runtime: { ...runtime, activeRequest: { ...object(request) }, beatFlow: { ...flow, status: "generating_" + phase, retryPhase: "", lastError: "" }, updatedAt: Date.now() } };
  }

  function applyAuditionBeat(raw, payload = {}) {
    const runtime = normalizeAuditionRuntime(raw);
    const data = object(payload);
    if (runtime.flowVersion !== 2 || text(data.auditionId, 160) !== runtime.auditionId) return { ok: false, reason: "audition_id_mismatch", runtime };
    const phase = data.phase;
    if (!["before", "after"].includes(phase) || runtime.beatFlow.status !== "generating_" + phase) return { ok: false, reason: "phase_mismatch", runtime };
    if (!text(data.story, 40000) || !text(data.continuitySummary, 1000)) return { ok: false, reason: "invalid_story", runtime };
    return { ok: true, runtime: { ...runtime, activeRequest: null, beatFlow: { ...runtime.beatFlow, status: "playing_" + phase, [phase + "Story"]: text(data.story, 40000), [phase + "Summary"]: text(data.continuitySummary, 1000), retryPhase: "", lastError: "" }, updatedAt: Date.now() } };
  }

  function completeAuditionBeforePlayback(raw) {
    const runtime = normalizeAuditionRuntime(raw);
    if (runtime.flowVersion !== 2 || runtime.beatFlow.status !== "playing_before") return { ok: false, reason: "illegal_beat_audition_status", runtime };
    const evaluated = evaluateAuditionOutcome(runtime.context.stats);
    const settled = settleAuditionOnce({ ...runtime, status: "awaiting_settlement" }, runtime.auditionId);
    if (!settled.ok) return settled;
    const result = { ...settled.result, evaluation: evaluated, qualified: evaluated.qualified, resultSummary: runtime.idolName + "试镜成功。", weakness: text(runtime.context.payoffs?.remainingWeakness?.content, 800) };
    return { ok: true, runtime: { ...settled.runtime, result, beatFlow: { ...runtime.beatFlow, status: "success_animation" } } };
  }

  function completeAuditionSuccessPlayback(raw) {
    const runtime = normalizeAuditionRuntime(raw);
    if (runtime.flowVersion !== 2 || runtime.beatFlow.status !== "success_animation") return { ok: false, reason: "illegal_beat_audition_status", runtime };
    return { ok: true, runtime: { ...runtime, beatFlow: { ...runtime.beatFlow, status: "after_ready" }, updatedAt: Date.now() } };
  }

  function completeAuditionAfterPlayback(raw) {
    const runtime = normalizeAuditionRuntime(raw);
    if (runtime.flowVersion !== 2 || runtime.beatFlow.status !== "playing_after") return { ok: false, reason: "illegal_beat_audition_status", runtime };
    return { ok: true, runtime: { ...runtime, beatFlow: { ...runtime.beatFlow, status: "completed" }, postAudition: { ...runtime.postAudition, status: "completed", recapSummary: runtime.beatFlow.afterSummary }, updatedAt: Date.now() } };
  }

  function getAuditionRanking(raw, segmentIndex) {
    const runtime = normalizeAuditionRuntime(raw);
    const index = integer(segmentIndex || runtime.segmentIndex || runtime.pendingSegmentIndex, 1, 4, 1);
    return runtime.rankings[index - 1].map((candidate) => ({ ...candidate }));
  }

  function settleAuditionOnce(raw, auditionId) {
    const runtime = normalizeAuditionRuntime(raw);
    const id = text(auditionId, 160);
    if (!id || id !== runtime.auditionId) return { ok: false, reason: "audition_id_mismatch", runtime };
    if (runtime.status === "settled" || runtime.settledAuditionId === id) return { ok: false, reason: "already_settled", runtime };
    if (runtime.status !== "awaiting_settlement") return { ok: false, reason: "illegal_status", runtime };
    const finalSegment = object(runtime.segments[3]);
    const self = runtime.flowVersion === 2 ? { rank: 1, score: 0 } : runtime.rankings[3].find((candidate) => candidate.isSelf);
    if (!self || self.rank !== 1) return { ok: false, reason: "invalid_final_rank", runtime };
    const rewards = calculateAuditionRewards(runtime.context.growth, runtime.roundNumber);
    const result = {
      score: self.score,
      rank: self.rank,
      qualified: true,
      fanGain: rewards.fanGain,
      statGains: rewards.statGains,
      highlight: text(finalSegment.highlight, 800),
      weakness: text(finalSegment.weakness, 800),
      payoffSummary: text(finalSegment.payoffSummary, 1000),
      resultSummary: text(finalSegment.resultSummary, 1000)
    };
    return {
      ok: true,
      result,
      runtime: {
        ...runtime,
        status: "settled",
        settledAuditionId: id,
        result,
        updatedAt: Date.now()
      }
    };
  }

  return Object.freeze({
    STATUSES,
    evaluateAuditionOutcome,
    beginAuditionBeat,
    applyAuditionBeat,
    completeAuditionBeforePlayback,
    completeAuditionSuccessPlayback,
    completeAuditionAfterPlayback,
    createAuditionRuntime,
    normalizeAuditionRuntime,
    beginAuditionSegment,
    applyAuditionSegment,
    completeAuditionPlayback,
    recoverInterruptedAudition,
    getAuditionRanking,
    calculateFirstAuditionRewards,
    calculateAuditionRewards,
    settleAuditionOnce,
    normalizePostAudition,
    beginPostAuditionOpening,
    applyPostAuditionOpening,
    selectPostAuditionResponse,
    beginPostAuditionResolution,
    applyPostAuditionResolution,
    completePostAudition
  });
});
