export function analyzeHintGraph(storyAreas,hintLinks,entryId){
  const ids=new Set(storyAreas.map(a=>a.id)),inbound=new Map(storyAreas.map(a=>[a.id,[]])),outbound=new Map(storyAreas.map(a=>[a.id,[]]));
  for(const link of hintLinks){if(ids.has(link.to))inbound.get(link.to).push(link);if(ids.has(link.from))outbound.get(link.from).push(link)}
  const reached=new Set([entryId]),queue=[entryId];while(queue.length){const id=queue.shift();for(const link of outbound.get(id)||[])if(!reached.has(link.to)){reached.add(link.to);queue.push(link.to)}}
  return{
    reachable:[...reached],unreachable:[...ids].filter(id=>!reached.has(id)),
    coverage:storyAreas.map(a=>({id:a.id,name:a.name,inbound:inbound.get(a.id)?.length||0,outbound:outbound.get(a.id)?.length||0})),
    healthy:reached.size===ids.size&&storyAreas.filter(a=>a.id!==entryId).every(a=>(inbound.get(a.id)?.length||0)>=1)
  };
}
