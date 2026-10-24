const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
// No unconditional climb. Add clearance only where sampled terrain requires it.
export function approachTerrainLift(start,target,heightAt){
  let lift=0;
  for(let i=1;i<40;i++){const u=i/40,t=smooth(u),x=start.x+(target.x-start.x)*t,z=start.z+(target.z-start.z)*t,y=start.y+(target.hoverY-start.y)*t,needed=heightAt(x,z)+18-y;
    if(needed>0)lift=Math.max(lift,(needed+2)/Math.sin(Math.PI*u)**2);
  }
  return lift;
}
export function landingApproachPose(start,clock,duration){
  duration=Math.max(.1,duration);const raw=clamp(clock/duration,0,1),t=smooth(raw),rate=6*raw*(1-raw)/duration,dx=start.target.x-start.x,dz=start.target.z-start.z,dy=start.target.hoverY-start.y,lift=start.terrainLift||0,bump=Math.sin(Math.PI*raw)**2*lift;
  const vx=dx*rate,vz=dz*rate,vy=dy*rate+lift*Math.PI*Math.sin(2*Math.PI*raw)/duration,distance=Math.hypot(dx,dz),pathPitch=Math.atan2(vy,Math.max(.1,Math.hypot(vx,vz))),flare=smooth((raw-.72)/.28),entryPitch=clamp(Math.atan2(dy,Math.max(80,distance)),-.30,.12),handoff=smooth(clock/.85),initial=start.bodyPitch??.1;
  const aim=lift>0?clamp(pathPitch,-.30,.25):entryPitch,bodyPitch=(initial+(aim-initial)*handoff)*(1-flare)+.42*flare;
  return{x:start.x+dx*t,y:start.y+dy*t+bump,z:start.z+dz*t,vx,vy,vz,pathPitch,bodyPitch,flare,raw};
}

// The final vertical leg has its own timing, independent of manual hover controls.
export function landingDescentPose(startY,contactY,clock,config={}){
  const distance=Math.max(0,startY-contactY),duration=distance===0?0:clamp(distance/(config.descentMeanSpeedMps||7),config.minDescentSeconds||1.6,config.maxDescentSeconds||5),raw=duration?clamp(clock/duration,0,1):1,t=smooth(raw);
  return{y:Math.max(contactY,startY-distance*t),vy:duration&&raw>0&&raw<1?-distance*6*raw*(1-raw)/duration:0,raw,blend:t,duration,done:raw>=1};
}
