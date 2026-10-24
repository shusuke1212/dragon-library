const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x,0,1);return x*x*x*(x*(x*6-15)+10)};
export const ROLL_RULES=Object.freeze({minSpeedMps:160/3.6,maxSpeedMps:260/3.6,minClearanceM:120,maxAltitudeM:3050,edgeMarginM:2500,radiusM:16,entrySeconds:.18,foldHoldSeconds:.37,exitSeconds:.35,recoverySeconds:2});
export const rollDuration=ROLL_RULES.entrySeconds+ROLL_RULES.foldHoldSeconds+ROLL_RULES.exitSeconds;
// Swept bounds test includes the complete dragon, not only its centre point.
export function intersectsSweptBox(a,b,box,radius=ROLL_RULES.radiusM){
  let lo=0,hi=1;
  for(const axis of ['x','y','z']){const delta=b[axis]-a[axis],min=box.min[axis]-radius,max=box.max[axis]+radius;
    if(Math.abs(delta)<1e-8){if(a[axis]<min||a[axis]>max)return false;continue}
    let t0=(min-a[axis])/delta,t1=(max-a[axis])/delta;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);if(lo>hi)return false;
  }return true;
}
export function rollReadiness(flight,{phase='airborne',onFoot=false,busy=false,boundaryActive=false,fieldM,heightAt,obstacles=[]}={}){
  const no=reason=>({ready:false,reason});
  if(busy)return no('ローリング中');
  if(onFoot||phase!=='airborne'||flight.hovering||flight.hoverBlend>.02)return no('通常飛行で使用');
  if(![flight.x,flight.y,flight.z,flight.yaw,flight.pitch,flight.roll,flight.speedMps,flight.vx,flight.vy,flight.vz].every(Number.isFinite))return no('姿勢を整えてください');
  const speed=flight.speedMps;
  if(speed<ROLL_RULES.minSpeedMps||speed>ROLL_RULES.maxSpeedMps)return no('速度160〜260 km/h');
  if(Math.abs(flight.pitch)>.08||Math.abs(flight.roll)>.24||flight.stalled)return no('水平飛行で使用');
  if(boundaryActive)return no('空域の中央側へ');
  const horizontal=Math.hypot(flight.vx,flight.vz),plan={x:flight.x,y:flight.y,z:flight.z,yaw:flight.yaw,roll:flight.roll,vy:flight.vy,horizontal,angleOfAttack:flight.angleOfAttack||0};
  const end=rollPose(plan,rollDuration+ROLL_RULES.recoverySeconds),lowY=Math.min(flight.y,end.y),highY=Math.max(flight.y,end.y);
  if(highY>ROLL_RULES.maxAltitudeM)return no('高度を下げてください');
  for(const p of [flight,end])if(Math.min(p.x,p.z,fieldM-p.x,fieldM-p.z)<ROLL_RULES.edgeMarginM)return no('空域の中央側へ');
  const pathLength=horizontal*(rollDuration+ROLL_RULES.recoverySeconds),steps=Math.ceil(pathLength/16),right={x:Math.cos(flight.yaw),z:-Math.sin(flight.yaw)};
  for(let i=0;i<=steps;i++){const t=i/steps,x=flight.x+(end.x-flight.x)*t,z=flight.z+(end.z-flight.z)*t;
    for(const side of [-1,0,1]){const ground=heightAt(x+right.x*side*ROLL_RULES.radiusM,z+right.z*side*ROLL_RULES.radiusM);if(!Number.isFinite(ground)||lowY-ground<ROLL_RULES.minClearanceM)return no('地形から120 m以上');}
  }
  // The straight corridor plus two seconds after handoff is reserved upfront.
  const a={x:flight.x,y:lowY,z:flight.z},b={x:end.x,y:lowY,z:end.z};
  if(obstacles.some(box=>intersectsSweptBox(a,b,box,ROLL_RULES.radiusM+highY-lowY)))return no('前方に障害物あり');
  return{ready:true,reason:'実行可能',plan};
}
// Axial rotation overlaps both wing folding and reopening, with no pauses.
export function rollPose(plan,clock){
  const t=Math.max(0,clock),entry=ROLL_RULES.entrySeconds,e=Math.min(t,entry),vy=plan.vy*(1-e/entry),y=plan.y+plan.vy*(e-e*e/(2*entry)),vx=Math.sin(plan.yaw)*plan.horizontal,vz=Math.cos(plan.yaw)*plan.horizontal,pitch=Math.atan2(vy,plan.horizontal),spin=clamp(t/rollDuration,0,1),angleOfAttack=plan.angleOfAttack+(.06-plan.angleOfAttack)*smooth(t/entry);
  const roll=plan.roll+(Math.PI*2-plan.roll)*smooth(spin),brace=smooth(t/entry)*(1-smooth((t-entry-ROLL_RULES.foldHoldSeconds)/ROLL_RULES.exitSeconds));
  return{x:plan.x+vx*t,y,z:plan.z+vz*t,vx,vy,vz,yaw:plan.yaw,pitch,bodyPitch:pitch+angleOfAttack,angleOfAttack,roll,speedMps:Math.hypot(plan.horizontal,vy),brace,done:t>=rollDuration};
}
