// Heading-up map: world +z is north, +x is east. One isotropic scale
// keeps directions accurate on rectangular canvases; inverse is used for taps.
export function radarMapView(flight,width,height,rangeM=12000){
  return {x:flight.x,z:flight.z,yaw:flight.yaw,cx:width/2,cy:(height-14)/2,scale:Math.min(width-16,height-22)/rangeM};
}
export function worldToRadar(point,view){const dx=point.x-view.x,dz=point.z-view.z,c=Math.cos(view.yaw),s=Math.sin(view.yaw);return{x:view.cx+(dx*c-dz*s)*view.scale,y:view.cy-(dx*s+dz*c)*view.scale}}
export function radarToWorld(point,view){const right=(point.x-view.cx)/view.scale,forward=(view.cy-point.y)/view.scale,c=Math.cos(view.yaw),s=Math.sin(view.yaw);return{x:view.x+right*c+forward*s,z:view.z-right*s+forward*c}}
