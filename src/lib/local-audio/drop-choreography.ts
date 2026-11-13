/** A drop has a reveal, a short cut, call/response, then slower musical phrases. */
export function dropLookAt(age: number | null, fallback: number) {
  return age === null ? fallback : age < 1 ? 31 : age < 4 ? 1 : age < 8 ? 20 : age < 16 ? 32 : 34;
}
export function dropShutterAt(age: number | null, floor: boolean, pair: number) {
  if(age === null || age < 0)return false;
  if(age < .75)return true;
  if(age < 1)return false;
  if(age < 2)return (pair+Number(floor))%2===0;
  if(age < 4)return Math.floor(age*2)%2===Number(floor);
  if(age < 8)return Math.floor(age)%4!==3 || age%1<.4;
  const half=age*.5;
  return (pair===1)===((Math.floor(half)+Number(floor))%2===0) && half%1<.58;
}

/** Four eye projectors answer the ceiling rig on the half phrase. */
export function eyeDropTarget(age:number, side:number, eye:number, fan:number, motion:number):[number,number,number] {
  if(age<1)return [fan*13,6.2+side*fan*.5,25];
  if(age<4)return [-side*(5+fan*5),5.6+fan*2.8,25];
  if(age<8)return [fan*13,5.5+Math.sin(motion*.25+eye*Math.PI)*2,25];
  const angle=fan*Math.PI+motion*.14+eye*Math.PI*.5;
  return [Math.cos(angle)*10,6+Math.sin(angle)*3,25];
}
