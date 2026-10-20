import Phaser from 'phaser'
import type { Progress } from './progress'
export const input={left:false,right:false,jump:false,magic:false}
export function clearInput(){input.left=input.right=input.jump=input.magic=false}
export type GameEvent={type:'progress';progress:Progress}|{type:'message';text:string}|{type:'win'}
export type GameOptions={progress:Progress;onEvent:(event:GameEvent)=>void}
export class Kingdom extends Phaser.Scene {
 player!:Phaser.Physics.Arcade.Sprite
 keys!:Phaser.Types.Input.Keyboard.CursorKeys
 magicKey?:Phaser.Input.Keyboard.Key
 platforms!:Phaser.Physics.Arcade.StaticGroup
 collectibles:{sprite:Phaser.Physics.Arcade.Image;id:string;luma:boolean}[]=[]
 checkpoint=0
 jumpWas=false
 magicWas=false
 lastGround=0
 jumpBuffer=0
 magicAt=-1000
 won=false
 progress:Progress
 onEvent:GameOptions['onEvent']
 constructor(options:GameOptions){super('kingdom');this.progress=structuredClone(options.progress);this.onEvent=options.onEvent}
 preload(){for(const s of ['agnes','star','luma'])this.load.svg(s,`${import.meta.env.BASE_URL}${s}.svg`);this.load.svg('world',`${import.meta.env.BASE_URL}world-${this.progress.world}.svg`)}
 create(){
  const w=this.progress.world
  this.add.image(480,270,'world').setDisplaySize(960,540).setScrollFactor(0)
  this.physics.world.setBounds(0,-100,3300,850)
  this.cameras.main.setBounds(0,0,3300,540)
  const g=this.make.graphics({x:0,y:0});g.fillStyle([0x607b8c,0x9a7eb3,0x565680][w]);g.fillRoundedRect(0,0,128,42,10);g.fillStyle([0x98e4c3,0xf6d7ec,0xb1a5ee][w]);g.fillRoundedRect(0,0,128,12,6);g.lineStyle(1,0xffffff,.18);g.lineBetween(12,20,116,20);g.generateTexture('platform',128,42);g.destroy()
  this.platforms=this.physics.add.staticGroup()
  const ground=[[150,476,380],[600,476,300],[1040,476,340],[1510,476,340],[1990,476,340],[2470,476,340],[3000,476,520]]
  const ledges=[[390,370,140],[770,342,150],[1180,335,150],[1370,252,130],[1730,350,150],[2180,335,150],[2350,250,130],[2650,355,150]]
  for(const [x,y,width] of [...ground,...ledges]){
   const platform=this.platforms.create(x,y,'platform') as Phaser.Physics.Arcade.Image;platform.setDisplaySize(width,42).refreshBody()
   if(width>250){for(let j=-width/2+25;j<width/2;j+=62){this.add.circle(x+j,y-26,4,0xffe3ad,.8);this.add.circle(x+j+5,y-32,5,[0xf0b9cd,0xc2b1f4,0xa1e8dc][w],.8)}}
  }
  this.checkpoint=this.progress.checkpoint
  const spawn=[[90,400],[1510,400],[2470,400]][this.checkpoint]
  this.player=this.physics.add.sprite(spawn[0],spawn[1],'agnes').setDisplaySize(65,74).setDepth(10)
  this.player.body!.setSize(94,205);(this.player.body as Phaser.Physics.Arcade.Body).setOffset(59,49)
  this.player.setMaxVelocity(300,760).setDragX(1800)
  this.physics.add.collider(this.player,this.platforms)
  this.cameras.main.startFollow(this.player,true,.09,.09,0,70)
  this.keys=this.input.keyboard!.createCursorKeys();this.magicKey=this.input.keyboard!.addKey('X')
  this.input.keyboard!.addCapture(['SPACE','UP','LEFT','RIGHT'])
  this.collectibles=[]
  const positions=[[220,410],[390,310],[610,412],[770,282],[1020,410],[1180,275],[1370,192],[1530,410],[1730,290],[1990,410],[2180,275],[2350,190],[2480,410],[2650,295],[2900,410]]
  positions.forEach(([x,y],i)=>this.collect(x,y,`${w}:s${i}`,false))
  ;[[770,302],[1730,310],[2650,315]].forEach(([x,y],i)=>this.collect(x+35,y-32,`${w}:l${i}`,true))
  for(const [i,x] of [1510,2470].entries()){
   const active=this.add.star(x,385,5,8,18,i+1<=this.checkpoint?0xffdf88:0x8d9bb9).setDepth(3)
   this.add.rectangle(x,420,4,65,0xe6d4a5)
   this.add.text(x,489,'PONTO DE LUZ',{fontFamily:'sans-serif',fontSize:'10px',color:'#d6e6ff'}).setOrigin(.5)
   const zone=this.add.zone(x,420,90,90);this.physics.add.existing(zone,true)
   this.physics.add.overlap(this.player,zone,()=>{if(this.checkpoint<i+1){this.checkpoint=i+1;this.progress.checkpoint=i+1;active.setFillStyle(0xffdf88);this.persist();this.message('Ponto de luz salvo! ✦');this.chime(520)}})
  }
  const portal=this.add.ellipse(3100,383,78,126,0xa5edff,.16).setStrokeStyle(4,0xffe0a3)
  this.tweens.add({targets:portal,alpha:.5,duration:1400,yoyo:true,repeat:-1})
  this.add.star(3100,365,5,15,30,0xffe0a3)
  this.add.text(3100,290,'PORTAL DAS ESTRELAS',{fontSize:'13px',fontFamily:'sans-serif',color:'#ffedc5'}).setOrigin(.5)
  const exit=this.add.zone(3100,410,80,100);this.physics.add.existing(exit,true)
  this.physics.add.overlap(this.player,exit,()=>{
   if(this.won)return
   const rescued=this.progress.lumas.filter(id=>id.startsWith(`${w}:`)).length
   if(rescued<3){if(this.time.now-this.magicAt>1000){this.message(`Encontre os ${3-rescued} Lumas que faltam para abrir o portal.`);this.magicAt=this.time.now}return}
   this.won=true;this.player.setVelocity(0);if(!this.progress.completed.includes(w))this.progress.completed.push(w);this.progress.checkpoint=0;this.persist();this.chime(880);this.onEvent({type:'win'})
  })
  this.message('Encontre 3 Lumas e leve a luz até o portal. ✨')
 }
 collect(x:number,y:number,id:string,luma:boolean){
  if((luma?this.progress.lumas:this.progress.stars).includes(id))return
  const item=this.physics.add.staticImage(x,y,luma?'luma':'star').setDisplaySize(luma?46:28,luma?46:28).refreshBody()
  this.collectibles.push({sprite:item,id,luma})
  this.tweens.add({targets:item,y:y-6,duration:1000,yoyo:true,repeat:-1,onUpdate:()=>{if(item.active)item.refreshBody()}})
  this.physics.add.overlap(this.player,item,()=>this.take(item,id,luma))
 }
 take(item:Phaser.Physics.Arcade.Image,id:string,luma:boolean){
  if(!item.active)return
  this.sparkle(item.x,item.y);this.tweens.killTweensOf(item);item.destroy();(luma?this.progress.lumas:this.progress.stars).push(id);this.persist();this.chime(luma?740:590)
  if(luma)this.message('Um Luma encontrou seu caminho! ✦')
 }
 persist(){this.onEvent({type:'progress',progress:structuredClone(this.progress)})}
 message(text:string){this.onEvent({type:'message',text})}
 sparkle(x:number,y:number){for(let i=0;i<9;i++){const s=this.add.star(x,y,4,2,5,0xffe4a3).setDepth(20);this.tweens.add({targets:s,x:x+Math.cos(i)*50,y:y+Math.sin(i)*45,alpha:0,scale:0,duration:650,onComplete:()=>s.destroy()})}}
 chime(freq:number){if(!this.progress.sound)return;try{const ctx=(this.sound as Phaser.Sound.WebAudioSoundManager).context as AudioContext;if(!ctx)return;void ctx.resume();const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(freq*1.5,ctx.currentTime+.14);gain.gain.setValueAtTime(.045,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.3);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.31)}catch{/* Audio is optional. */}}
 update(time:number){
  if(!this.player?.body||this.won)return
  const body=this.player.body as Phaser.Physics.Arcade.Body
  const jump=input.jump||this.keys.up.isDown||this.keys.space.isDown
  const magic=input.magic||!!this.magicKey?.isDown
  if(body.blocked.down)this.lastGround=time
  if(jump&&!this.jumpWas)this.jumpBuffer=time+140
  if(this.jumpBuffer>time&&time-this.lastGround<120){this.player.setVelocityY(-590);this.lastGround=-1000;this.jumpBuffer=0;this.chime(340)}
  if(!jump&&this.jumpWas&&body.velocity.y< -210)this.player.setVelocityY(-210)
  this.jumpWas=jump
  const direction=Number(input.right||this.keys.right.isDown)-Number(input.left||this.keys.left.isDown)
  this.player.setVelocityX(direction*265)
  if(direction)this.player.setFlipX(direction<0)
  this.player.setAngle(body.blocked.down?Math.sin(time/110)*Math.abs(direction)*3:direction*5)
  if(magic&&!this.magicWas&&time-this.magicAt>450){this.magicAt=time;this.sparkle(this.player.x+25,this.player.y-20);this.chime(660);for(const c of this.collectibles)if(c.sprite.active&&Phaser.Math.Distance.Between(this.player.x,this.player.y,c.sprite.x,c.sprite.y)<135)this.take(c.sprite,c.id,c.luma)}
  this.magicWas=magic
  if(this.player.y>650){const [x,y]=[[90,400],[1510,400],[2470,400]][this.checkpoint];this.player.setPosition(x,y).setVelocity(0);this.cameras.main.flash(250,170,200,255);this.message('As estrelas te levaram ao último ponto de luz. ♡')}
 }
}
export function createGame(parent:HTMLElement,options:GameOptions){return new Phaser.Game({type:Phaser.AUTO,parent,width:960,height:540,backgroundColor:'#171d3c',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},physics:{default:'arcade',arcade:{gravity:{x:0,y:1100},debug:false}},input:{activePointers:4},scene:new Kingdom(options),render:{antialias:true},audio:{disableWebAudio:false}})}
