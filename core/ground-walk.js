import{blocksGroundPoint}from'./story-collision.js?v=137';
export const WALK_RADIUS=12,EYE_HEIGHT=1.65;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function localPoint(p,dragon){const dx=p.x-dragon.x,dz=p.z-dragon.z,c=Math.cos(dragon.yaw),s=Math.sin(dragon.yaw);return{r:dx*c-dz*s,f:dx*s+dz*c}}
export function insideDragon(p,dragon){const q=localPoint(p,dragon);
  // Clearance around torso, neck/head, and the tapered tail.
  if((q.f/1.9)**2+(q.r/1.35)**2<1)return true;
  const neckF=clamp(q.f,1.3,4.6);if(Math.hypot(q.f-neckF,q.r)<.7)return true;
  const tailF=clamp(q.f,-7.4,-1.3),tailR=.22+.26*clamp((q.f+7.4)/6.1,0,1);return Math.hypot(q.f-tailF,q.r)<tailR;
}
export function dismountPose(dragon,heightAt){const right={x:Math.cos(dragon.yaw),z:-Math.sin(dragon.yaw)},forward={x:Math.sin(dragon.yaw),z:Math.cos(dragon.yaw)},x=dragon.x+right.x*3.3+forward.x*.4,z=dragon.z+right.z*3.3+forward.z*.4,target={x:dragon.x+forward.x*2.6,z:dragon.z+forward.z*2.6};return{active:true,x,z,y:heightAt(x,z)+EYE_HEIGHT,yaw:Math.atan2(target.x-x,target.z-z),pitch:0,speed:0}}
export function stepGroundWalk(state,input,dt,dragon,heightAt,site=null){
  const forward=clamp(input.forward||0,-1,1),strafe=clamp(input.strafe||0,-1,1),n=Math.max(1,Math.hypot(forward,strafe)),distance=(site?.speedMps||1.8)*Math.max(0,Math.min(.05,dt)),dx=(Math.sin(state.yaw)*forward+Math.cos(state.yaw)*strafe)*distance/n,dz=(Math.cos(state.yaw)*forward-Math.sin(state.yaw)*strafe)*distance/n;
  const oldX=state.x,oldZ=state.z;
  const origin=site?.center||dragon,radius=site?.radiusM||WALK_RADIUS;
  const accept=p=>Math.hypot(p.x-origin.x,p.z-origin.z)<=radius&&!insideDragon(p,dragon)&&!(site?.colliders||[]).some(b=>blocksGroundPoint(p,b));
  const proposed={x:state.x+dx,z:state.z+dz};
  if(accept(proposed)){state.x=proposed.x;state.z=proposed.z}else{
    if(accept({x:state.x+dx,z:state.z}))state.x+=dx;
    if(accept({x:state.x,z:state.z+dz}))state.z+=dz;
  }
  state.y=heightAt(state.x,state.z)+EYE_HEIGHT;state.speed=dt>0?Math.hypot(state.x-oldX,state.z-oldZ)/dt:0;state.pitch=clamp(state.pitch,-1.2,1.2);return state;
}
