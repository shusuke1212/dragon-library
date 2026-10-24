const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const fract=value=>value-Math.floor(value);
export const biomeScatter=(x,z,seed,salt=0)=>fract(Math.sin(x*127.1+z*311.7+(seed+salt)*74.7)*43758.5453123);
const smooth=value=>value*value*(3-2*value);
function valueNoise(x,z,seed,salt=0){
  const ix=Math.floor(x),iz=Math.floor(z),fx=smooth(x-ix),fz=smooth(z-iz),a=biomeScatter(ix,iz,seed,salt),b=biomeScatter(ix+1,iz,seed,salt),c=biomeScatter(ix,iz+1,seed,salt),d=biomeScatter(ix+1,iz+1,seed,salt),top=a+(b-a)*fx,bottom=c+(d-c)*fx;
  return top+(bottom-top)*fz;
}
export function biomeToneAt(nx,nz,seed){
  const broad=valueNoise(nx*7.5,nz*7.5,seed,211),fine=valueNoise(nx*25,nz*25,seed,227);
  return clamp((broad*.72+fine*.28)*2-1,-1,1);
}

function inRange(value,range){return!range||(value>=range[0]&&value<=range[1])}
export function resolveBiome(sample,recipe={}){
  const biomes=recipe.biomes||[];
  for(const biome of biomes){const match=biome.match||{},tags=match.terrainTagsAny;if(tags&&!tags.includes(sample.tag))continue;if(!inRange(sample.height,match.heightRange))continue;if(!inRange(sample.canyon,match.canyonRange))continue;if(!inRange(sample.roughness,match.roughnessRange))continue;return biome}
  return recipe.defaultBiome||{id:'open-ground',name:'風化原',groundColor:[92,96,87],accentColor:[126,119,96],dressing:{type:'none',density:0}};
}

export function biomeTerrainColor(sample,biome,baseColor){
  const tint=biome.groundColor||baseColor,mix=clamp(biome.colorMix??.58,0,1),heightLight=.86+sample.height*.24,canyonShade=1-sample.canyon*.09;
  return baseColor.map((channel,index)=>Math.round((channel*(1-mix)+tint[index]*mix)*heightLight*canyonShade));
}

export function blendBiomePalette(primary,neighbors=[]){
  const related=neighbors.filter(Boolean),primaryColor=primary.groundColor||[100,100,100],weight=.52,share=related.length?(1-weight)/related.length:0;
  const groundColor=primaryColor.map((channel,index)=>Math.round(channel*weight+related.reduce((sum,biome)=>sum+(biome.groundColor||primaryColor)[index]*share,0)));
  return{...primary,groundColor,colorMix:Math.min(primary.colorMix??.58,.66)};
}

export function biomeSurfaceColor(sample,biome,baseColor,lighting=.72,variation=0){
  const base=biomeTerrainColor(sample,biome,baseColor),material=biome.material||{},light=clamp(lighting,0,1),roughness=clamp(material.roughness??.7,0,1),sun=material.sunTint||[205,181,132],shadow=material.shadowTint||[52,72,77],tint=shadow.map((channel,index)=>channel+(sun[index]-channel)*light),tintMix=.12+roughness*.11,exposure=.68+light*.46,grain=1+variation*(material.variation??.1);
  return base.map((channel,index)=>Math.round(clamp((channel*(1-tintMix)+tint[index]*tintMix)*exposure*grain,0,255)));
}

export function biomeDressingAt(ix,iz,seed,biome){
  const dressing=biome.dressing||{},roll=biomeScatter(ix,iz,seed,17),density=dressing.density||0;
  if(roll>=density)return null;
  return{type:dressing.type||'none',scale:.72+biomeScatter(ix,iz,seed,29)*.78,angle:(biomeScatter(ix,iz,seed,37)-.5)*Math.PI*2,color:biome.accentColor||biome.groundColor||[120,116,100]};
}

export function biomeMacroAt(ix,iz,seed,biome){
  const macro=biome.macro||{},density=macro.density||0,roll=biomeScatter(ix,iz,seed,83);if(roll>=density)return null;
  const size=macro.sizeM||[260,620],height=macro.heightM||[70,180],angle=(macro.headingDeg||0)*Math.PI/180+(biomeScatter(ix,iz,seed,97)-.5)*(macro.angleJitterDeg||18)*Math.PI/180;
  return{type:macro.type||'none',sizeM:size[0]+(size[1]-size[0])*biomeScatter(ix,iz,seed,101),heightM:height[0]+(height[1]-height[0])*biomeScatter(ix,iz,seed,109),angle,color:macro.color||biome.accentColor||biome.groundColor||[120,116,100]};
}

export function biomeAirflowAt(biome,x,z,timeSeconds,seed=0){
  const flight=biome.flight||{},phase=seed*.013+x*.0011+z*.00073,wave=Math.sin(phase+timeSeconds*(flight.gustRate||.55)),crossWave=Math.sin(phase*1.71-timeSeconds*(flight.gustRate||.55)*.73),turbulence=flight.turbulence||0;
  const verticalMps=(flight.verticalMps||0)+wave*turbulence*2.2,lateralMps=(flight.lateralMps||0)+crossWave*turbulence*2.6,forwardMps=(flight.forwardMps||0)+wave*turbulence*.65;
  return{name:flight.name||'穏やかな風',kind:flight.kind||'steady',verticalMps,lateralMps,forwardMps,turbulence,strength:clamp((Math.abs(verticalMps)+Math.abs(lateralMps)*.7+Math.abs(forwardMps)*.35)/8,0,1)};
}
