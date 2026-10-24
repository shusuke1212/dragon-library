import{packageStorageKey}from'./package-runtime.js';
export function libraryProgress(pkg,storage){
 let save={};try{save=JSON.parse(storage.getItem(packageStorageKey(pkg,'flight-records','v1'))||'{}')||{};}catch{}
 const known=new Set(pkg.records.map(r=>r.id)),collected=new Set(Array.isArray(save.collected)?save.collected.filter(id=>known.has(id)):[]);
 return{collected,count:collected.size,total:known.size,complete:known.size>0&&[...known].every(id=>collected.has(id))};
}
export function libraryRecordPlace(pkg,id){return pkg.fieldLayout.storyAreas.find(a=>a.recordIds?.includes(id))?.name||'現地で採集';}
export function libraryReading(pkg,progress,selection){
 if(selection==='history')return progress.complete&&pkg.library?.completedStory?{kind:'history',story:pkg.library.completedStory}:null;
 const record=pkg.records.find(r=>r.id===selection);
 return record&&progress.collected.has(record.id)?{kind:'record',record,place:libraryRecordPlace(pkg,record.id)}:null;
}
