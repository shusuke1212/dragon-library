const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const fract=v=>v-Math.floor(v);
const hash=(x,z,seed)=>fract(Math.sin(x*127.1+z*311.7+seed*74.7)*43758.5453123);

export function createEnvironmentField({fieldM,seed,presentation,terrainHeight,terrainSample}){
  const clouds=[];
  for(const [layerIndex,layer] of (presentation.cloudLayers||[]).entries()){
    const count=layer.count||24;
    for(let i=0;i<count;i++){
      const x=hash(i,layerIndex,seed+11)*fieldM;
      const z=hash(i,layerIndex,seed+29)*fieldM;
      const size=(layer.sizeM?.[0]||420)+(layer.sizeM?.[1]-(layer.sizeM?.[0]||420))*hash(i,layerIndex,seed+47);
      clouds.push({x,z,y:layer.heightM+(hash(i,layerIndex,seed+61)-.5)*(layer.thicknessM||180),size,flatness:layer.flatness||.2,opacity:layer.opacity||.16,driftMps:layer.driftMps||2.5,phase:hash(i,layerIndex,seed+83)*Math.PI*2});
    }
  }
  const currents=[];
  const count=presentation.airflow?.count||90;
  for(let i=0;i<count;i++){
    const x=hash(i,3,seed+101)*fieldM,z=hash(i,7,seed+103)*fieldM,s=terrainSample?.(x,z)||{canyon:0,height:.5};
    const ground=terrainHeight(x,z),canyon=s.canyon>.52;
    currents.push({x,z,y:ground+(canyon?60:180)+hash(i,11,seed+109)*(canyon?720:1050),vertical:canyon,phase:hash(i,13,seed+127),length:90+hash(i,17,seed+131)*220});
  }
  return{clouds,currents};
}

export function environmentCell(ix,iz,cellM,seed){
  const a=hash(ix,iz,seed+211),b=hash(ix,iz,seed+223),c=hash(ix,iz,seed+227);
  return{x:(ix+.12+a*.76)*cellM,z:(iz+.12+b*.76)*cellM,heightM:5+c*24,bone:c>.82,angle:(a-b)*1.8};
}

export function atmosphereState(clearanceM,speedMps,presentation){
  const altitude=clamp(clearanceM/(presentation.altitudeColorHeightM||2200),0,1);
  const groundRush=clamp((speedMps-38)/58,0,1)*clamp(1-clearanceM/(presentation.surfaceCueHeightM||700),0,1);
  return{altitude,groundRush};
}

export function createBoundaryTerrain({fieldM,seed,presentation,terrainHeight}){
  const cfg=presentation.boundaryVisual;if(!cfg||cfg.style==='none')return[];
  const segments=Math.max(8,cfg.segmentsPerSide||28),count=segments*4,midOffset=(cfg.midOffsetKm||2.4)*1000,outerOffset=(cfg.outerOffsetKm||6.5)*1000,midRange=cfg.midHeightM||[1400,2300],outerRange=cfg.outerHeightM||[3300,4400];
  const squarePoint=(index,offset)=>{const side=Math.floor(index/segments),t=(index%segments)/segments;if(side===0)return{x:t*fieldM,z:-offset};if(side===1)return{x:fieldM+offset,z:t*fieldM};if(side===2)return{x:fieldM-t*fieldM,z:fieldM+offset};return{x:-offset,z:fieldM-t*fieldM}};
  const ring=(offset,range,ringIndex)=>Array.from({length:count},(_,i)=>{const p=squarePoint(i,offset);if(!range)return{x:p.x,y:terrainHeight(clamp(p.x,0,fieldM),clamp(p.z,0,fieldM))-18,z:p.z};const n=hash(i,ringIndex,seed+ringIndex*307),ridge=Math.pow(hash(i,ringIndex+19,seed+401),.72),height=range[0]+(range[1]-range[0])*(n*.56+ridge*.44);return{x:p.x,y:height,z:p.z}});
  const rings=[ring(0,null,0),ring(midOffset,midRange,1),ring(outerOffset,outerRange,2)],colors=cfg.colors||[[86,91,87],[68,76,79]],faces=[];
  for(let r=0;r<rings.length-1;r++)for(let i=0;i<count;i++){const next=(i+1)%count,c=colors[Math.min(r,colors.length-1)];faces.push({points:[rings[r][i],rings[r][next],rings[r+1][next],rings[r+1][i]],color:`rgb(${c[0]},${c[1]},${c[2]})`})}
  return faces;
}
