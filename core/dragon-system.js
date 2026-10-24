const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const smooth01=value=>{const t=clamp(value,0,1);return t*t*(3-2*t)};
const approach=(value,target,rate,dt)=>value+(target-value)*(1-Math.exp(-rate*dt));

// Persistent companion behaviour. Region packages only describe the things the
// dragon can notice; anatomy, safety reflexes and idle temperament live here.
export function createDragonBehavior(){return{idleSeconds:0,restBlend:0,sleepBlend:0,lookYaw:0,lookLift:0,callClock:0,alertBlend:0,windBrace:0,noticed:new Set(),reactionTarget:null,reactionMode:'interest'}}

export function advanceDragonBehavior(state,dt,{landed=false,waking=false,lookYawTarget=0,lookLiftTarget=0,windStrength=0,alert=0}={},profile){
  const idle=profile.groundIdle;
  state.idleSeconds=landed?state.idleSeconds+dt:0;
  const restTarget=landed?smooth01((state.idleSeconds-idle.lieDownSeconds)/10):0;
  const sleepTarget=landed?smooth01((state.idleSeconds-idle.asleepSeconds)/12):0;
  state.restBlend=approach(state.restBlend,restTarget,waking?4:1.25,dt);
  state.sleepBlend=approach(state.sleepBlend,sleepTarget,waking?5:1.1,dt);
  state.lookYaw=approach(state.lookYaw,lookYawTarget,state.sleepBlend>.5?.7:2.4,dt);
  state.lookLift=approach(state.lookLift,lookLiftTarget,2.2,dt);
  state.alertBlend=approach(state.alertBlend,alert,4.2,dt);
  state.windBrace=approach(state.windBrace,clamp(windStrength,0,1),2.7,dt);
  state.callClock=Math.max(0,state.callClock-dt);
  return state;
}

export function computeTerrainAwareness(flight,terrainHeight,profile){
  const sensor=profile.collision.wingSensor,forward=profile.collision.forwardSensor;
  const fx=Math.sin(flight.yaw),fz=Math.cos(flight.yaw),rx=Math.cos(flight.yaw),rz=-Math.sin(flight.yaw);
  const ahead=Math.max(sensor.lookAheadM,Math.min(42,flight.speedMps*.32));
  const tipClearance=side=>flight.y-terrainHeight(flight.x+fx*ahead+rx*sensor.halfSpanM*side,flight.z+fz*ahead+rz*sensor.halfSpanM*side);
  const risk=(clearance,threshold)=>clamp((threshold-clearance)/Math.max(1,threshold),0,1);
  const leftRisk=risk(tipClearance(-1),sensor.clearanceM),rightRisk=risk(tipClearance(1),sensor.clearanceM);
  let forwardRisk=0;
  for(const distance of forward.distancesM){const ground=terrainHeight(flight.x+fx*distance,flight.z+fz*distance);forwardRisk=Math.max(forwardRisk,risk(flight.y-ground,forward.clearanceM+distance*.08))}
  const wingRisk=Math.max(leftRisk,rightRisk),pitch=Math.max(forwardRisk,wingRisk*.35)*profile.collision.maxAutoPitchInput;
  const roll=(leftRisk-rightRisk)*profile.collision.maxAutoRollInput;
  return{active:forwardRisk>.02||wingRisk>.02,roll,pitch,forwardRisk,wingRisk,leftRisk,rightRisk};
}

export function reactionLook(flight,target){
  if(!target)return{yaw:0,lift:0};
  const wanted=Math.atan2(target.x-flight.x,target.z-flight.z),delta=Math.atan2(Math.sin(wanted-flight.yaw),Math.cos(wanted-flight.yaw));
  return{yaw:clamp(delta,-.82,.82),lift:clamp(((target.y??flight.y)-flight.y)/900,-.42,.32)};
}

// Avoidance is additive only while a sensor actually sees danger. A zero-risk
// sensor must never erase the rider's intentional nose-down input.
export function mergeAvoidanceControls(baseRoll,basePitch,awareness){
  if(!awareness?.active)return{roll:clamp(baseRoll,-1,1),pitch:clamp(basePitch,-1,1)};
  return{roll:clamp(baseRoll+(awareness.roll||0),-1,1),pitch:clamp(Math.max(basePitch,awareness.pitch||0),-1,1)};
}

export function shouldBeginAutoLanding({phase,candidate,requested=false,holdSeconds=0}){
  return phase==='airborne'&&!!candidate&&(requested||holdSeconds>.45);
}

// Quiet, independent glances; no flap-synchronised bobbing of the rider's view.
export function flightIdleLook(time,{roll=0,controlAmount=0,alert=0}={}){
  const calm=(1-clamp(Math.abs(roll)/.9,0,1)*.7)*(1-clamp(controlAmount,0,1)*.65)*(1-clamp(alert,0,1)*.8);
  return{yaw:(.09*Math.sin(time*.32)+.025*Math.sin(time*.73+.8))*calm,lift:(.075*Math.sin(time*.43+1.1)+.025*Math.sin(time*1.07))*calm};
}
