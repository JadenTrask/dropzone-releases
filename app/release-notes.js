export const RELEASE_NOTES={
 version:'2.5.3',
 title:'Shared news. Clearer game tools.',
 items:[
  {title:'Rocket League News',body:'Read official developer announcements and patch previews inside the tracker. News sits before Tracker settings, with AI Overview and Videos still at the end.'},
  {title:'One News experience',body:'THE FINALS now uses the same readable News layout as the other games, including source details, refresh states and saved posts when a refresh fails.'},
  {title:'Clearer WARDOGS tools',body:'The price-history chart now uses consistent glass. Server rows have readable mode and rules labels, with the original identifier and server code available under Details.'},
 ]
};
export const shouldShowRelease=(seen,version)=>seen!==version;
