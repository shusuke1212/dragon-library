import{intersectsSweptBox}from'./acrobatics.js?v=118';
const G=9.81,TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const LOOP_RULES=Object.freeze({minSpeedMps:230/3.6,maxSpeedMps:350/3.6,minClearanceM:80,maxStartClearanceM:800,maxAltitudeM:3050,edgeMarginM:2500,radiusM:16,recoverySeconds:2});
function point(plan,theta){
  // Curvature radius grows on the climb and shrinks on the descending half.
  // Integrating this radius yields a closed heading with a net altitude gain.
  const d=plan.radius*(Math.sin(theta)+.225*Math.sin(theta)**2),h=plan.radius*(1-Math.cos(theta)+.45*(theta/2-Math.sin(2*theta)/4)),c=Math.cos(plan.startPitch),s=Math.sin(plan.startPitch),forward=d*c-h*s;
  return{x:plan.x+Math.sin(plan.yaw)*forward,y:plan.y+d*s+h*c,z:plan.z+Math.cos(plan.yaw)*forward};
}
function speedAt(plan,y){return Math.sqrt(Math.max(24**2,plan.speed**2-2*G*(y-plan.y)))}
export function createLoopPlan(flight){
  const plan={x:flight.x,y:flight.y,z:flight.z,yaw:flight.yaw,startPitch:flight.pitch,startRoll:flight.roll,angleOfAttack:flight.angleOfAttack||0,speed:flight.speedMps,radius:.24*flight.speedMps**2/(2*G),track:[{theta:0,time:0}]};
  for(let i=1;i<=360;i++){const theta=TAU*i/360,mid=theta-TAU/720,p=point(plan,mid),radius=plan.radius*(1+.45*Math.sin(mid)),dt=radius*(TAU/360)/speedAt(plan,p.y);plan.track.push({theta,time:plan.track[i-1].time+dt})}
  plan.duration=plan.track.at(-1).time;return plan;
}
export function loopPose(plan,clock){
  const t=clamp(clock,0,plan.duration);let lo=0,hi=plan.track.length-1;
  while(hi-lo>1){const mid=(lo+hi)>>1;if(plan.track[mid].time<=t)lo=mid;else hi=mid}
  const a=plan.track[lo],b=plan.track[hi],theta=a.theta+(b.theta-a.theta)*(t-a.time)/(b.time-a.time),p=point(plan,theta),speed=speedAt(plan,p.y),angle=plan.startPitch+theta,horizontal=speed*Math.cos(angle),mix=clamp(t/.35,0,1),ease=mix*mix*(3-2*mix),angleOfAttack=plan.angleOfAttack+(.06-plan.angleOfAttack)*ease;
  return{...p,vx:Math.sin(plan.yaw)*horizontal,vy:speed*Math.sin(angle),vz:Math.cos(plan.yaw)*horizontal,yaw:plan.yaw,pitch:Math.asin(Math.sin(angle)),bodyPitch:angle+angleOfAttack,angleOfAttack,roll:plan.startRoll*(1-ease),speedMps:speed,brace:0,acroLoop:true,done:clock>=plan.duration};
}
export function loopReadiness(flight,{phase='airborne',onFoot=false,busy=false,boundaryActive=false,fieldM,heightAt,obstacles=[]}={}){
  const no=reason=>({ready:false,reason});
  if(busy)return no('自動操縦中');if(onFoot||phase!=='airborne'||flight.hovering||flight.hoverBlend>.02)return no('通常飛行で使用');
  if(![flight.x,flight.y,flight.z,flight.yaw,flight.pitch,flight.roll,flight.speedMps].every(Number.isFinite))return no('姿勢を整えてください');
  if(flight.speedMps<LOOP_RULES.minSpeedMps||flight.speedMps>LOOP_RULES.maxSpeedMps)return no('速度230〜350 km/h');
  if(Math.abs(flight.pitch)>.08||Math.abs(flight.roll)>.18||flight.stalled)return no('水平飛行で使用');if(boundaryActive)return no('空域の中央側へ');
  const clearance=flight.y-heightAt(flight.x,flight.z);if(clearance<80||clearance>800)return no('高度80〜800 m');
  const plan=createLoopPlan(flight),points=Array.from({length:91},(_,i)=>point(plan,TAU*i/90)),end=loopPose(plan,plan.duration);
  points.push({x:end.x+end.vx*LOOP_RULES.recoverySeconds,y:end.y+end.vy*LOOP_RULES.recoverySeconds,z:end.z+end.vz*LOOP_RULES.recoverySeconds});
  const min={},max={};for(const k of ['x','y','z']){min[k]=Math.min(...points.map(p=>p[k]))-16;max[k]=Math.max(...points.map(p=>p[k]))+16}
  const nearby=obstacles.filter(b=>['x','y','z'].every(k=>b.max[k]>=min[k]&&b.min[k]<=max[k]));
  const right={x:Math.cos(plan.yaw),z:-Math.sin(plan.yaw)};
  for(let i=0;i<points.length;i++){
    const p=points[i];if(p.y>LOOP_RULES.maxAltitudeM)return no('上空に余裕が必要');
    if(Math.min(p.x,p.z,fieldM-p.x,fieldM-p.z)<LOOP_RULES.edgeMarginM)return no('空域の中央側へ');
    // Sample every 8m even along the final normal-flight recovery segment.
    const previous=points[Math.max(0,i-1)],steps=Math.max(1,Math.ceil(Math.hypot(p.x-previous.x,p.y-previous.y,p.z-previous.z)/8));
    for(let j=0;j<=steps;j++)for(const side of [-1,0,1]){const t=j/steps,x=previous.x+(p.x-previous.x)*t+right.x*side*16,z=previous.z+(p.z-previous.z)*t+right.z*side*16,y=previous.y+(p.y-previous.y)*t,ground=heightAt(x,z);if(!Number.isFinite(ground)||y-ground<80)return no('地形から80 m以上');}
    if(nearby.some(box=>intersectsSweptBox(previous,p,box,17)))return no('宙返りの空間が不足');
  }
  return{ready:true,reason:'実行可能',plan};
}
