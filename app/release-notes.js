export const RELEASE_NOTES={
 version:'2.5.4',
 title:'Modern Warfare 4. Smoother switching.',
 items:[
  {title:'Modern Warfare 4 loadouts',body:'MW4 leads the Call of Duty collection with its own multiplayer attachment feed. Black Ops 7, Warzone and existing saved builds stay available.'},
  {title:'Simple Rocket League fades',body:'Tracker tabs use a short fade without zooming. Screen changes no longer capture and resize the glass workspace.'},
  {title:'Smoother weapon browsing',body:'Selecting a gun fades its loadout preview without resetting the list. Weapon cards gently shrink as they leave the scroll area, and the search field no longer shows duplicate outlines.'},
 ]
};
export const shouldShowRelease=(seen,version)=>seen!==version;
