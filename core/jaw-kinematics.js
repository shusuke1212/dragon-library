const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
// The reaction clock counts down; only the initial call window opens the jaw.
export function jawOpeningAngle(clock,reaction={}){
  const total=reaction.lookSeconds??4.6,duration=reaction.callSeconds??.7;
  if(duration<=0||clock<=0)return 0;
  const elapsed=total-clock;
  if(elapsed<=0||elapsed>=duration)return 0;
  return .38*smooth(elapsed/(duration*.24))*smooth((duration-elapsed)/(duration*.32));
}
// Rotate forward/up coordinates about the fixed transverse hinge.
export function rotateJawLocal(forward,up,angle){const c=Math.cos(angle),s=Math.sin(angle);return[forward*c+up*s,-forward*s+up*c]}

// Match the small chest breathing cycle, keeping a narrow resting mouth gap.
export function idleJawOpeningAngle(time,groundBlend=0,sleepBlend=0){
  const breathing=.048+.018*Math.sin(time*1.45);
  return breathing*clamp(groundBlend,0,1)*(1-clamp(sleepBlend,0,1)*.35);
}
