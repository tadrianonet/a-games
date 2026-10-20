// Rebuild the gameplay atlas from the original vector character; no external assets.
import fs from 'node:fs/promises'
import sharp from 'sharp'
const original = await fs.readFile(new URL('../public/agnes.svg', import.meta.url), 'utf8')
const lines = original.split('\n')
const defs = original.match(/<defs>[\s\S]*?<\/defs>/)[0]
const head = lines.slice(5,13).join('\n')
const skirt = lines[3]
const backHair = lines[1]
function star(x,y,r){return `<polygon points="${Array.from({length:10},(_,i)=>{const a=i*Math.PI/5,d=i%2?r*.46:r;return `${x+Math.sin(a)*d},${y-Math.cos(a)*d}`}).join(' ')}" fill="#ffe38a" stroke="#fff4c7" stroke-width="2"/>`}
const frames=[]
function pose(name,{phase=0,air=0,fall=false,land=0,idle=0}={}){
 const walking=name.startsWith('walk'),s=Math.sin(phase),c=Math.cos(phase)
 const bob=walking?-Math.abs(c)*5:idle
 const lean=walking?5:air? (fall?-3:8):0
 const leg=(front)=>{
  const sign=front?1:-1,hip=front?119:96
  let knee=hip+(walking?s*sign*24:air?(front?22:-18):0),ky=walking?235-Math.max(0,c*sign)*10:air?(front?221:231):238
  let foot=hip+(walking?s*sign*37:air?(front?4:-34):front?10:-5),fy=walking?247-Math.max(0,c*sign)*22:air?(front?241:249):247
  if(fall){knee=hip+(front?13:-14);ky=233;foot=hip+(front?25:-20);fy=243}
  return `<path d="M${hip} 208L${knee} ${ky}L${foot} ${fy-4}" stroke="${front?'#f6c5a1':'#d99f82'}" stroke-width="15" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M${foot-6} ${fy-5}q10 1 18 7q4 7-7 7h-15q-8-3-3-13" fill="${front?'#c7f6ff':'#78b8d4'}" stroke="#e2fbff" stroke-width="2"/>`
 }
 const arm=(front)=>{
  const shoulder=front?128:82
  const swing=walking?s*(front?-15:15):0
  const elbowX=front?145+swing:64+swing,elbowY=air?(front?133:148):170
  const handX=front?162+swing:52+swing,handY=air?(front?105:130):182-Math.abs(swing)*.35
  return `<path d="M${shoulder} 149Q${elbowX} ${elbowY} ${handX} ${handY}" fill="none" stroke="${front?'#f7c7a2':'#dda686'}" stroke-width="13" stroke-linecap="round"/><path d="M${shoulder-8} 146l17 0 2 15-18 5Z" fill="#d9f9ff" opacity=".9"/>${front?`<g transform="rotate(${walking?-s*12:air?-13:0} ${handX} ${handY})"><path d="M${handX} ${handY+5}l13-51" stroke="#e2f7ff" stroke-width="5" stroke-linecap="round"/>${star(handX+16,handY-61,17)}</g>`:''}`
 }
 const hairAngle=walking?-s*5:air?(fall?7:-12):idle
 const squash=1-land*.12,stretch=1+land*.1
 const body=`${leg(false)}${leg(true)}<g transform="translate(0 ${bob}) rotate(${lean} 107 215)"><g transform="rotate(${hairAngle} 107 72)">${backHair}</g>${arm(false)}<g transform="rotate(${walking?s*4:air?-7:0} 106 147)">${skirt}${star(100,188,4)}${star(132,214,3)}${star(79,216,3)}</g>${head}${arm(true)}${star(106,163,9)}</g>`
 frames.push({name,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="270" viewBox="0 0 240 270">${defs}<g transform="translate(${120*(1-stretch)} ${260*(1-squash)}) scale(${stretch} ${squash})">${body}</g></svg>`})
}
for(let i=0;i<4;i++)pose(`idle-${i}`,{idle:Math.sin(i*Math.PI/2)*1.6})
for(let i=0;i<8;i++)pose(`walk-${i}`,{phase:i*Math.PI/4})
pose('rise',{air:1});pose('apex',{air:1,fall:true});pose('fall',{air:1,fall:true,idle:-2})
for(let i=0;i<3;i++)pose(`land-${i}`,{land:[.7,1,.25][i]})
const width=240,height=270,columns=6
await sharp({create:{width:width*columns,height:height*Math.ceil(frames.length/columns),channels:4,background:'#00000000'}}).composite(await Promise.all(frames.map(async(f,i)=>({input:await sharp(Buffer.from(f.svg)).png().toBuffer(),left:i%columns*width,top:Math.floor(i/columns)*height})))).png().toFile(new URL('../public/agnes-sprites.png',import.meta.url).pathname)
await fs.writeFile(new URL('../public/agnes-sprites.json',import.meta.url),JSON.stringify({frameWidth:width,frameHeight:height,frames:frames.map(f=>f.name)},null,2)+'\n')
console.log(`Generated ${frames.length} frames: idle, walk, rise, apex, fall, landing.`)
