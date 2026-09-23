export const RELEASE_NOTES={
 version:'2.3.6',
 title:'A calibrated SPH-2 sight.',
 items:[
  {title:'More room for your tools',body:'Removed the duplicate Library header and the Tools, Pin and Quick panel buttons. Text size now lives in Settings under Accessibility.'},
  {title:'Optic-matched range marks',body:'SPH-2 uses 139 range and mil pairs transcribed from an in-game recording, correcting 59 community-table labels across both arcs.'},
  {title:'Aim between the marks',body:'The gunner sight positions the centre between 10-mil stadia. Compass labels stay at 0, 15, 30 degrees and onward.'},
  {title:'Mils in your firing solution',body:'See SPH-2 elevation alongside distance and bearing, with low and high arc selection.'},
  {title:'Cleaner impact correction',body:'A clear mark-impact action, compact range and direction adjustments, and a reset control that appears when needed. Removed redundant solution text.'}
 ]
};
export const shouldShowRelease=(seen,version)=>seen!==version;
