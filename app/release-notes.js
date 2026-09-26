export const RELEASE_NOTES={
 version:'2.4.0',
 title:'Rocket League joins Dropzone.',
 items:[
  {title:'Live tracking and match history',body:'Connect Rocket League, follow your scoreboard, and review your last match. History now shows game modes and clear personal stats, with Free Play excluded.'},
  {title:'Your profile and friends',body:'Create a free account for a rolling year of cloud history, a profile picture, performance charts, and shared stats with accepted friends. Local mode keeps 30 days on this PC.'},
  {title:'A cleaner tracker',body:'Hide the profile sidebar when you need more room. Tabs use the same transitions as the rest of Dropzone, and single-day charts display correctly.'}
 ]
};
export const shouldShowRelease=(seen,version)=>seen!==version;
