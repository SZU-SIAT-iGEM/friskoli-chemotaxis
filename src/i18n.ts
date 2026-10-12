import {useEffect,useState} from 'react';
import zh from './lang/zh-CN.json';
import en from './lang/en.json';
export type LanguagePack={schemaVersion:number;language:{code:string;name:string;dir:string};strings:Record<string,string>;content:Record<string,unknown>};
export type Translate=(key:string,vars?:Record<string,string|number>)=>string;
export function safeGet(key:string){try{return localStorage.getItem(key);}catch{return null;}}
export function safeSet(key:string,value:string){try{localStorage.setItem(key,value);return true;}catch{return false;}}
export function validatePack(value:unknown):value is LanguagePack {
 if(!value||typeof value!=='object')return false;
 const p=value as LanguagePack;if(p.schemaVersion!==1||!p.language||!/^([a-zA-Z]{2,8})(-[a-zA-Z0-9]{1,8})*$/.test(p.language.code)||typeof p.language.name!=='string'||p.language.name.length>60||!['ltr','rtl'].includes(p.language.dir)||!p.strings)return false;
 return Object.entries(zh.strings).every(([k,v])=>{const text=p.strings[k];return typeof text==='string'&&text.length<4000&&JSON.stringify([...v.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort())===JSON.stringify([...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort());});
}
export function downloadJSON(value:unknown,name:string){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function useLanguage(){
 const [packs,setPacks]=useState<LanguagePack[]>([zh,en]);
 const [code,setCode]=useState(()=>{const v=new URLSearchParams(location.search).get('lang')||safeGet('friskoli.language');return v==='zh-CN'?'zh-CN':'en';});
 const pack:LanguagePack=packs.find(p=>p.language.code===code)||en;
 useEffect(()=>{document.documentElement.lang=pack.language.code;document.documentElement.dir=pack.language.dir;document.title=`Friskoli · ${pack.strings.title}`;safeSet('friskoli.language',code);},[code,pack]);
 const t:Translate=(key,vars={})=>{const text=pack.strings[key]??(zh.strings as Record<string,string>)[key]??key;return text.replace(/\{(\w+)\}/g,(_,name)=>String(vars[name]??`{${name}}`));};
 const change=(next:string)=>{setCode(next);try{const url=new URL(location.href);url.searchParams.set('lang',next);history.replaceState(null,'',url);}catch{/* Offline files still switch normally. */}};
 const importPack=(value:unknown)=>{if(!validatePack(value))throw new Error('Invalid language pack');setPacks(list=>[...list.filter(p=>p.language.code!==value.language.code),value]);change(value.language.code);};
 return {t,code,packs,pack,change,importPack};
}
