export function tourPlacement(rect, viewport, card) {
  const pad = 16, gap = 24, w = Math.min(card.width, viewport.width - pad * 2), h = card.height;
  const right = rect.right + gap, left = rect.left - gap - w;
  let x, y;
  if (right + w <= viewport.width - pad) { x = right; y = rect.top; }
  else if (left >= pad) { x = left; y = rect.top; }
  else { x = (viewport.width - w) / 2; y = rect.bottom + gap + h <= viewport.height - pad ? rect.bottom + gap : rect.top - gap - h; }
  return { x: Math.max(pad, Math.min(x, viewport.width - w - pad)), y: Math.max(pad, Math.min(y, viewport.height - h - pad)) };
}

// Always target the midpoint of an edge, even when the card is taller than
// the control or has been shifted to fit a viewport corner.
export function tourConnection(target, card) {
  const cx = (card.left + card.right) / 2, cy = (card.top + card.bottom) / 2;
  const mx = (target.left + target.right) / 2, my = (target.top + target.bottom) / 2;
  const edges = [
    { side: 'right', x: target.right, y: my, outside: card.left >= target.right },
    { side: 'left', x: target.left, y: my, outside: card.right <= target.left },
    { side: 'bottom', x: mx, y: target.bottom, outside: card.top >= target.bottom },
    { side: 'top', x: mx, y: target.top, outside: card.bottom <= target.top }
  ];
  const separated = edges.filter(edge => edge.outside);
  const end = (separated.length ? separated : edges).sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0];
  // Intersect the ray with the card boundary; this also handles a large map
  // highlight containing the card when there is no room outside the target.
  const dx = end.x - cx, dy = end.y - cy;
  const scale = Math.min(dx ? (card.right - card.left) / 2 / Math.abs(dx) : Infinity, dy ? (card.bottom - card.top) / 2 / Math.abs(dy) : Infinity);
  const start = Number.isFinite(scale) ? { x: cx + dx * scale, y: cy + dy * scale } : { x: cx, y: card.top };
  return { start, end: { x: end.x, y: end.y }, side: end.side };
}
