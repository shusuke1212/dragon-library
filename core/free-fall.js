import{intersectsSweptBox}from'./acrobatics.js?v=120';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x,0,1);return x*x*x*(x*(x*6-15)+10)},integral=x=>2.5*x**4-3*x**5+x**6;
export const FALL_RULES=Object.freeze({gravity:9.81,minSpeedMps:160/3.6,maxSpeedMps:320/3.6,minStartClearanceM:450,minClearanceM:150,exitReserveM:250,maxFallSeconds:9,minFallSeconds:3.5,pulloutSeconds:2.4,recoverySeconds:2,maxExitSpeedMps:350/3.6,maxAltitudeM:3050,edgeMarginM:2500,radiusM:16});
export function fallPose(plan,clock){
  const t=Math.max(0,clock),f=Math.min(t,plan.fallSeconds),r=FALL_RULES.pulloutSeconds,u=clamp((t-plan.fallSeconds)/r,0,1),g=FALL_RULES.gravity,down=plan.vy-g*plan.fallSeconds;
  const horizontal=plan.horizontal+(plan.exitSpeed-plan.horizontal)*smooth(u),vy=t<=plan.fallSeconds?plan.vy-g*t:down*(1-smooth(u));
  const distance=plan.horizontal*f+plan.horizontal*r*u+(plan.exitSpeed-plan.horizontal)*r*integral(u)+plan.exitSpeed*Math.max(0,t-plan.duration);
  const y=plan.y+plan.vy*f-.5*g*f*f+down*r*(u-integral(u)),pitch=Math.atan2(vy,horizontal),entry=smooth(t/.45),angleOfAttack=plan.angleOfAttack+(.025-plan.angleOfAttack)*entry+(.06-.025)*smooth(u);
  // Begin opening before the pullout: the wings catch air while the dive still has momentum.
  const opening=smooth((t-(plan.fallSeconds-.35))/1.05),brace=smooth(t/.45)*(1-opening);
  return{x:plan.x+Math.sin(plan.yaw)*distance,y,z:plan.z+Math.cos(plan.yaw)*distance,vx:Math.sin(plan.yaw)*horizontal,vy,vz:Math.cos(plan.yaw)*horizontal,yaw:plan.yaw,pitch,bodyPitch:pitch+angleOfAttack,angleOfAttack,roll:plan.roll*(1-entry),speedMps:Math.hypot(horizontal,vy),brace,acroLoop:false,done:t>=plan.duration};
}
export function fallReadiness(flight,{phase='airborne',onFoot=false,busy=false,boundaryActive=false,fieldM,heightAt,obstacles=[]}={}){
  const no=reason=>({ready:false,reason});if(busy)return no('自動操縦中');if(onFoot||phase!=='airborne'||flight.hovering||flight.hoverBlend>.02)return no('通常飛行で使用');
  if(![flight.x,flight.y,flight.z,flight.yaw,flight.pitch,flight.roll,flight.speedMps,flight.vx,flight.vy,flight.vz].every(Number.isFinite))return no('姿勢を整えてください');
  if(flight.speedMps<FALL_RULES.minSpeedMps||flight.speedMps>FALL_RULES.maxSpeedMps)return no('速度160〜320 km/h');
  if(Math.abs(flight.pitch)>.08||Math.abs(flight.roll)>.18||flight.stalled)return no('水平飛行で使用');if(boundaryActive)return no('空域の中央側へ');
  const ground=heightAt(flight.x,flight.z),clearance=flight.y-ground;if(!Number.isFinite(ground)||clearance<FALL_RULES.minStartClearanceM)return no('地形から450 m以上');if(flight.y>FALL_RULES.maxAltitudeM)return no('高度を下げてください');
  const g=FALL_RULES.gravity,r=FALL_RULES.pulloutSeconds,b=g*r/2-flight.vy,c=-(clearance-FALL_RULES.exitReserveM)-flight.vy*r/2;
  const fallSeconds=Math.min(FALL_RULES.maxFallSeconds,(-b+Math.sqrt(b*b-2*g*c))/g);if(fallSeconds<FALL_RULES.minFallSeconds)return no('落下高度が不足');
  const horizontal=Math.hypot(flight.vx,flight.vz),drop=.5*g*fallSeconds**2-flight.vy*fallSeconds+(g*fallSeconds-flight.vy)*r/2;
  const plan={x:flight.x,y:flight.y,z:flight.z,yaw:flight.yaw,roll:flight.roll,vy:flight.vy,horizontal,angleOfAttack:flight.angleOfAttack||0,fallSeconds,duration:fallSeconds+r,exitSpeed:Math.min(FALL_RULES.maxExitSpeedMps,Math.sqrt(horizontal**2+2*g*drop))};
  const steps=Math.ceil((plan.duration+FALL_RULES.recoverySeconds)/.05),points=Array.from({length:steps+1},(_,i)=>fallPose(plan,i*(plan.duration+FALL_RULES.recoverySeconds)/steps)),right={x:Math.cos(plan.yaw),z:-Math.sin(plan.yaw)};
  const bounds={minX:Math.min(...points.map(p=>p.x))-16,maxX:Math.max(...points.map(p=>p.x))+16,minY:Math.min(...points.map(p=>p.y))-16,maxY:Math.max(...points.map(p=>p.y))+16,minZ:Math.min(...points.map(p=>p.z))-16,maxZ:Math.max(...points.map(p=>p.z))+16};
  const nearby=obstacles.filter(b=>b.max.x>=bounds.minX&&b.min.x<=bounds.maxX&&b.max.y>=bounds.minY&&b.min.y<=bounds.maxY&&b.max.z>=bounds.minZ&&b.min.z<=bounds.maxZ);
  for(let i=0;i<points.length;i++){const p=points[i];if(p.y>FALL_RULES.maxAltitudeM)return no('高度を下げてください');if(Math.min(p.x,p.z,fieldM-p.x,fieldM-p.z)<FALL_RULES.edgeMarginM)return no('立て直す空域が不足');
    for(const side of[-1,0,1]){const h=heightAt(p.x+right.x*side*16,p.z+right.z*side*16);if(!Number.isFinite(h)||p.y-h<FALL_RULES.minClearanceM)return no('落下先の地形が高い');}
    if(i&&nearby.some(b=>intersectsSweptBox(points[i-1],p,b,17)))return no('落下先に障害物あり');
  }
  return{ready:true,reason:'実行可能',plan};
}
