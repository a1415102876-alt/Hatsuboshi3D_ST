/**
 * Display and settlement numbers for the sandbox lesson/training board.
 * The formulas match the produce frontend: idol presets, rank from cap
 * percentage, lesson gain, and training gain. Random events stay out so the
 * board remains deterministic.
 */

const ATTRIBUTES = Object.freeze(['Vo', 'Da', 'Vi']);

const PRESET_ROWS = Object.freeze({
  藤田琴音: [90, 90, 120, 8, 29.5, 25.5, 1730, 2210, 2280],
  月村手毬: [120, 100, 80, 27, 22.5, 11.5, 2280, 2080, 1580],
  花海咲季: [100, 100, 105, 16.5, 16.5, 20.5, 1930, 1930, 2030],
  秦谷美铃: [95, 125, 140, 27, 13, 20, 2180, 1680, 2050],
  筱泽广: [70, 55, 120, 22, 8, 26, 1880, 1420, 2150],
  十王星南: [175, 125, 140, 15, 8, 20.5, 1930, 1650, 2200],
  花海佑芽: [120, 115, 110, 24, 24, 20, 2200, 2180, 2080],
  仓本千奈: [75, 115, 125, 10, 24, 20.5, 1650, 2220, 2150],
  葛城莉莉娅: [80, 100, 115, 18, 20, 18, 2000, 2080, 2150],
  紫云清夏: [100, 115, 90, 9, 23, 23, 1650, 2200, 2150],
  有村麻央: [125, 90, 100, 22, 8, 23, 2180, 1550, 2200],
  姬崎莉波: [85, 120, 125, 13, 21.5, 25.5, 1800, 2130, 2280],
  雨夜燕: [115, 125, 100, 20, 23, 17, 2100, 2250, 1800],
});

function freezePreset(row) {
  return Object.freeze({
    Vo: row[0],
    Da: row[1],
    Vi: row[2],
    growth: Object.freeze({ Vo: row[3], Da: row[4], Vi: row[5] }),
    cap: Object.freeze({ Vo: row[6], Da: row[7], Vi: row[8] }),
  });
}

export const PRODUCE_IDOL_PRESETS = Object.freeze(Object.fromEntries(
  Object.entries(PRESET_ROWS).map(([name, row]) => [name, freezePreset(row)]),
));

export const PRODUCE_STAT_COLORS = Object.freeze({
  Vo: '#ff4f9a',
  Da: '#26a9f4',
  Vi: '#ffca35',
});

export const RATING_SPRITE_RANKS = Object.freeze([
  'E', 'E+', 'D', 'D+', 'C', 'C+', 'B', 'B+', 'A', 'A+', 'S', 'S+', 'SS', 'SS+', 'SSS', 'SSS+',
]);

export const RATING_SPRITE_OFFSETS = Object.freeze({
  E: [-7.8, -16.3], 'E+': [-3.7, -16.5], D: [7.5, -16.5], 'D+': [12.1, -16.5],
  C: [-5.6, -3.0], 'C+': [-0.5, -3.0], B: [8.9, -3.0], 'B+': [13.4, -3.2],
  A: [-4.6, 11.5], 'A+': [-0.3, 11.3], S: [11.3, 11.7], 'S+': [14.2, 11.5],
  SS: [-0.8, 22.0], 'SS+': [-3.5, 22.2], SSS: [0.0, 22.0], 'SSS+': [8.8, 21.9],
});

export function producePresetFor(idolId) {
  return PRODUCE_IDOL_PRESETS[String(idolId || '').trim()] || PRODUCE_IDOL_PRESETS['藤田琴音'];
}

export function rankFor(pct) {
  const value = Number(pct) || 0;
  if (value >= 78) return 'SS';
  if (value >= 62) return 'S+';
  if (value >= 46) return 'S';
  if (value >= 30) return 'A';
  return 'B';
}

export function formatGrowthPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0%';
  const rounded = Math.round(number * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded}%`;
}

export function rankSpriteStyle(rank) {
  const rankIndex = Math.max(0, RATING_SPRITE_RANKS.indexOf(rank));
  const [shiftX, shiftY] = RATING_SPRITE_OFFSETS[rank] || [0, 0];
  return {
    x: (rankIndex % 4) * (100 / 3),
    y: Math.floor(rankIndex / 4) * (100 / 3),
    shiftX,
    shiftY,
  };
}

export function produceMeters(idolId, stats = {}) {
  const preset = producePresetFor(idolId);
  return ATTRIBUTES.map((key) => {
    const cap = preset.cap[key] || 1;
    const value = Math.max(0, Math.min(cap, Math.round(preset[key] + (Number(stats[key]) || 0))));
    const pct = Math.max(0, Math.min(100, (value / cap) * 100));
    return {
      key,
      value,
      cap,
      growth: preset.growth[key],
      growthText: formatGrowthPercent(preset.growth[key]),
      rank: rankFor(pct),
      progress: pct * 0.75,
      color: PRODUCE_STAT_COLORS[key],
    };
  });
}

export function produceActionTuning(idolId, kind) {
  const misuzu = String(idolId || '').trim() === '秦谷美铃';
  if (kind === 'lesson') {
    return { stamina: misuzu ? 30 : 10, stress: 1, lessonGain: misuzu ? 98 : 65, multiplier: 1 };
  }
  if (kind === 'training') {
    return { stamina: misuzu ? 33 : 12, stress: 2, lessonGain: 0, multiplier: misuzu ? 1.5 : 1 };
  }
  return { stamina: 0, stress: 0, lessonGain: 0, multiplier: 1 };
}

function roomFor(preset, stats, key) {
  const current = Math.round(preset[key] + (Number(stats?.[key]) || 0));
  return Math.max(0, preset.cap[key] - current);
}

export function produceActionSettlement(idolId, kind, attribute, stats = {}) {
  const stat = ATTRIBUTES.includes(attribute) ? attribute : 'Vo';
  const tuning = produceActionTuning(idolId, kind);
  const preset = producePresetFor(idolId);
  const rewards = {};
  if (kind === 'lesson') {
    rewards[stat] = Math.min(tuning.lessonGain, roomFor(preset, stats, stat));
    rewards.stress = tuning.stress;
  } else if (kind === 'training') {
    ATTRIBUTES.forEach((item) => {
      const growth = Number(preset.growth[item]) || 0;
      const baseGain = item === stat
        ? Math.round(28 + growth * 0.8)
        : Math.round(growth * 0.15);
      const tuned = Math.round(baseGain * tuning.multiplier);
      rewards[item] = Math.min(tuned, roomFor(preset, stats, item));
    });
    rewards.stress = tuning.stress;
  }
  return {
    attribute: stat,
    costs: { stamina: tuning.stamina },
    rewards,
    costText: kind === 'training' ? `-${tuning.stamina}` : `体力-${tuning.stamina}`,
  };
}
