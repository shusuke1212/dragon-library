function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function smooth(t){return t*t*(3-2*t)}
function hash(x,y,seed){let n=(x*374761393+y*668265263+seed*69069)|0;n=(n^(n>>>13))*1274126177;return ((n^(n>>>16))>>>0)/4294967295}
function valueNoise(x,y,seed){const x0=Math.floor(x),y0=Math.floor(y),tx=smooth(x-x0),ty=smooth(y-y0),a=hash(x0,y0,seed),b=hash(x0+1,y0,seed),c=hash(x0,y0+1,seed),d=hash(x0+1,y0+1,seed);return (a+(b-a)*tx)+((c+(d-c)*tx)-(a+(b-a)*tx))*ty}
function terrace(value,levels,sharpness){const scaled=clamp(value,0,.999999)*levels,whole=Math.floor(scaled),local=scaled-whole,edge=smooth(clamp((local-.5)*sharpness+.5,0,1));return(whole+edge)/levels}

export function sampleTerrain(nx,ny,recipe,seed){
  let height=0,amp=.58,freq=recipe.noiseScale||2.1;
  for(let o=0;o<(recipe.octaves||5);o++){height+=valueNoise(nx*freq,ny*freq,seed+o*97)*amp;amp*=.5;freq*=2.05}
  const canyonRecipe=recipe.canyon||{},canyonAxis=.49+Math.sin(ny*(canyonRecipe.bendFrequency||8)+seed*.01)*(canyonRecipe.bendAmount||.11)+Math.sin(ny*19)*.025,width=canyonRecipe.width||.09,cross=(nx-canyonAxis)/width,mainCanyon=Math.exp(-cross*cross);
  const ridgeRecipe=recipe.ridge||{},ridgeAngle=(ridgeRecipe.headingDeg||38)*Math.PI/180,ridgeAlong=nx*Math.sin(ridgeAngle)+ny*Math.cos(ridgeAngle),ridgeAcross=nx*Math.cos(ridgeAngle)-ny*Math.sin(ridgeAngle),ridgeWarp=(valueNoise(ridgeAlong*1.7,ridgeAcross*1.45,seed+911)-.5)*(ridgeRecipe.warp||.5),ridgeNoise=valueNoise(ridgeAlong*(ridgeRecipe.alongScale||2.25),ridgeAcross*(ridgeRecipe.crossScale||6.4)+ridgeWarp,seed+929),ridgeFold=Math.pow(1-Math.abs(ridgeNoise*2-1),ridgeRecipe.sharpness||2.7),ridgeDetail=Math.pow(1-Math.abs(valueNoise(ridgeAlong*5.2,ridgeAcross*13,seed+947)*2-1),5),detailWeight=ridgeRecipe.detailWeight??.05,highland=smooth(clamp((height-(ridgeRecipe.minimumHeight||.56))/(ridgeRecipe.heightBlend||.22),0,1))*(1-mainCanyon*.94),ridgeStrength=clamp(ridgeFold*(1-detailWeight)+ridgeDetail*detailWeight,0,1)*highland;height=clamp(height+ridgeStrength*(ridgeRecipe.relief||.16),0,1);
  const depthVariation=.68+.32*valueNoise(ny*(canyonRecipe.depthVariationFrequency||4.2),seed*.0001,seed+613),terraceProfile=terrace(mainCanyon,canyonRecipe.terraceLevels||5,canyonRecipe.terraceSharpness||5.4),innerChannel=Math.exp(-Math.pow(cross/(canyonRecipe.innerWidth||.26),2));
  const tributaryPhase=ny*(canyonRecipe.tributaryFrequency||11)+valueNoise(nx*5.4,ny*2.6,seed+701)*1.85+Math.sin(nx*31+seed*.003)*.08,tributaryWave=.5+.5*Math.cos(tributaryPhase*Math.PI*2),flank=Math.pow(mainCanyon,.3)*(1.0-mainCanyon*.67),tributary=Math.pow(tributaryWave,canyonRecipe.tributarySharpness||8)*flank;
  const rillPhase=ny*(canyonRecipe.rillFrequency||62)+valueNoise(nx*12,ny*5.5,seed+809)*2.7+Math.sin(nx*83)*.055,rillWave=.5+.5*Math.cos(rillPhase*Math.PI*2),rills=Math.pow(rillWave,canyonRecipe.rillSharpness||10)*Math.pow(mainCanyon,.22)*(1.0-mainCanyon*.5);
  const canyon=clamp(Math.max(mainCanyon,tributary*.76,rills*.42),0,1);
  const roughness=Math.abs(valueNoise(nx*7,ny*7,seed+501)-.5)*.24;
  const mainCut=terraceProfile*(canyonRecipe.depth||.42)*depthVariation,innerCut=innerChannel*(canyonRecipe.innerDepth||.065)*depthVariation,tributaryCut=tributary*(canyonRecipe.tributaryDepth||.1),rillCut=rills*(canyonRecipe.rillDepth||.026);
  height=clamp(height-roughness-mainCut-innerCut-tributaryCut-rillCut,0,1);
  if(Number.isFinite(recipe.seaLevel))height=Math.max(height,recipe.seaLevel);
  for(const site of recipe.siteTerraces||[]){const d=Math.hypot(nx-site.nx,ny-site.nz),mix=1-smooth(clamp((d-site.innerRadius)/(site.outerRadius-site.innerRadius),0,1));height=height*(1-mix)+site.height*mix;}
  const tag=canyon>.62?'canyon':height<.27?'basin':height>.68?'ridge':height>.42&&canyon<.5?'plateau':'shelf';
  return{height,canyon,roughness,terrace:terraceProfile,tributary,rills,ridge:ridgeStrength,tag};
}

export function terrainColor(sample,palette){
  const stops=palette||[
    {max:.18,color:[57,83,91]},{max:.28,color:[74,99,102]},{max:.43,color:[89,100,91]},
    {max:.6,color:[102,100,85]},{max:.76,color:[94,91,82]},{max:1,color:[119,116,105]}
  ];
  const stop=stops.find(s=>sample.height<=s.max)||stops.at(-1),shade=.78+sample.height*.4;
  return stop.color.map(v=>Math.round(v*shade));
}

export function renderTerrainBitmap(targetCanvas,recipe,seed,size=220){
  targetCanvas.width=size;targetCanvas.height=size;const ctx=targetCanvas.getContext('2d'),img=ctx.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const sample=sampleTerrain(x/(size-1),y/(size-1),recipe,seed),c=terrainColor(sample,recipe.palette),i=(y*size+x)*4;img.data[i]=c[0];img.data[i+1]=c[1];img.data[i+2]=c[2];img.data[i+3]=255}
  ctx.putImageData(img,0,0);return targetCanvas;
}
