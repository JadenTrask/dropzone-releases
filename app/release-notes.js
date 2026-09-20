export const RELEASE_NOTES={
 version:'2.3.4',
 title:'Less searching. More playing.',
 items:[
  {title:'A clearer Dropzone',body:'Full-color game artwork, compact weapon lists, and cleaner equipment sheets. Orange highlights show your selections while the tools keep the focus on your next decision.'},
  {title:'GTA 6 is on the horizon',body:'A new coming-soon entry in the library, with GTA VI artwork. Companion tools will follow later.'},
  {title:'A simpler THE FINALS',body:'Choose your class and build, see the full equipment list, and copy it. Team setups have their own tab.'},
  {title:'Siege picks with a purpose',body:'Choose a map and side to see the suggested team and each operator’s job. Ban options are tucked away until you need them.'},
  {title:'A cleaner sensitivity converter',body:'Use a game preset or measure cm/360. The custom coefficient option has been removed.'},
  {title:'Compare your guns',body:'Compare up to six weapons against the same target. See estimated TTK, damage, hits needed and time differences from your chosen baseline.'},
  {title:'Consistent page alignment',body:'Headers, controls and content share the same boundaries across workspaces. Tutorial arrows now point to the center of the highlighted edge.'},
  {title:'Meet the Siege operators',body:'A dedicated Operators tab with official portraits, animated cards, equipment, ratings and biographies. Browse all 78 operators and filter by side or specialty.'},
  {title:'More room for what matters',body:'Source checks sit beside page headers, with full details a click away. Enlarged ranked charts fit the window, and sidebar Coming soon badges stay inside the navigation.'},
  {title:'Know what changed',body:'Release highlights now live on App updates. A welcome popup appears once for each new version.'}
 ]
};
export const shouldShowRelease=(seen,version)=>seen!==version;
