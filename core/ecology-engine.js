const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const fract=value=>value-Math.floor(value);
const hash=(x,z,seed,salt=0)=>fract(Math.sin(x*127.1+z*311.7+(seed+salt)*74.7)*43758.5453123);

function rangeValue(range,t,fallback=[0,1]){
  const source=Array.isArray(range)&&range.length>1?range:fallback;
  return source[0]+(source[1]-source[0])*t;
}

export function createEcologyField({fieldM,seed,recipe={},terrainHeight,biomeAt,storyAreas=[]}){
  const creatures=[];
  for(const [speciesIndex,species] of (recipe.species||[]).entries()){
    const count=species.count||0,allowed=species.biomeIds||[];
    for(let i=0;i<count;i++){
      let x=0,z=0,biome=null,accepted=false;
      for(let attempt=0;attempt<9;attempt++){
        x=hash(i+attempt*37,speciesIndex,seed,17)*fieldM;
        z=hash(i+attempt*53,speciesIndex,seed,29)*fieldM;
        biome=biomeAt(x,z);
        if(!allowed.length||allowed.includes(biome.id)){accepted=true;break}
      }
      if(!accepted)continue;
      const ground=terrainHeight(x,z),altitude=rangeValue(species.altitudeM,hash(i,speciesIndex,seed,43),[50,120]);
      creatures.push({type:species.type,id:`${species.type}-${i}`,x,z,y:ground+altitude,ground,scale:rangeValue(species.scale,hash(i,speciesIndex,seed,59),[.8,1.2]),phase:hash(i,speciesIndex,seed,71)*Math.PI*2,heading:hash(i,speciesIndex,seed,83)*Math.PI*2,orbitM:rangeValue(species.orbitM,hash(i,speciesIndex,seed,97),[90,220]),speed:rangeValue(species.speed,hash(i,speciesIndex,seed,101),[.08,.18]),color:species.color||[85,105,104],glow:species.glowColor||null,maxDrawM:(species.maxDrawKm||7)*1000});
    }
  }
  const moss=[];
  for(const host of recipe.boneMoss?.hostAreaIds||[]){
    const area=storyAreas.find(item=>item.id===host);if(!area)continue;
    const count=recipe.boneMoss.countPerArea||34;
    for(let i=0;i<count;i++){
      const angle=hash(i,host.length,seed,131)*Math.PI*2,radius=rangeValue(recipe.boneMoss.radiusM,hash(i,host.length,seed,137),[120,620]),x=area.x+Math.cos(angle)*radius,z=area.z+Math.sin(angle)*radius,y=terrainHeight(x,z)+rangeValue(recipe.boneMoss.heightM,hash(i,host.length,seed,149),[3,180]);
      moss.push({x,z,y,phase:hash(i,host.length,seed,157)*Math.PI*2,size:rangeValue(recipe.boneMoss.sizeM,hash(i,host.length,seed,163),[2,7]),color:recipe.boneMoss.color||[105,222,219],maxDrawM:(recipe.boneMoss.maxDrawKm||6)*1000});
    }
  }
  return{creatures,moss};
}

export function creaturePose(creature,timeSeconds){
  const angle=creature.heading+timeSeconds*creature.speed,orbit=creature.orbitM,breath=Math.sin(timeSeconds*.72+creature.phase),x=creature.x+Math.cos(angle)*orbit,z=creature.z+Math.sin(angle)*orbit;
  if(creature.type==='cloud-jelly')return{x,z,y:creature.y+breath*14*creature.scale,angle,flap:breath};
  return{x,z,y:creature.y+Math.sin(timeSeconds*1.35+creature.phase)*7*creature.scale,angle,flap:Math.sin(timeSeconds*4.4+creature.phase)};
}

export function ecologyVisibility(distance,maxDrawM){return clamp(1-distance/maxDrawM,0,1)}
