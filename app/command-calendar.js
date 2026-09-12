const escape=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/[,;]/g,'\\$&');
const stamp=s=>new Date(s).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
export function exportCalendar(records){return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Dropzone//Session calendar//EN',...records.filter(r=>r.kind==='event'&&Number.isFinite(Date.parse(r.data.when))).flatMap(r=>['BEGIN:VEVENT','UID:'+r.id+'@dropzone.local','DTSTAMP:'+stamp(new Date()),'DTSTART:'+stamp(r.data.when),'SUMMARY:'+escape(r.title),'DESCRIPTION:'+escape(r.body),'URL:'+escape(r.source),'END:VEVENT']),'END:VCALENDAR'].join('\r\n');}
export function importCalendar(raw,game){
 if(typeof raw!=='string'||raw.length>2000000||!raw.includes('BEGIN:VCALENDAR'))throw Error('Choose an iCalendar file under 2 MB.');
 const unescape=s=>s.replace(/\\n/gi,'\n').replace(/\\([,;\\])/g,'$1');const items=[];const unfolded=raw.replace(/\r?\n[ \t]/g,'');
 for(const event of unfolded.split('BEGIN:VEVENT').slice(1)){const body=event.split('END:VEVENT')[0],fields={};for(const line of body.split(/\r?\n/)){const i=line.indexOf(':');if(i<0)continue;const key=line.slice(0,i);if(key.startsWith('DTSTART;TZID='))throw Error('Export this calendar using UTC times before importing. Named-timezone calendar imports are not supported.');fields[key.split(';')[0]]=unescape(line.slice(i+1));}
  if(fields.RRULE||fields.RECURRENCE_ID||body.includes('RECURRENCE-ID'))throw Error('Recurring events are not supported. Export individual event occurrences.');
  const v=fields.DTSTART,m=v?.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);if(!m||!fields.SUMMARY)continue;
  const when=m[7]?new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0))):new Date(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0));
  if(!Number.isFinite(when.getTime())||+(m[2])<1||+(m[2])>12||+(m[3])<1||+(m[3])>new Date(Date.UTC(+m[1],+m[2],0)).getUTCDate()||+(m[4]||0)>23||+(m[5]||0)>59||+(m[6]||0)>59)throw Error('Calendar contains an invalid date or time.');items.push({kind:'event',game,title:fields.SUMMARY,body:fields.DESCRIPTION||'',source:fields.URL||'',data:{when:when.toISOString(),availability:'Imported calendar. Times shown in this device’s timezone.'}});if(items.length>200)throw Error('Import up to 200 events at once.');
 }if(!items.length)throw Error('No supported events found.');return items;
}
