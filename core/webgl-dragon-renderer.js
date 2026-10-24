import{riderVisibility}from'./rider-visibility.js?v=133';
import{createStoryMeshRenderer}from'./story-mesh-renderer.js?v=137';
import{groundRestPose}from'./rest-pose.js?v=118';
import{solveLegKnee,flatFootPose}from'./leg-kinematics.js?v=106';
import{jawOpeningAngle,idleJawOpeningAngle,rotateJawLocal}from'./jaw-kinematics.js?v=107';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const V=(x=0,y=0,z=0)=>({x,y,z});
const add=(a,b,s=1)=>V(a.x+b.x*s,a.y+b.y*s,a.z+b.z*s);
const sub=(a,b)=>V(a.x-b.x,a.y-b.y,a.z-b.z);
const mul=(a,s)=>V(a.x*s,a.y*s,a.z*s);
const cross=(a,b)=>V(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
const unit=(a,f=V(0,1,0))=>{const n=Math.hypot(a.x,a.y,a.z);return n>.0001?mul(a,1/n):f};
const mix=(a,b,t)=>V(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t);
const C={skin:[.045,.16,.145],skinLight:[.09,.27,.225],bone:[.79,.77,.65],boneLight:[.91,.88,.72],boneDark:[.48,.5,.44],orange:[.77,.25,.075],orangeLight:[.95,.43,.11],leather:[.24,.105,.045],cloth:[.56,.26,.09],eye:[1,.09,.025],rider:[.14,.13,.12],skinTone:[.72,.49,.29]};

export function createWebGLDragonRenderer({canvas}){
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'high-performance'});if(!gl)return{ready:false,resize(){},render(){}};
  let ready=true,w=1,h=1,dpr=1,mesh=new Float32Array(400000);
  const vs=`#version 300 es
  precision highp float;layout(location=0)in vec3 aPosition;layout(location=1)in vec3 aNormal;layout(location=2)in vec3 aColor;layout(location=3)in vec3 aLocal;layout(location=4)in float aMaterial;
  uniform vec3 uCamera;uniform float uYaw;uniform float uPitch;uniform float uRoll;uniform float uFocal;uniform vec2 uViewport;
  out vec3 vNormal;out vec3 vColor;out vec3 vLocal;flat out float vMaterial;out vec3 vPosition;
  void main(){vec3 d=aPosition-uCamera;float cy=cos(uYaw),sy=sin(uYaw),cp=cos(uPitch),sp=sin(uPitch),cr=cos(uRoll),sr=sin(uRoll);float x=d.x*cy-d.z*sy,z1=d.x*sy+d.z*cy,y=d.y*cp-z1*sp,z=d.y*sp+z1*cp,xr=x*cr+y*sr,yr=-x*sr+y*cr;float np=.05,fp=300.0,cz=((fp+np)/(fp-np))*z-(2.0*fp*np)/(fp-np);gl_Position=vec4(xr*2.0*uFocal/uViewport.x,yr*2.0*uFocal/uViewport.y,cz,z);vNormal=aNormal;vColor=aColor;vLocal=aLocal;vMaterial=aMaterial;vPosition=aPosition;}`;
  const fs=`#version 300 es
  precision highp float;in vec3 vNormal;in vec3 vColor;in vec3 vLocal;flat in float vMaterial;in vec3 vPosition;uniform vec3 uCamera;uniform float uRiderVisibility;out vec4 outColor;
  float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
  float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  vec2 cells(vec2 p){vec2 tile=floor(p),f=fract(p);float first=10.0,second=10.0;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 jitter=vec2(hash(vec3(tile+g,1.7)),hash(vec3(tile+g,8.3)));vec2 delta=g+.2+.6*jitter-f;float d=dot(delta,delta);if(d<first){second=first;first=d;}else second=min(second,d);}return vec2(sqrt(first),max(0.0,sqrt(second)-sqrt(first)));}
  vec3 reliefNormal(vec3 n,float height){vec3 dx=dFdx(vPosition),dy=dFdy(vPosition),r1=cross(dy,n),r2=cross(n,dx);float det=dot(dx,r1);if(abs(det)<.000001)return n;vec3 grad=(r1*dFdx(height)+r2*dFdy(height))/det;return normalize(n-grad);}
  void main(){if(vMaterial>4.5&&uRiderVisibility<1.0&&hash(vec3(floor(gl_FragCoord.xy),0.0))>=uRiderVisibility)discard;vec3 n=normalize(vNormal),view=normalize(uCamera-vPosition);if(dot(n,view)<0.0)n=-n;vec3 sun=normalize(vec3(-.69,.72,-.69));vec3 base=vColor;float grain=noise(vLocal*18.0),broad=noise(vLocal*2.8),rough=.85,relief=0.0,specStrength=.12;vec3 specTint=vec3(.85,.9,.78);
    float detail=1.0-smoothstep(.025,.12,length(fwidth(vLocal)));
    vec2 surface=vLocal.xz+vec2(vLocal.y*.38,vLocal.y*.72);
    if(vMaterial<.5){vec2 scale=cells(surface*14.0);float seam=1.0-smoothstep(.014,.065,scale.y),crown=exp(-scale.x*scale.x*7.0);base*=.8+.3*broad;base=mix(base,vec3(.14,.23,.17),smoothstep(.48,.8,broad)*.25);base*=1.0-detail*seam*.3;base+=vec3(.005,.010,.007)*crown*detail;relief=detail*(crown*.011-seam*.004+(grain-.5)*.002);float dirtPatch=smoothstep(.48,.78,noise(vLocal*1.35+vec3(6.2,1.8,3.1))),low=1.0-smoothstep(-.45,.40,vLocal.y);base=mix(base,vec3(.20,.17,.105),(seam*.10+dirtPatch*(.075+low*.07))*detail);base=mix(base,vec3(.18,.30,.235),crown*smoothstep(.65,.86,grain)*detail*.07);// Dry scales retain uneven satin sheen, not a uniform white varnish.
      float satin=smoothstep(.40,.85,noise(vLocal*6.0+vec3(1.4,7.3,2.8)));
      rough=clamp(.88+.075*(1.0-satin)+dirtPatch*.025,0.0,1.0);
      specStrength=mix(.012,.038,satin)*(1.0-seam*detail*.80)*(1.0-dirtPatch*.60);specTint=vec3(.38,.54,.45);}
    else if(vMaterial<1.5){vec2 cracks=cells(surface*3.6+vec2(noise(vLocal*5.0)*.12));float seam=1.0-smoothstep(.008,.035,cracks.y);base*=.89+.15*broad;base=mix(base,vec3(.24,.27,.23),seam*detail*.55);float striae=sin(vLocal.x*60.0+noise(vLocal*4.0)*5.0);relief=detail*(-seam*.006+striae*.0008+(grain-.5)*.002);float patina=smoothstep(.40,.78,noise(vLocal*1.2+vec3(3.7,9.2,2.4)));base=mix(base,vec3(.50,.43,.29),patina*.20);base=mix(base,vec3(.25,.22,.155),seam*patina*detail*.20);float scratch=(1.0-smoothstep(.025,.075,abs(sin(surface.x*79.0+surface.y*43.0+noise(vLocal*3.1)*7.0))))*smoothstep(.70,.87,noise(vLocal*8.0))*detail;float pitting=smoothstep(.72,.88,grain)*patina*detail;base*=1.0-pitting*.085;base=mix(base,vec3(.90,.86,.69),scratch*.13);relief-=pitting*.001;rough=.89;}
    else if(vMaterial<2.5){base*=.86+.24*broad;float fibers=sin(vLocal.z*80.0+vLocal.x*9.0);base*=1.0+detail*(fibers*.022+(grain-.5)*.055);relief=detail*fibers*.0008;rough=.95;}
    else if(vMaterial>3.5){float wear=smoothstep(.48,.80,noise(vLocal*4.0)),scratch=(1.0-smoothstep(.015,.045,abs(sin(surface.x*96.0+surface.y*27.0))))*smoothstep(.64,.84,grain)*detail;base*=.84+.20*broad;base=mix(base,vec3(.40,.22,.105),wear*.20+scratch*.14);rough=.94;relief=detail*(grain-.5)*.001;}
    n=reliefNormal(n,relief);
    float direct=max(dot(n,sun),0.0),sky=.32+.15*max(n.y,0.0),spec=pow(max(dot(n,normalize(sun+view)),0.0),mix(36.0,10.0,rough))*specStrength;vec3 c=base*(sky+direct*.7)+specTint*spec;outColor=vec4(c,1.0);}`;
  const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
  const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  const loc={riderVisibility:gl.getUniformLocation(program,'uRiderVisibility'),camera:gl.getUniformLocation(program,'uCamera'),yaw:gl.getUniformLocation(program,'uYaw'),pitch:gl.getUniformLocation(program,'uPitch'),roll:gl.getUniformLocation(program,'uRoll'),focal:gl.getUniformLocation(program,'uFocal'),viewport:gl.getUniformLocation(program,'uViewport')};
  const vao=gl.createVertexArray(),buffer=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);for(const [i,o]of[[0,0],[1,3],[2,6],[3,9],[4,12]]){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,i===4?1:3,gl.FLOAT,false,52,o*4)}gl.bindVertexArray(null);
  function resize(width,height,pixelRatio){w=width;h=height;dpr=pixelRatio;const pw=Math.round(w*dpr),ph=Math.round(h*dpr);if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;canvas.style.width=w+'px';canvas.style.height=h+'px'}}
  const storyOcclusion=createStoryMeshRenderer(gl);
  function render({cam,focal,time,flight,landing,motion,behavior,profile,groundY}){
    if(!ready)return;let vertexCursor=0,riderPart=false,riderFade=0;
    let origin,basis;const tessellation=Math.hypot(cam.x-flight.x,cam.y-flight.y,cam.z-flight.z)>35?1:1.5;
    const emit=(p,n,color,material)=>{const dx=p.x-origin.x,dy=p.y-origin.y,dz=p.z-origin.z;if(vertexCursor+13>mesh.length){const expanded=new Float32Array(mesh.length*2);expanded.set(mesh);mesh=expanded}mesh[vertexCursor++]=p.x;mesh[vertexCursor++]=p.y;mesh[vertexCursor++]=p.z;mesh[vertexCursor++]=n.x;mesh[vertexCursor++]=n.y;mesh[vertexCursor++]=n.z;for(let k=0;k<3;k++)mesh[vertexCursor++]=color[k];for(let k=0;k<3;k++)mesh[vertexCursor++]=dx*basis[k].x+dy*basis[k].y+dz*basis[k].z;mesh[vertexCursor++]=riderPart?5:material??((color===C.skin||color===C.skinLight)?0:(color===C.bone||color===C.boneLight||color===C.boneDark)?1:(color===C.leather||color===C.cloth)?4:3)};
    const tri=(a,b,c,color,normals,material)=>{const n=unit(cross(sub(b,a),sub(c,a)));emit(a,normals?.[0]||n,color,material);emit(b,normals?.[1]||n,color,material);emit(c,normals?.[2]||n,color,material)};
    // Each shared surface vertex is evaluated once, rather than four times per adjacent quad.
    const surfaceGrid=(rows,cols,point,normal,color)=>{const ps=[],ns=[],cs=[],stride=cols+1;for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const u=i/rows,v=j/cols;ps.push(point(u,v));ns.push(normal(u,v));cs.push(typeof color==='function'?color(u,v):color)}for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*stride+j,b=a+stride,c=b+1,d=a+1;emit(ps[a],ns[a],cs[a]);emit(ps[b],ns[b],cs[b]);emit(ps[c],ns[c],cs[c]);emit(ps[a],ns[a],cs[a]);emit(ps[c],ns[c],cs[c]);emit(ps[d],ns[d],cs[d])}};
    const quad=(a,b,c,d,color)=>{tri(a,b,c,color);tri(a,c,d,color)};
    const segment=(a,b,r0,r1,color,sides=7)=>{sides=Math.max(10,Math.ceil(sides*tessellation));const axis=unit(sub(b,a)),seed=Math.abs(axis.y)<.82?V(0,1,0):V(1,0,0),u=unit(cross(axis,seed)),v=cross(axis,u),ra=[],rb=[],normals=[],slope=(r0-r1)/Math.max(.001,Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z));for(let i=0;i<sides;i++){const q=Math.PI*2*i/sides,rad=add(mul(u,Math.cos(q)),v,Math.sin(q));ra.push(add(a,rad,r0));rb.push(add(b,rad,r1));normals.push(unit(add(rad,axis,slope)))}for(let i=0;i<sides;i++){const j=(i+1)%sides;tri(ra[i],ra[j],rb[j],color,[normals[i],normals[j],normals[j]]);tri(ra[i],rb[j],rb[i],color,[normals[i],normals[j],normals[i]])}for(let i=0;i<sides;i++){const j=(i+1)%sides;tri(a,ra[j],ra[i],color,[mul(axis,-1),mul(axis,-1),mul(axis,-1)]);tri(b,rb[i],rb[j],color,[axis,axis,axis])}};
    const ellipsoid=(center,axes,radii,color,lat=5,lon=9)=>{lat=Math.max(8,Math.ceil(lat*tessellation));lon=Math.max(12,Math.ceil(lon*tessellation));const rings=[],normals=[];for(let iy=0;iy<=lat;iy++){const ph=-Math.PI/2+Math.PI*iy/lat,row=[],nr=[];for(let ix=0;ix<lon;ix++){const th=Math.PI*2*ix/lon,xyz=[Math.cos(ph)*Math.cos(th),Math.sin(ph),Math.cos(ph)*Math.sin(th)];let p=center,n=V();for(let k=0;k<3;k++){p=add(p,axes[k],xyz[k]*radii[k]);n=add(n,axes[k],xyz[k]/radii[k])}row.push(p);nr.push(unit(n))}rings.push(row);normals.push(nr)}for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){const j=(x+1)%lon;tri(rings[y][x],rings[y][j],rings[y+1][j],color,[normals[y][x],normals[y][j],normals[y+1][j]]);tri(rings[y][x],rings[y+1][j],rings[y+1][x],color,[normals[y][x],normals[y+1][j],normals[y+1][x]])}};
    const membrane=(a,b,c,d)=>{const steps=7,point=(u,v)=>mix(mix(a,b,u),mix(d,c,u),v),shade=(u,v)=>{const p=point(u,v),q=sub(p,origin),along=q.x*basis[0].x+q.y*basis[0].y+q.z*basis[0].z,across=q.x*basis[2].x+q.y*basis[2].y+q.z*basis[2].z;const band=Math.exp(-Math.pow((v-.62)/.16,2)),edge=1-.22*Math.pow(v,3),variation=.85+.15*Math.sin(Math.abs(across)*1.5+along*2.1);return C.skin.map((x,i)=>(x*(1-band*.75)+C.orange[i]*band*.75*variation)*edge)};for(let i=0;i<steps;i++)for(let j=0;j<steps;j++){const u=i/steps,v=j/steps,U=(i+1)/steps,Vv=(j+1)/steps,params=[[u,v],[U,v],[U,Vv],[u,Vv]],points=params.map(([x,y])=>point(x,y)),normals=params.map(([x,y])=>unit(cross(mix(sub(b,a),sub(c,d),y),mix(sub(d,a),sub(c,b),x))));for(const ids of[[0,1,2],[0,2,3]])for(const k of ids)emit(points[k],normals[k],shade(...params[k]),2)}};
    // Continuous cross-sections replace stacked primitive joints near the rider.
    const sweep=(points,radii,color,flatten=1)=>{const count=points.length,rings=[],ns=[];for(let i=0;i<count;i++){const tangent=unit(sub(points[Math.min(i+1,count-1)],points[Math.max(0,i-1)])),side=unit(cross(tangent,basis[1]),basis[2]),vertical=unit(cross(side,tangent)),ring=[],normals=[];for(let j=0;j<16;j++){const q=j*Math.PI/8,rad=add(mul(side,Math.cos(q)),vertical,Math.sin(q)*flatten);ring.push(add(points[i],rad,radii[i]));normals.push(unit(add(mul(side,Math.cos(q)),vertical,Math.sin(q)/flatten)))}rings.push(ring);ns.push(normals)}for(let i=0;i<count-1;i++)for(let j=0;j<16;j++){const k=(j+1)%16;tri(rings[i][j],rings[i][k],rings[i+1][k],color,[ns[i][j],ns[i][k],ns[i+1][k]]);tri(rings[i][j],rings[i+1][k],rings[i+1][j],color,[ns[i][j],ns[i+1][k],ns[i+1][j]])}};
    // Anatomical volumes use one smooth skin surface with a changing radius.
    // Buried root rings merge into the torso; the belly narrows into tendons.
    const muscle=(controls,radii,flatten=1)=>{
      const points=[],sizes=[],n=controls.length-1;
      const cubic=(a,b,c,d,t)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
      for(let j=0;j<=24;j++){const x=j/24*n,k=Math.min(n-1,Math.floor(x)),t=x-k,a=controls[Math.max(0,k-1)],b=controls[k],c=controls[k+1],d=controls[Math.min(n,k+2)];points.push(V(...['x','y','z'].map(axis=>cubic(a[axis],b[axis],c[axis],d[axis],t))));sizes.push(Math.max(.02,cubic(radii[Math.max(0,k-1)],radii[k],radii[k+1],radii[Math.min(n,k+2)],t)))}
      sweep(points,sizes,C.skin,flatten);
    };
    const curvedShell=(a,b,c,d,bulgeAxis,bulge,thickness,color,seat=null)=>{const point=(u,v,back=false)=>{const p=add(mix(mix(a,b,u),mix(d,c,u),v),bulgeAxis,bulge*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)-(back?thickness:0));return seat?seat(p,back):p},steps=8,grids=[];for(const back of[false,true]){const ps=[],ns=[];for(let i=0;i<=steps;i++)for(let j=0;j<=steps;j++){const u=i/steps,v=j/steps;ps.push(point(u,v,back));ns.push(unit(cross(sub(point(u+.001,v,back),point(u-.001,v,back)),sub(point(u,v+.001,back),point(u,v-.001,back)))));}grids.push(ps);for(let i=0;i<steps;i++)for(let j=0;j<steps;j++){const a=i*(steps+1)+j,b=(i+1)*(steps+1)+j,c=b+1,d=a+1,col=back?C.bone:color;tri(ps[a],ps[b],ps[c],col,[ns[a],ns[b],ns[c]]);tri(ps[a],ps[c],ps[d],col,[ns[a],ns[c],ns[d]])}}const front=grids[0],rear=grids[1];for(let i=0;i<steps;i++)for(const [a,b]of[[i*(steps+1),(i+1)*(steps+1)],[i*(steps+1)+steps,(i+1)*(steps+1)+steps],[i,i+1],[steps*(steps+1)+i,steps*(steps+1)+i+1]])quad(front[a],front[b],rear[b],rear[a],C.boneDark)};
    const plate=(center,fwd,up,right,len,width,height,color,skew=0)=>{const front=add(center,fwd,len*.5),rear=add(center,fwd,-len*.5),top=add(center,up,height),l=add(center,right,-width*.5),r=add(center,right,width*.5);tri(add(front,right,skew),l,top,color);tri(add(front,right,skew),top,r,color);tri(rear,top,l,color);tri(rear,r,top,color);quad(front,r,rear,l,color)};
    const groundPose=groundRestPose(flight,landing,behavior,profile,time),rest=groundPose.rest,sleep=groundPose.sleep;
    const supported=flight.acroLoop||flight.hovering||['approaching','settling','descending','landed','waking','takingoff'].includes(landing.phase),velocity=V(flight.vx,flight.vy,flight.vz),forward=supported?V(Math.sin(flight.yaw),0,Math.cos(flight.yaw)):unit(velocity,V(Math.sin(flight.yaw),0,Math.cos(flight.yaw))),right0=unit(V(forward.z,0,-forward.x),V(1,0,0)),up0=unit(cross(forward,right0)),ca=Math.cos(groundPose.angle),sa=Math.sin(groundPose.angle),fwd=unit(add(mul(forward,ca),up0,sa)),bodyUp=unit(add(mul(up0,ca),forward,-sa)),cr=Math.cos(flight.roll),sr=Math.sin(flight.roll),right=unit(add(mul(right0,cr),bodyUp,-sr)),up=unit(add(mul(bodyUp,cr),right0,sr));
    const hover=Math.max(flight.hovering?flight.hoverBlend:0,landing.wingBlend||0),fold=Math.max(landing.foldBlend||0,(motion.acroFold||0)*.94),center=V(flight.x,groundPose.centerY,flight.z);
    origin=center;basis=[fwd,up,right];
    // One anatomical torso replaces the overlapping rear/chest ellipsoids.
    // The shoulder keeps flight-muscle volume while the breast and abdomen
    // flatten and taper continuously into the neck and pelvis.
    const torsoSections=[[-3,.018,.025,.025,0],[-2.5,.27,.28,.25,0],[-1.8,.43,.43,.39,0],[-.9,.52,.53,.46,0],[-.3,.64,.62,.53,0],[.3,.75,.69,.61,0],[.8,.63,.57,.52,.06],[1.35,.42,.41,.31,.19],[1.85,.07,.10,.10,.31]];
    const torsoAt=x=>{let i=0;while(i<torsoSections.length-2&&x>torsoSections[i+1][0])i++;const a=torsoSections[i],b=torsoSections[i+1],t=clamp((x-a[0])/(b[0]-a[0]),0,1),prev=torsoSections[Math.max(0,i-1)],next=torsoSections[Math.min(torsoSections.length-1,i+2)],span=b[0]-a[0],t2=t*t,t3=t2*t;return a.map((value,k)=>k===0?x:((2*t3-3*t2+1)*value+(t3-2*t2+t)*(b[k]-prev[k])/Math.max(.001,b[0]-prev[0])*span+(-2*t3+3*t2)*b[k]+(t3-t2)*(next[k]-value)/Math.max(.001,next[0]-a[0])*span))};
    const torsoPoint=(t,q)=>{const x=-3+4.35*t,section=torsoAt(x),vertical=Math.sin(q),depth=vertical>=0?section[2]:section[3];return add(add(add(center,fwd,x),right,Math.cos(q)*section[1]),up,vertical*depth+section[4])};
    const torsoRows=40,torsoSides=24;
    for(let i=0;i<torsoRows;i++)for(let j=0;j<torsoSides;j++){const t=i/torsoRows,T=(i+1)/torsoRows,q=j*Math.PI*2/torsoSides,Q=(j+1)*Math.PI*2/torsoSides,uv=[[t,q],[T,q],[T,Q],[t,Q]],points=uv.map(([x,y])=>torsoPoint(x,y)),ns=uv.map(([x,y])=>unit(cross(sub(torsoPoint(x+.0001,y),torsoPoint(x-.0001,y)),sub(torsoPoint(x,y+.001),torsoPoint(x,y-.001)))));for(const ids of[[0,1,2],[0,2,3]])for(const k of ids){const blend=clamp((uv[k][0]-.45)*1.4,0,.75),color=C.skin.map((v,c)=>v+(C.skinLight[c]-v)*blend);emit(points[k],ns[k],color,0)}}
    const surfaceY=Number.isFinite(groundY)?groundY:flight.y-(profile.groundCenterM??2.4),tailPlant=clamp(landing.blend||0,0,1),tailRadii=Array.from({length:7},(_,i)=>i===6?.02:Math.max(.08,.57-i*.068));
    const tailSafe=(p,i)=>V(p.x,p.y+Math.max(0,surfaceY+tailRadii[i]+.065-p.y)*tailPlant,p.z);
    const tail=[tailSafe(add(center,fwd,-1.55),0)];for(let i=1;i<=6;i++){const t=i/6,len=1.02+(i<3?.2:0),base=add(tail[i-1],fwd,-len),side=Math.sin(time*1.7-i*.72)*.09*(1-motion.controlAmount)+motion.tailSide*.016*Math.pow(t,1.45)+rest*.16*Math.sin(t*Math.PI*.8),lift=Math.sin(time*1.25+i*.6)*.04+motion.tailLift*.013*Math.pow(t,1.6)-hover*t*.16;tail.push(tailSafe(add(add(base,right,side),up,lift),i))}sweep(tail,tailRadii,C.skin,.95);
    // Tail scutes are separate rigid saddles over each articulated skin segment.
    // A broad dorsal plate and smaller side plates leave a visible green joint;
    // the underside is flexible skin rather than a continuous bone tube.
    for(let i=0;i<6;i++){
      const a=tail[i],b=tail[i+1],axis=unit(sub(b,a)),side=unit(cross(up,axis),right),normal=unit(cross(axis,side),up),r0=tailRadii[i],r1=tailRadii[i+1],age=i/5;
      const scute=(start,end,angleCenter,arc,thickness)=>{
        const point=(u,v,inner=false)=>{const across=v*2-1,lip=.045*Math.cos(across*Math.PI*2)*(1-u),t=start+(end-start)*u+lip,angle=angleCenter+across*arc*(1-.16*u),r=r0+(r1-r0)*t,crest=thickness*(.65+.35*Math.exp(-across*across*9))*(.7+.3*Math.sin(u*Math.PI)),radius=r+.018*(i===5?1-u:1)+(inner?0:crest*(i===5?Math.pow(1-u,.65):1)),p=mix(a,b,t);return add(add(p,side,Math.sin(angle)*radius),normal,Math.cos(angle)*radius*.95)};
        const rows=6,cols=12;
        for(const inner of[false,true])for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const uv=[[j/rows,k/cols],[(j+1)/rows,k/cols],[(j+1)/rows,(k+1)/cols],[j/rows,(k+1)/cols]],ps=uv.map(([u,v])=>point(u,v,inner)),ns=uv.map(([u,v])=>unit(cross(sub(point(u+.001,v,inner),point(u-.001,v,inner)),sub(point(u,v+.001,inner),point(u,v-.001,inner))))),col=inner?C.bone:C.boneLight;tri(ps[0],ps[1],ps[2],col,[ns[0],ns[1],ns[2]]);tri(ps[0],ps[2],ps[3],col,[ns[0],ns[2],ns[3]])}
        for(let k=0;k<cols;k++){const v=k/cols,Vv=(k+1)/cols;for(const u of[0,1])quad(point(u,v),point(u,Vv),point(u,Vv,true),point(u,v,true),C.bone)}
        for(let j=0;j<rows;j++){const u=j/rows,U=(j+1)/rows;for(const v of[0,1])quad(point(u,v),point(U,v),point(U,v,true),point(u,v,true),C.bone)}
      };
      scute(.12,i===5?.99:.81,0,i===5?1.18:.92,.10-age*.055);
      if(i<5)for(const sign of[-1,1])scute(.24,.73,sign*1.34,.34,.06-age*.025);
    }
    const neckFold=clamp(Math.max(hover,landing.blend||0),0,1),neckStretch=profile.skeleton.neckLengthScale??1,neckSlim=profile.skeleton.neckRadiusScale??1,gazeYaw=(behavior.lookYaw||0)*(1-sleep*.95),gazeLift=(behavior.lookLift||0)*(1-sleep*.95),rootSection=torsoAt(1.35),neck0=add(add(center,fwd,1.35),up,rootSection[4]),stretchOrigin=add(add(center,fwd,1.35),up,.38),stretchNeck=p=>add(stretchOrigin,sub(p,stretchOrigin),neckStretch);
    const levelForward=V(Math.sin(flight.yaw),0,Math.cos(flight.yaw)),levelRight=V(Math.cos(flight.yaw),0,-Math.sin(flight.yaw));
    const activeHead=stretchNeck(add(add(add(center,fwd,3.05-neckFold*.25),up,.36-neckFold*.91+gazeLift*.32),right,gazeYaw*.72)),restingHead=add(add(V(flight.x,surfaceY+.87+Math.sin(time*1.45)*.012,flight.z),levelForward,2.85),levelRight,.10);
    const head=mix(activeHead,restingHead,rest),activeHeadF=unit(add(add(fwd,right,gazeYaw*.6),up,Math.tan(-.06-neckFold*.54)+gazeLift*.25)),restingHeadF=unit(add(levelForward,V(0,1,0),-.06)),headF=unit(mix(activeHeadF,restingHeadF,rest)),headR=unit(cross(up,headF),right),headUp=unit(cross(headF,headR),up);
    // Keep the cheeks and the opened mandible clear throughout the lie-down.
    const callLift=jawOpeningAngle(behavior.callClock||0,profile.reaction)*.7;
    head.y+=Math.max(0,surfaceY+.86+callLift-head.y)*tailPlant;
    // End at the occiput. The final tangent enters the back of the skull,
    // rather than descending into the centre of the head from above.
    const neckEnd=add(add(head,headF,-.53),headUp,.07),lowering=Math.max(neckFold,rest),neckSpan=sub(neckEnd,neck0),neckLength=Math.hypot(neckSpan.x,neckSpan.y,neckSpan.z);
    // Lower the whole cervical curve with the head. A fixed high middle point
    // produced a hump followed by a tight bend, especially during resting.
    // The relaxed controls distribute flexion while entering the occiput
    // along the skull axis; cruise retains its established silhouette.
    const neck1=mix(stretchNeck(add(add(center,fwd,2.05-neckFold*.10),up,.48+neckFold*.25)),add(mix(neck0,neckEnd,.34),up,.07*(1-rest)),lowering),neck2=add(neckEnd,headF,-(.52*(1-lowering)+Math.min(.72,neckLength*.30)*lowering)),neckPoints=[],neckRadii=[];
    for(let i=0;i<=16;i++){const t=i/16,u=1-t;let p=mul(neck0,u*u*u);p=add(p,neck1,3*u*u*t);p=add(p,neck2,3*u*t*t);p=add(p,neckEnd,t*t*t);neckPoints.push(p);neckRadii.push((.54-.2*t+.035*Math.sin(t*Math.PI))*neckSlim)}
    // Share the torso's complete terminal ring, including its asymmetric belly.
    // The neck gradually turns into its animated frame beyond this welded seam.
    const neckSkinPoint=(t,q)=>{t=clamp(t,0,1);const u=1-t;let pos=mul(neck0,u*u*u);pos=add(pos,neck1,3*u*u*t);pos=add(pos,neck2,3*u*t*t);pos=add(pos,neckEnd,t*t*t);
      const tangent=unit(add(add(mul(sub(neck1,neck0),3*u*u),sub(neck2,neck1),6*u*t),sub(neckEnd,neck2),3*t*t)),blend=clamp(t/.28,0,1),ease=blend*blend*(3-2*blend),frame=unit(mix(fwd,tangent,ease)),side=unit(cross(up,frame),right),vertical=unit(cross(frame,side),up),r=(.54-.2*t+.035*Math.sin(t*Math.PI))*neckSlim,width=rootSection[1]*(1-ease)+r*ease,depth=(Math.sin(q)>=0?rootSection[2]:rootSection[3])*(1-ease)+r*.88*ease;
      return add(add(pos,side,Math.cos(q)*width),vertical,Math.sin(q)*depth);
    };
    for(let i=0;i<24;i++)for(let j=0;j<24;j++){const uv=[[i/24,j*Math.PI/12],[(i+1)/24,j*Math.PI/12],[(i+1)/24,(j+1)*Math.PI/12],[i/24,(j+1)*Math.PI/12]],ps=uv.map(([t,q])=>neckSkinPoint(t,q)),ns=uv.map(([t,q])=>unit(cross(sub(neckSkinPoint(t+.0001,q),neckSkinPoint(t-.0001,q)),sub(neckSkinPoint(t,q+.001),neckSkinPoint(t,q-.001)))));for(const ids of[[0,1,2],[0,2,3]])for(const k of ids){const blend=.75+.25*clamp(uv[k][0]/.28,0,1),color=C.skin.map((v,c)=>v+(C.skinLight[c]-v)*blend);emit(ps[k],ns[k],color,0)}}
    // ⑨ Nape armour: three low overlapping scutes follow the living neck.
    // Each scute has a broad leading edge, a scalloped trailing lip and a
    // shallow dorsal ridge; the lateral skin stays exposed for articulation.
    const neckAt=t=>{const x=clamp(t,0,1)*16,i=Math.min(15,Math.floor(x));return mix(neckPoints[i],neckPoints[i+1],x-i)};
    for(const [mid,half,width]of[[.86,.09,.46*neckSlim],[.62,.09,.40*neckSlim],[.39,.085,.34*neckSlim]]){
      const napePoint=(u,v,inner=false)=>{const across=v*2-1,scallop=.018*(1-across*across)*Math.cos(across*Math.PI*2),t=clamp(mid+(u*2-1)*half-(1-u)*scallop,0,1),p=neckAt(t),tangent=unit(sub(neckAt(t+.012),neckAt(t-.012))),side=unit(cross(up,tangent),right),normal=unit(cross(tangent,side),up),angle=across*.78,skinRadius=(.54-.2*t+.035*Math.sin(t*Math.PI))*.88*neckSlim,skullLift=0,ridge=.035*Math.exp(-across*across*10)*Math.sin(u*Math.PI),lip=.018*Math.sin(u*Math.PI),radius=skinRadius+.045+skullLift+ridge+lip-(inner?.045:0),flare=Math.max(width*(.85+.15*Math.sin(u*Math.PI)),(skinRadius/.88)*Math.sin(.78)+.025);let surface=add(add(p,side,Math.sin(angle)/Math.sin(.78)*flare),normal,Math.cos(angle)*radius);const skullCenter=add(add(head,headF,-.12),headUp,.02),q=sub(surface,skullCenter),dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z,axes=[headF,headUp,headR],radii=[.69,.48,.51],Q=axes.map((a,k)=>dot(q,a)/radii[k]),N=axes.map((a,k)=>dot(normal,a)/radii[k]),A=N.reduce((n,x)=>n+x*x,0),B=2*Q.reduce((n,x,k)=>n+x*N[k],0),D=Q.reduce((n,x)=>n+x*x,0)-1;if(D<0){const lift=(-B+Math.sqrt(Math.max(0,B*B-4*A*D)))/(2*A);surface=add(surface,normal,lift)}return surface};
      const lengthSteps=10,widthSteps=18;
      for(const inner of[false,true])for(let i=0;i<lengthSteps;i++)for(let j=0;j<widthSteps;j++){const uv=[[i/lengthSteps,j/widthSteps],[(i+1)/lengthSteps,j/widthSteps],[(i+1)/lengthSteps,(j+1)/widthSteps],[i/lengthSteps,(j+1)/widthSteps]],ps=uv.map(([u,v])=>napePoint(u,v,inner)),ns=uv.map(([u,v])=>unit(cross(sub(napePoint(u+.001,v,inner),napePoint(u-.001,v,inner)),sub(napePoint(u,v+.001,inner),napePoint(u,v-.001,inner))))),color=inner?C.bone:C.boneLight;tri(ps[0],ps[1],ps[2],color,[ns[0],ns[1],ns[2]]);tri(ps[0],ps[2],ps[3],color,[ns[0],ns[2],ns[3]])}
      for(let j=0;j<widthSteps;j++){const v=j/widthSteps,Vv=(j+1)/widthSteps;for(const u of[0,1])quad(napePoint(u,v),napePoint(u,Vv),napePoint(u,Vv,true),napePoint(u,v,true),C.bone)}
      for(let i=0;i<lengthSteps;i++){const u=i/lengthSteps,U=(i+1)/lengthSteps;for(const v of[0,1])quad(napePoint(u,v),napePoint(U,v),napePoint(U,v,true),napePoint(u,v,true),C.bone)}
    }
    // The head is wholly living tissue.  A compact muscular braincase flows
    // into a narrow, down-sloping muzzle; no pale armour or horn interrupts
    // the neck-to-face silhouette.
    const brow=add(add(head,headF,.25),headUp,.12),muzzleBase=add(add(head,headF,.28),headUp,-.06),muzzleTip=add(add(head,headF,1.35),headUp,-.24);
    ellipsoid(add(add(head,headF,-.12),headUp,.02),[headF,headUp,headR],[.66,.45,.48],C.skinLight,6,9);
    segment(muzzleBase,muzzleTip,.34,.075,C.skin,8);
    ellipsoid(add(add(head,headF,.16),headUp,-.16),[headF,headUp,headR],[.5,.27,.42],C.skin,5,8);
    // Paired muscle ridges form a predatory brow without becoming horns.
    for(const s of[-1,1]){const ridgeA=add(add(add(brow,headR,s*.31),headF,-.22),headUp,.015),ridgeB=add(add(add(brow,headR,s*.25),headF,.43),headUp,-.065);segment(ridgeA,ridgeB,.105,.035,C.skinLight,6)}
    const jawAngle=Math.max(jawOpeningAngle(behavior.callClock||0,profile.reaction),idleJawOpeningAngle(time,landing.blend||0,sleep)),jawHinge=add(add(head,headF,-.03),headUp,-.29);
    const jawPoint=(forward,height,side=0)=>{const [f,u]=rotateJawLocal(forward+.03,height+.29,jawAngle);return add(add(add(jawHinge,headF,f),headUp,u),headR,side)};
    const jawUp=add(mul(headUp,Math.cos(jawAngle)),headF,Math.sin(jawAngle)),jawTip=jawPoint(1.22,-.3);
    segment(jawHinge,jawTip,.2,.035,C.skin,7);
    if(jawAngle>.005){
      // Inner mouth stretches between the fixed upper jaw and rotating mandible.
      const roof=add(add(head,headF,1.22),headUp,-.265),tongueTip=add(jawTip,jawUp,.035);
      for(const side of[-.07,.07])quad(add(jawHinge,headR,side),add(roof,headR,side),add(tongueTip,headR,side),add(add(jawHinge,jawUp,.035),headR,side),C.orange);
      segment(add(jawHinge,jawUp,.075),tongueTip,.075,.018,C.orange,6);
    }
    // Small amber eyes and nostrils are recessed into the dark face, keeping
    // expression without the round, high-contrast toy-eye cue.
    for(const s of[-1,1]){
      // Embed the eye in the braincase; iris and slit share its outward surface.
      const eye=add(add(add(head,headF,.29),headUp,.06),headR,s*.32),iris=add(eye,headR,s*.088),pupil=add(eye,headR,s*.101);
      ellipsoid(eye,[headF,headUp,headR],[.105,.074,.105],C.rider.map((v,i)=>v+(C.skinLight[i]-v)*sleep),6,10);
      ellipsoid(iris,[headF,headUp,headR],[.078,.058*(1-sleep)+.001,.019],C.orangeLight.map((v,i)=>v+(C.skinLight[i]-v)*sleep),6,10);
      ellipsoid(pupil,[headF,headUp,headR],[.014,.047*(1-sleep)+.001,.011],C.rider.map((v,i)=>v+(C.skinLight[i]-v)*sleep),5,8);
      if(sleep>.01){const closed=add(eye,headR,s*.105);segment(add(closed,headF,-.077),add(closed,headF,.077),.009*sleep,.009*sleep,C.skin,6)}
      for(const edge of[-1,1]){let prev;for(let j=0;j<=10;j++){const t=Math.PI*j/10,pt=add(add(add(eye,headF,Math.cos(t)*.112),headUp,edge*Math.sin(t)*.080),headR,s*(.005+Math.sin(t)*.083));if(prev)segment(prev,pt,.023,.023,C.skinLight,6);prev=pt}}
      const nostril=add(add(add(muzzleTip,headF,-.24),headR,s*.1),headUp,.045);ellipsoid(nostril,[headF,headUp,headR],[.055,.035,.022],C.rider,3,6);
    }
    // Hercules-beetle geometry: one long upper horn and one shorter lower
    // horn oppose each other vertically.  Side braces only support the frame;
    // ① Three distinct bone plates carry the crown/cheek construction into
    // the horn: an arched dorsal plate and two deep curved lateral plates.
    // The symmetric jointed plan contour is preserved, with curved rear lips
    // seated into the crown instead of a flat oval section facing the rider.
    // Seat both faces of the crown on the braincase, rather than leaving a
    // hollow helmet. The small inner clearance avoids skin/bone z-fighting.
    const headShellLocal=(x,y,z,inner=false)=>{
      const radii=inner?[.67,.46,.49]:[.71,.50,.53],q=[z+.12,y-.02,x],scale=1/Math.max(.001,Math.hypot(...q.map((v,i)=>v/radii[i])));
      return V(q[2]*scale,.02+q[1]*scale,-.12+q[0]*scale);
    };
    const headShellWorld=(p,inner=false)=>{
      const q=sub(p,head),dot=a=>q.x*a.x+q.y*a.y+q.z*a.z,local=headShellLocal(dot(headR),dot(headUp),dot(headF),inner);
      return add(add(add(head,headR,local.x),headUp,local.y),headF,local.z);
    };
    const hornProfile=[[0,.38],[.10,.40],[.23,.24],[.33,.30],[.47,.15],[.57,.21],[.71,.08],[.79,.13],[.90,.045],[1,.003]];
    const hornWidth=t=>{t=clamp(t,0,1);let i=0;while(i<hornProfile.length-2&&t>hornProfile[i+1][0])i++;const [a,A]=hornProfile[i],[b,B]=hornProfile[i+1],u=clamp((t-a)/(b-a),0,1),smooth=u*u*(3-2*u);return A+(B-A)*smooth};
    const hornPlate=(part)=>{
      const point=(u,v,inner=false)=>{
        const across=v*2-1,T=clamp(u,0,1),wave=Math.sin(Math.PI*T),width=hornWidth(T);
        const relief=.04*(Math.exp(-Math.pow((T-.33)/.07,2))+.8*Math.exp(-Math.pow((T-.57)/.06,2))+.5*Math.exp(-Math.pow((T-.79)/.05,2)));
        const fade=Math.pow(1-T,.8),thickness=(.052*fade+.002)*(.4+.6*Math.sin(Math.PI*u/2));
        const blendU=clamp(u/.30,0,1),rootBlend=1-blendU*blendU*(3-2*blendU);
        let x,y,z=-.42+3.5*T,base=.565+.025*wave-.11*wave*T+.04*T*T;
        if(part===0){
          x=across*width*.97;y=base+(.15*fade+.045*wave+relief)*Math.pow(Math.max(0,1-across*across),.8);
          // The rear dorsal seam follows the two crown panels' rear edges.
          const w=Math.abs(across),f=clamp((w-.23/.31)/(1-.23/.31),0,1);
          const rootX=across*.31,rootY=w<=.23/.31?.55+.065*(1-Math.pow(w/(.23/.31),2)):.55+(.38-.55)*f,rootZ=w<=.23/.31?-.36:-.36+(-.42+.36)*f;
          x+=(rootX-across*.38*.97)*rootBlend;y+=(rootY-(.565+.15*Math.pow(Math.max(0,1-across*across),.8)))*rootBlend;z+=(rootZ+.42)*rootBlend;
          if(inner)y-=thickness;
        }else{
          x=part*width*(.97-.38*v+.065*Math.sin(Math.PI*v));y=base-.018*fade-(.30*fade+.05*wave+relief*.6)*v;
          // Lateral rear seam is the actual upper edge of the cheek guard:
          // a(-.44,.38,+/-.31) to b(.18,.24,+/-.49), in head coordinates.
          const rootX=part*(.31+.18*v),rootY=.38-.14*v,rootZ=-.44+.62*v;
          x+=(rootX-part*.38*(.97-.38*v+.065*Math.sin(Math.PI*v)))*rootBlend;y+=(rootY-(.565-.018-.30*v))*rootBlend;z+=(rootZ+.42)*rootBlend;
          if(inner)x-=part*thickness;
        }
        // Root rings use the same fitted shell as the crown and cheek rims;
        // the correction fades out before the first horn joint.
        const fitted=headShellLocal(x,y,z,inner);
        x+=(fitted.x-x)*rootBlend;y+=(fitted.y-y)*rootBlend;z+=(fitted.z-z)*rootBlend;
        return add(add(add(head,headF,z),headR,x),headUp,y);
      };
      const rows=64,cols=20;
      for(const inner of[false,true])surfaceGrid(rows,cols,(u,v)=>point(u,v,inner),(u,v)=>{let n=unit(cross(sub(point(clamp(u+.0001,0,1),v,inner),point(clamp(u-.0001,0,1),v,inner)),sub(point(u,v+.0001,inner),point(u,v-.0001,inner))));if(part===1)n=mul(n,-1);return inner?mul(n,-1):n},inner?C.bone:part===0?C.boneLight:C.bone);
      for(let j=0;j<cols;j++){const v=j/cols,Vv=(j+1)/cols;for(const u of[0,1])quad(point(u,v),point(u,Vv),point(u,Vv,true),point(u,v,true),C.bone);}
      for(let i=0;i<rows;i++){const u=i/rows,U=(i+1)/rows;for(const v of[0,1])quad(point(u,v),point(U,v),point(U,v,true),point(u,v,true),C.bone);}
    };
    for(const part of[0,-1,1])hornPlate(part);
    // The three horn plates and crown/cheek shells now provide the head
    // structure; the legacy tubular temple brace is intentionally absent.
    // ③ Cheek guards sit against the living cheek, keeping their separate
    // plate silhouettes and leaving the eye and forward jaw exposed.
    // The inner cheek surface clears all living volumes: braincase, cheek
    // muscle and the final neck rings. Thickness grows outward from it.
    const cheekBodies=[{center:add(add(head,headF,-.12),headUp,.02),axes:[headF,headUp,headR],radii:[.66,.45,.48]},{center:add(add(head,headF,.16),headUp,-.16),axes:[headF,headUp,headR],radii:[.50,.27,.42]}];
    for(let i=11;i<=16;i++){
      const tangent=unit(sub(neckPoints[Math.min(16,i+1)],neckPoints[i-1])),side=unit(cross(up,tangent),headR),vertical=unit(cross(tangent,side),headUp),span=Math.hypot(...Object.values(sub(neckPoints[i],neckPoints[i-1])));
      cheekBodies.push({center:neckPoints[i],axes:[tangent,vertical,side],radii:[Math.max(.06,span*.85),neckRadii[i]*.88,neckRadii[i]]});
    }
    const cheekClearance=(p,s)=>{
      const axis=mul(headR,s),dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;let distance=0;
      for(const body of cheekBodies){const q=sub(p,body.center),Q=body.axes.map((a,k)=>dot(q,a)/body.radii[k]),N=body.axes.map((a,k)=>dot(axis,a)/body.radii[k]),A=N.reduce((n,x)=>n+x*x,0),B=2*Q.reduce((n,x,k)=>n+x*N[k],0),D=Q.reduce((n,x)=>n+x*x,0)-1,disc=B*B-4*A*D;if(disc>=0)distance=Math.max(distance,(-B+Math.sqrt(disc))/(2*A)+.018)}
      return add(p,axis,distance);
    };
    for(const s of[-1,1]){
      const a=headShellWorld(add(add(add(head,headF,-.44),headUp,.38),headR,s*.31)),b=headShellWorld(add(add(add(head,headF,.18),headUp,.24),headR,s*.49)),c=add(add(add(head,headF,.03),headUp,-.76),headR,s*.30),d=add(add(add(head,headF,-.43),headUp,-.14),headR,s*.46);
      const point=(u,v,inner=false)=>{
        const base=mix(mix(a,b,u),mix(d,c,u),v),thickness=.04+.025*Math.sin(Math.PI*v),inset=add(base,headR,-s*thickness),seated=cheekClearance(inset,s);
        return inner?seated:add(seated,headR,s*thickness);
      },rows=18,cols=18;
      for(const inner of[false,true])surfaceGrid(rows,cols,(u,v)=>point(u,v,inner),(u,v)=>{const n=unit(cross(sub(point(u+.0001,v,inner),point(u-.0001,v,inner)),sub(point(u,v+.0001,inner),point(u,v-.0001,inner))));return mul(n,s*(inner?-1:1))},inner?C.bone:C.boneLight);
      for(let i=0;i<rows;i++){const u=i/rows,U=(i+1)/rows;for(const v of[0,1])quad(point(u,v),point(U,v),point(U,v,true),point(u,v,true),C.boneDark)}
      for(let j=0;j<cols;j++){const v=j/cols,Vv=(j+1)/cols;for(const u of[0,1])quad(point(u,v),point(u,Vv),point(u,Vv,true),point(u,v,true),C.boneDark)}
      // The forward rim is part of the shell, without an inward tubular brace.
    }
    // Fan-shaped crown panels bridge the diamond horn root to both temporal
    // shells.  Their inner edges meet the horn's half-width, removing the gaps
    // visible from above while leaving the forward face open.
    for(const s of[-1,1]){const ir=add(add(add(head,headF,-.36),headUp,.55),headR,s*.23),ifront=add(add(add(head,headF,.28),headUp,.46),headR,s*.23),of=add(add(add(head,headF,.18),headUp,.24),headR,s*.49),or=add(add(add(head,headF,-.42),headUp,.38),headR,s*.31),ofu=add(of,headUp,-.11),oru=add(or,headUp,-.11);curvedShell(ir,ifront,of,or,headUp,.025,.04,C.boneLight,headShellWorld);segment(headShellWorld(or),headShellWorld(of),.055,.035,C.bone,6)}
    // Ventral jaw armour follows the mandible, with its tip beyond the muzzle.
    const jawArmor=[[ -.03,-.48,.19],[.26,-.49,.17],[.62,-.45,.12],[.98,-.37,.07],[1.38,-.30,.005]];
    for(let i=0;i<jawArmor.length-1;i++){const a=jawArmor[i],b=jawArmor[i+1];curvedShell(jawPoint(a[0],a[1],-a[2]),jawPoint(b[0],b[1],-b[2]),jawPoint(b[0],b[1],b[2]),jawPoint(a[0],a[1],a[2]),mul(jawUp,-1),.035,.045,C.boneLight)}
    // A short exposed tooth row gives the living mouth a readable edge without
    // turning the whole head white again at chase-camera distance.
    for(const t of[.3,.5,.7,.86])for(const s of[-1,1]){const gum=add(mix(jawHinge,jawTip,t),headR,s*.13);segment(add(gum,jawUp,.04),add(gum,jawUp,.14),.032,.006,C.boneLight,5)}
    // Dorsal armour is a continuation of the tail and ends exactly at the wing
    // roots, leaving the shoulders, neck and full wing stroke unobstructed.
    // Short, articulated scutes with a low central ridge and separate flank plates.
    for(let i=0;i<5;i++){const f=-1.65+i*.36,section=torsoAt(f),width=section[1]*.62;
      const point=(d,r,h)=>{const sec=torsoAt(f+d);return add(add(add(center,fwd,f+d),right,r),up,sec[4]+sec[2]*Math.sqrt(Math.max(.05,1-(r/sec[1])**2))+h)};
      for(const side of[-1,1]){
        curvedShell(point(-.13,0,.055),point(.15,0,.11),point(.12,side*width,.025),point(-.16,side*width*.78,.015),up,.025,.045,i%2?C.bone:C.boneLight);
        curvedShell(point(-.13,side*width*1.13,.02),point(.12,side*width*1.10,.02),point(.08,side*width*1.43,.01),point(-.12,side*width*1.38,.01),up,.035,.04,C.bone);
      }
    }
    const speedFold=clamp((flight.speedMps-72)/25,0,1),span=(7.5-speedFold*1.9)*(1-hover*.08)*(1-fold*.8),phase=motion.flapPhase||0,amount=motion.flapAmount||0,idle=Math.sin(time*2.2)*.27*(1-amount)*(1-(motion.acroFold||0)*.9),turn=motion.wingTurn?.command||0,shoulder=add(add(center,fwd,.1),up,hover*.64),rearRoot=add(center,fwd,-1.0);
    const support=clamp(landing.supportBlend||0,0,1)*(landing.blend||0),supportFloor=Number.isFinite(groundY)?groundY:flight.y-(profile.groundCenterM??2.4),groundForward=V(Math.sin(flight.yaw),0,Math.cos(flight.yaw)),groundRight=V(Math.cos(flight.yaw),0,-Math.sin(flight.yaw));
    const wingGround=(f,r,h)=>add(add(V(flight.x,supportFloor+h,flight.z),groundForward,f),groundRight,r);
    for(const s of[-1,1]){const relation=s*turn,inside=Math.max(0,relation),outside=Math.max(0,-relation),live=span*(1-inside*.14+outside*.06),root=add(shoulder,right,s*.62),rootRear=add(rearRoot,right,s*.48);
      let elbow=add(add(add(shoulder,right,s*live*.42),fwd,.58-inside*.22-fold*1.1),up,Math.sin(phase)*amount*1.2+idle*.55),wrist=add(add(add(shoulder,right,s*live*.76),fwd,-.65-inside*.45-fold*1.9),up,Math.sin(phase-.28)*amount*1.9+idle*.8),tip=add(add(add(shoulder,right,s*live),fwd,-2.35-inside*.65-fold*2.55),up,Math.sin(phase-.5)*amount*2.45+idle),rearTip=add(add(add(rearRoot,right,s*live*.73),fwd,-.72-fold*2.05),up,Math.sin(phase-.62)*amount*1.55),rearElbow=add(add(rearRoot,right,s*live*.33),up,Math.sin(phase-.1)*amount*.62);
      const plantedWrist=wingGround(1.35,s*1.55,.14),plantedElbow=solveLegKnee(root,plantedWrist,add(mul(groundForward,-.8),groundRight,s*.7),1.55,1.55);
      elbow=mix(elbow,plantedElbow,support);wrist=mix(wrist,plantedWrist,support);tip=mix(tip,wingGround(-2.25,s*1.72,.38),support);rearTip=mix(rearTip,wingGround(-2.10,s*1.05,.29),support);rearElbow=mix(rearElbow,add(rootRear,groundRight,s*.3),support);
      membrane(root,elbow,rearElbow,rootRear);membrane(elbow,wrist,rearTip,rearElbow);membrane(wrist,tip,rearTip,rearTip);
      const chestAnchor=add(add(add(center,fwd,.10),right,s*.28),up,.08);
      muscle([chestAnchor,root,mix(root,elbow,.38),elbow],[.34,.30,.24,.165],.86);
      muscle([elbow,mix(elbow,wrist,.28),mix(elbow,wrist,.72),wrist],[.165,.18,.13,.105],.90);
      segment(wrist,tip,.105,.035,C.skin,7);segment(elbow,rearElbow,.09,.045,C.skin,6);segment(wrist,rearTip,.075,.035,C.skin,6);
      // The rounded elbow bridges both limb shafts and hides their flat end caps.
      const forearm=unit(sub(wrist,elbow)),jointSide=unit(cross(unit(sub(elbow,root)),forearm),right),jointUp=unit(cross(jointSide,forearm),up);
      ellipsoid(elbow,[forearm,jointUp,jointSide],[.24,.185,.19],C.skinLight,8,12);
      const crease=add(elbow,jointUp,-.155);segment(add(crease,jointSide,-.09),add(crease,jointSide,.09),.018,.018,C.skin,7);
      const handForward=unit(mix(fwd,groundForward,support)),handRight=unit(mix(right,groundRight,support)),handUp=unit(cross(handForward,handRight));
      ellipsoid(wrist,[handForward,handUp,handRight],[.23,.14,.18],C.skin,6,10);
      // Three exposed, splayed grasping digits remain attached when the wing folds.
      for(let digit=-1;digit<=1;digit++){
        const base=add(add(add(wrist,handForward,.12),handRight,digit*.11),handUp,-.035),knuckle=add(add(add(base,handForward,.17),handRight,digit*.04),handUp,-.020),end=add(add(add(base,handForward,digit===0?.32:.27),handRight,digit*.09),handUp,-.035);
        segment(base,knuckle,.057,.044,C.skinLight,7);ellipsoid(knuckle,[handForward,handUp,handRight],[.062,.049,.050],C.skin,5,8);segment(knuckle,end,.044,.029,C.skin,7);
        const clawMid=add(add(end,handForward,.09),handUp,.023),clawTip=add(add(end,handForward,.19),handUp,-.035);segment(end,clawMid,.032,.024,C.bone,7);segment(clawMid,clawTip,.024,.002,C.boneLight,7);
      }
    }
    const approach=landing.phase==='approaching'?clamp((landing.approachClock/Math.max(.01,landing.approachDuration)-.55)/.45,0,1):0,deploy=Math.max(hover,landing.blend||0,approach),reach=deploy*(1-rest*.7),plant=clamp(landing.blend||0,0,1);
    const floor=Number.isFinite(groundY)?groundY:flight.y-(profile.groundCenterM??2.4),footPlane=Math.max(floor,flight.y-(profile.groundCenterM??2.4));
    for(const s of[-1,1]){
      const hip=add(add(add(center,fwd,-.72),right,s*.3),up,-.42);
      const airKnee=add(add(add(hip,fwd,.42-reach*.2),right,s*(.12+reach*.2)),up,-.12-reach*.5),airAnkle=add(add(add(airKnee,fwd,-.34-reach*.26),right,s*(.05+reach*.12)),up,.05-reach*.68),airToe=add(add(add(airAnkle,fwd,.08+reach*1.0),right,s*(.03+reach*.12)),up,-.04-reach*.12);
      const foot=flatFootPose(flight,footPlane,s,rest),plantedKnee=solveLegKnee(hip,foot.ankle,add(foot.forward,foot.right,s*(.55+rest*.75))),knee=mix(airKnee,plantedKnee,plant),ankle=mix(airAnkle,foot.ankle,plant),toe=mix(airToe,foot.toe,plant);
      const pelvisAnchor=add(add(add(center,fwd,-.78),right,s*.23),up,-.10);
      muscle([pelvisAnchor,hip,mix(hip,knee,.42),knee],[.30,.31,.28,.18],.85);
      muscle([knee,mix(knee,ankle,.30),mix(knee,ankle,.72),ankle],[.18,.21,.15,.12],.88);
      segment(ankle,toe,.12,.07,C.skin,6);
      ellipsoid(knee,[fwd,up,right],[.21,.17,.18],C.skin,5,8);
      // Raised hock, a compact palm and three splayed digits rather than a human sole.
      const palm=mix(airToe,foot.pad,plant),ff=unit(mix(fwd,foot.forward,plant)),fr=unit(mix(right,foot.right,plant));
      segment(ankle,palm,.115,.10,C.skin,8);ellipsoid(palm,[ff,V(0,1,0),fr],[.19,.09,.19],C.skinLight,5,9);
      for(let digit=-1;digit<=1;digit++){
        const root=add(palm,fr,digit*.11),knuckle=add(add(root,ff,.20),fr,digit*.10),end=add(add(root,ff,digit===0?.43:.34),fr,digit*.17);
        segment(root,knuckle,.075,.055,C.skinLight,7);segment(knuckle,end,.055,.035,C.skin,7);
        const clawBase=add(end,V(0,1,0),.018),clawMid=add(add(end,ff,.09),V(0,1,0),.045),clawTip=add(add(end,ff,.18),V(0,1,0),-.03);segment(clawBase,clawMid,.036,.025,C.bone,7);segment(clawMid,clawTip,.025,.002,C.boneLight,7);
      }
      const rearDigit=add(add(palm,ff,-.20),fr,s*.13);segment(palm,rearDigit,.055,.025,C.skin,7);segment(rearDigit,add(rearDigit,ff,-.12),.027,.002,C.boneLight,7);
    }
    // Quiet travelling equipment: curved pad, leather seat and broad girths.
    const seat=add(add(center,fwd,profile.riderSeatForwardM),up,profile.riderSeatHeightM??.80);
    const local=(f,h,r)=>add(add(add(seat,fwd,f),up,h),right,r);
    const leather=[.19,.115,.07],edgeLeather=[.29,.20,.12],padColor=[.25,.265,.22],coat=[.19,.22,.20],coatLight=[.24,.265,.235],boot=[.11,.105,.09],mask=[.065,.075,.075];
    const surfacePatch=(point,color,rows=10,cols=10)=>{for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const uv=[[i/rows,j/cols],[(i+1)/rows,j/cols],[(i+1)/rows,(j+1)/cols],[i/rows,(j+1)/cols]],ps=uv.map(([u,v])=>point(u,v));tri(ps[0],ps[1],ps[2],color);tri(ps[0],ps[2],ps[3],color)}};
    const padPoint=(u,v)=>{const f=profile.riderSeatForwardM-.65+u*1.30,section=torsoAt(f),angle=(v-.5)*2.3;return add(add(add(center,fwd,f),right,Math.sin(angle)*(section[1]+.06)),up,Math.cos(angle)*section[2]+section[4]+.075)};
    surfacePatch(padPoint,padColor);
    for(let i=0;i<16;i++)for(const v of[0,1])segment(padPoint(i/16,v),padPoint((i+1)/16,v),.016,.016,edgeLeather,5);
    const seatPoint=(u,v,bottom=false)=>{const f=(u-.5)*1.05,r=(v-.5)*.77,height=-.012+.13*Math.pow(2*u-1,2)+.06*Math.pow(2*v-1,2)-(bottom?.075:0);return local(f,height,r)};
    surfacePatch((u,v)=>seatPoint(u,v),leather);surfacePatch((u,v)=>seatPoint(u,v,true),leather);
    for(let i=0;i<12;i++)for(const [u,v,U,Vv]of[[i/12,0,(i+1)/12,0],[i/12,1,(i+1)/12,1],[0,i/12,0,(i+1)/12],[1,i/12,1,(i+1)/12]]){quad(seatPoint(u,v),seatPoint(U,Vv),seatPoint(U,Vv,true),seatPoint(u,v,true),leather);segment(seatPoint(u,v),seatPoint(U,Vv),.018,.018,edgeLeather,5)}
    for(const offset of[-.40,.36]){const f=profile.riderSeatForwardM+offset;for(const side of[-1,1]){const ring=(t,along)=>{const sec=torsoAt(f+along),angle=Math.PI*t;return add(add(add(center,fwd,f+along),right,side*(sec[1]+.035)*Math.sin(angle)),up,sec[4]+(angle<Math.PI/2?sec[2]:sec[3])*Math.cos(angle))};for(let j=0;j<20;j++)quad(ring(j/20,-.04),ring((j+1)/20,-.04),ring((j+1)/20,.04),ring(j/20,.04),leather)}}
    for(const side of[-1,1]){
      const hanger=local(-.06,-.02,side*.45),stirrup=local(.02,-.82,side*.73);segment(hanger,stirrup,.025,.022,leather,7);
      const a=add(stirrup,fwd,-.14),b=add(stirrup,fwd,.14),c=add(add(b,up,.16),right,side*.035),d=add(add(a,up,.16),right,-side*.035);for(const pair of[[a,b],[b,c],[c,d],[d,a]])segment(pair[0],pair[1],.018,.018,edgeLeather,6);
    }
    const hip=local(-.02,.17,0),shoulders=add(add(hip,up,.68),fwd,.075),headRider=add(add(shoulders,up,.26),fwd,.025);
    riderFade=riderVisibility(cam,headRider);
    if(riderFade>0){
      riderPart=true;
      // Clothes carry the silhouette; no exposed face or custom appearance.
      ellipsoid(add(hip,up,.30),[fwd,up,right],[.17,.34,.24],coat,7,12);
      ellipsoid(add(shoulders,up,-.12),[fwd,up,right],[.19,.20,.26],coatLight,6,12);
      ellipsoid(headRider,[fwd,up,right],[.195,.235,.205],coat,8,14);
      ellipsoid(add(add(headRider,fwd,.177),up,-.025),[fwd,up,right],[.035,.14,.14],mask,7,12);
      ellipsoid(add(add(headRider,fwd,.207),up,.045),[fwd,up,right],[.013,.033,.128],boot,5,12);
      ellipsoid(add(add(headRider,fwd,.075),up,-.17),[fwd,up,right],[.17,.072,.19],coatLight,6,12);
      const capePoint=(u,v)=>{const down=v,width=.27+.075*down,r=(u-.5)*2*width,fold=Math.sin(u*Math.PI*8)*.018*down;return add(add(add(shoulders,right,r),up,-.08-.61*down),fwd,-.19-.07*down-fold)};
      surfacePatch(capePoint,coatLight,16,12);
      for(let i=0;i<10;i++)segment(capePoint(i/10,1),capePoint((i+1)/10,1),.008,.008,coat,5);
      for(const side of[-1,1]){
        const knee=local(.25,-.28,side*.59),ankle=local(-.04,-.64,side*.72),foot=local(.04,-.72,side*.73),legRoot=add(hip,right,side*.16);
        segment(legRoot,knee,.115,.095,coat,9);ellipsoid(knee,[fwd,up,right],[.11,.12,.105],coat,6,10);segment(knee,ankle,.09,.068,boot,9);ellipsoid(foot,[fwd,up,right],[.18,.075,.095],boot,6,12);
        const shoulder=add(shoulders,right,side*.21),elbow=local(.27,.53,side*.30),hand=local(.58,.48,side*.15);
        segment(shoulder,elbow,.09,.073,coatLight,9);ellipsoid(elbow,[fwd,up,right],[.08,.09,.078],coat,6,10);segment(elbow,hand,.070,.045,coat,8);ellipsoid(hand,[fwd,up,right],[.076,.055,.055],boot,6,10);
      }
      riderPart=false;
    }
    // Reins remain attached to the articulated neck when the rider fades out.
    const neckAnchor=neckPoints[Math.min(4,neckPoints.length-1)];
    if(cam.mode!=='foot')for(const side of[-1,1]){const hand=local(.62,.48,side*.15),end=add(add(neckAnchor,right,side*.34),up,.12);let previous=hand;for(let i=1;i<=12;i++){const t=i/12,p=add(mix(hand,end,t),up,-.075*Math.sin(t*Math.PI));segment(previous,p,.011,.011,leather,6);previous=p}}
    const data=mesh.subarray(0,vertexCursor);gl.viewport(0,0,Math.round(w*dpr),Math.round(h*dpr));gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);if(cam.mode==='foot'){gl.colorMask(false,false,false,false);storyOcclusion.render(cam,focal,w,h,time,.05,300);gl.colorMask(true,true,true,true);}gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.useProgram(program);gl.uniform1f(loc.riderVisibility,riderFade);gl.uniform3f(loc.camera,cam.x,cam.y,cam.z);gl.uniform1f(loc.yaw,cam.yaw);gl.uniform1f(loc.pitch,cam.pitch);gl.uniform1f(loc.roll,cam.roll);gl.uniform1f(loc.focal,focal);gl.uniform2f(loc.viewport,w,h);gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,data.length/13);gl.bindVertexArray(null)
  }
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false});return{get ready(){return ready},resize,render,setStoryGeometry:faces=>storyOcclusion.setGeometry(faces)};
}
