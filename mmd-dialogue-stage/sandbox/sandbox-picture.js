export const SANDBOX_PICTURE_KEY = 'hatsuSandboxPictureV1';

export function defaultSandboxPicture() {
  return { taa: true, plateSharpen: true, dialogueFontSize: 23 };
}

export function normalizeSandboxPicture(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const defaults = defaultSandboxPicture();
  const requestedFontSize = Number(source.dialogueFontSize);
  const dialogueFontSize = Number.isFinite(requestedFontSize)
    && requestedFontSize >= 14
    && requestedFontSize <= 30
    ? Math.round(requestedFontSize)
    : defaults.dialogueFontSize;
  return {
    taa: typeof source.taa === 'boolean' ? source.taa : defaults.taa,
    plateSharpen: typeof source.plateSharpen === 'boolean' ? source.plateSharpen : defaults.plateSharpen,
    dialogueFontSize,
  };
}
