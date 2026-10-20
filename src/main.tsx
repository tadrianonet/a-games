import React,{useEffect,useRef,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {registerSW} from 'virtual:pwa-register'
import {createGame,clearInput,input,type GameEvent} from './game'
import {fresh,load,save,worlds,type Progress} from './progress'
import {MAX_LIVES} from './levels'
import './style.css'
let updateApp:((reloadPage?:boolean)=>Promise<void>)|undefined
function Controls(){
 const held=useRef(new Map<number,keyof typeof input>())
 useEffect(()=>{const clear=()=>{held.current.clear();clearInput()};window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);return()=>{clear();window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear)}},[])
 function release(id:number){const key=held.current.get(id);held.current.delete(id);if(key)input[key]=[...held.current.values()].includes(key)}
 return <div className="controls" aria-label="Controles do jogo"><div className="pad">{(['left','right'] as const).map(k=><button key={k} aria-label={k==='left'?'Esquerda':'Direita'} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);held.current.set(e.pointerId,k);input[k]=true}} onPointerUp={e=>release(e.pointerId)} onPointerCancel={e=>release(e.pointerId)} onLostPointerCapture={e=>release(e.pointerId)}>{k==='left'?'←':'→'}</button>)}</div><div className="pad">{(['magic','jump'] as const).map(k=><button className={k} key={k} aria-label={k==='jump'?'Pular':'Magia'} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);held.current.set(e.pointerId,k);input[k]=true}} onPointerUp={e=>release(e.pointerId)} onPointerCancel={e=>release(e.pointerId)} onLostPointerCapture={e=>release(e.pointerId)}>{k==='jump'?'↑':'✦'}<small>{k==='jump'?'PULAR':'MAGIA'}</small></button>)}</div></div>
}
function App(){
 const [progress,setProgress]=useState<Progress>(()=>{
  const p=load()
  if(import.meta.env.DEV){
   const query=new URLSearchParams(location.search)
   const world=Number(query.get('test-world')),lives=Number(query.get('test-lives'))
   if(query.has('test-world')&&Number.isInteger(world)&&world>=0&&world<=3){p.world=world;p.checkpoint=0;p.sound=false}
   if(query.has('test-lives')&&Number.isInteger(lives)&&lives>=0&&lives<=MAX_LIVES)p.lives=lives
  }
  return p
 })
 const pRef=useRef(progress)
 const [screen,setScreen]=useState<'home'|'worlds'|'album'|'settings'|'game'>('home')
 const [session,setSession]=useState(0)
 const [paused,setPaused]=useState(false)
 const [won,setWon]=useState(false)
 const [over,setOver]=useState(false)
 const [lives,setLives]=useState(progress.lives)
 const [boss,setBoss]=useState<{hp:number;max:number}|null>(null)
 const [message,setMessage]=useState('')
 const [storageError,setStorageError]=useState(false)
 const [offline,setOffline]=useState(false)
 const [update,setUpdate]=useState(false)
 const [install,setInstall]=useState<(Event&{prompt:()=>Promise<void>})|null>(null)
 const host=useRef<HTMLDivElement>(null)
 const game=useRef<ReturnType<typeof createGame>|null>(null)
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
 const commit=(p:Progress)=>{pRef.current=p;setProgress(p);setStorageError(!save(p))}
 useEffect(()=>{updateApp=registerSW({onOfflineReady:()=>setOffline(true),onNeedRefresh:()=>setUpdate(true)});const handler=(e:Event)=>{e.preventDefault();setInstall(e as Event&{prompt:()=>Promise<void>})};window.addEventListener('beforeinstallprompt',handler);return()=>window.removeEventListener('beforeinstallprompt',handler)},[])
 useEffect(()=>{
  if(screen!=='game'||!host.current)return
  clearInput();setWon(false);setPaused(false);setOver(false);setBoss(null);setLives(pRef.current.lives)
  const onEvent=(e:GameEvent)=>{if(e.type==='health')setLives(e.lives);if(e.type==='boss')setBoss({hp:e.hp,max:e.max});if(e.type==='gameover'){clearInput();setOver(true)}if(e.type==='progress')commit(e.progress);if(e.type==='win'){clearInput();setWon(true)}if(e.type==='message'){setMessage(e.text);clearTimeout(timer.current);timer.current=setTimeout(()=>setMessage(''),4500)}}
  game.current=createGame(host.current,{progress:pRef.current,onEvent})
  const hide=()=>{if(document.hidden){clearInput();setPaused(true)}};document.addEventListener('visibilitychange',hide)
  return()=>{clearInput();clearTimeout(timer.current);document.removeEventListener('visibilitychange',hide);game.current?.destroy(true);game.current=null}
 },[screen,session])
 useEffect(()=>{if(game.current){if(paused||won||over)game.current.scene.pause('kingdom');else game.current.scene.resume('kingdom')}clearInput()},[paused,won,over])
 function start(world=progress.world){const p={...pRef.current,world,checkpoint:world===pRef.current.world?pRef.current.checkpoint:0};commit(p);setScreen('game');setSession(s=>s+1)}
 function retry(){commit({...pRef.current,lives:MAX_LIVES,checkpoint:0});start(pRef.current.world)}
 const world=worlds[progress.world]
 const stars=progress.stars.filter(s=>s.startsWith(`${progress.world}:`)).length
 const lumas=progress.lumas.filter(s=>s.startsWith(`${progress.world}:`)).length
 return <main className={screen==='game'?'app playing':'app'}>
 {screen!=='game'&&<><div className="ambient"/><header className="top"><a className="brand" href="#" onClick={e=>{e.preventDefault();setScreen('home')}}><span>✦</span> AGNES <i>/ uma aventura nas estrelas</i></a><button className="icon-btn" aria-label="Configurações" onClick={()=>setScreen('settings')}>⚙</button></header></>}
 {screen==='home'&&<section className="home"><div className="hero-copy"><div className="eyebrow"><span/> UMA PEQUENA PRINCESA. UM UNIVERSO INTEIRO.</div><h1>Agnes<span>e o Reino das</span><em>Estrelas</em></h1><p>Há uma luz especial em você.<br/>Vamos ajudar o céu a brilhar de novo?</p><button className="primary play" onClick={()=>start()}><span>▶</span> {progress.stars.length||progress.checkpoint?'Continuar aventura':'Começar aventura'} <b>→</b></button><div className="home-links"><button onClick={()=>setScreen('worlds')}>◉ Explorar mundos</button><button onClick={()=>setScreen('album')}>✧ Meu álbum</button></div><div className="save-note">♡ Feito para Agnes · sem pressa, só magia</div></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><img className="hero-agnes" src={`${import.meta.env.BASE_URL}agnes.svg`} alt="Agnes com cabelo castanho, coroa, vestido azul e varinha de estrela"/><img className="friend friend-one" src={`${import.meta.env.BASE_URL}luma.svg`} alt="Luma"/><img className="friend friend-two" src={`${import.meta.env.BASE_URL}star.svg`} alt=""/><div className="island"><span>✿</span><span>✿</span><span>✿</span></div><div className="art-caption"><span>✦</span> Sua próxima história começa aqui.</div></div><footer className="home-footer"><span>01 — JARDIM DAS ESTRELAS</span><span>Toque, explore e descubra ✧</span></footer></section>}
 {screen==='worlds'&&<section className="page"><button className="back" onClick={()=>setScreen('home')}>← Voltar</button><div className="eyebrow">UM CÉU CHEIO DE DESCOBERTAS</div><h2>Para onde vamos?</h2><p>Encontre os três Lumas de cada mundo. Depois, enfrente o Guardião da Tempestade!</p><div className="world-grid">{worlds.map((w,i)=>{const locked=i>0&&!progress.completed.includes(i-1);return <button className={`world-card world-${i}`} key={w.name} disabled={locked} onClick={()=>start(i)}><span className="world-number">0{i+1} {locked?'· BLOQUEADO':''}</span><div className="world-symbol" style={{color:w.color}}>{w.symbol}</div><h3>{w.name}</h3><p>{w.desc}</p><div className="world-score">{i===3?'♛ 12 pontos de energia':<>✦ {progress.stars.filter(s=>s.startsWith(`${i}:`)).length}/30 <span>♡ {progress.lumas.filter(s=>s.startsWith(`${i}:`)).length}/3</span></>}</div><b>{locked?'Complete o mundo anterior':progress.completed.includes(i)?'Visitar de novo →':'Vamos explorar →'}</b></button>})}</div></section>}
 {screen==='album'&&<section className="page"><button className="back" onClick={()=>setScreen('home')}>← Voltar</button><div className="eyebrow">PEQUENOS ENCONTROS, GRANDES MEMÓRIAS</div><h2>O álbum da Agnes</h2><p>{progress.stars.length} de 90 estrelas · {progress.lumas.length} de 9 Lumas encontrados</p><div className="album-grid">{Array.from({length:9},(_,i)=>{const found=progress.lumas.includes(`${Math.floor(i/3)}:l${i%3}`);return <article className={found?'found':'unknown'} key={i}><img src={`${import.meta.env.BASE_URL}luma.svg`} alt={found?'Luma encontrado':'Luma ainda escondido'}/><h3>{found?['Orvalho','Pétala','Brotinho','Brisa','Algodão','Aurora','Cristal','Cometa','Luar'][i]:'Quem será?'}</h3><small>{worlds[Math.floor(i/3)].name}</small></article>})}</div></section>}
 {screen==='settings'&&<section className="page settings"><button className="back" onClick={()=>setScreen('home')}>← Voltar</button><h2>Do seu jeitinho</h2><button className="setting-row" onClick={()=>commit({...progress,sound:!progress.sound})}>Sons mágicos <b>{progress.sound?'Ligados ♫':'Desligados'}</b></button>{install&&<button className="primary" onClick={()=>{void install.prompt();setInstall(null)}}>Instalar no tablet</button>}<h3>Como brincar</h3><p>Use ← → para andar, ↑ ou espaço para pular e X para lançar magia. No tablet, toque nos botões: é possível andar e pular ao mesmo tempo.</p><p>Segure MAGIA ou X para disparar estrelas pela varinha. Você também pode pular sobre as nuvens! Há mais plataformas fixas, saltos e cristais. Agnes começa com cinco corações: cair custa um coração e retorna ao checkpoint; encostar em inimigos custa só um coração, com proteção temporária. Sem corações, a partida termina. Tente novamente com cinco corações e os itens salvos. Depois dos três mundos, enfrente o chefão: desvie dos feitiços e acerte doze disparos.</p><h3>Instalar a aventura</h3><p>No Android, abra o menu do Chrome e escolha “Instalar app”. No iPad, abra no Safari, toque em Compartilhar e “Adicionar à Tela de Início”. Depois da primeira visita completa, a aventura funciona sem internet.</p><button className="quiet" onClick={()=>{if(window.confirm('Apagar todas as estrelas, Lumas e mundos salvos?'))commit(fresh())}}>Recomeçar toda a aventura</button></section>}
 {screen==='game'&&<section className={`game-shell ${boss?'boss-mode':''}`}><div ref={host} className="canvas-host"/><div className="hud"><div className="location"><small>MUNDO 0{progress.world+1}</small><strong>{world.name}</strong><div className="hearts" role="status" aria-label={`${lives} de ${MAX_LIVES} corações`}>{Array.from({length:MAX_LIVES},(_,i)=><span key={i} className={i<lives?'full':'empty'}>{i<lives?'♥':'♡'}</span>)}</div></div><div className="hud-right">{progress.world<3&&<><span>✦ {stars}<small>/30</small></span><span className="luma-count">♡ {lumas}<small>/3</small></span></>}<button aria-label="Pausar" onClick={()=>setPaused(true)}>Ⅱ</button></div></div>{boss&&<div className="boss-health" role="status" aria-label={`Energia do chefão: ${boss.hp} de ${boss.max}`}><span>♛ GUARDIÃO DA TEMPESTADE</span><div><i style={{width:`${boss.hp/boss.max*100}%`}}/></div><small>{boss.hp} / {boss.max}</small></div>}{message&&!paused&&!won&&!over&&<div className="toast" role="status">{message}</div>}{!paused&&!won&&!over&&<Controls/>}<div className="rotate">↻<strong>Vire o tablet para brincar</strong><span>A aventura fica melhor deitada!</span></div>{over&&<div className="modal-backdrop"><div className="modal"><div className="modal-star">♡</div><div className="eyebrow">GAME OVER</div><h2>Vamos tentar de novo?</h2><p>Os corações acabaram, mas suas estrelas e seus amigos estão salvos. Recomece esta fase com cinco corações.</p><button className="primary" onClick={retry}>Tentar novamente · ♥ ♥ ♥ ♥ ♥</button><button className="quiet" onClick={()=>setScreen('worlds')}>Escolher um mundo</button><button className="quiet" onClick={()=>setScreen('home')}>Voltar ao início</button></div></div>}{(paused||won)&&!over&&<div className="modal-backdrop"><div className="modal"><div className="modal-star">{won?'✦':'☾'}</div><div className="eyebrow">{won?'VOCÊ FEZ O CÉU BRILHAR':'UMA PAUSA PARA SONHAR'}</div><h2>{won?(progress.world===3?'O reino está iluminado!':'Um mundo de luz!'):'Até as estrelas descansam.'}</h2><p>{won?(progress.world===3?'Você venceu o Guardião com a magia da sua varinha! O reino voltou a brilhar.':`Que aventura, Agnes! Você encontrou ${lumas} Lumas e ${stars} estrelas neste mundo.`):'Sua aventura está salva. Pode voltar quando quiser.'}</p>{won&&progress.world<3?<button className="primary" onClick={()=>start(progress.world+1)}>{progress.world===2?'Enfrentar o chefão →':'Próximo mundo →'}</button>:!won?<button className="primary" onClick={()=>setPaused(false)}>Continuar brincando →</button>:<button className="primary" onClick={()=>setScreen('album')}>Ver meu álbum ✧</button>}<button className="quiet" onClick={()=>setScreen('worlds')}>Escolher um mundo</button><button className="quiet" onClick={()=>setScreen('home')}>Voltar ao início</button></div></div>}</section>}
 {screen!=='game'&&<div className="connection">{storageError?'Não foi possível salvar neste navegador.':update?<button onClick={()=>void updateApp?.(true)}>Nova versão disponível · Atualizar</button>:offline?'✦ Pronto para brincar sem internet':'✧ Uma aventura para levar com você'}</div>}
 </main>
}
const root=createRoot(document.getElementById('root')!)
root.render(<React.StrictMode><App/></React.StrictMode>)
if(import.meta.hot)import.meta.hot.dispose(()=>root.unmount())
