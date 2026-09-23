import {e} from './shared.js';
import {ARMOR} from './wardogs-damage-engine.js';
import {compareDamage, supportedAmmo, MAX_COMPARE_WEAPONS} from './damage-comparison.js';

export function comparisonPanel() {
  return `<section class="gun-comparison" aria-labelledby="gun-comparison-title">
    <header class="gun-comparison-heading"><div><span class="hub-eyebrow">SIDE BY SIDE</span><h2 id="gun-comparison-title">Compare your guns</h2><p>Pick up to ${MAX_COMPARE_WEAPONS} weapons. Use the shared target setup to compare the same shot.</p></div><span id="gun-comparison-count"></span></header>
    <div class="gun-comparison-controls"><label for="gun-comparison-add">Add a weapon<select id="gun-comparison-add" aria-label="Add a weapon to comparison" data-searchable="true" data-search-label="Find a weapon" data-empty-message="No matching weapons."></select></label><button class="hub-button secondary" id="gun-comparison-current">Add current weapon</button></div>
    <p class="gun-comparison-conditions" id="gun-comparison-conditions"></p>
    <div class="gun-comparison-grid" id="gun-comparison-grid"></div>
    <p class="gun-comparison-note">Estimated TTK starts at the first hit. Assumes every hit lands on the selected body part with constant damage. Armor breakage, reloads and travel time are excluded. Shorter bars mean less firing time.</p>
    <p id="gun-comparison-status" class="sr-only" role="status"></p>
  </section>`;
}

const n = (value, places = 1) => Number.isFinite(value) ? value.toFixed(places) : '—';
export function comparisonCards(weapons, settings, baselineId) {
  if (!weapons.length) return '<p class="gun-comparison-empty">Add weapons above to compare damage and time to kill.</p>';
  const baselineName = weapons.find(w => w.id === baselineId)?.name;
  return compareDamage(weapons, settings, baselineId).map(({weapon: w, result: r, baseline, delta, fastest, bar}) => {
    const knownTime = r.valid && Number.isFinite(r.ttk);
    const difference = baseline ? 'Comparison baseline' : delta === null ? 'TTK difference unavailable' : Math.abs(delta) < 1e-9 ? `Same TTK as ${baselineName}` : `${n(Math.abs(delta) * 1000)} ms ${delta < 0 ? 'faster' : 'slower'} than ${baselineName}`;
    const unavailable = !r.valid ? r.message : r.unit === 'pellet' ? 'Pellet damage cannot establish shot TTK without a verified spread model.' : 'A verified fire rate is not available for this weapon.';
    return `<article class="gun-comparison-card ${baseline ? 'is-baseline' : ''}" data-comparison-id="${e(w.id)}">
      <header><div><h3>${e(w.name)}</h3><small>${e(w.caliber || 'Special weapon')}</small></div><button class="gun-remove" data-gun-remove="${e(w.id)}" aria-label="Remove ${e(w.name)} from comparison">×</button></header>
      <label class="gun-ammo">Ammunition<select data-gun-ammo="${e(w.id)}" aria-label="Ammunition for ${e(w.name)}" ${supportedAmmo(w).length===1?'disabled':''}>${supportedAmmo(w).map(ammo=>`<option value="${ammo}" ${ammo===(settings.compareAmmo?.[w.id]||'FMJ')?'selected':''}>${w.unit==='pellet'?'Standard buckshot':ammo}</option>`).join('')}</select></label>
      <div class="gun-ttk"><span>Estimated TTK</span><strong>${knownTime ? n(r.ttk, 3) + '<small> s</small>' : 'Unavailable'}</strong>${fastest ? '<span class="gun-fastest">Fastest in this comparison</span>' : ''}</div>
      <div class="gun-time-track" aria-hidden="true"><span style="width:${bar}%"></span></div>
      <p class="gun-delta" data-delta="${delta ?? ''}">${e(difference)}</p>
      <dl><div><dt>Damage / ${r.unit === 'pellet' ? 'pellet' : 'hit'}</dt><dd>${r.valid ? n(r.damage) + ' HP' : '—'}</dd></div><div><dt>${r.unit === 'pellet' ? 'Pellets' : 'Hits'} needed</dt><dd>${r.valid ? r.hits : '—'}</dd></div><div><dt>Fire rate</dt><dd>${Number.isFinite(w.rpm) && w.rpm > 0 ? w.rpm + ' RPM' : 'Unknown'}</dd></div></dl>
      ${!knownTime ? `<p class="gun-unavailable">${e(unavailable)}</p>` : ''}
      <button class="hub-button secondary gun-baseline" data-gun-baseline="${e(w.id)}" aria-pressed="${baseline}">${baseline ? 'Baseline weapon' : 'Use as baseline'}</button>
    </article>`;
  }).join('');
}

export function comparisonConditions(s) {
  return `${s.zone} · ${Number.isFinite(s.range) ? s.range + ' m' : 'Set range'} · ${Number.isFinite(s.health) ? s.health + ' HP' : 'Set health'} · Body: ${ARMOR[s.body].name} · Helmet: ${ARMOR[s.helmet].name} · Ammunition set per weapon`;
}
