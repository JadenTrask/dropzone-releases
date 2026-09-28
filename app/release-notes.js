export const RELEASE_NOTES={
 version:'2.4.6',
 title:'A clearer view of your time.',
 items:[
  {title:'Time played, polished',body:'Personal and friend profiles now share a compact glass panel with grouped playtime, a period total, a subtle distribution bar and short entrance animations. Existing filters and tracking stay intact.'},
  {title:'Your friends',body:'Friend-list headings and search now consistently say Friends.'},
  {title:'Match and Freeplay time',body:'Track casual, ranked, private-match and Freeplay time separately in My profile. Time starts with this update; menus, pauses and replays are excluded.'},
  {title:'Playtime on friend profiles',body:'Playtime syncs with your account and appears on friend profiles when stats sharing is enabled. Ranked and Casual filters also filter match time. Repeated syncs do not double-count time.'},
  {title:'Ranked-only player stats',body:'Use All, Ranked or Casual in My profile and friend profiles. The selection updates every chart, total, personal record and match list, together with your chosen time period. Private games remain excluded.'},
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
