// A clue belongs to the thing actually examined, not to completion of an area.
export function pointClue(point, records, area, links, visited){
  if(point?.clue)return point.clue;
  const clues=records.map(r=>r.fieldClue).filter(Boolean);
  if(clues.length)return clues.join('\n');
  const next=links.find(h=>h.from===area.id&&!visited.has(h.to));
  return next?`手がかり：${next.clue}`:'';
}
export function journalEntries(records,collected,sites,observed){
  const entries=records.filter(r=>collected.has(r.id)).map(r=>({id:r.id,type:r.type,title:r.title,text:r.snippet,clue:r.fieldClue||''}));
  for(const site of sites.values())for(const p of site.points){
    if(p.observation&&observed.has(p.id))entries.push({id:p.id,type:p.observation.type,title:p.label,text:p.observation.text,clue:p.clue||''});
  }
  return entries;
}
export function escapeStoryText(text){return String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

// Only evidence actually read can suggest a destination. Visiting a region is not completion.
export function explorationLeads(pkg,collected,observed){
  const readOrder=[...collected,...observed];
  return(pkg.explorationLeads||[]).filter(lead=>{
    const known=(lead.sourceRecordIds||[]).some(id=>collected.has(id))||(lead.sourcePointIds||[]).some(id=>observed.has(id));
    const targets=(lead.targetRecordIds||[]).length+(lead.targetPointIds||[]).length;
    const resolved=targets>0&&(lead.targetRecordIds||[]).every(id=>collected.has(id))&&(lead.targetPointIds||[]).every(id=>observed.has(id));
    return known&&!resolved;
  }).map(lead=>({...lead,order:Math.max(-1,...[...(lead.sourceRecordIds||[]),...(lead.sourcePointIds||[])].map(id=>readOrder.indexOf(id)))})).sort((a,b)=>b.order-a.order);
}
