export const RELEASE_NOTES={
 version:'2.3.5',
 title:'A sharper WARDOGS workspace.',
 items:[
  {title:'A cleaner calculator',body:'More room for the map, generated gun and target markers, direct gun dragging, colored range fills and an orange lock toggle. Ruler distances are shown on the line.'},
  {title:'Gunner sight, within reach',body:'Open a compact orange sight from the right edge, slide it closed, or expand it for a larger readout.'},
  {title:'Refreshed servers and gold market',body:'Cleaner tables and charts, brighter text and fewer boxes. Server Status reuses the latest session snapshot while checking for fresh data.'},
  {title:'Live player totals and smoother navigation',body:'A player total beside News covers the provider’s listed servers. Orange hover highlights, animated tab underlines and page crossfades add motion, with reduced-motion support.'},
  {title:'Adjust from impact',body:'Mark where a WARDOGS shot landed to get a corrected distance and bearing. Keep your target fixed and refine the correction after each shot.'},
  {title:'Damage Lab, two focused views',body:'Shot setup keeps the body diagram and single-weapon results together. Compare weapons has its own tab for side-by-side TTK, damage and armor comparisons.'},
  {title:'Ammo for each weapon',body:'Choose supported ammunition separately on each comparison card. TTK differences and armor comparisons use each weapon’s selected round.'},
  {title:'One shared target',body:'Adjust hit location, armor, range and health directly in Compare. Your target settings, selected weapons and baseline stay with you when switching tabs.'}
 ]
};
export const shouldShowRelease=(seen,version)=>seen!==version;
