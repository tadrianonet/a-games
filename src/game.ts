import Phaser from 'phaser'
import type { Progress } from './progress'
import {level,damage} from './levels'
export const input={left:false,right:false,jump:false,magic:false}
export function clearInput(){input.left=input.right=input.jump=input.magic=false}
export type GameEvent={type:'progress';progress:Progress}|{type:'message';text:string}|{type:'win'}|{type:'gameover'}|{type:'health';lives:number}|{type:'boss';hp:number;max:number}
export type GameOptions={progress:Progress;onEvent:(event:GameEvent)=>void}
export class Kingdom extends Phaser.Scene {
 player!:Phaser.Physics.Arcade.Sprite
 keys!:Phaser.Types.Input.Keyboard.CursorKeys
 magicKey?:Phaser.Input.Keyboard.Key
 platforms!:Phaser.Physics.Arcade.StaticGroup
 collectibles:{sprite:Phaser.Physics.Arcade.Image;id:string;luma:boolean}[]=[]
 layout=level(0)
 boss?:Phaser.Physics.Arcade.Image
 bossHp=12
 bossAwake=false
 bossHitAt=-1000
 nextBossAttack=0
 projectiles!:Phaser.Physics.Arcade.Group
 threats!:Phaser.Physics.Arcade.Group
 gameOver=false
 hurtUntil=0
 knockback=0
 facing=1
 enemies:{sprite:Phaser.Physics.Arcade.Image;min:number;max:number;speed:number}[]=[]
 hazards!:Phaser.Physics.Arcade.StaticGroup
 invulnerableUntil=0
 checkpoint=0
 jumpWas=false
 magicWas=false
 lastGround=0
 jumpBuffer=0
 magicAt=-1000
 wasGrounded=false
 landingUntil=0
 won=false
 progress:Progress
 onEvent:GameOptions['onEvent']
 constructor(options:GameOptions){super('kingdom');this.progress=structuredClone(options.progress);this.onEvent=options.onEvent}
 preload(){this.load.spritesheet('agnes-motion',`${import.meta.env.BASE_URL}agnes-sprites.png`,{frameWidth:240,frameHeight:270});for(const s of ['agnes','star','luma','guardian'])this.load.svg(s,`${import.meta.env.BASE_URL}${s}.svg`);this.load.svg('world',`${import.meta.env.BASE_URL}world-${Math.min(2,this.progress.world)}.svg`)}
 create(){
  const w=Math.min(2,this.progress.world)
  const finale=this.progress.world===3
  this.layout=level(w)
  this.add.image(480,270,'world').setDisplaySize(960,540).setScrollFactor(0)
  this.physics.world.setBounds(0,-100,(finale?1800:this.layout.width),850)
  this.cameras.main.setBounds(0,0,(finale?1800:this.layout.width),540)
  const g=this.make.graphics({x:0,y:0});g.fillStyle([0x607b8c,0x9a7eb3,0x565680][w]);g.fillRoundedRect(0,0,128,42,10);g.fillStyle([0x98e4c3,0xf6d7ec,0xb1a5ee][w]);g.fillRoundedRect(0,0,128,12,6);g.lineStyle(1,0xffffff,.18);g.lineBetween(12,20,116,20);g.generateTexture('platform',128,42);g.destroy()
  this.platforms=this.physics.add.staticGroup()
  const ground=finale?[[900,476,1800]]:this.layout.ground.map(p=>[p.x,p.y,p.width])
  const ledges=finale?[[430,355,150],[760,300,145],[1030,355,150]]:this.layout.ledges.map(p=>[p.x,p.y,p.width])
  for(const [x,y,width] of [...ground,...ledges]){
   const platform=this.platforms.create(x,y,'platform') as Phaser.Physics.Arcade.Image;platform.setDisplaySize(width,42).refreshBody()
   if(width>250){for(let j=-width/2+25;j<width/2;j+=62){this.add.circle(x+j,y-26,4,0xffe3ad,.8);this.add.circle(x+j+5,y-32,5,[0xf0b9cd,0xc2b1f4,0xa1e8dc][w],.8)}}
  }
  this.checkpoint=this.progress.checkpoint
  const spawn=this.spawnPoint()
  const sequences: [string,number,number,number,number][]=[['idle',0,3,4,-1],['walk',4,11,16,-1],['rise',12,12,1,-1],['apex',13,13,1,-1],['fall',14,14,1,-1],['land',15,17,20,0]]
  for(const [name,start,end,frameRate,repeat] of sequences){
   const key=`agnes-${name}`
   if(!this.anims.exists(key))this.anims.create({key,frames:this.anims.generateFrameNumbers('agnes-motion',{start,end}),frameRate,repeat})
  }
  this.player=this.physics.add.sprite(spawn[0],spawn[1],'agnes-motion',0).setDisplaySize(65,74).setDepth(10)
  this.player.body!.setSize(94,205);(this.player.body as Phaser.Physics.Arcade.Body).setOffset(59,49)
  this.player.setMaxVelocity(300,760).setDragX(1800)
  this.player.play('agnes-idle')
  this.player.on(Phaser.Animations.Events.ANIMATION_UPDATE,(animation:Phaser.Animations.Animation,frame:Phaser.Animations.AnimationFrame)=>{
   if(animation.key==='agnes-walk'&&(frame.index===1||frame.index===5)&&(this.player.body as Phaser.Physics.Arcade.Body).blocked.down)this.footstep(2)
  })
  this.physics.add.collider(this.player,this.platforms)
  this.projectiles=this.physics.add.group({allowGravity:false})
  this.threats=this.physics.add.group({allowGravity:false})
  this.physics.add.collider(this.projectiles,this.platforms,(a,b)=>{const shot=this.projectiles.contains(a as Phaser.GameObjects.GameObject)?a:b;shot.destroy()})
  this.physics.add.overlap(this.player,this.threats,(a,b)=>{const shot=(a===this.player?b:a) as Phaser.Physics.Arcade.Image;if(shot.active){shot.destroy();this.hurt(false,this.boss?.x??1300)}})
  this.createChallenges(w,finale)
  if(finale)this.createBoss()
  this.onEvent({type:"health",lives:this.progress.lives})
  if(this.progress.lives===0)this.time.delayedCall(50,()=>this.endGame())
  this.cameras.main.startFollow(this.player,true,.09,.09,0,70)
  this.keys=this.input.keyboard!.createCursorKeys();this.magicKey=this.input.keyboard!.addKey('X')
  this.input.keyboard!.addCapture(['SPACE','UP','LEFT','RIGHT'])
  this.collectibles=[]
  if(finale){this.message('CHEFÃO: segure MAGIA para atirar. Pule os feitiços e proteja seus corações!');return}
  this.layout.stars.forEach(([x,y],i)=>this.collect(x,y,`${w}:s${i}`,false))
  this.layout.lumas.forEach(([x,y],i)=>this.collect(x,y,`${w}:l${i}`,true))
  for(const [i,x] of this.layout.checkpoints.entries()){
   const active=this.add.star(x,385,5,8,18,i+1<=this.checkpoint?0xffdf88:0x8d9bb9).setDepth(3)
   this.add.rectangle(x,420,4,65,0xe6d4a5)
   this.add.text(x,489,'PONTO DE LUZ',{fontFamily:'sans-serif',fontSize:'10px',color:'#d6e6ff'}).setOrigin(.5)
   const zone=this.add.zone(x,420,90,90);this.physics.add.existing(zone,true)
   this.physics.add.overlap(this.player,zone,()=>{if(this.checkpoint<i+1){this.checkpoint=i+1;this.progress.checkpoint=i+1;active.setFillStyle(0xffdf88);this.persist();this.message('Ponto de luz salvo! ✦');this.chime(520)}})
  }
  const portal=this.add.ellipse(this.layout.portal,383,78,126,0xa5edff,.16).setStrokeStyle(4,0xffe0a3)
  this.tweens.add({targets:portal,alpha:.5,duration:1400,yoyo:true,repeat:-1})
  this.add.star(this.layout.portal,365,5,15,30,0xffe0a3)
  this.add.text(this.layout.portal,290,'PORTAL DAS ESTRELAS',{fontSize:'13px',fontFamily:'sans-serif',color:'#ffedc5'}).setOrigin(.5)
  const exit=this.add.zone(this.layout.portal,410,80,100);this.physics.add.existing(exit,true)
  this.physics.add.overlap(this.player,exit,()=>{
   if(this.won)return
   const rescued=this.progress.lumas.filter(id=>id.startsWith(`${w}:`)).length
   if(rescued<3){if(this.time.now-this.magicAt>1000){this.message(`Encontre os ${3-rescued} Lumas que faltam para abrir o portal.`);this.magicAt=this.time.now}return}
   this.won=true;this.player.setVelocity(0);if(!this.progress.completed.includes(w))this.progress.completed.push(w);this.progress.checkpoint=0;this.persist();this.chime(880);this.onEvent({type:'win'})
  })
  this.message('Fase ampliada! Encontre 3 Lumas. Quedas e inimigos custam um coração. ♥')
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
 createChallenges(world:number,finale:boolean){
  const enemyArt=this.make.graphics({x:0,y:0})
  enemyArt.fillStyle(0xa18ade);enemyArt.fillEllipse(28,24,50,32);enemyArt.fillCircle(15,16,11);enemyArt.fillCircle(29,12,13);enemyArt.fillCircle(43,18,10)
  enemyArt.fillStyle(0x342d60);enemyArt.fillEllipse(21,24,4,7);enemyArt.fillEllipse(36,24,4,7);enemyArt.lineStyle(2,0xeee4ff);enemyArt.lineBetween(24,33,32,33)
  enemyArt.generateTexture('mischief',56,44);enemyArt.destroy()
  this.enemies=[]
  const patrols=finale?[]:this.layout.ground.slice(1,-1).filter((_,i)=>world>0||i%2===0).map(p=>[p.x,p.x-115,p.x+115])
  patrols.forEach(([x,min,max],i)=>{
   const sprite=this.physics.add.image(x,435,'mischief').setDisplaySize(43,34).setImmovable(true).setDepth(5)
   sprite.body.allowGravity=false
   const speed=55+world*15+i*5;sprite.setVelocityX(speed)
   this.enemies.push({sprite,min,max,speed})
   this.physics.add.overlap(this.projectiles,sprite,(a,b)=>{const shot=a===sprite?b:a;if(sprite.active){shot.destroy();this.disperse(sprite)}})
   this.physics.add.overlap(this.player,sprite,()=>{
    if(!sprite.active||this.time.now<this.invulnerableUntil)return
    const body=this.player.body as Phaser.Physics.Arcade.Body
    if(body.velocity.y>60&&body.bottom<sprite.y+8){this.disperse(sprite);this.player.setVelocityY(-390)}
    else this.hurt(false,sprite.x)
   })
  })
  this.hazards=this.physics.add.staticGroup()
  if(world>=1&&!finale){
   const crystal=this.make.graphics({x:0,y:0});crystal.fillStyle(0xe3a6c9);crystal.fillTriangle(0,28,10,0,20,28);crystal.fillStyle(0xf9d7e7);crystal.fillTriangle(17,28,28,7,38,28);crystal.generateTexture('crystals',40,30);crystal.destroy()
   for(const x of this.layout.ground.slice(2,-1).filter((_,i)=>i%(world===2?2:3)===0).map(p=>p.x+55)){
    const hazard=this.hazards.create(x,442,'crystals') as Phaser.Physics.Arcade.Image;hazard.setDisplaySize(34,26).refreshBody()
    this.physics.add.overlap(this.player,hazard,()=>{if(this.time.now>=this.invulnerableUntil)this.hurt(false,hazard.x)})
   }
  }
 }
 disperse(enemy:Phaser.Physics.Arcade.Image){if(!enemy.active)return;this.sparkle(enemy.x,enemy.y);enemy.destroy();this.chime(770);this.message('A nuvem virou poeira de estrela! ✨')}
 spawnPoint(){return this.progress.world===3?[150,400]:this.checkpoint===0?[90,400]:[this.layout.checkpoints[this.checkpoint-1],400]}
 endGame(){if(this.gameOver)return;this.gameOver=true;clearInput();this.player.setVelocity(0);this.physics.pause();this.onEvent({type:'gameover'})}
 hurt(fall:boolean,sourceX=this.player.x){
  if(this.won||this.gameOver)return
  const result=damage(this.progress.lives,this.time.now,this.invulnerableUntil,fall)
  if(!result.hit)return
  this.progress.lives=result.lives;this.persist();this.onEvent({type:'health',lives:result.lives})
  if(result.lives===0){this.endGame();return}
  this.invulnerableUntil=this.time.now+1800;this.hurtUntil=this.time.now+260
  this.knockback=this.player.x<sourceX?-230:230
  if(fall){const [x,y]=this.spawnPoint();this.player.setPosition(x,y).setVelocity(0);this.wasGrounded=false;this.landingUntil=0;this.hurtUntil=0;this.jumpBuffer=0;this.lastGround=-1000;this.message('Você perdeu um coração. De volta ao ponto de luz! ♥')}
  else{this.player.setVelocityY(-220);this.message('Ai! Um coração a menos. Você está protegida por um instante. ♥')}
  this.cameras.main.flash(180,220,130,170)
  this.tweens.killTweensOf(this.player);this.player.setAlpha(1)
  this.tweens.add({targets:this.player,alpha:.35,duration:100,yoyo:true,repeat:8,onComplete:()=>this.player.setAlpha(1)})
 }
 shoot(){
  const shot=this.projectiles.create(this.player.x+this.facing*25,this.player.y-10,'star') as Phaser.Physics.Arcade.Image
  shot.setDisplaySize(20,20).setVelocityX(this.facing*560).setDepth(12);shot.body!.setSize(35,35)
  this.time.delayedCall(1600,()=>{if(shot.active)shot.destroy()})
  this.chime(660)
 }
 hitBoss(shot:Phaser.Physics.Arcade.Image){
   if(!shot.active||!this.boss?.active||this.gameOver||this.won)return;shot.destroy()
   if(this.time.now-this.bossHitAt<240)return
   this.bossHitAt=this.time.now;this.bossHp--;this.onEvent({type:'boss',hp:this.bossHp,max:12});this.sparkle(this.boss.x,this.boss.y);this.chime(850)
   this.boss.setTint(0xffe3a5);this.time.delayedCall(150,()=>{if(this.boss?.active)this.boss.clearTint()})
   if(this.bossHp===0){this.boss.destroy();this.threats.clear(true,true);this.won=true;this.player.setVelocity(0);if(!this.progress.completed.includes(3))this.progress.completed.push(3);this.progress.checkpoint=0;this.persist();this.onEvent({type:'win'})}
 }
 createBoss(){
  this.boss=this.physics.add.image(1350,385,'guardian').setDisplaySize(190,145).setImmovable(true).setDepth(6)
  ;(this.boss.body as Phaser.Physics.Arcade.Body).setAllowGravity(false)
  this.add.text(1350,235,'♛ GUARDIÃO DA TEMPESTADE ♛',{fontFamily:'sans-serif',fontSize:'16px',color:'#ffe3a5'}).setOrigin(.5)
  this.onEvent({type:'boss',hp:this.bossHp,max:12});this.nextBossAttack=this.time.now+2500
  this.physics.add.overlap(this.player,this.boss,()=>this.hurt(false,this.boss!.x))
  this.physics.add.overlap(this.projectiles,this.boss,(a,b)=>this.hitBoss((a===this.boss?b:a) as Phaser.Physics.Arcade.Image))
 }
 attackBoss(){
  if(!this.boss?.active||this.won||this.gameOver)return
  const phase2=this.bossHp<=6
  this.boss.setTint(0xf6b5ed)
  this.time.delayedCall(400,()=>{
   if(!this.boss?.active||this.won||this.gameOver)return
   this.boss.clearTint()
   const aim=new Phaser.Math.Vector2(this.player.x-this.boss.x,this.player.y-this.boss.y).normalize()
   for(const angle of phase2?[-.18,0,.18]:[0]){
    const velocity=aim.clone().rotate(angle).scale(phase2?230:190)
    const shot=this.threats.create(this.boss.x-60,this.boss.y+12,'luma') as Phaser.Physics.Arcade.Image
    shot.setDisplaySize(27,27).setTint(0xfa9fc7).setVelocity(velocity.x,velocity.y).setDepth(11);shot.body!.setSize(48,48)
    this.time.delayedCall(6000,()=>{if(shot.active)shot.destroy()})
   }
  })
 }
 updateChallenges(time:number,_delta:number){
  if(this.boss?.active){
   if(!this.bossAwake&&this.player.x>650){this.bossAwake=true;this.nextBossAttack=time+3000}
   this.boss.setVelocityX(Math.cos(time/1200)*65);if(this.boss.x<1150)this.boss.setVelocityX(70);if(this.boss.x>1550)this.boss.setVelocityX(-70);if(this.bossAwake&&time>=this.nextBossAttack&&!(import.meta.env.DEV&&new URLSearchParams(location.search).has('test-passive'))){this.nextBossAttack=time+(this.bossHp<=6?1500:2400);this.attackBoss()}}
  for(const enemy of this.enemies){if(!enemy.sprite.active)continue
   if(enemy.sprite.x>=enemy.max)enemy.sprite.setVelocityX(-enemy.speed)
   else if(enemy.sprite.x<=enemy.min)enemy.sprite.setVelocityX(enemy.speed)
   enemy.sprite.setFlipX((enemy.sprite.body as Phaser.Physics.Arcade.Body).velocity.x<0)
  }
 }
 footstep(count:number){
  for(let i=0;i<count;i++){
   const dust=this.add.ellipse(this.player.x+(Math.random()-.5)*12,this.player.y+31,5+i*2,3,0xd7e9ed,.35).setDepth(9)
   this.tweens.add({targets:dust,x:dust.x+(this.player.flipX?10:-10),y:dust.y-8,alpha:0,scaleX:1.8,duration:250,onComplete:()=>dust.destroy()})
  }
 }
 animatePlayer(time:number){
  const body=this.player.body as Phaser.Physics.Arcade.Body
  const grounded=body.blocked.down&&body.velocity.y>=0
  if(grounded&&!this.wasGrounded){this.landingUntil=time+150;this.footstep(4)}
  this.wasGrounded=grounded
  const state=!grounded?(body.velocity.y< -90?'rise':body.velocity.y>90?'fall':'apex'):time<this.landingUntil?'land':Math.abs(body.velocity.x)>10?'walk':'idle'
  this.player.play(`agnes-${state}`,true)
 }
 update(time:number,delta:number){
  if(!this.player?.body||this.won||this.gameOver)return
  const body=this.player.body as Phaser.Physics.Arcade.Body
  this.updateChallenges(time,delta)
  const jump=input.jump||this.keys.up.isDown||this.keys.space.isDown
  const magic=input.magic||!!this.magicKey?.isDown
  if(body.blocked.down)this.lastGround=time
  if(jump&&!this.jumpWas)this.jumpBuffer=time+140
  if(this.jumpBuffer>time&&time-this.lastGround<120){this.player.setVelocityY(-590);this.lastGround=-1000;this.jumpBuffer=0;this.chime(340)}
  if(!jump&&this.jumpWas&&body.velocity.y< -210)this.player.setVelocityY(-210)
  this.jumpWas=jump
  const direction=Number(input.right||this.keys.right.isDown)-Number(input.left||this.keys.left.isDown)
  this.player.setVelocityX(time<this.hurtUntil?this.knockback:direction*265)
  if(direction){this.facing=direction;this.player.setFlipX(direction<0)}
  this.animatePlayer(time)
  if(magic&&time-this.magicAt>350){this.magicAt=time;this.shoot();for(const c of this.collectibles)if(c.sprite.active&&Phaser.Math.Distance.Between(this.player.x,this.player.y,c.sprite.x,c.sprite.y)<110)this.take(c.sprite,c.id,c.luma)}
  this.magicWas=magic
  if(this.player.y>650)this.hurt(true)
 }
}
export function createGame(parent:HTMLElement,options:GameOptions){return new Phaser.Game({type:Phaser.AUTO,parent,width:960,height:540,backgroundColor:'#171d3c',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},physics:{default:'arcade',arcade:{gravity:{x:0,y:1100},debug:false}},input:{activePointers:4},scene:new Kingdom(options),render:{antialias:true},audio:{disableWebAudio:false}})}
