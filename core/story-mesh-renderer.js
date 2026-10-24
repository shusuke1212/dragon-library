// Uses the terrain's depth buffer, so walls clip correctly from inside and behind hills.
export function storyVertexData(faces){const data=[],rgb=c=>c.startsWith('#')?[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)/255):c.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>n/255);
  for(const f of faces){const p=f.points,a=p[0],b=p[1],c=p[2],u=[b.x-a.x,b.y-a.y,b.z-a.z],v=[c.x-a.x,c.y-a.y,c.z-a.z],n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n),color=rgb(f.color);if(len<1e-7)continue;for(let i=1;i<p.length-1;i++)for(const j of[0,i,i+1]){const q=p[j];data.push(q.x,q.y,q.z,...(f.normals?.[j]||n.map(x=>x/len)),...color,f.material||0);}}
  return new Float32Array(data);
}
export const storyVS=`#version 300 es
precision highp float;
layout(location=0)in vec3 aPosition;layout(location=1)in vec3 aNormal;layout(location=2)in vec3 aColor;layout(location=3)in float aMaterial;
uniform vec3 uCamera;uniform float uYaw,uPitch,uRoll,uFocal,uNear,uFar,uTime;uniform vec2 uViewport;
out vec3 vWorld,vNormal,vColor;out float vMaterial;
void main(){vec3 world=aPosition;if(aMaterial>2.5&&aMaterial<3.5)world.z+=sin(uTime*1.4+world.y*1.3)*.12;vec3 d=world-uCamera;float cy=cos(uYaw),sy=sin(uYaw),cp=cos(uPitch),sp=sin(uPitch),cr=cos(uRoll),sr=sin(uRoll);float x=d.x*cy-d.z*sy,z0=d.x*sy+d.z*cy,y=d.y*cp-z0*sp,z=d.y*sp+z0*cp;float xr=x*cr+y*sr,yr=-x*sr+y*cr;float far=uFar;gl_Position=vec4(xr*2.*uFocal/uViewport.x,yr*2.*uFocal/uViewport.y,((far+uNear)/(far-uNear))*z-2.*far*uNear/(far-uNear),z);vWorld=world;vNormal=aNormal;vColor=aColor;vMaterial=aMaterial;}`;
export const storyFS=`#version 300 es
precision highp float;
in vec3 vWorld,vNormal,vColor;in float vMaterial;uniform vec3 uCamera;uniform float uTime;out vec4 outColor;
float hash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
void main(){vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;float noise=hash(floor(vWorld*26.)),weather=hash(floor(vWorld*1.6));float grain=.87+noise*.08+weather*.08;float m=vMaterial;
 if(m<.5){float courses=abs(sin(vWorld.y*3.14*2.2));grain*=mix(.76,1.,smoothstep(.04,.14,courses));}
 else if(m<1.5)grain*=.85+.15*sin(vWorld.y*60.+sin(vWorld.z*8.)*2.);
 else if(m<2.5){float seams=min(fract(vWorld.x*1.2),fract(vWorld.z*1.1));grain*=mix(.72,1.,smoothstep(.015,.07,seams));}
 if(m>7.5)grain*=.9+.06*sin(vWorld.x*.19+sin(vWorld.z*.11)*2.)+.04*sin(vWorld.y*.37+vWorld.z*.21);
 float light=.5+.5*max(0.,dot(n,normalize(vec3(-.69,.72,-.69))));vec3 color=vColor*grain*light;if(m>8.5&&m<9.5){vec3 view=normalize(uCamera-vWorld),halfway=normalize(view+normalize(vec3(-.69,.72,-.69)));float shine=pow(max(0.,dot(n,halfway)),18.);color=mix(color,vColor*.75+vec3(.2,.28,.29),.22)+vec3(.5,.65,.61)*shine*.5;}if(m>6.5&&m<7.5)color=vColor*(.85+.25*sin(uTime*1.4));float fog=clamp(distance(uCamera,vWorld)/16800.,0.,.92);color=mix(color,vec3(.42,.51,.53),fog);outColor=vec4(color,1.);}`;
export function createStoryMeshRenderer(gl){let program,vao,count=0,groundCount=0;function shader(kind,source){const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
  program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,storyVS));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,storyFS));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  const names=['uCamera','uYaw','uPitch','uRoll','uFocal','uNear','uFar','uTime','uViewport'],loc=Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(program,n)]));
  return{setGeometry(faces){const ground=faces.filter(f=>f.material===4),objects=faces.filter(f=>f.material!==4);groundCount=storyVertexData(ground).length/10;const data=storyVertexData([...ground,...objects]);count=data.length/10;vao=gl.createVertexArray();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);for(const[i,size,offset]of[[0,3,0],[1,3,3],[2,3,6],[3,1,9]]){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,size,gl.FLOAT,false,40,offset*4);}gl.bindVertexArray(null);},render(cam,focal,width,height,time,near=null,far=42000){if(!count)return;gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.useProgram(program);gl.uniform3f(loc.uCamera,cam.x,cam.y,cam.z);for(const[n,v]of[['uYaw',cam.yaw],['uPitch',cam.pitch],['uRoll',cam.roll],['uFocal',focal],['uNear',near??(.12)],['uFar',far],['uTime',time]])gl.uniform1f(loc[n],v);gl.uniform2f(loc.uViewport,width,height);gl.bindVertexArray(vao);if(groundCount){gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-4,-4);gl.drawArrays(gl.TRIANGLES,0,groundCount);gl.disable(gl.POLYGON_OFFSET_FILL);}if(count>groundCount)gl.drawArrays(gl.TRIANGLES,groundCount,count-groundCount);gl.bindVertexArray(null);}};
}
