import{sampleTerrain}from'./terrain-engine.js';

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const between=(v,range)=>!range||(v>=range[0]&&v<=range[1]);
export const distanceKm=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

export function evaluatePlacement(area,positionKm,layout,regionRecipe,options={}){
  const size=layout.fieldSizeKm,nx=positionKm[0]/size,ny=positionKm[1]/size,sample=sampleTerrain(nx,ny,regionRecipe,layout.terrainSeed),req=area.placementRequirements||{};
  const checks=[];
  if(req.terrainTagsAny?.length)checks.push({ok:req.terrainTagsAny.includes(sample.tag),label:`地形：${sample.tag}`,expected:req.terrainTagsAny.join('・')});
  if(req.heightRange)checks.push({ok:between(sample.height,req.heightRange),label:`標高指数：${sample.height.toFixed(2)}`,expected:`${req.heightRange[0]}〜${req.heightRange[1]}`});
  if(req.canyonRange)checks.push({ok:between(sample.canyon,req.canyonRange),label:`峡谷指数：${sample.canyon.toFixed(2)}`,expected:`${req.canyonRange[0]}〜${req.canyonRange[1]}`});
  if(req.edgeDistanceKmRange){const edge=Math.min(positionKm[0],positionKm[1],size-positionKm[0],size-positionKm[1]);checks.push({ok:between(edge,req.edgeDistanceKmRange),label:`外縁まで：${edge.toFixed(1)}km`,expected:`${req.edgeDistanceKmRange[0]}〜${req.edgeDistanceKmRange[1]}km`})}
  if(req.nearArea){const other=layout.storyAreas.find(a=>a.id===req.nearArea.id);if(other){const d=distanceKm(positionKm,other.positionKm);checks.push({ok:between(d,[req.nearArea.minKm||0,req.nearArea.maxKm??Infinity]),label:`${other.name}まで：${d.toFixed(1)}km`,expected:`${req.nearArea.minKm||0}〜${req.nearArea.maxKm}km`})}}
  const passed=checks.filter(c=>c.ok).length,score=checks.length?passed/checks.length:1;
  return{score,ok:score===1,checks,sample};
}

export function candidateCells(area,layout,recipe,grid=52){
  const cells=[];for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){const pos=[(x+.5)/grid*layout.fieldSizeKm,(y+.5)/grid*layout.fieldSizeKm],result=evaluatePlacement(area,pos,layout,recipe,{candidate:true});if(result.score>=.66)cells.push({x,y,score:result.score})}return{grid,cells};
}

export function summarizePlacements(layout,recipe){
  return layout.storyAreas.map(area=>({area,result:evaluatePlacement(area,area.positionKm,layout,recipe)}));
}
