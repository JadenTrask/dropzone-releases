export const RELEASE_NOTES={
 version:'2.4.9',
 title:'A cleaner workspace. Faster navigation.',
 items:[
  {title:'Gray Zone Warfare is under construction',body:'The tactical map and planning tools are temporarily unavailable while they are reworked. Saved map progress stays on your device.'},
  {title:'Glass, spacing and controls refined',body:'Cleaner Finals equipment, CoD weapon details, Wardogs controls and game-library cards. Apex profiles have a calmer backdrop and readable recent-player actions.'},
  {title:'Get to your next game sooner',body:'Navigation shows the destination without waiting for source refreshes. Small local workspace code warms during idle time, and the Sons location list renders in smaller batches.'},
  {title:'Optional Windows startup',body:'Installed Windows copies can launch at sign-in from Settings. This is off by default; browser previews and portable copies do not register startup entries.'},
 ]
};
export const shouldShowRelease=(seen,version)=>seen!==version;
