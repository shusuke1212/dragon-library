import{intersectsSweptBox}from'./acrobatics.js?v=119';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x,0,1);return x*x*x*(x*(x*6-15)+10)},integral=x=>2.5*x**4-3*x**5+x**6;
export const DASH_RULES=Object.freeze({minSpeedMps:180/3.6,maxSpeedMps:320/3.6,targetSpeedMps:1000/3.6,accelSeconds:.7,holdSeconds:3,decelSeconds:1.1,recoverySeconds:2,minClearanceM:150,maxAltitudeM:3050,edgeMarginM:2500,radiusM:16});
export const dashDuration=DASH_RULES.accelSeconds+DASH_RULES.holdSeconds+DASH_RULES.decelSeconds;
export function dashPose(plan,clock){
  const t=Math.max(0,clock),a=DASH_RULES.accelSeconds,h=DASH_RULES.holdSeconds,d=DASH_RULES.decelSeconds,fast=DASH_RULES.targetSpeedMps,delta=fast-plan.horizontal;
  let distance,speed;
  if(t<=a){const u=t/a;speed=plan.horizontal+delta*smooth(u);distance=plan.horizontal*t+delta*a*integral(u)}
  else{distance=a*(plan.horizontal+fast)/2;const hold=Math.min(h,t-a);distance+=fast*hold;
    if(t<=a+h)speed=fast;
    else{const u=clamp((t-a-h)/d,0,1);speed=fast-delta*smooth(u);distance+=fast*d*u-delta*d*integral(u)+plan.horizontal*Math.max(0,t-dashDuration)}
  }
  if(t>=dashDuration)speed=plan.horizontal;
  const e=Math.min(t,.35),vy=plan.vy*(1-e/.35),y=plan.y+plan.vy*(e-e*e/.7),pitch=Math.atan2(vy,speed),mix=smooth(t/a),angleOfAttack=plan.angleOfAttack+(.035-plan.angleOfAttack)*mix;
  return{x:plan.x+Math.sin(plan.yaw)*distance,y,z:plan.z+Math.cos(plan.yaw)*distance,vx:Math.sin(plan.yaw)*speed,vy,vz:Math.cos(plan.yaw)*speed,yaw:plan.yaw,pitch,bodyPitch:pitch+angleOfAttack,angleOfAttack,roll:plan.roll*(1-mix),speedMps:Math.hypot(speed,vy),brace:clamp((speed-plan.horizontal)/delta,0,1),acroLoop:false,done:t>=dashDuration};
}
export function dashReadiness(flight,{phase='airborne',onFoot=false,busy=false,boundaryActive=false,fieldM,heightAt,obstacles=[]}={}){
  const no=reason=>({ready:false,reason});if(busy)return no('自動操縦中');if(onFoot||phase!=='airborne'||flight.hovering||flight.hoverBlend>.02)return no('通常飛行で使用');
  if(![flight.x,flight.y,flight.z,flight.yaw,flight.pitch,flight.roll,flight.speedMps,flight.vx,flight.vy,flight.vz].every(Number.isFinite))return no('姿勢を整えてください');
  if(flight.speedMps<DASH_RULES.minSpeedMps||flight.speedMps>DASH_RULES.maxSpeedMps)return no('速度180〜320 km/h');
  if(Math.abs(flight.pitch)>.08||Math.abs(flight.roll)>.18||flight.stalled)return no('水平飛行で使用');if(boundaryActive)return no('空域の中央側へ');
  const plan={x:flight.x,y:flight.y,z:flight.z,yaw:flight.yaw,roll:flight.roll,vy:flight.vy,horizontal:Math.hypot(flight.vx,flight.vz),angleOfAttack:flight.angleOfAttack||0},end=dashPose(plan,dashDuration+DASH_RULES.recoverySeconds),lowY=Math.min(plan.y,end.y),highY=Math.max(plan.y,end.y);
  if(highY>DASH_RULES.maxAltitudeM)return no('高度を下げてください');
  for(const p of[flight,end])if(Math.min(p.x,p.z,fieldM-p.x,fieldM-p.z)<DASH_RULES.edgeMarginM)return no('直進距離が不足');
  const length=Math.hypot(end.x-plan.x,end.z-plan.z),steps=Math.ceil(length/10),right={x:Math.cos(plan.yaw),z:-Math.sin(plan.yaw)};
  for(let i=0;i<=steps;i++)for(const side of[-1,0,1]){const t=i/steps,x=plan.x+(end.x-plan.x)*t+right.x*side*16,z=plan.z+(end.z-plan.z)*t+right.z*side*16,ground=heightAt(x,z);if(!Number.isFinite(ground)||lowY-ground<DASH_RULES.minClearanceM)return no('地形から150 m以上');}
  const start={x:plan.x,y:lowY,z:plan.z},finish={x:end.x,y:lowY,z:end.z};if(obstacles.some(b=>intersectsSweptBox(start,finish,b,16+highY-lowY)))return no('直進先に障害物あり');
  return{ready:true,reason:'実行可能',plan};
}
