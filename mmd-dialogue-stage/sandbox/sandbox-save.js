import { createSandboxState, normalizeSandboxState } from './sandbox-core.js?v=20261029-commission-v1';

export const SANDBOX_STORAGE_KEY = 'hatsuFreeSandboxStateV1';

function resolveStorage(storage) {
  if (storage && typeof storage.getItem === 'function') return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function readSandboxSave(storage) {
  const adapter = resolveStorage(storage);
  if (!adapter) return createSandboxState();
  try {
    const raw = adapter.getItem(SANDBOX_STORAGE_KEY);
    if (!raw) return createSandboxState();
    return normalizeSandboxState(JSON.parse(raw));
  } catch {
    return createSandboxState();
  }
}

export function writeSandboxSave(state, storage) {
  const normalized = normalizeSandboxState(state);
  const adapter = resolveStorage(storage);
  if (!adapter) return normalized;
  try {
    adapter.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Storage may be unavailable in private or quota-limited contexts.
  }
  return normalized;
}

export function clearSandboxSave(storage) {
  const adapter = resolveStorage(storage);
  if (!adapter) return false;
  try {
    adapter.removeItem(SANDBOX_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
