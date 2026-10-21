export const MAX_MANA=100
export const SPELLS={
 gold:{name:'Luz dourada',color:0xffdf7c,css:'#ffdf7c',cost:8,speed:560,damage:1,size:20},
 blue:{name:'Cometa azul',color:0x79dfff,css:'#79dfff',cost:6,speed:740,damage:1,size:18},
 violet:{name:'Estrela violeta',color:0xd4a0ff,css:'#d4a0ff',cost:12,speed:480,damage:2,size:29}
} as const
export type Spell=keyof typeof SPELLS
export function restore(value:number,amount:number,max:number){return Math.min(max,Math.max(0,value)+amount)}
export function spend(mana:number,spell:Spell){const cost=SPELLS[spell].cost;return mana>=cost?mana-cost:null}
