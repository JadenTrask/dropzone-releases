export const RELEASE_NOTES={
 version:'2.4.1',
 title:'Practice stays out of match history.',
 items:[
  {title:'Private-session practice filtering',body:'Some practice sessions report themselves as private matches. Dropzone now waits for players on both teams before saving those sessions.'},
  {title:'Cleaned-up history',body:'Existing one-sided private sessions and empty match entries are hidden from history and stats. Real private matches remain, even when opponents leave.'}
 ]
};
export const shouldShowRelease=(seen,version)=>seen!==version;
