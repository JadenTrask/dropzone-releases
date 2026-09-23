import {solveDamage} from './wardogs-damage-engine.js';

export const MAX_COMPARE_WEAPONS = 6;
export function comparisonIds(ids, weapons) {
  const known = new Set(weapons.map(w => w.id));
  return [...new Set(Array.isArray(ids) ? ids : [])].filter(id => known.has(id)).slice(0, MAX_COMPARE_WEAPONS);
}

export const supportedAmmo = weapon => weapon?.caliber === '5.56x45mm' ? ['FMJ','AP','HP'] : ['FMJ'];
export function comparisonAmmo(weapons, saved, fallback='FMJ') {
  return Object.fromEntries(weapons.map(w=>{const value=saved?.[w.id]??fallback;return [w.id,supportedAmmo(w).includes(value)?value:'FMJ'];}));
}
export function compareDamage(weapons, settings, baselineId) {
  const rows = weapons.map(weapon => ({weapon, result: solveDamage(weapon, {...settings,ammo:settings.compareAmmo?.[weapon.id]??settings.ammo??'FMJ'})}));
  const time = row => row?.result.valid && Number.isFinite(row.result.ttk) ? row.result.ttk : null;
  const baseline = rows.find(row => row.weapon.id === baselineId);
  const baselineTime = time(baseline);
  const times = rows.map(time).filter(t => t !== null);
  const fastest = times.length > 1 ? Math.min(...times) : null;
  const longest = Math.max(0, ...times);
  return rows.map(row => {
    const ttk = time(row);
    return {...row, baseline: row.weapon.id === baselineId, delta: ttk !== null && baselineTime !== null ? ttk - baselineTime : null,
      fastest: fastest !== null && ttk !== null && Math.abs(ttk - fastest) < 1e-9,
      bar: ttk === null || !longest ? 0 : ttk / longest * 100};
  });
}
