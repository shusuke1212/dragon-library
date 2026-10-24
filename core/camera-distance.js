export const CAMERA_MAX_DISTANCE=80;
export const CAMERA_DEFAULT_DISTANCE=18;
export const CAMERA_FIRST_PERSON_LIMIT=1;
export function clampCameraDistance(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(CAMERA_MAX_DISTANCE,n)):CAMERA_DEFAULT_DISTANCE}
export function sliderToCameraDistance(value){return clampCameraDistance(Math.expm1(Math.max(0,Math.min(100,Number(value)||0))/100*Math.log1p(CAMERA_MAX_DISTANCE)))}
export function cameraDistanceToSlider(distance){return Math.log1p(clampCameraDistance(distance))/Math.log1p(CAMERA_MAX_DISTANCE)*100}
export function cameraDistancePose(eye,distance,heightAt=()=>-Infinity,pivot=eye){
  const d=clampCameraDistance(distance);if(d<=CAMERA_FIRST_PERSON_LIMIT)return {...eye,mode:'rider'};
  const sy=Math.sin(eye.yaw),cy=Math.cos(eye.yaw),sp=Math.sin(eye.pitch),cp=Math.cos(eye.pitch),cr=Math.cos(eye.roll),sr=Math.sin(eye.roll);
  const forward={x:sy*cp,y:sp,z:cy*cp},up={x:-cy*sr-sy*sp*cr,y:cp*cr,z:sy*sr-cy*sp*cr},elevation=.28;
  const t=Math.max(0,Math.min(1,(d-CAMERA_FIRST_PERSON_LIMIT)/7)),orbitBlend=t*t*(3-2*t);
  // Near the eyes: look freely. Further back: orbit a fixed saddle anchor.
  const anchor={x:eye.x+(pivot.x-eye.x)*orbitBlend,y:eye.y+(pivot.y-eye.y)*orbitBlend,z:eye.z+(pivot.z-eye.z)*orbitBlend};
  let position={x:anchor.x+d*(-forward.x*Math.cos(elevation)+up.x*Math.sin(elevation)),y:anchor.y+d*(-forward.y*Math.cos(elevation)+up.y*Math.sin(elevation)),z:anchor.z+d*(-forward.z*Math.cos(elevation)+up.z*Math.sin(elevation))};
  // Stop before a terrain slope, keeping the camera above the ground.
  let safe=anchor;for(let i=1;i<=16;i++){const t=i/16,p={x:anchor.x+(position.x-anchor.x)*t,y:anchor.y+(position.y-anchor.y)*t,z:anchor.z+(position.z-anchor.z)*t};if(p.y<heightAt(p.x,p.z)+.6){position=safe;break}safe=p}
  if(Math.hypot(position.x-eye.x,position.y-eye.y,position.z-eye.z)<=CAMERA_FIRST_PERSON_LIMIT)return {...eye,mode:'rider'};
  const lookAhead=6*(1-orbitBlend),dx=anchor.x+forward.x*lookAhead-position.x,dy=anchor.y+forward.y*lookAhead-position.y,dz=anchor.z+forward.z*lookAhead-position.z;
  return {...position,yaw:Math.atan2(dx,dz),pitch:Math.atan2(dy,Math.hypot(dx,dz)),roll:eye.roll*Math.max(0,1-(d-1)/12),mode:'chase'};
}
