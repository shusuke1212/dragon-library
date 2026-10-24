// Canvas: +x points right, +z projects upward; positive rotation turns right.
export function radarHeading(yaw,width,height){return Math.atan2(Math.sin(yaw)*(width-28),Math.cos(yaw)*(height-28))}
