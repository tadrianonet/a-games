export type Platform = {x:number;y:number;width:number}
export function level(world:number){
 const count=13+world
 const ground:Platform[]=Array.from({length:count},(_,i)=>({x:150+i*470,y:476,width:i===0?380:i===count-1?520:340}))
 const ledges:Platform[]=Array.from({length:count-1},(_,i)=>({x:385+i*470,y:world===2&&i%3===1?335:365,width:150}))
 const upper=ledges.filter((_,i)=>i%2===0).map(p=>({x:p.x+105,y:p.y-95,width:125}))
 const stars=[...ground.map(p=>[p.x,410]),...ledges.map(p=>[p.x,p.y-60]),...upper.map(p=>[p.x,p.y-60])].slice(0,30)
 const lumas=[ledges[2],ledges[6],ledges[10]].map(p=>[p.x+25,p.y-62])
 return {width:count*470+100,ground,ledges:[...ledges,...upper],stars,lumas,checkpoints:[ground[4].x,ground[8].x],portal:ground[count-1].x+80}
}
export const MAX_LIVES=5
export function damage(lives:number,now:number,protectedUntil:number,fall=false){
 if(lives<=0||(!fall&&now<protectedUntil))return {lives,hit:false}
 return {lives:Math.max(0,lives-1),hit:true}
}
