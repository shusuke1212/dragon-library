import{intersectsSweptBox}from'./acrobatics.js?v=123';
export function storyAirBounds(site){return site.faces.filter(f=>f.material!==4).map(f=>({min:Object.fromEntries(['x','y','z'].map(k=>[k,Math.min(...f.points.map(p=>p[k]))])),max:Object.fromEntries(['x','y','z'].map(k=>[k,Math.max(...f.points.map(p=>p[k]))]))}));}
// Visibility graph includes routes under the rib corridor and over tall structures.
export function planStoryLanding(start,target,site,heightAt){
  if(!site)return[target];const radius=16,bounds=site.airBounds??=storyAirBounds(site),center=site.center,ground=heightAt(center.x,center.z),peak=Math.max(ground,...bounds.map(b=>b.max.y)),high=Math.max(start.y,peak+30),edge=site.radiusM+35;
  const clear=(a,b)=>{const broad={minX:Math.min(a.x,b.x)-radius,maxX:Math.max(a.x,b.x)+radius,minY:Math.min(a.y,b.y)-radius,maxY:Math.max(a.y,b.y)+radius,minZ:Math.min(a.z,b.z)-radius,maxZ:Math.max(a.z,b.z)+radius};if(bounds.some(box=>box.max.x>=broad.minX&&box.min.x<=broad.maxX&&box.max.y>=broad.minY&&box.min.y<=broad.maxY&&box.max.z>=broad.minZ&&box.min.z<=broad.maxZ&&intersectsSweptBox(a,b,box,radius)))return false;
    const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/12));for(let i=0;i<=steps;i++){const t=i/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=a.y+(b.y-a.y)*t;if(y-heightAt(x,z)<18)return false;}return true;};
  const end={...target,y:target.hoverY};if(clear(start,end))return[target];
  const nodes=[{x:start.x,y:start.y,z:start.z},end,{x:target.x,y:high,z:target.z},{x:start.x,y:high,z:start.z}];
  for(let i=0;i<8;i++){const a=i*Math.PI/4,x=center.x+Math.sin(a)*edge,z=center.z+Math.cos(a)*edge;for(const y of new Set([start.y,high,ground+40]))nodes.push({x,y:Math.max(y,heightAt(x,z)+25),z});}
  const cost=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),visited=new Set(),cache=new Map();cost[0]=0;
  while(visited.size<nodes.length){let u=-1;for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(u<0||cost[i]<cost[u]))u=i;if(u<0||!Number.isFinite(cost[u]))break;if(u===1){const route=[];for(let i=1;i!==0;i=prev[i])route.push({...target,x:nodes[i].x,z:nodes[i].z,hoverY:nodes[i].y});return route.reverse();}visited.add(u);for(let v=0;v<nodes.length;v++){if(visited.has(v)||v===u)continue;const a=nodes[u],b=nodes[v],d=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),next=cost[u]+d;if(next>=cost[v])continue;const key=[Math.min(u,v),Math.max(u,v)].join(',');if(!cache.has(key))cache.set(key,clear(a,b));if(cache.get(key)){cost[v]=next;prev[v]=u;}}}
  return null;
}
