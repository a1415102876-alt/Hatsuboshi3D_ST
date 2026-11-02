export const SANDBOX_ACTIONS = Object.freeze({
  lesson: Object.freeze({
    kind: 'lesson',
    label: '上课',
    duration: 60,
    category: 'growth',
    growth: true,
    costs: Object.freeze({ stamina: 6, stress: 1 }),
    rewards: Object.freeze({ Vi: 8 }),
  }),
  training: Object.freeze({
    kind: 'training',
    label: '训练',
    duration: 60,
    category: 'growth',
    growth: true,
    costs: Object.freeze({ stamina: 8, stress: 2 }),
    rewards: Object.freeze({ Da: 8 }),
  }),
  commission: Object.freeze({
    kind: 'commission',
    label: '委托',
    duration: 120,
    category: 'work',
    growth: false,
    costs: Object.freeze({ stamina: 10, stress: 3 }),
    rewards: Object.freeze({ coins: 100, fame: 2 }),
  }),
  explore: Object.freeze({
    kind: 'explore',
    label: '探索',
    duration: 60,
    category: 'explore',
    growth: false,
    costs: Object.freeze({ stamina: 3, stress: 1 }),
    rewards: Object.freeze({ trust: 1 }),
  }),
  chat: Object.freeze({
    kind: 'chat',
    label: '闲聊',
    duration: 30,
    category: 'relationship',
    growth: false,
    costs: Object.freeze({ stamina: 0, stress: -1 }),
    rewards: Object.freeze({ trust: 1 }),
  }),
  rest: Object.freeze({
    kind: 'rest',
    label: '休息',
    duration: 60,
    category: 'recovery',
    growth: false,
    costs: Object.freeze({ stamina: -12, stress: -4 }),
    rewards: Object.freeze({}),
  }),
});

export const SANDBOX_DAILY_GROWTH_LIMIT = 3;
export const SANDBOX_TIME = Object.freeze({
  startMinutes: 8 * 60,
  endMinutes: 24 * 60,
  gridMinutes: 15,
});

export function getSandboxAction(kind) {
  const action = SANDBOX_ACTIONS[String(kind || '').trim()];
  return action ? { ...action, costs: { ...action.costs }, rewards: { ...action.rewards } } : null;
}
