// Browsing groups only; these labels do not change any ballistic calculation.
const groups={
 'Assault rifle':['m4','fal','bushmaster-m17s','kh-2002','t-21','ak74','a-91','galil'],
 'SMG':['mp5','amp-9','pp-19-vityaz','super-45'],
 'Marksman':['sks','svd','bmr-308','scout-rifle-td'],
 'Sniper':['mosin-nagant','sv98','mk22','amr-50'],
 'Pistol':['ggx-17','judge','m1911','ggx-18','deagle'],
 'LMG':['m249-saw','pkm'],
 'Shotgun':['mp43','m500'],
 'Bow':['compound-bow'],
 'Specialist':['rpg-7','9k333-verba','maaws','mgl-40']
};
export const WEAPON_TYPES=['All',...Object.keys(groups)];
export const weaponType=id=>Object.keys(groups).find(type=>groups[type].includes(id))||'Other';
