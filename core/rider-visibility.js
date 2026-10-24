// A neutral traveller should not block the close inspection camera.
export function riderVisibility(camera,head){
  if(camera.mode==='foot'||camera.mode==='rider')return 0;
  const distance=Math.hypot(camera.x-head.x,camera.y-head.y,camera.z-head.z),t=Math.max(0,Math.min(1,(distance-2)/2.2));
  return t*t*(3-2*t);
}
