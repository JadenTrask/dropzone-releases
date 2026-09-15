// Sorted daily timestamps. Ties choose the earlier observation.
export function nearestTimestamp(times,time){
 let lo=0,hi=times.length-1;if(hi<0)return -1;
 while(lo<hi){const mid=(lo+hi)>>1;if(times[mid]<time)lo=mid+1;else hi=mid;}
 return lo>0&&time-times[lo-1]<=times[lo]-time?lo-1:lo;
}
