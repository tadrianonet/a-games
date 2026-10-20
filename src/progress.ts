export type Progress = { world: number; checkpoint: number; stars: string[]; lumas: string[]; completed: number[]; sound: boolean; lives:number }
export const fresh = (): Progress => ({world:0,checkpoint:0,stars:[],lumas:[],completed:[],sound:true,lives:5})
const key='agnes-stars-v1'
export function load(): Progress {
 try { const p=JSON.parse(localStorage.getItem(key)||'null'); if(!p || !Number.isInteger(p.world) || p.world<0 || p.world>3) return fresh(); return {world:p.world,checkpoint:[0,1,2].includes(p.checkpoint)?p.checkpoint:0,stars:Array.isArray(p.stars)?p.stars.filter((s:unknown)=>typeof s==='string'):[],lumas:Array.isArray(p.lumas)?p.lumas.filter((s:unknown)=>typeof s==='string'):[],completed:Array.isArray(p.completed)?p.completed.filter((n:number)=>[0,1,2,3].includes(n)):[],sound:p.sound!==false,lives:Number.isInteger(p.lives)?Math.max(0,Math.min(5,p.lives)):5} } catch { return fresh() }
}
export function save(p:Progress) { try { localStorage.setItem(key,JSON.stringify(p)); return true } catch { return false } }
export const worlds=[{name:'Jardim das Estrelas',desc:'Entre flores e ilhas flutuantes',color:'#8ce6cf',symbol:'✿'},{name:'Reino das Nuvens',desc:'Um passeio pelo céu de algodão',color:'#eeb7e1',symbol:'☁'},{name:'Castelo das Estrelas',desc:'Acenda a última constelação',color:'#bcadff',symbol:'♜'},{name:'O Guardião da Tempestade',desc:'Batalha final · use a magia da varinha',color:'#f5c28d',symbol:'♛'}]
