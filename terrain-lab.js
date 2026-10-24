import{loadRegionPackage}from'./core/package-runtime.js';
import{sampleTerrain}from'./core/terrain-engine.js';

const canvas=document.querySelector('#terrain'),unsupported=document.querySelector('#unsupported'),gl=canvas.getContext('webgl2',{antialias:true,alpha:true,powerPreference:'high-performance'});
if(!gl){unsupported.hidden=false;throw new Error('WebGL 2 is not available')}
const pkg=await loadRegionPackage('./packages/white-bone.json'),recipe=pkg.regionRecipe,layout=pkg.fieldLayout,lab=pkg.terrainRenderPrototype||{},fieldM=layout.fieldSizeKm*1000,segments=lab.meshSegments||96,focus={x:(lab.focusKm?.[0]||14)*1000,z:(lab.focusKm?.[1]||8.75)*1000};
let sizeM=(lab.defaultSizeKm||2)*1000,altitude=lab.defaultAltitudeM||350,yaw=-.7,pitch=.48,drag=null,autoOrbit=true,mesh=null,program=null,last=performance.now();

const vertexSource=`#version 300 es
precision highp float;
layout(location=0)in vec3 aPosition;
layout(location=1)in vec3 aNormal;
layout(location=2)in vec2 aTerrain;
uniform mat4 uViewProjection;
out vec3 vWorld;out vec3 vNormal;out vec2 vTerrain;
void main(){vWorld=aPosition;vNormal=aNormal;vTerrain=aTerrain;gl_Position=uViewProjection*vec4(aPosition,1.0);}`;
const fragmentSource=`#version 300 es
precision highp float;
in vec3 vWorld;in vec3 vNormal;in vec2 vTerrain;
uniform vec3 uCamera;uniform vec3 uSun;uniform float uPatchSize;
out vec4 outColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
float fbm(vec2 p){float n=0.0,a=.55;for(int i=0;i<4;i++){n+=noise(p)*a;p=p*2.03+17.2;a*=.5;}return n;}
void main(){
  vec3 n=normalize(vNormal);float slope=1.0-clamp(n.y,0.0,1.0),h=vTerrain.x,canyon=vTerrain.y;
  float broad=fbm(vWorld.xz*.0018),fine=fbm(vWorld.xz*.018);
  vec3 grass=mix(vec3(.22,.36,.10),vec3(.39,.56,.16),broad);
  vec3 dry=mix(vec3(.42,.36,.20),vec3(.59,.50,.27),fine);
  vec3 rock=mix(vec3(.29,.31,.29),vec3(.48,.46,.39),broad*.72+fine*.28);
  float rockMask=smoothstep(.16,.52,slope)+smoothstep(.72,.94,h)*.42;
  float dryMask=smoothstep(.42,.72,h)*(1.0-rockMask*.65)+smoothstep(.38,.74,canyon)*.36;
  vec3 base=mix(grass,dry,clamp(dryMask,0.0,1.0));base=mix(base,rock,clamp(rockMask,0.0,1.0));
  float strata=.5+.5*sin(vWorld.y*.115+fbm(vWorld.xz*.01)*4.2);base=mix(base,base*mix(.72,1.18,strata),rockMask*.22);
  float light=max(dot(n,normalize(uSun)),0.0),sky=.26+.36*n.y,ao=.82+.18*smoothstep(.18,.5,slope);vec3 lit=base*(sky+light*.74)*ao;
  float d=distance(uCamera,vWorld),fog=1.0-exp(-pow(d/(uPatchSize*1.42+900.0),1.65));vec3 haze=vec3(.54,.64,.66);
  outColor=vec4(mix(lit,haze,clamp(fog,0.0,.84)),1.0);
}`;

function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader}
function createProgram(){const result=gl.createProgram();gl.attachShader(result,compile(gl.VERTEX_SHADER,vertexSource));gl.attachShader(result,compile(gl.FRAGMENT_SHADER,fragmentSource));gl.linkProgram(result);if(!gl.getProgramParameter(result,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(result));return result}
function terrainHeight(worldX,worldZ){return-120+sampleTerrain(worldX/fieldM,worldZ/fieldM,recipe,layout.terrainSeed).height*1250}
function buildMesh(){
  if(mesh){for(const buffer of mesh.buffers)gl.deleteBuffer(buffer)}
  const count=(segments+1)*(segments+1),positions=new Float32Array(count*3),normals=new Float32Array(count*3),terrain=new Float32Array(count*2),indices=new Uint32Array(segments*segments*6),step=sizeM/segments,heights=new Float32Array(count);
  for(let z=0;z<=segments;z++)for(let x=0;x<=segments;x++){const i=z*(segments+1)+x,lx=x/segments*sizeM-sizeM/2,lz=z/segments*sizeM-sizeM/2,wx=focus.x+lx,wz=focus.z+lz,s=sampleTerrain(wx/fieldM,wz/fieldM,recipe,layout.terrainSeed),y=-120+s.height*1250;heights[i]=y;positions.set([lx,y,lz],i*3);terrain.set([s.height,s.canyon],i*2)}
  for(let z=0;z<=segments;z++)for(let x=0;x<=segments;x++){const i=z*(segments+1)+x,x0=Math.max(0,x-1),x1=Math.min(segments,x+1),z0=Math.max(0,z-1),z1=Math.min(segments,z+1),dx=heights[z*(segments+1)+x1]-heights[z*(segments+1)+x0],dz=heights[z1*(segments+1)+x]-heights[z0*(segments+1)+x],nx=-dx,ny=step*((x1-x0)+(z1-z0))*.5,nz=-dz,len=Math.hypot(nx,ny,nz)||1;normals.set([nx/len,ny/len,nz/len],i*3)}
  let at=0;for(let z=0;z<segments;z++)for(let x=0;x<segments;x++){const a=z*(segments+1)+x,b=a+1,c=a+segments+1,d=c+1;indices.set((x+z)%2?[a,c,b,b,c,d]:[a,c,d,a,d,b],at);at+=6}
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);const buffers=[];for(const [location,data,size]of[[0,positions,3],[1,normals,3],[2,terrain,2]]){const buffer=gl.createBuffer();buffers.push(buffer);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,0,0)}const indexBuffer=gl.createBuffer();buffers.push(indexBuffer);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);gl.bindVertexArray(null);mesh={vao,buffers,count:indices.length,centerY:terrainHeight(focus.x,focus.z)};document.querySelector('#spacing').textContent=`${(step).toFixed(1)} m`;document.querySelector('#scaleLabel').textContent=sizeM<=1000?'50 m':sizeM<=2000?'100 m':'200 m';
}

function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])}
function lookAt(eye,center,up=[0,1,0]){let zx=eye[0]-center[0],zy=eye[1]-center[1],zz=eye[2]-center[2],zl=Math.hypot(zx,zy,zz);zx/=zl;zy/=zl;zz/=zl;let xx=up[1]*zz-up[2]*zy,xy=up[2]*zx-up[0]*zz,xz=up[0]*zy-up[1]*zx,xl=Math.hypot(xx,xy,xz);xx/=xl;xy/=xl;xz/=xl;const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;return new Float32Array([xx,yx,zx,0,xy,yy,zy,0,xz,yz,zz,0,-(xx*eye[0]+xy*eye[1]+xz*eye[2]),-(yx*eye[0]+yy*eye[1]+yz*eye[2]),-(zx*eye[0]+zy*eye[1]+zz*eye[2]),1])}
function multiply(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)out[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return out}
function resize(){const dpr=Math.min(devicePixelRatio||1,1.7),w=innerWidth,h=innerHeight;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px'}gl.viewport(0,0,canvas.width,canvas.height)}
function render(now){resize();const dt=Math.min(.05,(now-last)/1000);last=now;if(autoOrbit)yaw+=dt*.035;const distance=Math.max(sizeM*.22,altitude*.88+160),horizontal=distance*Math.cos(pitch),eye=[Math.sin(yaw)*horizontal,mesh.centerY+altitude,Math.cos(yaw)*horizontal],target=[0,mesh.centerY+Math.max(0,altitude*.08),0],projection=perspective(Math.PI/3,canvas.width/canvas.height,4,16000),view=lookAt(eye,target),viewProjection=multiply(projection,view);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.useProgram(program);gl.uniformMatrix4fv(gl.getUniformLocation(program,'uViewProjection'),false,viewProjection);gl.uniform3fv(gl.getUniformLocation(program,'uCamera'),eye);gl.uniform3f(gl.getUniformLocation(program,'uSun'),-.69,.72,-.69);gl.uniform1f(gl.getUniformLocation(program,'uPatchSize'),sizeM);gl.bindVertexArray(mesh.vao);gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_INT,0);requestAnimationFrame(render)}

function choose(selector,value,attribute){document.querySelectorAll(selector+' button').forEach(button=>button.classList.toggle('active',Number(button.dataset[attribute])===value))}
document.querySelector('#sizeChoices').addEventListener('click',event=>{const value=Number(event.target.dataset.size);if(!value||value===sizeM)return;sizeM=value;choose('#sizeChoices',sizeM,'size');buildMesh()});
document.querySelector('#altitudeChoices').addEventListener('click',event=>{const value=Number(event.target.dataset.altitude);if(!value)return;altitude=value;choose('#altitudeChoices',altitude,'altitude')});
canvas.addEventListener('pointerdown',event=>{drag={id:event.pointerId,x:event.clientX,y:event.clientY};autoOrbit=false;canvas.setPointerCapture(event.pointerId)});
canvas.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;drag.x=event.clientX;drag.y=event.clientY;yaw-=dx*.006;pitch=Math.max(.2,Math.min(.82,pitch+dy*.004))});
canvas.addEventListener('pointerup',event=>{if(drag?.id===event.pointerId)drag=null});
canvas.addEventListener('pointercancel',()=>drag=null);
program=createProgram();buildMesh();requestAnimationFrame(render);
