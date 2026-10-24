const clamp=x=>Math.max(0,Math.min(1,x));
// Shared by the mesh and the seat camera so resting never detaches the rider.
export function groundRestPose(flight,landing,behavior,profile,time=0){
  const rest=clamp(behavior.restBlend||0)*clamp(landing.blend||0),sleep=clamp(behavior.sleepBlend||0)*rest;
  const breathing=landing.phase==='landed'?Math.sin(time*1.45)*(1-sleep*.35)*.035:0;
  return{rest,sleep,angle:(flight.acroLoop||landing.phase==='approaching'?flight.bodyPitch:flight.angleOfAttack)-rest*.36,centerY:flight.y-rest*((profile.groundCenterM??2.4)-.82)+breathing};
}
