import sharp from 'sharp'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const metadata=JSON.parse(await fs.readFile(new URL('../public/agnes-sprites.json',import.meta.url),'utf8'))
const poses=[]
assert.equal(metadata.frames.length,18)
for(let i=0;i<metadata.frames.length;i++){
 const {data,info}=await sharp(new URL('../public/agnes-sprites.png',import.meta.url).pathname).extract({left:i%6*240,top:Math.floor(i/6)*270,width:240,height:270}).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let pixels=0
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const alpha=data[(y*info.width+x)*4+3]
  if(alpha)pixels++
  if(x===0||x===239||y===0||y===269)assert.equal(alpha,0,`${metadata.frames[i]} clipped at ${x},${y}`)
 }
 assert.ok(pixels>1000,`${metadata.frames[i]} empty`)
 if(metadata.frames[i].startsWith('walk'))poses.push(data.toString('base64'))
}
assert.equal(new Set(poses).size,8,'Walk cycle must have eight distinct poses')
console.log('PASS: 18 visible frames, 8 distinct walking poses, no clipped edges.')
