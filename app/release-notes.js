export const RELEASE_NOTES={
 version:'2.3.7',
 title:'A sharper impact correction.',
 items:[
  {title:'Precise impact placement',body:'Mark impact now uses a crosshair on the map instead of a hand cursor.'},
  {title:'Compact impact controls',body:'Mark impact sits beside the heading, coordinate entry stays tucked away, and Reset appears only when needed. Click Cancel to leave impact placement.'}
 ]
};
export const shouldShowRelease=(seen,version)=>seen!==version;
