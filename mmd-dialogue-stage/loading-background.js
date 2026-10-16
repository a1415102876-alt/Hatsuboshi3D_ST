/**
 * Reusable recreation of the Gakumas SimpleLoading Art Deco background.
 *
 * The game renders a pale Cover plus four 1080px square UI layers. Each
 * layer contains sixteen 270px cells which use an alpha mask from the
 * img_pattern_artdeco atlas. This module keeps that composition separate from
 * Beat parsing so a loading screen can opt into it later.
 */

export const ARTDECO_ATLAS_PATH = './assets/loading-background/img_pattern_artdeco.png';

// Atlas coordinates are expressed from the top-left, which matches CSS mask
// positioning. The four Unity UV rows are flipped here because Unity stores
// the texture origin at the bottom-left while CSS masks use the top-left.
export const ARTDECO_PATTERN_LAYOUT = Object.freeze([
    { name: 'circle-1', gridX: 0, gridY: 0, atlasX: 0, atlasY: 0, flipAtlasX: 1, flipAtlasY: 0 },
    { name: 'square-2', gridX: 1, gridY: 0, atlasX: 1, atlasY: 0, flipAtlasX: 1, flipAtlasY: 1 },
    { name: 'diamond-3', gridX: 2, gridY: 0, atlasX: 2, atlasY: 0, flipAtlasX: 3, flipAtlasY: 0 },
    { name: 'rounded-4', gridX: 3, gridY: 0, atlasX: 3, atlasY: 0, flipAtlasX: 2, flipAtlasY: 0 },
    { name: 'square-5', gridX: 0, gridY: 1, atlasX: 0, atlasY: 1, flipAtlasX: 0, flipAtlasY: 2 },
    { name: 'triangle-6', gridX: 1, gridY: 1, atlasX: 1, atlasY: 1, flipAtlasX: 0, flipAtlasY: 0 },
    { name: 'square-7', gridX: 2, gridY: 1, atlasX: 2, atlasY: 1, flipAtlasX: 2, flipAtlasY: 2 },
    { name: 'cross-8', gridX: 3, gridY: 1, atlasX: 3, atlasY: 1, flipAtlasX: 2, flipAtlasY: 2 },
    { name: 'rounded-9', gridX: 0, gridY: 2, atlasX: 0, atlasY: 2, flipAtlasX: 2, flipAtlasY: 3 },
    { name: 'diamond-10', gridX: 1, gridY: 2, atlasX: 1, atlasY: 2, flipAtlasX: 1, flipAtlasY: 2 },
    { name: 'square-11', gridX: 2, gridY: 2, atlasX: 2, atlasY: 2, flipAtlasX: 3, flipAtlasY: 1 },
    { name: 'circle-12', gridX: 3, gridY: 2, atlasX: 3, atlasY: 2, flipAtlasX: 0, flipAtlasY: 2 },
    { name: 'cross-13', gridX: 0, gridY: 3, atlasX: 0, atlasY: 3, flipAtlasX: 0, flipAtlasY: 3 },
    { name: 'square-14', gridX: 1, gridY: 3, atlasX: 1, atlasY: 3, flipAtlasX: 3, flipAtlasY: 2 },
    { name: 'triangle-15', gridX: 2, gridY: 3, atlasX: 2, atlasY: 3, flipAtlasX: 2, flipAtlasY: 3 },
    { name: 'square-16', gridX: 3, gridY: 3, atlasX: 3, atlasY: 3, flipAtlasX: 2, flipAtlasY: 3 },
]);

// The extracted DecoBackgroundBaseTimeline uses two 14/15-second UV clips
// inside a five-second loop: one starts at 1/15 s and one at 61/15 s.
export const ARTDECO_PATTERN_FLIP_DURATION = 5;
export const ARTDECO_BACKGROUND_SLIDE_DURATION = 10;

const DEFAULT_OPTIONS = Object.freeze({
    atlas: ARTDECO_ATLAS_PATH,
    layerCount: 4,
    seed: 0,
    baseColor: '#fff8f6',
    patternColor: '#f7e9e6',
    patternOpacity: 0.84,
    animationSpeed: 1,
});

function integerOption(value, fallback, minimum, maximum) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(maximum, Math.max(minimum, Math.round(number)));
}

function finiteOption(value, fallback, minimum, maximum) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(maximum, Math.max(minimum, number));
}

export function artDecoAnimationDuration(layerIndex = 0, speed = 1) {
    const index = integerOption(layerIndex, 0, 0, 3);
    const rate = finiteOption(speed, 1, 0.1, 4);
    return (12 + (index * 2)) / rate;
}

export function artDecoPatternFlipDuration() {
    return {
        duration: ARTDECO_PATTERN_FLIP_DURATION,
        firstStart: 1 / 15,
        firstDuration: 14 / 15,
        secondStart: 61 / 15,
        secondDuration: 14 / 15,
    };
}

export function artDecoBackgroundSlideDuration(speed = 1) {
    const rate = finiteOption(speed, 1, 0.1, 4);
    return ARTDECO_BACKGROUND_SLIDE_DURATION / rate;
}

export function artDecoSlideLoop(viewportHeight, layerSize, layerCount = 4) {
    const height = Math.max(1, Number(viewportHeight) || 1);
    const size = Math.max(1, Number(layerSize) || 1);
    const count = Math.max(1, Math.round(Number(layerCount) || 1));
    const stack = size * count;
    return {
        stack,
        distance: stack,
        copies: Math.max(2, Math.ceil(height / stack) + 1),
    };
}

export function buildArtDecoLoadingPlan(options = {}) {
    const settings = { ...DEFAULT_OPTIONS, ...(options || {}) };
    const layerCount = integerOption(settings.layerCount, DEFAULT_OPTIONS.layerCount, 1, 4);
    const seed = integerOption(settings.seed, DEFAULT_OPTIONS.seed, 0, Number.MAX_SAFE_INTEGER);
    const layers = Array.from({ length: layerCount }, (_, index) => ({
        id: `artdeco-layer-${index + 1}`,
        index,
        patterns: ARTDECO_PATTERN_LAYOUT.map(pattern => ({ ...pattern })),
    }));
    return {
        atlas: String(settings.atlas || DEFAULT_OPTIONS.atlas),
        seed,
        layerCount,
        baseColor: String(settings.baseColor || DEFAULT_OPTIONS.baseColor),
        patternColor: String(settings.patternColor || DEFAULT_OPTIONS.patternColor),
        patternOpacity: finiteOption(settings.patternOpacity, DEFAULT_OPTIONS.patternOpacity, 0, 1),
        animationSpeed: finiteOption(settings.animationSpeed, DEFAULT_OPTIONS.animationSpeed, 0.1, 4),
        layers,
    };
}

function setStyle(element, name, value) {
    if (element?.style) element.style.setProperty(name, String(value));
}

/**
 * Mounts the animated background into a caller-owned container.
 * The returned controller is intentionally tiny so the loading flow can keep
 * ownership of when it starts, pauses, hides, and destroys the background.
 */
export function createArtDecoLoadingBackground(container, options = {}) {
    if (!container || typeof document === 'undefined') return null;
    const plan = buildArtDecoLoadingPlan(options);
    const root = document.createElement('div');
    root.className = 'artdeco-loading-background';
    root.setAttribute('aria-hidden', 'true');
    root.dataset.seed = String(plan.seed);
    setStyle(root, '--artdeco-atlas', `url("${plan.atlas.replaceAll('"', '%22')}")`);
    setStyle(root, '--artdeco-base-color', plan.baseColor);
    setStyle(root, '--artdeco-pattern-color', plan.patternColor);
    setStyle(root, '--artdeco-pattern-opacity', plan.patternOpacity);
    setStyle(root, '--artdeco-animation-speed', plan.animationSpeed);

    const cover = document.createElement('div');
    cover.className = 'artdeco-loading-cover';
    root.append(cover);

    const layerRoot = document.createElement('div');
    layerRoot.className = 'artdeco-loading-layers';
    layerRoot.style.animationDuration = `${artDecoBackgroundSlideDuration(plan.animationSpeed)}s`;
    layerRoot.style.animationDelay = `${-(plan.seed % ARTDECO_BACKGROUND_SLIDE_DURATION)}s`;
    const createCycle = cycleIndex => {
        const cycle = document.createElement('div');
        cycle.className = 'artdeco-loading-cycle';
        cycle.dataset.cycle = String(cycleIndex);
        for (const layer of plan.layers) {
            const layerElement = document.createElement('div');
            layerElement.className = 'artdeco-loading-layer';
            layerElement.dataset.layer = String(layer.index + 1);
            layerElement.style.setProperty('--artdeco-layer-index', String(layer.index));
            layerElement.style.setProperty('--artdeco-offset-x', '0px');
            layerElement.style.setProperty('--artdeco-offset-y', '0px');
            layerElement.style.animationDuration = `${artDecoAnimationDuration(layer.index, plan.animationSpeed)}s`;
            layerElement.style.animationDelay = `${-((plan.seed + layer.index) % 17)}s`;
            layerElement.style.opacity = String(Math.max(0.16, 0.32 + (layer.index * 0.07)));
            for (const pattern of layer.patterns) {
                const patternElement = document.createElement('div');
                patternElement.className = 'artdeco-loading-pattern';
                patternElement.dataset.pattern = pattern.name;
                patternElement.style.left = `${pattern.gridX * 25}%`;
                patternElement.style.top = `${pattern.gridY * 25}%`;
                patternElement.style.setProperty('--artdeco-atlas-x', `${pattern.atlasX * 33.333333}%`);
                patternElement.style.setProperty('--artdeco-atlas-y', `${pattern.atlasY * 33.333333}%`);
                patternElement.style.setProperty('--artdeco-flip-x', `${pattern.flipAtlasX * 33.333333}%`);
                patternElement.style.setProperty('--artdeco-flip-y', `${pattern.flipAtlasY * 33.333333}%`);
                patternElement.style.animationDelay = `${-((plan.seed + layer.index) % ARTDECO_PATTERN_FLIP_DURATION)}s`;
                layerElement.append(patternElement);
            }
            cycle.append(layerElement);
        }
        return cycle;
    };
    root.append(layerRoot);
    container.append(root);

    const updateLayout = () => {
        const width = Math.max(1, container.clientWidth || window.innerWidth || 1080);
        const height = Math.max(1, container.clientHeight || window.innerHeight || width);
        const size = Math.min(width, height);
        const loop = artDecoSlideLoop(height, size, plan.layers.length);
        while (layerRoot.childElementCount < loop.copies) layerRoot.append(createCycle(layerRoot.childElementCount));
        while (layerRoot.childElementCount > loop.copies) layerRoot.lastElementChild.remove();
        layerRoot.style.setProperty('--artdeco-slide-distance', `${loop.distance}px`);
        layerRoot.style.animationDuration = `${artDecoBackgroundSlideDuration(plan.animationSpeed) * (loop.distance / Math.max(1, size * 2))}s`;
        for (const cycle of layerRoot.children) {
            const cycleIndex = Number(cycle.dataset.cycle || 0);
            cycle.style.top = `${-cycleIndex * loop.stack}px`;
            for (const layerElement of cycle.children) {
                const index = Number(layerElement.dataset.layer || 1) - 1;
                layerElement.style.width = `${size}px`;
                layerElement.style.height = `${size}px`;
                layerElement.style.top = `${index * size}px`;
                layerElement.style.setProperty('--artdeco-drift-x', `${size * 0.055}px`);
                layerElement.style.setProperty('--artdeco-drift-y', `${size * 0.035}px`);
                layerElement.style.setProperty('--artdeco-drift-wide-x', `${size * 0.09}px`);
                layerElement.style.setProperty('--artdeco-drift-wide-y', `${size * 0.06}px`);
            }
        }
    };
    updateLayout();
    const resizeObserver = typeof ResizeObserver === 'function'
        ? new ResizeObserver(updateLayout)
        : null;
    resizeObserver?.observe(container);
    window.addEventListener('resize', updateLayout);

    return {
        element: root,
        plan,
        setVisible(visible) {
            root.hidden = !visible;
            root.classList.toggle('is-hidden', !visible);
        },
        setPaused(paused) {
            root.classList.toggle('is-paused', Boolean(paused));
        },
        destroy() {
            resizeObserver?.disconnect();
            window.removeEventListener('resize', updateLayout);
            root.remove();
        },
    };
}
