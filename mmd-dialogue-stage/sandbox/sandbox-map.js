import { SANDBOX_MAP_REGIONS } from './sandbox-map-regions.js?v=20261028-field-garden-v1';
import { AMAGAWA_MAP_REGIONS } from './sandbox-city-map-regions.js?v=20261027-city-map-old-regions-v1';
export { SANDBOX_MAP_REGIONS, AMAGAWA_MAP_REGIONS };

const MAP_IMAGE = '../hatsu-produce-local/assets/MAP/Gakuen.png';
const MAP_ASPECT = 3036 / 1672;
const CAMPUS_VIEW = Object.freeze({ width: 1000, height: 550 });

export const CITY_MAP_VIEW = Object.freeze({
  image: 'assets/maps/amagawa.jpg?v=20261027-city-map-v2',
  aspect: 1448 / 1086,
  viewWidth: 1024,
  viewHeight: 768,
  alt: '天川市地图',
  hint: '左右拖动查看地图 · 轻点地点前往',
  regions: AMAGAWA_MAP_REGIONS,
});

export function campusMapLayout(width, height, aspect = MAP_ASPECT) {
  const viewportWidth = Math.max(1, Number(width) || 1);
  const viewportHeight = Math.max(1, Number(height) || 1);
  const mapAspect = Number(aspect) > 0 ? Number(aspect) : MAP_ASPECT;
  const mapWidth = Math.max(viewportWidth, viewportHeight * mapAspect);
  const mapHeight = mapWidth / mapAspect;
  return {
    width: mapWidth,
    height: mapHeight,
    maxPanX: Math.max(0, (mapWidth - viewportWidth) / 2),
    maxPanY: Math.max(0, (mapHeight - viewportHeight) / 2),
  };
}

const clampPan = (value, limit) => Math.max(-limit, Math.min(limit, value));

export function updateMapPanGesture(gesture, point, layout) {
  const dx = point.x - gesture.startX;
  const dy = point.y - gesture.startY;
  const dragged = Boolean(gesture.dragged) || Math.hypot(dx, dy) > 6;
  return {
    dragged,
    panX: clampPan(gesture.originX + (dragged ? dx : 0), layout.maxPanX),
    panY: clampPan(gesture.originY + (dragged ? dy : 0), layout.maxPanY),
  };
}

function parsePoints(points) {
  return String(points || '').trim().split(/\s+/u).map((pair) => pair.split(',').map(Number)).filter((point) => point.length === 2 && point.every(Number.isFinite));
}

const LABEL_BREAKS = Object.freeze({
  西侧运动场: ['西侧', '运动场'],
  东南侧长形校舍: ['东南侧', '长形校舍'],
  制作人科教室: ['制作人', '科教室'],
  偶像科教室: ['偶像科', '教室'],
  北侧校舍: ['北侧', '校舍'],
  特殊教室: ['特殊', '教室'],
  学园正门: ['学园', '正门'],
  仓本家别墅: ['仓本家', '别墅'],
  初星学园寮: ['初星', '学园寮'],
  拱廊商店街: ['拱廊', '商店街'],
  制作人的家: ['制作人', '的家'],
  初星温泉: ['初星', '温泉'],
  近郊公园: ['近郊', '公园'],
});

function pointInPolygon(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const hit = ((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function polygonAnchor(points) {
  let area = 0;
  let cx = 0;
  let cy = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const cross = xi * yj - xj * yi;
    area += cross;
    cx += (xi + xj) * cross;
    cy += (yi + yj) * cross;
    minX = Math.min(minX, xi);
    minY = Math.min(minY, yi);
    maxX = Math.max(maxX, xi);
    maxY = Math.max(maxY, yi);
  }
  area *= 0.5;
  const centroid = Math.abs(area) < 1e-4
    ? [(minX + maxX) / 2, (minY + maxY) / 2]
    : [cx / (6 * area), cy / (6 * area)];
  if (pointInPolygon(points, centroid[0], centroid[1])) return { x: centroid[0], y: centroid[1], minX, minY, maxX, maxY };
  let best = centroid;
  let bestDist = Infinity;
  for (let row = 1; row < 24; row += 1) {
    for (let col = 1; col < 24; col += 1) {
      const x = minX + (maxX - minX) * col / 24;
      const y = minY + (maxY - minY) * row / 24;
      if (!pointInPolygon(points, x, y)) continue;
      const dist = (x - centroid[0]) ** 2 + (y - centroid[1]) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = [x, y];
      }
    }
  }
  return { x: best[0], y: best[1], minX, minY, maxX, maxY };
}

function candidateLines(label) {
  const text = String(label || '');
  const chars = Array.from(text);
  if (LABEL_BREAKS[text]) return LABEL_BREAKS[text];
  if (chars.length < 4) return [text];
  const mid = Math.ceil(chars.length / 2);
  return [chars.slice(0, mid).join(''), chars.slice(mid).join('')];
}

function fitLabelFont(lines, width, height, maxFont) {
  const longest = Math.max(1, ...lines.map((line) => Array.from(line).length));
  const fontByWidth = (width * 0.9) / (longest * 1.02);
  const fontByHeight = (height * 0.78) / (lines.length * 1.15);
  return Math.min(fontByWidth, fontByHeight, maxFont);
}

export function mapRegionLabelLayout(region, viewWidth = CAMPUS_VIEW.width, viewHeight = CAMPUS_VIEW.height) {
  const points = parsePoints(region?.points);
  const label = String(region?.label || '');
  const width = Math.max(1, Number(viewWidth) || CAMPUS_VIEW.width);
  const height = Math.max(1, Number(viewHeight) || CAMPUS_VIEW.height);
  if (!points.length || !label) return null;
  const anchor = polygonAnchor(points);
  const boxWidth = Math.max(1, anchor.maxX - anchor.minX);
  const boxHeight = Math.max(1, anchor.maxY - anchor.minY);
  const maxFont = height * 0.021;
  const minFont = height * 0.012;
  const single = [label];
  const split = candidateLines(label);
  const singleFont = fitLabelFont(single, boxWidth, boxHeight, maxFont);
  const splitFont = fitLabelFont(split, boxWidth, boxHeight, maxFont);
  const lines = split.length > 1 && splitFont > singleFont * 1.15 && singleFont < maxFont * 0.85 ? split : single;
  const fontSize = Math.max(minFont, lines === split ? splitFont : singleFont);
  const lineHeight = fontSize * 1.12;
  const textWidth = Math.max(...lines.map((line) => Array.from(line).length)) * fontSize;
  const padX = fontSize * 0.42;
  const padY = fontSize * 0.28;
  const pillWidth = textWidth + padX * 2;
  const pillHeight = lines.length * lineHeight + padY * 2;
  const x = Math.max(pillWidth / 2 + 2, Math.min(width - pillWidth / 2 - 2, anchor.x));
  const y = Math.max(pillHeight / 2 + 2, Math.min(height - pillHeight / 2 - 2, anchor.y));
  return {
    id: region.id,
    label,
    lines,
    x,
    y,
    fontSize,
    pillWidth,
    pillHeight,
  };
}

export function mapRegionAtPoint(regions, x, y) {
  const candidates = Array.isArray(regions) ? regions : SANDBOX_MAP_REGIONS;
  // Later SVG polygons are drawn on top; use that same order at shared edges.
  for (const region of [...candidates].reverse()) {
    const points = parsePoints(region.points);
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      const hit = ((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi;
      if (hit) inside = !inside;
    }
    if (inside) return region;
  }
  return null;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function mapLabelMarkup(region, viewWidth, viewHeight, activeLocationId) {
  const layout = mapRegionLabelLayout(region, viewWidth, viewHeight);
  if (!layout) return '';
  const active = region.locationId && region.locationId === activeLocationId;
  const disabled = region.enabled === false;
  const lineHeight = layout.fontSize * 1.12;
  const tspans = layout.lines.map((line, index) => {
    const lineY = layout.y + (index - (layout.lines.length - 1) / 2) * lineHeight;
    return `<tspan x="${layout.x.toFixed(1)}" y="${lineY.toFixed(1)}">${escapeHtml(line)}</tspan>`;
  }).join('');
  return `<g class="sandbox-map-label${active ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}" data-map-label="${escapeHtml(region.id)}" aria-hidden="true"><rect x="${(layout.x - layout.pillWidth / 2).toFixed(1)}" y="${(layout.y - layout.pillHeight / 2).toFixed(1)}" width="${layout.pillWidth.toFixed(1)}" height="${layout.pillHeight.toFixed(1)}" rx="${(layout.fontSize * 0.46).toFixed(1)}"></rect><text font-size="${layout.fontSize.toFixed(1)}">${tspans}</text></g>`;
}

export function activateMapRegion(region, onSelect = () => {}) {
  if (!region || region.enabled === false || (!region.locationId && !region.switchTo)) return false;
  onSelect(region.id, region);
  return true;
}

export function renderSandboxMap(container, {
  activeLocationId = '',
  onSelect = () => {},
  describePresence = null,
  regions = SANDBOX_MAP_REGIONS,
  image = MAP_IMAGE,
  aspect = MAP_ASPECT,
  viewWidth = CAMPUS_VIEW.width,
  viewHeight = CAMPUS_VIEW.height,
  alt = '初星学园地图',
  hint = '左右拖动查看地图 · 轻点建筑进入',
} = {}) {
  if (!container) return null;
  const mapRegions = Array.isArray(regions) ? regions : SANDBOX_MAP_REGIONS;
  container.innerHTML = `
    <div class="sandbox-map-canvas" style="--sandbox-map-image: url('${image}')">
      <div class="sandbox-map-pan-layer">
        <img class="sandbox-map-image" src="${image}" alt="${escapeHtml(alt)}" draggable="false">
        <svg class="sandbox-map-overlay" viewBox="0 0 ${viewWidth} ${viewHeight}" role="application" aria-label="${escapeHtml(alt)}" preserveAspectRatio="none">
          ${mapRegions.map((region) => `<polygon class="sandbox-map-region${region.locationId && region.locationId === activeLocationId ? ' is-active' : ''}" data-map-region="${region.id}" points="${region.points}" tabindex="0" role="button" aria-disabled="${region.enabled === false}" aria-label="${escapeHtml(region.label)}${region.enabled === false ? ' · 暂未开放' : ''}"></polygon>`).join('')}
          ${mapRegions.map((region) => mapLabelMarkup(region, viewWidth, viewHeight, activeLocationId)).join('')}
        </svg>
      </div>
      <div class="sandbox-map-tooltip" hidden></div>
      <div class="sandbox-map-hint">${escapeHtml(hint)}</div>
    </div>
  `;
  const canvas = container.querySelector('.sandbox-map-canvas');
  const panLayer = container.querySelector('.sandbox-map-pan-layer');
  const overlay = container.querySelector('.sandbox-map-overlay');
  const tooltip = container.querySelector('.sandbox-map-tooltip');
  const byId = new Map(mapRegions.map((region) => [region.id, region]));
  const events = new AbortController();
  const listen = (node, type, handler) => node.addEventListener(type, handler, { signal: events.signal });
  let layout = campusMapLayout(1, 1);
  let panX = 0;
  let panY = 0;
  let gesture = null;
  const applyPan = () => {
    panLayer.style.transform = `translate3d(calc(-50% + ${panX}px), calc(-50% + ${panY}px), 0)`;
  };
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    layout = campusMapLayout(rect.width, rect.height, aspect);
    panLayer.style.width = `${layout.width}px`;
    panLayer.style.height = `${layout.height}px`;
    panX = clampPan(panX, layout.maxPanX);
    panY = clampPan(panY, layout.maxPanY);
    applyPan();
  };
  const showTooltip = (region, event) => {
    if (!region || !tooltip || !canvas) return;
    tooltip.hidden = false;
    const action = region.switchTo ? '点击查看学园' : '点击进入';
    const detail = region.enabled === false ? '暂未开放' : `${region.category || ''} · ${action}`.replace(/^ · /, '');
    const presence = region.enabled !== false && region.locationId && typeof describePresence === 'function'
      ? String(describePresence(region) || '')
      : '';
    tooltip.innerHTML = `<strong>${escapeHtml(region.label)}</strong><small>${escapeHtml(detail)}</small>${presence ? `<small>${escapeHtml(presence)}</small>` : ''}`;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(8, Math.min(rect.width - tooltip.offsetWidth - 8, (event?.clientX ?? rect.left + rect.width / 2) - rect.left + 10));
    const y = Math.max(8, Math.min(rect.height - tooltip.offsetHeight - 8, (event?.clientY ?? rect.top + rect.height / 2) - rect.top + 10));
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  };
  const hideTooltip = () => { if (tooltip) tooltip.hidden = true; };
  const selectRegion = (region, event) => {
    if (!activateMapRegion(region, onSelect)) showTooltip(region, event);
  };
  listen(canvas, 'pointerdown', (event) => {
    if (event.button !== 0 || gesture) return;
    gesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: panX,
      originY: panY,
      dragged: false,
      regionId: event.target.closest?.('[data-map-region]')?.dataset.mapRegion,
    };
    canvas.setPointerCapture(event.pointerId);
    hideTooltip();
  });
  listen(canvas, 'pointermove', (event) => {
    if (gesture?.pointerId !== event.pointerId) return;
    const next = updateMapPanGesture(gesture, { x: event.clientX, y: event.clientY }, layout);
    gesture.dragged = next.dragged;
    panX = next.panX;
    panY = next.panY;
    canvas.classList.toggle('is-panning', next.dragged);
    applyPan();
  });
  const endPan = (event) => {
    if (gesture?.pointerId !== event.pointerId) return;
    const ended = gesture;
    const next = updateMapPanGesture(ended, { x: event.clientX, y: event.clientY }, layout);
    gesture = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    canvas.classList.remove('is-panning');
    if (event.type !== 'pointerup' || next.dragged) return;
    const rect = panLayer.getBoundingClientRect();
    const region = mapRegionAtPoint(mapRegions, (event.clientX - rect.left) / rect.width * viewWidth, (event.clientY - rect.top) / rect.height * viewHeight);
    if (region?.id === ended.regionId) selectRegion(region, event);
  };
  listen(canvas, 'pointerup', endPan);
  listen(canvas, 'pointercancel', endPan);
  listen(canvas, 'lostpointercapture', () => { gesture = null; canvas.classList.remove('is-panning'); });
  overlay.querySelectorAll('[data-map-region]').forEach((node) => {
    const region = byId.get(node.dataset.mapRegion);
    const label = overlay.querySelector(`[data-map-label="${region.id}"]`);
    listen(node, 'pointerenter', (event) => { if (!gesture) { label?.classList.add('is-hot'); showTooltip(region, event); } });
    listen(node, 'pointermove', (event) => { if (!gesture) showTooltip(region, event); });
    listen(node, 'pointerleave', () => { label?.classList.remove('is-hot'); hideTooltip(); });
    listen(node, 'focus', () => {
      if (!node.matches(':focus-visible')) return;
      const points = parsePoints(region.points);
      const x = points.reduce((sum, point) => sum + point[0], 0) / points.length;
      const y = points.reduce((sum, point) => sum + point[1], 0) / points.length;
      panX = clampPan((.5 - x / viewWidth) * layout.width, layout.maxPanX);
      panY = clampPan((.5 - y / viewHeight) * layout.height, layout.maxPanY);
      applyPan();
      showTooltip(region);
    });
    listen(node, 'blur', hideTooltip);
    listen(node, 'click', (event) => { if (event.detail === 0) selectRegion(region, event); });
    listen(node, 'keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectRegion(region);
      }
    });
  });
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  return {
    regions: mapRegions,
    image,
    dispose() { observer.disconnect(); events.abort(); },
  };
}
