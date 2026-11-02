const DEFAULT_MIN_WIDTH = 900;
const DEFAULT_MIN_ASPECT = 1;

function readSize(root) {
  const rect = root?.getBoundingClientRect?.();
  if (!rect) return { width: 0, height: 0 };
  return {
    width: Number(rect.width) || 0,
    height: Number(rect.height) || 0,
  };
}

function readViewportSize(root, viewport) {
  const width = Number(viewport?.innerWidth) || 0;
  const height = Number(viewport?.innerHeight) || 0;
  if (width > 0 && height > 0) return { width, height };
  return readSize(root);
}

function installSandboxResponsiveLayout(root, options = {}) {
  const resizeObserverClass = options.ResizeObserver || globalThis.ResizeObserver;
  const viewport = options.window || root?.ownerDocument?.defaultView || globalThis;
  const hasViewportSize = Number(viewport?.innerWidth) > 0
    && Number(viewport?.innerHeight) > 0;
  const minWidth = Number.isFinite(Number(options.minWidth))
    ? Number(options.minWidth)
    : DEFAULT_MIN_WIDTH;
  const minAspect = Number.isFinite(Number(options.minAspect))
    ? Number(options.minAspect)
    : DEFAULT_MIN_ASPECT;
  let active = true;

  const apply = (width, height) => {
    if (!active || !root?.classList) return false;
    const safeWidth = Number(width) || 0;
    const safeHeight = Number(height) || 0;
    const isDesktop = safeWidth >= minWidth
      && safeHeight > 0
      && safeWidth / safeHeight >= minAspect;
    root.classList.toggle('is-desktop-layout', isDesktop);
    return isDesktop;
  };

  const refresh = (size) => {
    const nextSize = size || readViewportSize(root, viewport);
    return apply(nextSize.width, nextSize.height);
  };
  const observer = typeof resizeObserverClass === 'function'
    ? new resizeObserverClass((entries) => {
      if (!entries?.length) return;
      if (hasViewportSize) {
        refresh();
        return;
      }
      const rect = entries[0]?.contentRect;
      refresh(rect ? { width: rect.width, height: rect.height } : undefined);
    })
    : null;

  refresh();
  observer?.observe?.(root);
  const handleViewportResize = () => refresh();
  viewport?.addEventListener?.('resize', handleViewportResize);

  return {
    refresh,
    disconnect() {
      active = false;
      observer?.disconnect?.();
      viewport?.removeEventListener?.('resize', handleViewportResize);
    },
  };
}

export {
  DEFAULT_MIN_ASPECT,
  DEFAULT_MIN_WIDTH,
  installSandboxResponsiveLayout,
};
