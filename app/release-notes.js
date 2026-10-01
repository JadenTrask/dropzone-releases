export const RELEASE_NOTES={
 version:'2.5.2',
 title:'Your matches. Your coaching style.',
 items:[
  {title:'Rocket League AI Overview',body:'Choose Nice Coach or Brutal Coach and copy a prompt built from your retained match history. Paste it into your preferred AI; Dropzone does not call an AI service.'},
  {title:'Game artwork behind Videos',body:'Siege, League of Legends, RLCS and THE FINALS now have their supplied logo backgrounds, centered beneath the clear-glass panels as you scroll.'},
  {title:'Everything in its place',body:'AI Overview sits beside Tracker settings, with Videos at the end of the Rocket League navigation. Both coaching styles use the same recorded facts and label missing data.'},
 ]
};
export const shouldShowRelease=(seen,version)=>seen!==version;
