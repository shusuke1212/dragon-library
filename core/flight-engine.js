const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const approach=(value,target,rate,dt)=>value+(target-value)*Math.min(1,rate*dt);
const length=(x,y,z)=>Math.hypot(x,y,z);
const normalize=(x,y,z,fallback=[0,0,1])=>{const n=length(x,y,z);return n>.0001?[x/n,y/n,z/n]:fallback};

export const DEFAULT_FLIGHT_CONFIG=Object.freeze({
  gravity:9.81,
  cruiseSpeedMps:55.6,
  stallSpeedMps:18,
  levelMaxSpeedMps:77.8,
  diveMaxSpeedMps:97.2,
  maxRollRad:1.05,
  rollRateRad:1.18,
  rollStability:.48,
  rollReturnDelay:.28,
  pitchStability:2.25,
  pitchReturnDelay:.32,
  pitchDeadbandRad:.045,
  pitchReturnLimit:.7,
  pullLiftRange:1.25,
  angleOfAttackRad:.12,
  thrustAccel:5.2,
  dragBase:.45,
  dragAtLevelMax:2.8,
  airbrakeAccel:5.2,
  hoverYawRate:.55,
  hoverVerticalAccel:7,
  hoverVerticalDamping:1.9
});

export const DEFAULT_ASSIST_CONFIG=Object.freeze({
  minimumClearanceM:20,
  terrainBufferM:8,
  pulloutReactionSeconds:.34,
  pulloutNormalAccelMps2:22.1,
  assistRampMinM:28,
  assistRampMaxM:72,
  recoverySpeedMps:46,
  brakingRecoverySpeedMps:30,
  minimumSpeedMps:24
});

export function createFlightState({x=0,y=0,z=0,yaw=0,pitch=0,roll=0,speedMps=55.6}={}){
  const state={x,y,z,yaw,pitch,bodyPitch:pitch,roll,speedMps,vx:0,vy:0,vz:0,angleOfAttack:0,rollNeutralTime:0,pitchNeutralTime:0,hoverVerticalMps:0,hoverBlend:0,hoverClock:0,hovering:false,stalled:false,status:'巡航'};
  return setFlightPath(state,{yaw,pitch,speedMps});
}

export function setFlightPath(state,{yaw=state.yaw,pitch=state.pitch,speedMps=state.speedMps}={}){
  const horizontal=Math.cos(pitch);state.vx=Math.sin(yaw)*horizontal*speedMps;state.vy=Math.sin(pitch)*speedMps;state.vz=Math.cos(yaw)*horizontal*speedMps;state.yaw=yaw;state.pitch=pitch;state.speedMps=speedMps;state.bodyPitch=pitch+(state.angleOfAttack||0);return state;
}

export function computeFlightAssist(state,userControls,environment={},overrides={}){
  if(state.hovering)return{...userControls,pitch:clamp(userControls.pitch||0,-1,1),boost:!!userControls.boost,brake:!!userControls.brake,status:state.hoverBlend<.82?'滞空移行':'滞空',terrainNeed:0,speedNeed:0,pullout:null};
  const c={...DEFAULT_ASSIST_CONFIG,...overrides},braking=!!userControls.brake,targetSpeed=braking?c.brakingRecoverySpeedMps:c.recoverySpeedMps;
  const clearance=environment.clearanceM??Infinity,pullout=predictPullout(state,environment,c),descending=state.vy<-1||state.pitch<-.025||(environment.terrainRiseM||0)>2;
  const ramp=clamp(state.speedMps*.65,c.assistRampMinM,c.assistRampMaxM),terrainNeed=descending?clamp((pullout.requiredClearanceM+ramp-clearance)/ramp,0,1):0;
  const speedNeed=clamp((targetSpeed-state.speedMps)/Math.max(1,targetSpeed-c.minimumSpeedMps),0,1);
  let pitch=clamp(userControls.pitch||0,-1,1),status='';
  if(terrainNeed>0){pitch=Math.max(pitch,.18+terrainNeed*.82);status=terrainNeed>.7?'引き起こし':'地形予測'}
  else if(speedNeed>0){pitch=Math.min(pitch,-speedNeed*.55);status='自動加速'}
  return{...userControls,pitch,boost:!!userControls.boost||terrainNeed>.12||speedNeed>0,brake:braking&&state.speedMps>c.brakingRecoverySpeedMps,status,terrainNeed,speedNeed,pullout};
}

export function predictPullout(state,environment={},overrides={}){
  const c={...DEFAULT_ASSIST_CONFIG,...overrides},speed=Math.max(c.minimumSpeedMps,state.speedMps),descentAngle=clamp(-state.pitch,0,Math.PI/2),normalAccel=Math.max(1,c.pulloutNormalAccelMps2),radius=speed*speed/normalAccel;
  const arcLossM=radius*(1-Math.cos(descentAngle)),reactionLossM=Math.max(0,-state.vy)*c.pulloutReactionSeconds,terrainRiseM=Math.max(0,environment.terrainRiseM||0),requiredClearanceM=c.minimumClearanceM+c.terrainBufferM+arcLossM+reactionLossM+terrainRiseM;
  const horizontalM=Math.max(120,Math.cos(descentAngle)*speed*c.pulloutReactionSeconds+radius*Math.sin(descentAngle));
  return{requiredClearanceM,arcLossM,reactionLossM,terrainRiseM,radiusM:radius,horizontalM};
}

export function computeBoundaryAssist(state,bounds,overrides={}){
  const c={minimumMarginM:1800,extraMarginM:750,lookAheadSeconds:8,maxTurnRollRad:.75,...overrides},speed=Math.max(24,state.speedMps),turnRadius=speed*speed/(DEFAULT_FLIGHT_CONFIG.gravity*Math.tan(c.maxTurnRollRad)),margin=Math.max(c.minimumMarginM,turnRadius+c.extraMarginM),px=state.x+state.vx*c.lookAheadSeconds,pz=state.z+state.vz*c.lookAheadSeconds;
  const edgeDistance=Math.min(px-bounds.minX,bounds.maxX-px,pz-bounds.minZ,bounds.maxZ-pz);if(edgeDistance>=margin)return{active:false,roll:0,pitch:0,urgency:0,marginM:margin,turnRadiusM:turnRadius};
  const targetYaw=Math.atan2((bounds.minX+bounds.maxX)*.5-state.x,(bounds.minZ+bounds.maxZ)*.5-state.z),delta=Math.atan2(Math.sin(targetYaw-state.yaw),Math.cos(targetYaw-state.yaw)),urgency=clamp((margin-edgeDistance)/margin,0,1);
  return{active:true,roll:Math.sign(delta||1)*(.28+urgency*.72),pitch:.16+urgency*.3,urgency,marginM:margin,turnRadiusM:turnRadius};
}

export function enforceFlightEnvelope(state,groundHeightM,overrides={}){
  const c={...DEFAULT_ASSIST_CONFIG,...overrides},minimumY=groundHeightM+c.minimumClearanceM;
  let corrected=false;
  if(state.hovering){if(state.y<minimumY){state.y=minimumY;state.vy=Math.max(0,state.vy);state.hoverVerticalMps=Math.max(0,state.hoverVerticalMps);state.status='安全回復';return true}return false}
  if(state.y<minimumY){state.y=minimumY;setFlightPath(state,{pitch:Math.max(.12,state.pitch),speedMps:Math.max(c.minimumSpeedMps,state.speedMps)});corrected=true}
  if(state.speedMps<c.minimumSpeedMps){setFlightPath(state,{pitch:state.y<=minimumY+25?Math.max(.08,state.pitch):Math.min(-.08,state.pitch),speedMps:c.minimumSpeedMps});corrected=true}
  if(corrected){state.stalled=false;state.status='安全回復'}
  return corrected;
}

export function toggleHover(state,enabled=!state.hovering){
  if(enabled&&!state.hovering&&state.speedMps>DEFAULT_FLIGHT_CONFIG.stallSpeedMps*1.9){state.status='滞空には速すぎる';return false}
  state.hovering=enabled;
  if(enabled){state.hoverBlend=0;state.hoverClock=0;state.hoverVerticalMps=state.vy;state.status='滞空移行'}
  else setFlightPath(state,{speedMps:Math.max(DEFAULT_FLIGHT_CONFIG.stallSpeedMps*1.25,state.speedMps),pitch:.04});
  return state.hovering;
}

export function stepFlight(state,input,dt,overrides={}){
  const c={...DEFAULT_FLIGHT_CONFIG,...overrides},safeDt=clamp(dt,0,.05);
  if(state.hovering)return stepHover(state,input,safeDt,c);

  const rollInput=clamp(input.roll||0,-1,1),requestedPull=clamp(input.pitch||0,-1,1);
  if(rollInput){state.rollNeutralTime=0;state.roll=clamp(state.roll+rollInput*c.rollRateRad*safeDt,-c.maxRollRad,c.maxRollRad)}else{state.rollNeutralTime+=safeDt;if(state.rollNeutralTime>c.rollReturnDelay)state.roll=approach(state.roll,0,c.rollStability,safeDt)}
  let pullInput=requestedPull;if(Math.abs(requestedPull)>.001)state.pitchNeutralTime=0;else{state.pitchNeutralTime+=safeDt;if(state.pitchNeutralTime>c.pitchReturnDelay&&Math.abs(state.pitch)>c.pitchDeadbandRad)pullInput=clamp(-state.pitch*c.pitchStability,-c.pitchReturnLimit,c.pitchReturnLimit)}
  state.angleOfAttack=approach(state.angleOfAttack,pullInput*c.angleOfAttackRad,3.4,safeDt);

  let speed=length(state.vx,state.vy,state.vz),forward=normalize(state.vx,state.vy,state.vz,[Math.sin(state.yaw),0,Math.cos(state.yaw)]);
  const flatRight=normalize(forward[2],0,-forward[0],[Math.cos(state.yaw),0,-Math.sin(state.yaw)]);
  const wingUp=normalize(
    forward[1]*flatRight[2]-forward[2]*flatRight[1],
    forward[2]*flatRight[0]-forward[0]*flatRight[2],
    forward[0]*flatRight[1]-forward[1]*flatRight[0],
    [0,1,0]
  );
  const liftDirection=normalize(
    wingUp[0]*Math.cos(state.roll)+flatRight[0]*Math.sin(state.roll),
    wingUp[1]*Math.cos(state.roll)+flatRight[1]*Math.sin(state.roll),
    wingUp[2]*Math.cos(state.roll)+flatRight[2]*Math.sin(state.roll),
    wingUp
  );

  state.stalled=speed<c.stallSpeedMps;
  const liftAuthority=clamp(Math.pow(speed/c.stallSpeedMps,2),0,1);
  const loadFactor=(1+pullInput*c.pullLiftRange)*liftAuthority;
  const liftAccel=c.gravity*loadFactor;
  const throttle=input.boost?1:input.brake?.12:.45;
  const speedRatio=speed/c.diveMaxSpeedMps;
  const thrust=c.thrustAccel*throttle*Math.max(.18,1-.55*speedRatio*speedRatio);
  const profileDrag=c.dragBase+c.dragAtLevelMax*Math.pow(speed/c.levelMaxSpeedMps,2);
  const inducedDrag=.8*Math.pow(Math.sin(state.roll),2)+.5*Math.max(0,loadFactor-1);
  const brakeDrag=input.brake?c.airbrakeAccel*(.45+speed/c.levelMaxSpeedMps):0;
  const along=thrust-profileDrag-inducedDrag-brakeDrag;

  state.vx+=(forward[0]*along+liftDirection[0]*liftAccel)*safeDt;
  state.vy+=(forward[1]*along+liftDirection[1]*liftAccel-c.gravity)*safeDt;
  state.vz+=(forward[2]*along+liftDirection[2]*liftAccel)*safeDt;
  speed=length(state.vx,state.vy,state.vz);
  if(speed>c.diveMaxSpeedMps){const scale=c.diveMaxSpeedMps/speed;state.vx*=scale;state.vy*=scale;state.vz*=scale;speed=c.diveMaxSpeedMps}

  state.x+=state.vx*safeDt;state.y+=state.vy*safeDt;state.z+=state.vz*safeDt;
  state.speedMps=speed;state.yaw=speed>.05?Math.atan2(state.vx,state.vz):state.yaw;state.pitch=speed>.05?Math.asin(clamp(state.vy/speed,-1,1)):state.pitch;state.bodyPitch=clamp(state.pitch+state.angleOfAttack,-1.35,1.35);state.status=flightStatus(state,c);
  return state;
}

function stepHover(state,input,dt,c){
  state.hoverClock+=dt;state.hoverBlend=approach(state.hoverBlend,1,1.45,dt);state.roll=approach(state.roll,0,2.4,dt);state.yaw+=(input.roll||0)*c.hoverYawRate*(.55+state.hoverBlend*.45)*dt;
  const horizontalDamping=1.15+state.hoverBlend*1.9;state.vx=approach(state.vx,0,horizontalDamping,dt);state.vz=approach(state.vz,0,horizontalDamping,dt);const verticalTarget=(input.pitch||0)*7+Math.sin(state.hoverClock*2.2)*.22;state.vy=approach(state.vy,verticalTarget,1.7+state.hoverBlend*1.3,dt);state.hoverVerticalMps=state.vy;
  state.x+=state.vx*dt;state.y+=state.vy*dt;state.z+=state.vz*dt;state.speedMps=length(state.vx,state.vy,state.vz);state.pitch=0;state.bodyPitch=approach(state.bodyPitch,.42+(input.pitch||0)*.045,2.2,dt);state.angleOfAttack=approach(state.angleOfAttack,.42,2.35,dt);
  if(input.boost){state.hovering=false;state.hoverBlend=0;setFlightPath(state,{speedMps:Math.max(c.stallSpeedMps*1.25,state.speedMps),pitch:.04})}
  state.stalled=false;state.status=state.hovering?(state.hoverBlend<.82?'滞空移行':'滞空'):'再加速';return state;
}

export function flightStatus(state,config=DEFAULT_FLIGHT_CONFIG){
  if(state.hovering)return'滞空';if(state.stalled)return'失速';if(state.pitch<-.38&&state.speedMps>config.levelMaxSpeedMps)return'急降下';if(state.pitch>.12)return'上昇';if(state.pitch<-.12)return'降下';if(state.speedMps>config.levelMaxSpeedMps*.92)return'高速滑空';return'巡航';
}

export function kineticAltitudeM(speedMps){return speedMps*speedMps/(2*DEFAULT_FLIGHT_CONFIG.gravity)}
