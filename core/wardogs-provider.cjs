'use strict';
const crypto = require('node:crypto');
const {SourceCache, requestText} = require('./source-cache.cjs');
const REPOSITORY = 'https://raw.githubusercontent.com/apollyon-sys/wardogs-calculator/main/';
const SOURCE = 'https://wardogs-artillery.com/';
const MAP_IDS = ['bakurani', 'ozeti'];
const geometry = m => ({bounds:['minX','maxX','minY','maxY'].map(k=>m.bounds?.[k]),tileBounds:['minX','maxX','minY','maxY'].map(k=>m.tileBounds?.[k]),coordinateMetersPerUnit:m.coordinateMetersPerUnit});
function normalizeWeapon(w) {
  if (!['mortar','spg'].includes(w?.id)) throw new Error('The source added an unsupported weapon. An app update is required.');
  const minRange = w.minRangeKm * 1000, maxRange = w.maxRangeKm * 1000;
  if (![minRange,maxRange,w.minElevationMil,w.maxElevationMil].every(Number.isFinite) || minRange < 0 || maxRange <= minRange || maxRange > 50000 || w.minElevationMil < 0 || w.maxElevationMil > 10000 || w.minElevationMil >= w.maxElevationMil) throw new Error('Invalid WARDOGS weapon limits.');
  const ballistics = {};
  for (const branch of w.id === 'mortar' ? ['single'] : ['low','high']) {
    const rows = w.ballistics?.[branch];
    if (!Array.isArray(rows) || rows.length < 2 || rows.length > 2000 || rows.some(r => !Array.isArray(r) || r.length !== 2 || !r.every(Number.isFinite) || r[0] < 0 || r[0] > 100000 || r[1] < 0 || r[1] > 10000)) throw new Error('Incomplete WARDOGS firing table.');
    ballistics[branch] = rows.map(r => [...r]);
  }
  return {id:w.id,name:w.id==='mortar'?'Mortar':'SPH-2',minRange,maxRange,minElevationMil:w.minElevationMil,maxElevationMil:w.maxElevationMil,ballistics};
}
function normalizeWardogs(input, maps) {
  const raw = typeof input === 'string' ? JSON.parse(input) : input;
  if (!Array.isArray(raw.weapons?.weapons) || raw.weapons.weapons.length !== 2) throw new Error('The WARDOGS weapon format changed.');
  const weapons = raw.weapons.weapons.map(normalizeWeapon);
  if (new Set(weapons.map(w => w.id)).size !== 2) throw new Error('Duplicate WARDOGS weapon.');
  const mapsChanged = MAP_IDS.filter(id => {
    const incoming = raw.maps?.find(m => m.id === id), bundled = maps.maps.find(m => m.id === id);
    if (!incoming || !bundled) throw new Error('Missing map calibration.');
    return JSON.stringify(geometry(incoming)) !== JSON.stringify(geometry(bundled));
  });
  return {source:'WARDOGS Artillery Calculator',sourceUrl:SOURCE,sourceUpdatedAt:null,
    weapons,mapsChanged,fingerprint:crypto.createHash('sha256').update(JSON.stringify(weapons)).digest('hex'),
    mapRevision:maps.revision,mapReviewedAt:maps.reviewedAt,releaseValidated:false};
}
class WardogsProvider {
  constructor(options) {
    this.maps = require('../app/data/wardogs/maps.json');
    const request = options.requestFn || requestText;
    this.feed = new SourceCache({...options,id:'wardogs-data',url:SOURCE,
      requestFn:async () => {
        const [weapons,...maps] = await Promise.all(['data/weapons.json',...MAP_IDS.map(id=>'maps/'+id+'.json')].map(async file=>JSON.parse(await request(REPOSITORY+file))));
        return JSON.stringify({weapons,maps});
      },normalize:raw=>normalizeWardogs(raw,this.maps),
      validate:d=>Array.isArray(d.weapons)&&d.weapons.length===2&&d.weapons.every(w=>['mortar','spg'].includes(w.id)&&Number.isFinite(w.maxRange)&&w.ballistics)&&Array.isArray(d.mapsChanged)&&/^[a-f0-9]{64}$/.test(d.fingerprint||'')});
  }
  async get(options={}) {
    if (!options || typeof options!=='object' || Array.isArray(options)) throw new Error('Invalid calculator request.');
    const data = await this.feed.get(options.refresh===true || options.refresh==='true');
    return {...data,maps:this.maps};
  }
}
module.exports = {WardogsProvider,normalizeWardogs,normalizeWeapon};
