export const RELEASE_NOTES={
 version:'2.5.1',
 title:'Smoother navigation. Videos together.',
 items:[
  {title:'Less flicker, steadier controls',body:'Saving launch preferences keeps the page still. Rocket League tab transitions leave the glass navigation header stable.'},
  {title:'One Videos experience',body:'Consistent search, archives and playback controls across Call of Duty, Apex, Siege, League of Legends, THE FINALS and Rocket League. Show more keeps your scroll position.'},
  {title:'Official Rocket League Videos',body:'Find RL Esports uploads, broadcasts and playlists in the existing top navigation. New game-logo backgrounds are still pending; the clear-glass material is unchanged.'},
 ]
};
export const shouldShowRelease=(seen,version)=>seen!==version;
