export const RELEASE_NOTES={
 version:'2.4.3',
 title:'Rocket League scrolling restored.',
 items:[
  {title:'Scroll through the whole tracker',body:'Fixed a layout issue that prevented mouse-wheel scrolling through profiles, match history, settings and long scoreboards. The player sidebar also scrolls in shorter windows.'},
  {title:'Rocket League, redesigned',body:'A tighter workspace, cinematic scorelines, clearer match history and new player profiles. Your team comes first, and charts animate into view once.'},
  {title:'Build your Finals loadout',body:'Visual class selection, a new build browser and equipment layout, redesigned team setups, plus a fresh look for News and Videos. Source dates and patch-review status stay visible.'},
  {title:'Draw over your replay',body:'Open Coaching overlay or press Ctrl+Alt+C to draw arrows, shapes and notes, then save an annotated screenshot. Use Borderless or Windowed mode; customize your shortcuts in Tracker settings.'},
  {title:'Make your own match groups',body:'Create and name groups for any recorded matches. Filter history by group or playlist. Casual and ranked games count toward profile stats; private games stay in history.'},
  {title:'Frosted controls throughout Dropzone',body:'The new button, tab and dropdown style extends across the app, with consistent game navigation. The rail waits for you to leave and return before reopening, and the startup splash plays once.'},
  {title:'A better place for friends',body:'Separate friend requests, profile pictures and full player profiles, with a short notification when someone adds you.'}
 ]
};
export const shouldShowRelease=(seen,version)=>seen!==version;
