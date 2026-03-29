// ─────────────────────────────────────────────────────────────────
// App.tsx — Arabic Learning System
// Pure functionality. No word data stored here.
// Add words in: src/words/verbs.ts and src/words/nouns.ts
// ─────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import { VERBS } from "./words/verbs";
import { NOUNS } from "./words/nouns";
import { conjugateVerb } from "./utils/conjugate";
import type { VerbType } from "./utils/conjugate";

// ── TYPES ────────────────────────────────────────────────────────
export interface VerbContext { s: string; t: string; m: string; }
export interface Verb {
  id: string; ar: string; root: string; form: string;
  meaning: string; meanings: string[];
  sentence: string; sentenceTr: string;
  contexts: VerbContext[];
  masdar: string; fail: string; mafool: string;
  type: VerbType;
  madi: string;
  mudariVowel?: 'a' | 'i' | 'u';
  conjugation?: {
    past?: string[];
    present?: string[];
    passive?: { past: string[]; present: string[] };
  };
}

function getConjugation(v: Verb): { past: string[]; present: string[] } {
  if (v.conjugation?.past && v.conjugation?.present) return v.conjugation as { past: string[]; present: string[] };
  return conjugateVerb(v);
}
export interface NounPlural { ar: string; type: string; meaning: string; shift: boolean; }
export interface NounContext { s: string; t: string; m: string; }
export interface Noun {
  id: string; ar: string; root: string; meaning: string;
  sentence: string; sentenceTr: string;
  plurals: NounPlural[];
  contexts: NounContext[];
  synonym: { ar: string; meaning: string; distinction: string } | null;
  antonym: { ar: string; meaning: string } | null;
}

// ── THEME ────────────────────────────────────────────────────────
const C={bg:"#0f0f0f",surface:"#1a1a1a",surface2:"#222",border:"rgba(255,255,255,0.08)",borderMed:"rgba(255,255,255,0.14)",text:"#f0f0f0",muted:"#888",subtle:"#444"};
const PURPLE={bg:"#26215C",text:"#CECBF6"};
const TEAL={bg:"#04342C",text:"#9FE1CB"};
const CORAL={bg:"#4A1B0C",text:"#F5C4B3"};
const PINK={bg:"#4B1528",text:"#F4C0D1"};
const GRAY={bg:"#2C2C2A",text:"#D3D1C7"};
const BLUE={bg:"#042C53",text:"#B5D4F4"};
const AMBER={bg:"#412402",text:"#FAC775"};
const GREEN={bg:"#173404",text:"#C0DD97"};

// ── UI PRIMITIVES ────────────────────────────────────────────────
const SL=({children,col}:{children:React.ReactNode;col?:string})=><p style={{fontSize:11,fontWeight:500,color:col||C.muted,letterSpacing:"0.07em",textTransform:"uppercase",margin:"0 0 10px"}}>{children}</p>;
const Card=({children,style}:{children:React.ReactNode;style?:React.CSSProperties})=><div style={{background:C.surface,border:`0.5px solid ${C.border}`,borderRadius:12,padding:"1rem 1.25rem",marginBottom:10,...style}}>{children}</div>;
const Pill=({label,color,sm}:{label:string;color:{bg:string;text:string};sm?:boolean})=><span style={{background:color.bg,color:color.text,fontSize:sm?10:11,fontWeight:500,padding:sm?"1px 7px":"2px 10px",borderRadius:99,display:"inline-block",margin:"2px 3px 2px 0"}}>{label}</span>;
const Divider=()=><hr style={{border:"none",borderTop:`0.5px solid ${C.border}`,margin:"1.2rem 0"}}/>;
const AccentBar=({children,color="#9FE1CB"}:{children:React.ReactNode;color?:string})=><div style={{borderLeft:`2px solid ${color}`,padding:"8px 14px",marginBottom:10,background:"rgba(255,255,255,0.02)",borderRadius:"0 6px 6px 0"}}><p style={{fontSize:13,color:C.muted,margin:0,lineHeight:1.65}}>{children}</p></div>;
const Btn=({children,onClick,col,sm,full,disabled}:{children:React.ReactNode;onClick?:()=>void;col?:{bg:string;text:string};sm?:boolean;full?:boolean;disabled?:boolean})=>(
  <button onClick={onClick} disabled={disabled} style={{background:col?col.bg:"transparent",border:`0.5px solid ${col?col.text:C.borderMed}`,borderRadius:8,padding:sm?"5px 12px":"9px 18px",fontSize:sm?12:13,color:disabled?"#444":col?col.text:C.text,cursor:disabled?"not-allowed":"pointer",width:full?"100%":"auto",marginRight:4,marginTop:4,fontWeight:500,opacity:disabled?0.5:1}}>
    {children}
  </button>
);
const RetBar=({r}:{r:number})=>{const col=r>=85?"#5DCAA5":r>=60?"#EF9F27":r>=30?"#F0997B":"#E24B4A";return <div style={{background:C.surface2,borderRadius:99,height:5,overflow:"hidden"}}><div style={{width:`${r}%`,height:"100%",background:col,borderRadius:99,transition:"width 0.4s"}}/></div>;};

// ── STORAGE ──────────────────────────────────────────────────────
const KEY="arabic_v6";
const loadS=()=>{try{const r=localStorage.getItem(KEY);return r?JSON.parse(r):{words:{},learned:{},settings:{}};}catch{return{words:{},learned:{},settings:{}};}};
const saveS=(d:object)=>{try{localStorage.setItem(KEY,JSON.stringify(d));}catch{}};

// ── SRS ──────────────────────────────────────────────────────────
const calcRet=(lr:number,s:number)=>{if(!lr)return 0;const e=(Date.now()-lr)/86400000;return Math.round(Math.max(0,Math.exp(-e/Math.max(s,0.5))*100));};
const nextS=(s:number,ok:boolean)=>ok?Math.min(s*2.5,365):0.5;
const statusR=(r:number)=>r>=85?{l:"Mastered",c:GREEN}:r>=60?{l:"Familiar",c:TEAL}:r>=30?{l:"Learning",c:AMBER}:{l:"New",c:CORAL};

// ── FUZZY MATCH ──────────────────────────────────────────────────
function fuzzy(a:string,b:string){a=a.trim();b=b.trim();if(a===b)return 1;const L=a.length>b.length?a:b,S=a.length>b.length?b:a;if(!L.length)return 1;let m=0;for(let i=0;i<S.length;i++)if(L.includes(S[i]))m++;return m/L.length;}
const checkAr=(input:string,target:string)=>{const v=input.trim();return v===target||fuzzy(v,target)>=0.85;};
const deriveMansub=(f:string):string=>{
  if(f.endsWith("ُونَ"))return f.slice(0,-4)+"ُوا";
  if(f.endsWith("ِينَ"))return f.slice(0,-4)+"ِي";
  if(f.endsWith("انِ"))return f.slice(0,-3)+"ا";
  if(f.endsWith("ُ"))return f.slice(0,-1)+"َ";
  return f;
};
const deriveMajzum=(f:string):string=>{
  if(f.endsWith("ُونَ"))return f.slice(0,-4)+"ُوا";
  if(f.endsWith("ِينَ"))return f.slice(0,-4)+"ِي";
  if(f.endsWith("انِ"))return f.slice(0,-3)+"ا";
  if(f.endsWith("ُ"))return f.slice(0,-1)+"ْ";
  if(f.endsWith("َ"))return f.slice(0,-1)+"ْ";
  return f;
};

// ── GRAMMAR DATA ─────────────────────────────────────────────────
const PRONOUNS=[
  {ar:"هُوَ",gram:"الغائب",sub:"مفرد مذكر"},{ar:"هِيَ",gram:"الغائب",sub:"مفرد مؤنث"},
  {ar:"هُمَا",gram:"الغائب",sub:"مثنى مذكر"},{ar:"هُمَا",gram:"الغائب",sub:"مثنى مؤنث"},
  {ar:"هُمْ",gram:"الغائب",sub:"جمع مذكر"},{ar:"هُنَّ",gram:"الغائب",sub:"جمع مؤنث"},
  {ar:"أَنْتَ",gram:"المخاطب",sub:"مفرد مذكر"},{ar:"أَنْتِ",gram:"المخاطب",sub:"مفرد مؤنث"},
  {ar:"أَنْتُمَا",gram:"المخاطب",sub:"مثنى"},{ar:"أَنْتُمْ",gram:"المخاطب",sub:"جمع مذكر"},
  {ar:"أَنْتُنَّ",gram:"المخاطب",sub:"جمع مؤنث"},
  {ar:"أَنَا",gram:"المتكلم",sub:"مفرد"},{ar:"نَحْنُ",gram:"المتكلم",sub:"جمع"},
];
const AMR_PRONOUNS=[
  {ar:"أَنْتَ",sub:"مفرد مذكر"},{ar:"أَنْتِ",sub:"مفرد مؤنث"},
  {ar:"أَنْتُمَا",sub:"مثنى"},{ar:"أَنْتُمْ",sub:"جمع مذكر"},{ar:"أَنْتُنَّ",sub:"جمع مؤنث"},
];
const gramColor=(g:string)=>g==="الغائب"?BLUE:g==="المخاطب"?TEAL:PURPLE;

// ── WEAK VERB TEMPLATES ──────────────────────────────────────────
const STRONG={root:"ف-ع-ل",display:"فَعَلَ",meaning:"placeholder strong verb",
  active:{
    past:["فَعَلَ","فَعَلَتْ","فَعَلَا","فَعَلَتَا","فَعَلُوا","فَعَلْنَ","فَعَلْتَ","فَعَلْتِ","فَعَلْتُمَا","فَعَلْتُمْ","فَعَلْتُنَّ","فَعَلْتُ","فَعَلْنَا"],
    marfu:["يَفْعَلُ","تَفْعَلُ","يَفْعَلَانِ","تَفْعَلَانِ","يَفْعَلُونَ","يَفْعَلْنَ","تَفْعَلُ","تَفْعَلِينَ","تَفْعَلَانِ","تَفْعَلُونَ","تَفْعَلْنَ","أَفْعَلُ","نَفْعَلُ"],
    mansub:["يَفْعَلَ","تَفْعَلَ","يَفْعَلَا","تَفْعَلَا","يَفْعَلُوا","يَفْعَلْنَ","تَفْعَلَ","تَفْعَلِي","تَفْعَلَا","تَفْعَلُوا","تَفْعَلْنَ","أَفْعَلَ","نَفْعَلَ"],
    majzum:["يَفْعَلْ","تَفْعَلْ","يَفْعَلَا","تَفْعَلَا","يَفْعَلُوا","يَفْعَلْنَ","تَفْعَلْ","تَفْعَلِي","تَفْعَلَا","تَفْعَلُوا","تَفْعَلْنَ","أَفْعَلْ","نَفْعَلْ"],
  },
  passive:{
    past:["فُعِلَ","فُعِلَتْ","فُعِلَا","فُعِلَتَا","فُعِلُوا","فُعِلْنَ","فُعِلْتَ","فُعِلْتِ","فُعِلْتُمَا","فُعِلْتُمْ","فُعِلْتُنَّ","فُعِلْتُ","فُعِلْنَا"],
    marfu:["يُفْعَلُ","تُفْعَلُ","يُفْعَلَانِ","تُفْعَلَانِ","يُفْعَلُونَ","يُفْعَلْنَ","تُفْعَلُ","تُفْعَلِينَ","تُفْعَلَانِ","تُفْعَلُونَ","تُفْعَلْنَ","أُفْعَلُ","نُفْعَلُ"],
    mansub:["يُفْعَلَ","تُفْعَلَ","يُفْعَلَا","تُفْعَلَا","يُفْعَلُوا","يُفْعَلْنَ","تُفْعَلَ","تُفْعَلِي","تُفْعَلَا","تُفْعَلُوا","تُفْعَلْنَ","أُفْعَلَ","نُفْعَلَ"],
    majzum:["يُفْعَلْ","تُفْعَلْ","يُفْعَلَا","تُفْعَلَا","يُفْعَلُوا","يُفْعَلْنَ","تُفْعَلْ","تُفْعَلِي","تُفْعَلَا","تُفْعَلُوا","تُفْعَلْنَ","أُفْعَلْ","نُفْعَلْ"],
  },
  amr:["اِفْعَلْ","اِفْعَلِي","اِفْعَلَا","اِفْعَلُوا","اِفْعَلْنَ"],
  masdar:"فَعْل",fail:"فَاعِل",mafool:"مَفْعُول",
};
const AJWAF={root:"ق-و-ل",display:"قَالَ",meaning:"to say",weakType:"أجوف (و)",weakNote:"In مجزوم, the weak middle letter و drops: يَقُولُ → يَقُلْ.",
  active:{
    past:["قَالَ","قَالَتْ","قَالَا","قَالَتَا","قَالُوا","قُلْنَ","قُلْتَ","قُلْتِ","قُلْتُمَا","قُلْتُمْ","قُلْتُنَّ","قُلْتُ","قُلْنَا"],
    marfu:["يَقُولُ","تَقُولُ","يَقُولَانِ","تَقُولَانِ","يَقُولُونَ","يَقُلْنَ","تَقُولُ","تَقُولِينَ","تَقُولَانِ","تَقُولُونَ","تَقُلْنَ","أَقُولُ","نَقُولُ"],
    mansub:["يَقُولَ","تَقُولَ","يَقُولَا","تَقُولَا","يَقُولُوا","يَقُلْنَ","تَقُولَ","تَقُولِي","تَقُولَا","تَقُولُوا","تَقُلْنَ","أَقُولَ","نَقُولَ"],
    majzum:["يَقُلْ","تَقُلْ","يَقُولَا","تَقُولَا","يَقُولُوا","يَقُلْنَ","تَقُلْ","تَقُولِي","تَقُولَا","تَقُولُوا","تَقُلْنَ","أَقُلْ","نَقُلْ"],
  },
  passive:{
    past:["قِيلَ","قِيلَتْ","قِيلَا","قِيلَتَا","قِيلُوا","قِلْنَ","قِلْتَ","قِلْتِ","قِلْتُمَا","قِلْتُمْ","قِلْتُنَّ","قِلْتُ","قِلْنَا"],
    marfu:["يُقَالُ","تُقَالُ","يُقَالَانِ","تُقَالَانِ","يُقَالُونَ","يُقَلْنَ","تُقَالُ","تُقَالِينَ","تُقَالَانِ","تُقَالُونَ","تُقَلْنَ","أُقَالُ","نُقَالُ"],
    mansub:["يُقَالَ","تُقَالَ","يُقَالَا","تُقَالَا","يُقَالُوا","يُقَلْنَ","تُقَالَ","تُقَالِي","تُقَالَا","تُقَالُوا","تُقَلْنَ","أُقَالَ","نُقَالَ"],
    majzum:["يُقَلْ","تُقَلْ","يُقَالَا","تُقَالَا","يُقَالُوا","يُقَلْنَ","تُقَلْ","تُقَالِي","تُقَالَا","تُقَالُوا","تُقَلْنَ","أُقَلْ","نُقَلْ"],
  },
  amr:["قُلْ","قُولِي","قُولَا","قُولُوا","قُلْنَ"],
  masdar:"قَوْل",fail:"قَائِل",mafool:"مَقُول",
};
const MITHAL={root:"و-ج-د",display:"وَجَدَ",meaning:"to find",weakType:"مثال (و)",weakNote:"The first letter و drops in the present tense: يَوَجِدُ → يَجِدُ.",
  active:{
    past:["وَجَدَ","وَجَدَتْ","وَجَدَا","وَجَدَتَا","وَجَدُوا","وَجَدْنَ","وَجَدْتَ","وَجَدْتِ","وَجَدْتُمَا","وَجَدْتُمْ","وَجَدْتُنَّ","وَجَدْتُ","وَجَدْنَا"],
    marfu:["يَجِدُ","تَجِدُ","يَجِدَانِ","تَجِدَانِ","يَجِدُونَ","يَجِدْنَ","تَجِدُ","تَجِدِينَ","تَجِدَانِ","تَجِدُونَ","تَجِدْنَ","أَجِدُ","نَجِدُ"],
    mansub:["يَجِدَ","تَجِدَ","يَجِدَا","تَجِدَا","يَجِدُوا","يَجِدْنَ","تَجِدَ","تَجِدِي","تَجِدَا","تَجِدُوا","تَجِدْنَ","أَجِدَ","نَجِدَ"],
    majzum:["يَجِدْ","تَجِدْ","يَجِدَا","تَجِدَا","يَجِدُوا","يَجِدْنَ","تَجِدْ","تَجِدِي","تَجِدَا","تَجِدُوا","تَجِدْنَ","أَجِدْ","نَجِدْ"],
  },
  passive:{
    past:["وُجِدَ","وُجِدَتْ","وُجِدَا","وُجِدَتَا","وُجِدُوا","وُجِدْنَ","وُجِدْتَ","وُجِدْتِ","وُجِدْتُمَا","وُجِدْتُمْ","وُجِدْتُنَّ","وُجِدْتُ","وُجِدْنَا"],
    marfu:["يُوجَدُ","تُوجَدُ","يُوجَدَانِ","تُوجَدَانِ","يُوجَدُونَ","يُوجَدْنَ","تُوجَدُ","تُوجَدِينَ","تُوجَدَانِ","تُوجَدُونَ","تُوجَدْنَ","أُوجَدُ","نُوجَدُ"],
    mansub:["يُوجَدَ","تُوجَدَ","يُوجَدَا","تُوجَدَا","يُوجَدُوا","يُوجَدْنَ","تُوجَدَ","تُوجَدِي","تُوجَدَا","تُوجَدُوا","تُوجَدْنَ","أُوجَدَ","نُوجَدَ"],
    majzum:["يُوجَدْ","تُوجَدْ","يُوجَدَا","تُوجَدَا","يُوجَدُوا","يُوجَدْنَ","تُوجَدْ","تُوجَدِي","تُوجَدَا","تُوجَدُوا","تُوجَدْنَ","أُوجَدْ","نُوجَدْ"],
  },
  amr:["جِدْ","جِدِي","جِدَا","جِدُوا","جِدْنَ"],
  masdar:"وُجُود",fail:"وَاجِد",mafool:"مَوْجُود",
};
const NAQIS={root:"د-ع-و",display:"دَعَا",meaning:"to call",weakType:"ناقص (و/ي)",weakNote:"The weak final letter causes changes in plurals and majzum (drops entirely).",
  active:{
    past:["دَعَا","دَعَتْ","دَعَوَا","دَعَتَا","دَعَوْا","دَعَوْنَ","دَعَوْتَ","دَعَوْتِ","دَعَوْتُمَا","دَعَوْتُمْ","دَعَوْتُنَّ","دَعَوْتُ","دَعَوْنَا"],
    marfu:["يَدْعُو","تَدْعُو","يَدْعَوَانِ","تَدْعَوَانِ","يَدْعُونَ","يَدْعُونَ","تَدْعُو","تَدْعِينَ","تَدْعَوَانِ","تَدْعُونَ","تَدْعُونَ","أَدْعُو","نَدْعُو"],
    mansub:["يَدْعُوَ","تَدْعُوَ","يَدْعَوَا","تَدْعَوَا","يَدْعُوا","يَدْعُونَ","تَدْعُوَ","تَدْعِي","تَدْعَوَا","تَدْعُوا","تَدْعُونَ","أَدْعُوَ","نَدْعُوَ"],
    majzum:["يَدْعْ","تَدْعْ","يَدْعَوَا","تَدْعَوَا","يَدْعُوا","يَدْعُونَ","تَدْعْ","تَدْعِي","تَدْعَوَا","تَدْعُوا","تَدْعُونَ","أَدْعْ","نَدْعْ"],
  },
  passive:{
    past:["دُعِيَ","دُعِيَتْ","دُعِيَا","دُعِيَتَا","دُعُوا","دُعِينَ","دُعِيتَ","دُعِيتِ","دُعِيتُمَا","دُعِيتُمْ","دُعِيتُنَّ","دُعِيتُ","دُعِينَا"],
    marfu:["يُدْعَى","تُدْعَى","يُدْعَيَانِ","تُدْعَيَانِ","يُدْعَوْنَ","يُدْعَيْنَ","تُدْعَى","تُدْعَيْنَ","تُدْعَيَانِ","تُدْعَوْنَ","تُدْعَيْنَ","أُدْعَى","نُدْعَى"],
    mansub:["يُدْعَى","تُدْعَى","يُدْعَيَا","تُدْعَيَا","يُدْعَوْا","يُدْعَيْنَ","تُدْعَى","تُدْعَيْ","تُدْعَيَا","تُدْعَوْا","تُدْعَيْنَ","أُدْعَى","نُدْعَى"],
    majzum:["يُدْعَ","تُدْعَ","يُدْعَيَا","تُدْعَيَا","يُدْعَوْا","يُدْعَيْنَ","تُدْعَ","تُدْعَيْ","تُدْعَيَا","تُدْعَوْا","تُدْعَيْنَ","أُدْعَ","نُدْعَ"],
  },
  amr:["اُدْعُ","اُدْعِي","اُدْعُوَا","اُدْعُوا","اُدْعُونَ"],
  masdar:"دَعْوَة",fail:"دَاعٍ",mafool:"مَدْعُوّ",
};
const MUDAAF={root:"ر-د-د",display:"رَدَّ",meaning:"to reply",weakType:"مضاعف",weakNote:"The identical 2nd and 3rd letters merge (shadda) unless followed by a consonant pronoun.",
  active:{
    past:["رَدَّ","رَدَّتْ","رَدَّا","رَدَّتَا","رَدُّوا","رَدَدْنَ","رَدَدْتَ","رَدَدْتِ","رَدَدْتُمَا","رَدَدْتُمْ","رَدَدْتُنَّ","رَدَدْتُ","رَدَدْنَا"],
    marfu:["يَرُدُّ","تَرُدُّ","يَرُدَّانِ","تَرُدَّانِ","يَرُدُّونَ","يَرْدُدْنَ","تَرُدُّ","تَرُدِّينَ","تَرُدَّانِ","تَرُدُّونَ","تَرْدُدْنَ","أَرُدُّ","نَرُدُّ"],
    mansub:["يَرُدَّ","تَرُدَّ","يَرُدَّا","تَرُدَّا","يَرُدُّوا","يَرْدُدْنَ","تَرُدَّ","تَرُدِّي","تَرُدَّا","تَرُدُّوا","تَرْدُدْنَ","أَرُدَّ","نَرُدَّ"],
    majzum:["يَرُدَّ","تَرُدَّ","يَرُدَّا","تَرُدَّا","يَرُدُّوا","يَرْدُدْنَ","تَرُدَّ","تَرُدِّي","تَرُدَّا","تَرُدُّوا","تَرْدُدْنَ","أَرُدَّ","نَرُدَّ"],
  },
  passive:{
    past:["رُدَّ","رُدَّتْ","رُدَّا","رُدَّتَا","رُدُّوا","رُدِدْنَ","رُدِدْتَ","رُدِدْتِ","رُدِدْتُمَا","رُدِدْتُمْ","رُدِدْتُنَّ","رُدِدْتُ","رُدِدْنَا"],
    marfu:["يُرَدُّ","تُرَدُّ","يُرَدَّانِ","تُرَدَّانِ","يُرَدُّونَ","يُرْدَدْنَ","تُرَدُّ","تُرَدِّينَ","تُرَدَّانِ","تُرَدُّونَ","تُرْدَدْنَ","أُرَدُّ","نُرَدُّ"],
    mansub:["يُرَدَّ","تُرَدَّ","يُرَدَّا","تُرَدَّا","يُرَدُّوا","يُرْدَدْنَ","تُرَدَّ","تُرَدِّي","تُرَدَّا","تُرَدُّوا","تُرْدَدْنَ","أُرَدَّ","نُرَدَّ"],
    majzum:["يُرَدَّ","تُرَدَّ","يُرَدَّا","تُرَدَّا","يُرَدُّوا","يُرْدَدْنَ","تُرَدَّ","تُرَدِّي","تُرَدَّا","تُرَدُّوا","تُرْدَدْنَ","أُرَدَّ","نُرَدَّ"],
  },
  amr:["رُدَّ","رُدِّي","رُدَّا","رُدُّوا","اُرْدُدْنَ"],
  masdar:"رَدّ",fail:"رَادّ",mafool:"مَرْدُود",
};

// Add this right below your VERB_TYPES array
const genSarf=(past:string, pres:string, pv:string, amr:string, ppast:string, ppres:string)=>{
  const pB=past.slice(0,-1), ppB=ppast.slice(0,-1);
  const getPr=(pv:string, b:string, m:string)=>{
    const v=m==="marfu"?"ُ":m==="mansub"?"َ":"ْ";
    const d2=m==="marfu"?"َانِ":"َا", dP=m==="marfu"?"ُونَ":"ُوا", dF=m==="marfu"?"ِينَ":"ِي";
    return ["ي"+pv+b+v, "ت"+pv+b+v, "ي"+pv+b+d2, "ت"+pv+b+d2, "ي"+pv+b+dP, "ي"+pv+b+"ْنَ", "ت"+pv+b+v, "ت"+pv+b+dF, "ت"+pv+b+d2, "ت"+pv+b+dP, "ت"+pv+b+"ْنَ", "أ"+pv+b+v, "ن"+pv+b+v];
  };
  return{
    display: past, root: "ف-ع-ل", meaning: "Generated Form",
    masdar: "—", fail: "—", mafool: "—",
    active:{
      past:[past,past+"تْ",past+"ا",past+"تَا",pB+"ُوا",pB+"ْنَ",pB+"ْتَ",pB+"ْتِ",pB+"ْتُمَا",pB+"ْتُمْ",pB+"ْتُنَّ",pB+"ْتُ",pB+"ْنَا"],
      marfu:getPr(pv,pres,"marfu"), mansub:getPr(pv,pres,"mansub"), majzum:getPr(pv,pres,"majzum")
    },
    passive: ppast ? {
      past:[ppast,ppast+"تْ",ppast+"ا",ppast+"تَا",ppB+"ُوا",ppB+"ْنَ",ppB+"ْتَ",ppB+"ْتِ",ppB+"ْتُمَا",ppB+"ْتُمْ",ppB+"ْتُنَّ",ppB+"ْتُ",ppB+"ْنَا"],
      marfu:getPr("ُ",ppres,"marfu"), mansub:getPr("ُ",ppres,"mansub"), majzum:getPr("ُ",ppres,"majzum")
    } : {past:Array(13).fill("—"),marfu:Array(13).fill("—"),mansub:Array(13).fill("—"),majzum:Array(13).fill("—")},
    amr:[amr+"ْ",amr+"ِي",amr+"َا",amr+"ُوا",amr+"ْنَ"]
  };
};

const STRONG_FORMS=[
  STRONG,
  genSarf("فَعَّلَ","فَعِّل","ُ","فَعِّل","فُعِّلَ","فَعَّل"),
  genSarf("فَاعَلَ","فَاعِل","ُ","فَاعِل","فُوعِلَ","فَاعَل"),
  genSarf("أَفْعَلَ","فْعِل","ُ","أَفْعِل","أُفْعِلَ","فْعَل"),
  genSarf("تَفَعَّلَ","تَفَعَّل","َ","تَفَعَّل","تُفُعِّلَ","تَفَعَّل"),
  genSarf("تَفَاعَلَ","تَفَاعَل","َ","تَفَاعَل","تُفُوعِلَ","تَفَاعَل"),
  genSarf("اِنْفَعَلَ","نْفَعِل","َ","اِنْفَعِل","اُنْفُعِلَ","نْفَعَل"),
  genSarf("اِفْتَعَلَ","فْتَعِل","َ","اِفْتَعِل","اُفْتُعِلَ","فْتَعَل"),
  genSarf("اِفْعَلَّ","فْعَلّ","َ","اِفْعَلِّ","",""),
  genSarf("اِسْتَفْعَلَ","سْتَفْعِل","َ","اِسْتَفْعِل","اُسْتُفْعِلَ","سْتَفْعَل")
];

// Per-type per-form sarf data using actual example verbs
const VERB_TYPE_FORMS=[
  // [0] Strong سالم — STRONG_FORMS already uses ف-ع-ل which IS the example
  STRONG_FORMS,
  // [1] Hollow أجوف
  [
    AJWAF,
    genSarf("زَيَّنَ","زَيِّن","ُ","زَيِّن","زُيِّنَ","زَيَّن"),
    genSarf("قَاوَلَ","قَاوِل","ُ","قَاوِل","قُووِلَ","قَاوَل"),
    genSarf("أَقَالَ","قِيل","ُ","أَقِل","أُقِيلَ","قَال"),
    genSarf("تَزَيَّنَ","تَزَيَّن","َ","تَزَيَّن","تُزُيِّنَ","تَزَيَّن"),
    genSarf("تَقَاوَلَ","تَقَاوَل","َ","تَقَاوَل","تُقُووِلَ","تَقَاوَل"),
    genSarf("اِنْهَارَ","نْهَار","َ","اِنْهَر","",""),
    genSarf("اِخْتَارَ","خْتَار","َ","اِخْتَر","اُخْتِيرَ","خْتَار"),
    genSarf("اِسْوَدَّ","سْوَدّ","َ","اِسْوَدِّ","",""),
    genSarf("اِسْتَقَالَ","سْتَقِيل","َ","اِسْتَقِل","اُسْتُقِيلَ","سْتَقَال"),
  ],
  // [2] Assimilated مثال
  [
    MITHAL,
    genSarf("وَصَّلَ","وَصِّل","ُ","وَصِّل","وُصِّلَ","وَصَّل"),
    genSarf("وَاصَلَ","وَاصِل","ُ","وَاصِل","وُوصِلَ","وَاصَل"),
    genSarf("أَوْجَدَ","وْجِد","ُ","أَوْجِد","أُوجِدَ","وْجَد"),
    genSarf("تَوَصَّلَ","تَوَصَّل","َ","تَوَصَّل","تُوُصِّلَ","تَوَصَّل"),
    genSarf("تَوَاجَدَ","تَوَاجَد","َ","تَوَاجَد","تُووجِدَ","تَوَاجَد"),
    genSarf("اِنْوَجَدَ","نْوَجِد","َ","اِنْوَجِد","",""),
    genSarf("اِتَّصَلَ","تَّصِل","َ","اِتَّصِل","اُتُّصِلَ","تَّصَل"),
    STRONG_FORMS[8], // Form IX not applicable for Assimilated
    genSarf("اِسْتَوْعَبَ","سْتَوْعِب","َ","اِسْتَوْعِب","اُسْتُوعِبَ","سْتَوْعَب"),
  ],
  // [3] Defective ناقص
  [
    NAQIS,
    genSarf("سَمَّى","سَمِّي","ُ","سَمِّ","سُمِّيَ","سَمَّ"),
    genSarf("نَادَى","نَادِي","ُ","نَادِ","نُودِيَ","نَادَ"),
    genSarf("أَعْطَى","عْطِي","ُ","أَعْطِ","أُعْطِيَ","عْطَ"),
    genSarf("تَمَنَّى","تَمَنَّ","َ","تَمَنَّ","تُمُنِّيَ","تَمَنَّ"),
    genSarf("تَدَاعَى","تَدَاعَ","َ","تَدَاعَ","تُدُوعِيَ","تَدَاعَ"),
    genSarf("اِنْطَوَى","نْطَوِي","َ","اِنْطَوِ","",""),
    genSarf("اِدَّعَى","دَّعِي","َ","اِدَّعِ","اُدُّعِيَ","دَّعَ"),
    STRONG_FORMS[8], // Form IX not applicable for Defective
    genSarf("اِسْتَدْعَى","سْتَدْعِي","َ","اِسْتَدْعِ","اُسْتُدْعِيَ","سْتَدْعَ"),
  ],
  // [4] Doubled مضاعف
  [
    MUDAAF,
    genSarf("رَدَّدَ","رَدِّد","ُ","رَدِّد","رُدِّدَ","رَدَّد"),
    genSarf("رَادَّ","رَادّ","ُ","رَادِد","رُودَّ","رَادَد"),
    genSarf("أَحَبَّ","حِبّ","ُ","أَحِبَّ","أُحِبَّ","حَبّ"),
    genSarf("تَرَدَّدَ","تَرَدَّد","َ","تَرَدَّد","تُرُدِّدَ","تَرَدَّد"),
    genSarf("تَرَادَّ","تَرَادّ","َ","تَرَادَّ","تُرُودَّ","تَرَادَد"),
    genSarf("اِنْشَقَّ","نْشَقّ","َ","اِنْشَقِّ","",""),
    genSarf("اِرْتَدَّ","رْتَدّ","َ","اِرْتَدِّ","اُرْتُدَّ","رْتَدَد"),
    STRONG_FORMS[8], // Form IX not applicable for Doubled
    genSarf("اِسْتَرَدَّ","سْتَرِدّ","َ","اِسْتَرِدَّ","اُسْتُرِدَّ","سْتَرَدَد"),
  ],
];

const VERB_TYPES = [
  {
    label: "سالم (Strong: ف-ع-ل)", data: STRONG,
    examples: [
      {ar: "فَعَلَ", sentence: "فَعَلَ مَا يُؤْمَرُ بِهِ", tr: "He did what he was commanded"},
      {ar: "فَعَّلَ", sentence: "فَعَّلَ القَانُونَ", tr: "He implemented the law"},
      {ar: "فَاعَلَ", sentence: "فَاعَلَ شَرِيكَهُ بِالخَيْرِ", tr: "He treated his partner well"},
      {ar: "أَفْعَلَ", sentence: "أَفْعَلَ الأَمْرَ", tr: "He caused the matter to happen"},
      {ar: "تَفَعَّلَ", sentence: "تَفَعَّلَ الخَيْرَ", tr: "He pursued good"},
      {ar: "تَفَاعَلَ", sentence: "تَفَاعَلَتِ المَوَادُّ", tr: "The materials reacted mutually"},
      {ar: "اِنْفَعَلَ", sentence: "اِنْفَعَلَ مِنَ الغَضَبِ", tr: "He became agitated from anger"},
      {ar: "اِفْتَعَلَ", sentence: "اِفْتَعَلَ المُشْكِلَةَ", tr: "He fabricated the problem"},
      {ar: "اِفْعَلَّ", sentence: "اِفْعَلَّ لَوْنُهُ", tr: "Its color changed"},
      {ar: "اِسْتَفْعَلَ", sentence: "اِسْتَفْعَلَهُ الأَمْرَ", tr: "He asked him to do the matter"}
    ]
  },
  {
    label: "أجوف (Hollow: ق-و-ل)", data: AJWAF,
    examples: [
      {ar: "قَالَ", sentence: "قَالَ كَلِمَةَ الحَقِّ", tr: "He spoke the word of truth (Root: ق-و-ل)"},
      {ar: "زَيَّنَ", sentence: "زَيَّنَ المَنْزِلَ", tr: "He decorated the house (Root: ز-ي-ن)"},
      {ar: "قَاوَلَ", sentence: "قَاوَلَ التَّاجِرَ فِي السِّعْرِ", tr: "He bargained with the merchant (Root: ق-و-ل)"},
      {ar: "أَقَالَ", sentence: "أَقَالَ الْمُوَظَّفَ", tr: "He dismissed the employee (Root: ق-و-ل)"},
      {ar: "تَزَيَّنَ", sentence: "تَزَيَّنَ لِلْحَفْلِ", tr: "He adorned himself for the party (Root: ز-ي-ن)"},
      {ar: "تَقَاوَلَ", sentence: "تَقَاوَلَ القَوْمُ", tr: "The people discussed mutually (Root: ق-و-ل)"},
      {ar: "اِنْهَارَ", sentence: "اِنْهَارَ المَبْنَى", tr: "The building collapsed (Root: ه-و-ر)"},
      {ar: "اِخْتَارَ", sentence: "اِخْتَارَ الطَّرِيقَ", tr: "He chose the path (Root: خ-ي-ر)"},
      {ar: "اِسْوَدَّ", sentence: "اِسْوَدَّ اللَّيْلُ", tr: "The night turned black (Root: س-و-د)"},
      {ar: "اِسْتَقَالَ", sentence: "اِسْتَقَالَ مِنْ مَنْصِبِهِ", tr: "He resigned from his position (Root: ق-و-ل)"}
    ]
  },
  {
    label: "مثال (Assimilated: و-ج-د)", data: MITHAL,
    examples: [
      {ar: "وَجَدَ", sentence: "وَجَدَ ضَالَّتَهُ", tr: "He found his lost item (Root: و-ج-د)"},
      {ar: "وَصَّلَ", sentence: "وَصَّلَ الرِّسَالَةَ", tr: "He delivered/connected the message (Root: و-ص-ل)"},
      {ar: "وَاصَلَ", sentence: "وَاصَلَ العَمَلَ", tr: "He continued the work (Root: و-ص-ل)"},
      {ar: "أَوْجَدَ", sentence: "أَوْجَدَ الشَّيْءَ مِنَ العَدَمِ", tr: "He brought the thing into existence (Root: و-ج-د)"},
      {ar: "تَوَصَّلَ", sentence: "تَوَصَّلَ إِلَى حَلٍّ", tr: "He reached a solution (Root: و-ص-ل)"},
      {ar: "تَوَاجَدَ", sentence: "تَوَاجَدَ القَوْمُ", tr: "The people were present together (Root: و-ج-د)"},
      {ar: "اِنْوَجَدَ", sentence: "اِنْوَجَدَ فِي المَكَانِ", tr: "He was found in the place (Root: و-ج-د)"},
      {ar: "اِتَّصَلَ", sentence: "اِتَّصَلَ بِصَدِيقِهِ", tr: "He contacted his friend (Root: و-ص-ل)"},
      {ar: "—", sentence: "—", tr: "Not applicable to Assimilated roots"},
      {ar: "اِسْتَوْعَبَ", sentence: "اِسْتَوْعَبَ الدَّرْسَ", tr: "He comprehended the lesson (Root: و-ع-ب)"}
    ]
  },
  {
    label: "ناقص (Defective: د-ع-و)", data: NAQIS,
    examples: [
      {ar: "دَعَا", sentence: "دَعَا صَدِيقَهُ", tr: "He invited his friend (Root: د-ع-و)"},
      {ar: "سَمَّى", sentence: "سَمَّى ابْنَهُ", tr: "He named his son (Root: س-م-و)"},
      {ar: "نَادَى", sentence: "نَادَى بِأَعْلَى صَوْتِهِ", tr: "He called out loudly (Root: ن-د-و)"},
      {ar: "أَعْطَى", sentence: "أَعْطَى المَالَ", tr: "He gave the money (Root: ع-ط-و)"},
      {ar: "تَمَنَّى", sentence: "تَمَنَّى الخَيْرَ", tr: "He wished for good (Root: م-ن-ي)"},
      {ar: "تَدَاعَى", sentence: "تَدَاعَى القَوْمُ لِلنُّصْرَةِ", tr: "The people called each other for help (Root: د-ع-و)"},
      {ar: "اِنْطَوَى", sentence: "اِنْطَوَى عَلَى نَفْسِهِ", tr: "He became introverted/folded in (Root: ط-و-ي)"},
      {ar: "اِدَّعَى", sentence: "اِدَّعَى حَقّاً لَيْسَ لَهُ", tr: "He claimed a right that wasn't his (Root: د-ع-و)"},
      {ar: "—", sentence: "—", tr: "Not applicable to Defective roots"},
      {ar: "اِسْتَدْعَى", sentence: "اِسْتَدْعَى السَّفِيرَ", tr: "He summoned the ambassador (Root: د-ع-و)"}
    ]
  },
  {
    label: "مضاعف (Doubled: ر-د-د)", data: MUDAAF,
    examples: [
      {ar: "رَدَّ", sentence: "رَدَّ البَابَ", tr: "He closed the door (Root: ر-د-د)"},
      {ar: "رَدَّدَ", sentence: "رَدَّدَ الأُغْنِيَةَ", tr: "He repeated the song (Root: ر-د-د)"},
      {ar: "رَادَّ", sentence: "رَادَّهُ فِي الكَلَامِ", tr: "He argued back and forth with him (Root: ر-د-د)"},
      {ar: "أَحَبَّ", sentence: "أَحَبَّ العَمَلَ", tr: "He loved the work (Root: ح-ب-ب)"},
      {ar: "تَرَدَّدَ", sentence: "تَرَدَّدَ فِي القَرَارِ", tr: "He hesitated in the decision (Root: ر-د-د)"},
      {ar: "تَرَادَّ", sentence: "تَرَادَّا البَيْعَ", tr: "They mutually canceled the sale (Root: ر-د-د)"},
      {ar: "اِنْشَقَّ", sentence: "اِنْشَقَّ القَمَرُ", tr: "The moon split apart (Root: ش-ق-ق)"},
      {ar: "اِرْتَدَّ", sentence: "اِرْتَدَّ عَنْ دِينِهِ", tr: "He turned back from his religion (Root: ر-د-د)"},
      {ar: "—", sentence: "—", tr: "Not applicable to Doubled roots"},
      {ar: "اِسْتَرَدَّ", sentence: "اِسْتَرَدَّ أَمْوَالَهُ", tr: "He reclaimed his money (Root: ر-د-د)"}
    ]
  }
];
const FORM_RULES=[
  {idx:0, num:"I",   color:PURPLE, rule:"Base Meaning",        exp:"The default, simple action of the root.", analogy:"A simple closed circuit. The current flows, the action happens.",
   masdar:"فَعْل / فِعَال / فَعَالَة (varies)", fail:"فَاعِل", mafool:"مَفْعُول"},
  {idx:1, num:"II",  color:TEAL,   rule:"Intensive / Causative", exp:"Adds intensity, repetition, or causes the action to happen to someone else.", analogy:"An amplifier boosting a signal.",
   masdar:"تَفْعِيل", fail:"مُفَعِّل", mafool:"مُفَعَّل"},
  {idx:2, num:"III", color:TEAL,   rule:"Mutual Interaction",   exp:"Action directed at or done mutually with another person.", analogy:"A two-way communication protocol (like TCP) requiring a transmitter and receiver.",
   masdar:"مُفَاعَلَة / فِعَال", fail:"مُفَاعِل", mafool:"مُفَاعَل"},
  {idx:3, num:"IV",  color:CORAL,  rule:"Causative (Director)", exp:"You bring about the action in someone or something else.", analogy:"A command signal triggering an external process.",
   masdar:"إِفْعَال", fail:"مُفْعِل", mafool:"مُفْعَل"},
  {idx:4, num:"V",   color:PINK,   rule:"Reflexive of II",      exp:"The natural consequence of Form II. If Form II is 'to smash', Form V is 'to become smashed'.", analogy:"The physical reaction to an applied force.",
   masdar:"تَفَعُّل", fail:"مُتَفَعِّل", mafool:"مُتَفَعَّل"},
  {idx:5, num:"VI",  color:PINK,   rule:"Reciprocal",           exp:"Two or more parties doing the action together.", analogy:"A peer-to-peer (P2P) network where nodes share data equally.",
   masdar:"تَفَاعُل", fail:"مُتَفَاعِل", mafool:"مُتَفَاعَل"},
  {idx:6, num:"VII", color:AMBER,  rule:"Pure Passive",         exp:"The action happened, but the 'doer' is irrelevant. Focuses entirely on the state of the object.", analogy:"A tripped circuit breaker. We care that it snapped, not who tripped it.",
   masdar:"اِنْفِعَال", fail:"مُنْفَعِل", mafool:"مُنْفَعَل"},
  {idx:7, num:"VIII",color:AMBER,  rule:"Internal Effort",      exp:"Doing the action for oneself, or acting with deliberate, internal effort.", analogy:"Internal CPU processing before an output is made.",
   masdar:"اِفْتِعَال", fail:"مُفْتَعِل", mafool:"مُفْتَعَل"},
  {idx:8, num:"IX",  color:GRAY,   rule:"Colors & Defects",     exp:"Strictly used for transforming into colors or physical defects.", analogy:"A status LED changing state (e.g., from green to red).",
   masdar:"اِفْعِلَال", fail:"مُفْعَلّ", mafool:"—"},
  {idx:9, num:"X",   color:BLUE,   rule:"The Seeker",           exp:"Seeking, requesting, or deeming the base action.", analogy:"A client sending an HTTP GET request.",
   masdar:"اِسْتِفْعَال", fail:"مُسْتَفْعِل", mafool:"مُسْتَفْعَل"},
];

// ── ARABIC KEYBOARD OVERLAY ──────────────────────────────────────
const KB_ROWS=[["ض","ص","ث","ق","ف","غ","ع","ه","خ","ح","ج","د"],["ش","س","ي","ب","ل","ا","ت","ن","م","ك","ط"],["ئ","ء","ؤ","ر","لا","ى","ة","و","ز","ظ","ذ"]];
const HARAKAT=["َ","ِ","ُ","ً","ٍ","ٌ","ْ","ّ"];
if(typeof document!=="undefined"&&!document.getElementById("mic-pulse-style")){const s=document.createElement("style");s.id="mic-pulse-style";s.textContent="@keyframes micPulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)}70%{box-shadow:0 0 0 8px rgba(239,68,68,0)}}";document.head.appendChild(s);}
const useSpeech=(lang:string)=>{
  const [listening,setListening]=useState(false);
  const recRef=useRef<any>(null);
  const supported=typeof window!=="undefined"&&!!((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition);
  const start=(cb:(t:string)=>void)=>{
    if(!supported)return;
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    const r=new SR();r.lang=lang;r.continuous=false;r.interimResults=false;
    r.onresult=(e:any)=>{setListening(false);cb(e.results[0][0].transcript);};
    r.onerror=()=>setListening(false);r.onend=()=>setListening(false);
    recRef.current=r;r.start();setListening(true);
  };
  const stop=()=>{recRef.current?.stop();setListening(false);};
  return{supported,listening,start,stop};
};
const KBOverlay=({label,initial,onConfirm,onClose}:{label:string;initial?:string;onConfirm:(v:string)=>void;onClose:()=>void})=>{
  const [val,setVal]=useState(initial||"");
  const [cur,setCur]=useState((initial||"").length);
  const [showH,setShowH]=useState(true);
  const speech=useSpeech("ar-SA");
  const ins=(k:string)=>{const nv=val.slice(0,cur)+k+val.slice(cur);setVal(nv);setCur(cur+k.length);};
  const bk=()=>{if(!cur)return;setVal(val.slice(0,cur-1)+val.slice(cur));setCur(c=>Math.max(0,c-1));};
  const mv=(d:number)=>setCur(c=>Math.max(0,Math.min(val.length,c+d)));
  const ks=(x:React.CSSProperties={})=>({background:C.surface2,border:`0.5px solid ${C.borderMed}`,borderRadius:6,padding:"9px 3px",fontSize:16,color:C.text,cursor:"pointer",textAlign:"center" as const,flex:1,minWidth:0,...x});
  return(
    <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,backdropFilter:"blur(6px)",background:"rgba(0,0,0,0.7)"}}/>
      <div style={{position:"relative",width:"100%",maxWidth:600,background:C.surface,borderRadius:"16px 16px 0 0",padding:"1rem",boxShadow:"0 -8px 40px rgba(0,0,0,0.6)"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <p style={{fontSize:12,color:C.muted,margin:0}}>{label}</p>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{background:C.bg,border:`0.5px solid ${C.border}`,borderRadius:8,padding:"10px 14px",marginBottom:8,minHeight:44,direction:"rtl",fontSize:20,color:C.text,lineHeight:1.6,display:"flex",alignItems:"center",flexWrap:"wrap",gap:1}}>
          {!val&&<span style={{color:C.subtle,fontSize:14}}>اكتب هنا…</span>}
          {val.split("").map((ch,i)=><span key={i} onClick={()=>setCur(i+1)} style={{cursor:"pointer",borderRight:i===cur-1?"2px solid #AFA9EC":"none",padding:"0 1px"}}>{ch}</span>)}
          {cur===val.length&&val.length>0&&<span style={{borderRight:"2px solid #AFA9EC",height:"1.2em",display:"inline-block"}}/>}
        </div>
        {showH&&<div style={{display:"flex",gap:3,marginBottom:5,flexWrap:"wrap"}}>{HARAKAT.map(h=><button key={h} onClick={()=>ins(h)} style={ks({flex:"none",padding:"7px 9px",fontSize:18,background:PURPLE.bg,color:PURPLE.text,minWidth:30})}>{h}</button>)}</div>}
        {KB_ROWS.map((row,ri)=><div key={ri} style={{display:"flex",gap:3,marginBottom:3}}>{row.map(k=><button key={k} onClick={()=>ins(k)} style={ks()}>{k}</button>)}</div>)}
        <div style={{display:"flex",gap:3,marginTop:6}}>
          <button onClick={()=>mv(-1)} style={ks({flex:1,fontSize:13,color:BLUE.text,background:BLUE.bg})}>←</button>
          <button onClick={()=>mv(1)}  style={ks({flex:1,fontSize:13,color:BLUE.text,background:BLUE.bg})}>→</button>
          <button onClick={bk} style={ks({flex:2,fontSize:13,color:AMBER.text,background:AMBER.bg})}>⌫</button>
          <button onClick={()=>{setVal("");setCur(0);}} style={ks({flex:2,fontSize:11,color:CORAL.text,background:CORAL.bg})}>مسح</button>
          <button onClick={()=>setShowH(s=>!s)} style={ks({flex:2,fontSize:10,color:TEAL.text,background:TEAL.bg})}>{showH?"إخفاء":"حركات"}</button>
          <button onClick={()=>{if(speech.listening)speech.stop();else speech.start(t=>{setVal(t);setCur(t.length);});}} style={ks({flex:2,fontSize:14,background:speech.listening?"#7f1d1d":"transparent",color:speech.listening?"#ef4444":C.muted,border:`0.5px solid ${speech.listening?"#ef4444":C.borderMed}`,animation:speech.listening?"micPulse 1s ease-in-out infinite":"none"})}>{speech.listening?"🔴":"🎤"}</button>
          <button onClick={()=>val.trim()&&onConfirm(val)} style={ks({flex:4,background:PURPLE.bg,color:PURPLE.text,fontSize:13,fontWeight:500})}>تأكيد ←</button>
        </div>
      </div>
    </div>
  );
};


// ── SARF TABLE (reference + fill-in) ────────────────────────────
const MOODS=[{key:"marfu",ar:"مرفوع"},{key:"mansub",ar:"منصوب"},{key:"majzum",ar:"مجزوم"}];
const SarfTable=({data}:{data:typeof STRONG})=>{
  const [mode,setMode]=useState<"view"|"fill">("view");
  const [useCanvas,setUseCanvas]=useState(false);
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [checked,setChecked]=useState(false);
  const [overlay,setOverlay]=useState<{key:string;label:string;target:string;store:string;field?:string}|null>(null);
  const [amrPage,setAmrPage]=useState(false);
  const [amrAns,setAmrAns]=useState<Record<string,string>>({});
  const [bottom,setBottom]=useState({masdar:"",fail:"",mafool:""});
  const [bottomChecked,setBottomChecked]=useState(false);
  const ck=(s:string,m:string,i:number)=>`${s}_${m}_${i}`;
  const total=(MOODS.length+1)*PRONOUNS.length*2;
  const correct=checked?Object.keys(answers).filter(k=>{const[s,m,i]=k.split("_");return checkAr(answers[k]||"",(data as any)[s][m][parseInt(i)]);}).length:0;
  const amrCorrect=checked?Object.keys(amrAns).filter(k=>checkAr(amrAns[k]||"",data.amr[parseInt(k.split("_")[1])])).length:0;
  
  if(amrPage)return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Btn onClick={()=>setAmrPage(false)} sm col={GRAY}>← Back</Btn>
          <p style={{fontSize:15,fontWeight:500,color:C.text,margin:0}}>فِعل الأمر — {data.display}</p>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <Btn onClick={()=>{setMode(m=>m==="fill"?"view":"fill");setChecked(false);setAmrAns({});}} col={mode==="fill"?TEAL:PURPLE} sm>{mode==="fill"?"View mode":"Fill in"}</Btn>
          {mode==="fill"&&<button onClick={()=>setUseCanvas(s=>!s)} style={{background:useCanvas?BLUE.bg:"transparent",border:`0.5px solid ${useCanvas?BLUE.text:C.borderMed}`,borderRadius:8,padding:"5px 10px",fontSize:11,color:useCanvas?BLUE.text:C.muted,cursor:"pointer"}}>{useCanvas?"✏ Canvas":"⌨ Keyboard"}</button>}
          {mode==="fill"&&<Btn onClick={()=>setChecked(true)} col={TEAL} sm>Check ✓</Btn>}
          {checked&&<Btn onClick={()=>{setAmrAns({});setChecked(false);}} col={AMBER} sm>Reset</Btn>}
        </div>
      </div>
      <AccentBar color={TEAL.text}>Only المخاطب pronouns take الأمر — you cannot command an absent person.</AccentBar>
      {checked&&<div style={{background:PURPLE.bg,borderRadius:8,padding:"8px 14px",marginBottom:10}}><p style={{fontSize:13,color:PURPLE.text,margin:0}}>Score: {amrCorrect}/{AMR_PRONOUNS.length} — {Math.round(amrCorrect/AMR_PRONOUNS.length*100)}%</p></div>}
      <Card>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}} dir="rtl">
          <thead><tr style={{borderBottom:`0.5px solid ${C.border}`}}>
            <th style={{padding:"6px 10px",color:C.muted,fontWeight:500,textAlign:"right"}}>المخاطب</th>
            {mode==="view"?<th style={{padding:"6px 10px",color:TEAL.text,fontWeight:500,textAlign:"center"}}>الأمر</th>:<th style={{padding:"6px 10px",color:C.muted,fontWeight:500,textAlign:"center"}}>Your answer</th>}
          </tr></thead>
          <tbody>{AMR_PRONOUNS.map((pr,i)=>{
            const k=`amr_${i}`;const ans=amrAns[k]||"";
            const ok=checked?checkAr(ans,data.amr[i]):null;
            return(<tr key={i} style={{borderBottom:`0.5px solid ${C.border}`}}>
              <td style={{padding:"8px 10px",textAlign:"right"}}><span style={{direction:"rtl",display:"block",color:C.text,fontSize:14}}>{pr.ar}</span><span style={{fontSize:11,color:C.muted}}>{pr.sub}</span></td>
              {mode==="view"?(
                <td style={{padding:"8px 10px",textAlign:"center",direction:"rtl",fontSize:16,color:TEAL.text}}>{data.amr[i]}</td>
              ):(
                <td style={{padding:"4px 8px",textAlign:"center"}}>
                  <button onClick={()=>setOverlay({key:k,label:`الأمر — ${pr.ar}`,target:data.amr[i],store:"amr"})}
                    style={{background:checked?(ok?TEAL.bg:CORAL.bg):ans?PURPLE.bg:C.surface2,border:`0.5px solid ${checked?(ok?TEAL.text:CORAL.text):ans?PURPLE.text:C.border}`,borderRadius:6,padding:"6px 12px",cursor:"pointer",color:checked?(ok?TEAL.text:CORAL.text):ans?PURPLE.text:C.muted,fontSize:14,direction:"rtl",minWidth:80}}>
                    {ans||<span style={{fontSize:11}}>tap to fill</span>}
                  </button>
                </td>
              )}
            </tr>);
          })}</tbody>
        </table>
      </Card>
      {overlay&&(useCanvas?(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end"}}>
          <div onClick={()=>setOverlay(null)} style={{position:"absolute",inset:0,backdropFilter:"blur(6px)",background:"rgba(0,0,0,0.7)"}}/>
          <div style={{position:"relative",width:"100%",maxWidth:600,background:C.surface,borderRadius:"16px 16px 0 0",padding:"1rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <p style={{fontSize:12,color:C.muted,margin:0}}>{overlay.label}</p>
              <button onClick={()=>setOverlay(null)} style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer"}}>✕</button>
            </div>
            <DrawCanvas targetWord={overlay.target} hideTarget onResult={v=>{if(v==="correct")setAmrAns(a=>({...a,[overlay.key]:overlay.target}));setOverlay(null);}}/>
          </div>
        </div>
      ):(
        <KBOverlay label={overlay.label} initial={amrAns[overlay.key]||""} onConfirm={v=>{setAmrAns(a=>({...a,[overlay.key]:v}));setOverlay(null);}} onClose={()=>setOverlay(null)}/>
      ))}
    </div>
  );

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
        <div>
          <span style={{fontSize:22,direction:"rtl",color:C.text,fontWeight:500}}>{data.display}</span>
          <span style={{fontSize:13,color:C.muted,marginLeft:10}}>{data.meaning}</span>
          {(data as any).weakType&&<Pill label={(data as any).weakType} color={AMBER}/>}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <Btn onClick={()=>{setMode(m=>m==="fill"?"view":"fill");setChecked(false);setAnswers({});}} col={mode==="fill"?TEAL:PURPLE} sm>{mode==="fill"?"View mode":"Fill in"}</Btn>
          {mode==="fill"&&<button onClick={()=>setUseCanvas(s=>!s)} style={{background:useCanvas?BLUE.bg:"transparent",border:`0.5px solid ${useCanvas?BLUE.text:C.borderMed}`,borderRadius:8,padding:"5px 10px",fontSize:11,color:useCanvas?BLUE.text:C.muted,cursor:"pointer"}}>{useCanvas?"✏ Canvas":"⌨ Keyboard"}</button>}
          {mode==="fill"&&<Btn onClick={()=>setChecked(true)} col={TEAL} sm>Check ✓</Btn>}
          {checked&&<Btn onClick={()=>{setAnswers({});setChecked(false);}} col={AMBER} sm>Reset</Btn>}
        </div>
      </div>
      {(data as any).weakNote&&<AccentBar color={AMBER.text}>{(data as any).weakNote}</AccentBar>}
      {checked&&<div style={{background:PURPLE.bg,borderRadius:8,padding:"8px 14px",marginBottom:10}}><p style={{fontSize:13,color:PURPLE.text,margin:0}}>Score: {correct}/{total} — {Math.round(correct/total*100)}%</p></div>}
      <div style={{overflowX:"auto",marginBottom:12}} dir="rtl">
        <table style={{borderCollapse:"collapse",fontSize:12,minWidth:720,direction:"rtl"}}>
          <thead><tr style={{borderBottom:`0.5px solid ${C.border}`}}>
            <th style={{padding:"6px 8px",color:C.muted,fontWeight:500,textAlign:"right",width:130}}>الضمير</th>
            <th style={{padding:"6px 8px",color:TEAL.text,fontWeight:500,textAlign:"center",minWidth:90}}><span style={{direction:"rtl",display:"block"}}>ماضي</span><span style={{fontSize:10,color:C.muted}}>معلوم</span></th>
            {MOODS.map(m=><th key={m.key+"a"} style={{padding:"6px 8px",color:TEAL.text,fontWeight:500,textAlign:"center",minWidth:90}}><span style={{direction:"rtl",display:"block"}}>{m.ar}</span><span style={{fontSize:10,color:C.muted}}>معلوم</span></th>)}
            <th style={{padding:"6px 8px",color:CORAL.text,fontWeight:500,textAlign:"center",minWidth:90}}><span style={{direction:"rtl",display:"block"}}>ماضي</span><span style={{fontSize:10,color:C.muted}}>مجهول</span></th>
            {MOODS.map(m=><th key={m.key+"p"} style={{padding:"6px 8px",color:CORAL.text,fontWeight:500,textAlign:"center",minWidth:90}}><span style={{direction:"rtl",display:"block"}}>{m.ar}</span><span style={{fontSize:10,color:C.muted}}>مجهول</span></th>)}
          </tr></thead>
          <tbody>{PRONOUNS.map((pr,i)=>{
            const gc=gramColor(pr.gram);const isFirst=i===0||PRONOUNS[i-1].gram!==pr.gram;
            return(<tr key={i} style={{borderBottom:`0.5px solid ${C.border}`,background:i%2===0?"transparent":"rgba(255,255,255,0.01)"}}>
              <td style={{padding:"5px 8px",borderRight:isFirst?`2px solid ${gc.text}`:"2px solid transparent"}}>
                <span style={{direction:"rtl",display:"block",fontSize:14,color:C.text}}>{pr.ar}</span>
                <span style={{fontSize:10,color:gc.text,fontWeight:500}}>{pr.gram}</span>
                <span style={{fontSize:10,color:C.muted,display:"block"}}>{pr.sub}</span>
              </td>
              <td style={{padding:"3px 5px"}}>
                {mode==="fill"?(
                  <button onClick={()=>setOverlay({key:`active_past_${i}`,label:`ماضي معلوم — ${pr.ar}`,target:data.active.past[i],store:"main"})}
                    style={{width:"100%",background:checked?(checkAr(answers[`active_past_${i}`]||"",data.active.past[i])?TEAL.bg:CORAL.bg):answers[`active_past_${i}`]?PURPLE.bg:C.surface2,border:`0.5px solid ${checked?(checkAr(answers[`active_past_${i}`]||"",data.active.past[i])?TEAL.text:CORAL.text):answers[`active_past_${i}`]?PURPLE.text:C.border}`,borderRadius:5,padding:"5px 4px",cursor:"pointer",color:checked?(checkAr(answers[`active_past_${i}`]||"",data.active.past[i])?TEAL.text:CORAL.text):answers[`active_past_${i}`]?PURPLE.text:C.muted,fontSize:13,direction:"rtl",textAlign:"center",minWidth:70}}>
                    {answers[`active_past_${i}`]||<span style={{fontSize:10}}>tap</span>}
                  </button>
                ):(
                  <div style={{direction:"rtl",textAlign:"center",fontSize:14,color:TEAL.text,padding:"5px 6px",background:C.surface2,borderRadius:5}}>{data.active.past[i]}</div>
                )}
              </td>
              {MOODS.map(m=>{
                const k=ck("active",m.key,i);const ans=answers[k]||"";const ok=checked?checkAr(ans,data.active[m.key as keyof typeof data.active][i]):null;
                return(<td key={m.key+"a"} style={{padding:"3px 5px"}}>
                  {mode==="fill"?(
                    <button onClick={()=>setOverlay({key:k,label:`معلوم ${m.ar} — ${pr.ar}`,target:data.active[m.key as keyof typeof data.active][i],store:"main"})}
                      style={{width:"100%",background:checked?(ok?TEAL.bg:CORAL.bg):ans?PURPLE.bg:C.surface2,border:`0.5px solid ${checked?(ok?TEAL.text:CORAL.text):ans?PURPLE.text:C.border}`,borderRadius:5,padding:"5px 4px",cursor:"pointer",color:checked?(ok?TEAL.text:CORAL.text):ans?PURPLE.text:C.muted,fontSize:13,direction:"rtl",textAlign:"center",minWidth:70}}>
                      {ans||<span style={{fontSize:10}}>tap</span>}
                    </button>
                  ):(
                    <div style={{direction:"rtl",textAlign:"center",fontSize:14,color:TEAL.text,padding:"5px 6px",background:C.surface2,borderRadius:5}}>{data.active[m.key as keyof typeof data.active][i]}</div>
                  )}
                </td>);
              })}
              <td style={{padding:"3px 5px"}}>
                {mode==="fill"?(
                  <button onClick={()=>setOverlay({key:`passive_past_${i}`,label:`ماضي مجهول — ${pr.ar}`,target:data.passive.past[i],store:"main"})}
                    style={{width:"100%",background:checked?(checkAr(answers[`passive_past_${i}`]||"",data.passive.past[i])?TEAL.bg:CORAL.bg):answers[`passive_past_${i}`]?PURPLE.bg:C.surface2,border:`0.5px solid ${checked?(checkAr(answers[`passive_past_${i}`]||"",data.passive.past[i])?TEAL.text:CORAL.text):answers[`passive_past_${i}`]?PURPLE.text:C.border}`,borderRadius:5,padding:"5px 4px",cursor:"pointer",color:checked?(checkAr(answers[`passive_past_${i}`]||"",data.passive.past[i])?TEAL.text:CORAL.text):answers[`passive_past_${i}`]?PURPLE.text:C.muted,fontSize:13,direction:"rtl",textAlign:"center",minWidth:70}}>
                    {answers[`passive_past_${i}`]||<span style={{fontSize:10}}>tap</span>}
                  </button>
                ):(
                  <div style={{direction:"rtl",textAlign:"center",fontSize:14,color:CORAL.text,padding:"5px 6px",background:C.surface2,borderRadius:5}}>{data.passive.past[i]}</div>
                )}
              </td>
              {MOODS.map(m=>{
                const k=ck("passive",m.key,i);const ans=answers[k]||"";const ok=checked?checkAr(ans,data.passive[m.key as keyof typeof data.passive][i]):null;
                return(<td key={m.key+"p"} style={{padding:"3px 5px"}}>
                  {mode==="fill"?(
                    <button onClick={()=>setOverlay({key:k,label:`مجهول ${m.ar} — ${pr.ar}`,target:data.passive[m.key as keyof typeof data.passive][i],store:"main"})}
                      style={{width:"100%",background:checked?(ok?TEAL.bg:CORAL.bg):ans?PURPLE.bg:C.surface2,border:`0.5px solid ${checked?(ok?TEAL.text:CORAL.text):ans?PURPLE.text:C.border}`,borderRadius:5,padding:"5px 4px",cursor:"pointer",color:checked?(ok?TEAL.text:CORAL.text):ans?PURPLE.text:C.muted,fontSize:13,direction:"rtl",textAlign:"center",minWidth:70}}>
                      {ans||<span style={{fontSize:10}}>tap</span>}
                    </button>
                  ):(
                    <div style={{direction:"rtl",textAlign:"center",fontSize:14,color:CORAL.text,padding:"5px 6px",background:C.surface2,borderRadius:5}}>{data.passive[m.key as keyof typeof data.passive][i]}</div>
                  )}
                </td>);
              })}
            </tr>);
          })}</tbody>
        </table>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginTop:4}}>
        <button onClick={()=>setAmrPage(true)} style={{background:BLUE.bg,border:`0.5px solid ${BLUE.text}`,borderRadius:8,padding:"8px 10px",cursor:"pointer",textAlign:"center"}}>
          <p style={{fontSize:10,color:BLUE.text,margin:"0 0 3px",fontWeight:500}}>الأمر</p>
          <p style={{fontSize:13,direction:"rtl",color:BLUE.text,margin:0}}>{data.amr[0]}…</p>
          <p style={{fontSize:10,color:BLUE.text,margin:"3px 0 0",opacity:0.7}}>tap to practise →</p>
        </button>
        {["masdar","fail","mafool"].map((field,fi)=>{
          const labels=["مَصْدَر","اسم فاعل","اسم مفعول"];
          const targets=[data.masdar,data.fail,data.mafool];
          const cols=[PURPLE,TEAL,CORAL];
          const ans=bottom[field as keyof typeof bottom];
          const ok=bottomChecked?checkAr(ans,targets[fi]):null;
          return(<button key={field} onClick={()=>mode==="fill"&&setOverlay({key:`bottom_${field}`,label:labels[fi],target:targets[fi],store:"bottom",field})}
            style={{background:bottomChecked?(ok?cols[fi].bg:CORAL.bg):ans?cols[fi].bg:C.surface2,border:`0.5px solid ${bottomChecked?(ok?cols[fi].text:CORAL.text):ans?cols[fi].text:C.border}`,borderRadius:8,padding:"8px 10px",cursor:mode==="fill"?"pointer":"default",textAlign:"center"}}>
            <p style={{fontSize:10,color:bottomChecked?(ok?cols[fi].text:CORAL.text):cols[fi].text,margin:"0 0 3px",fontWeight:500}}>{labels[fi]}</p>
            {mode==="fill"?(
              <p style={{fontSize:13,direction:"rtl",color:bottomChecked?(ok?cols[fi].text:CORAL.text):ans?cols[fi].text:C.muted,margin:0}}>{ans||<span style={{fontSize:11}}>tap to fill</span>}</p>
            ):(
              <p style={{fontSize:14,direction:"rtl",color:cols[fi].text,margin:0,fontWeight:500}}>{targets[fi]}</p>
            )}
          </button>);
        })}
      </div>
      {mode==="fill"&&<div style={{display:"flex",gap:6,marginTop:8}}>
        <Btn onClick={()=>setBottomChecked(true)} col={TEAL} sm>Check bottom row</Btn>
        {bottomChecked&&<Btn onClick={()=>{setBottom({masdar:"",fail:"",mafool:""});setBottomChecked(false);}} col={AMBER} sm>Reset</Btn>}
      </div>}
      {overlay&&(useCanvas?(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end"}}>
          <div onClick={()=>setOverlay(null)} style={{position:"absolute",inset:0,backdropFilter:"blur(6px)",background:"rgba(0,0,0,0.7)"}}/>
          <div style={{position:"relative",width:"100%",maxWidth:600,background:C.surface,borderRadius:"16px 16px 0 0",padding:"1rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <p style={{fontSize:12,color:C.muted,margin:0}}>{overlay.label}</p>
              <button onClick={()=>setOverlay(null)} style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer"}}>✕</button>
            </div>
            <DrawCanvas targetWord={overlay.target} hideTarget onResult={v=>{
              if(v==="correct"){
                if(overlay.store==="bottom")setBottom(b=>({...b,[overlay.field!]:overlay.target}));
                else if(overlay.store==="amr")setAmrAns(a=>({...a,[overlay.key]:overlay.target}));
                else setAnswers(a=>({...a,[overlay.key]:overlay.target}));
              }
              setOverlay(null);
            }}/>
          </div>
        </div>
      ):(
        <KBOverlay label={overlay.label} initial={overlay.store==="bottom"?bottom[overlay.field as keyof typeof bottom]||"":overlay.store==="amr"?amrAns[overlay.key]||"":answers[overlay.key]||""}
          onConfirm={v=>{
            if(overlay.store==="bottom")setBottom(b=>({...b,[overlay.field!]:v}));
            else if(overlay.store==="amr")setAmrAns(a=>({...a,[overlay.key]:v}));
            else setAnswers(a=>({...a,[overlay.key]:v}));
            setOverlay(null);
          }}
          onClose={()=>setOverlay(null)}/>
      ))}
    </div>
  );
};

// ── FORM RULES TAB ────────────────────────────────────────────────
const FormRulesTab=()=>{
  const [selected,setSelected]=useState<typeof FORM_RULES[0]|null>(null);
  const [showCanvas,setShowCanvas]=useState(false);
  const [activeType, setActiveType]=useState(VERB_TYPES[0]);
  
  const handleSelect=(f:typeof FORM_RULES[0])=>{
    if(activeType.examples[f.idx].ar === "—") return;
    const same=selected?.idx===f.idx;
    setSelected(same?null:f);
    setShowCanvas(false);
  };

  return(
    <div>
      <SL>10 Form Rules — Examples by Verb Type</SL>
      <AccentBar>Select a root type below, then tap any of the 10 form rules to read its logic and see authentic Arabic examples.</AccentBar>
      
      <div style={{display:"flex",gap:8,overflowX:"auto",marginBottom:16,paddingBottom:4}}>
        {VERB_TYPES.map(vt => (
          <button key={vt.label} onClick={()=>{setActiveType(vt);setSelected(null);setShowCanvas(false);}}
            style={{background:activeType.label===vt.label?PURPLE.bg:C.surface,border:`0.5px solid ${activeType.label===vt.label?PURPLE.text:C.borderMed}`,borderRadius:8,padding:"6px 14px",fontSize:13,color:activeType.label===vt.label?PURPLE.text:C.muted,cursor:"pointer",whiteSpace:"nowrap"}}>
            {vt.label}
          </button>
        ))}
      </div>

      {selected&&(
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:6}}>
            <Pill label={`Form ${selected.num}`} color={selected.color}/>
            <div style={{display:"flex",gap:6}}>
              <Btn onClick={()=>setShowCanvas(s=>!s)} sm col={showCanvas?GRAY:selected.color}>{showCanvas?"Close canvas ✕":"Practice writing ✏"}</Btn>
              <Btn onClick={()=>{setSelected(null);setShowCanvas(false);}} sm col={GRAY}>Close ✕</Btn>
            </div>
          </div>
          
          {/* EXPLANATION SLIDE */}
          <Card style={{marginBottom:10, borderLeft:`3px solid ${selected.color.text}`}}>
            <p style={{fontSize:15, fontWeight:500, color:selected.color.text, margin:"0 0 6px"}}>Form {selected.num} — {selected.rule}</p>
            <p style={{fontSize:13, color:C.text, margin:"0 0 10px", lineHeight:1.6}}>{selected.exp}</p>
            <div style={{background:"rgba(255,255,255,0.03)", padding:"8px 12px", borderRadius:6}}>
              <p style={{fontSize:12, color:C.muted, margin:0}}><strong>Analogy:</strong> {selected.analogy}</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:12}}>
              {([
                [PURPLE,"مَصْدَر","Verbal Noun",selected.masdar],
                [TEAL,"اِسْم فَاعِل","Active Participle",selected.fail],
                [CORAL,"اِسْم مَفْعُول","Passive Participle",selected.mafool],
              ] as [typeof PURPLE,string,string,string][]).map(([col,ar,en,val])=>(
                <div key={ar} style={{background:col.bg,borderRadius:6,padding:"6px 8px"}}>
                  <p style={{fontSize:9,color:col.text,margin:"0 0 1px",fontWeight:500}}>{ar}</p>
                  <p style={{fontSize:9,color:col.text,margin:"0 0 4px",opacity:0.7}}>{en}</p>
                  <p style={{fontSize:14,direction:"rtl",color:col.text,margin:0,fontWeight:600}}>{val}</p>
                </div>
              ))}
            </div>
          </Card>

          <SarfTable data={VERB_TYPE_FORMS[VERB_TYPES.indexOf(activeType)][selected.idx]}/>
          
          {showCanvas&&(
            <Card style={{marginBottom:10}}>
              <p style={{fontSize:13,fontWeight:500,color:C.text,margin:"0 0 8px"}}>Practice writing: <span style={{direction:"rtl",color:selected.color.text,fontSize:18}}>{activeType.examples[selected.idx].ar}</span></p>
              <DrawCanvas targetWord={activeType.examples[selected.idx].ar} onResult={()=>setShowCanvas(false)}/>
            </Card>
          )}
          <Card style={{marginTop:10}}>
            <p style={{fontSize:13,fontWeight:500,color:C.text,margin:"0 0 6px"}}>Dictionary Example</p>
            <p style={{fontSize:18,direction:"rtl",color:selected.color.text,margin:"0 0 4px",lineHeight:1.8}}>{activeType.examples[selected.idx].sentence}</p>
            <p style={{fontSize:12,color:C.muted,margin:0}}>{activeType.examples[selected.idx].tr}</p>
          </Card>
        </div>
      )}
      
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        {FORM_RULES.map(f=>{
          const ex = activeType.examples[f.idx];
          const isRare = ex.ar === "—";
          return(
            <button key={f.idx} onClick={()=>handleSelect(f)}
              style={{background:selected?.idx===f.idx?f.color.bg:C.surface,border:`0.5px solid ${selected?.idx===f.idx?f.color.text:C.border}`,borderRadius:10,padding:"10px 14px",cursor:isRare?"not-allowed":"pointer",textAlign:"left",transition:"all 0.15s", opacity: isRare ? 0.4 : 1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,flexWrap:"wrap",gap:6}}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <Pill label={`Form ${f.num}`} color={f.color}/>
                  <span style={{fontSize:17,direction:"rtl",color:f.color.text}}>{ex.ar}</span>
                  <span style={{fontSize:13,color:C.muted}}>— {f.rule}</span>
                </div>
              </div>
              <p style={{fontSize:12,direction:"rtl",color:C.muted,margin:0,textAlign:"right"}}>{ex.sentence} <span style={{color:C.subtle}}>({ex.tr})</span></p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
// ── DRAWING CANVAS ────────────────────────────────────────────────
const DrawCanvas=({targetWord,onResult,hideTarget}:{targetWord:string;onResult:(r:string)=>void;hideTarget?:boolean})=>{
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const drawing=useRef(false);
  const lastPos=useRef<{x:number;y:number}|null>(null);
  const history=useRef<ImageData[]>([]);
  const historyIdx=useRef(-1);
  const [checked,setChecked]=useState(false);
  const [aiResult,setAiResult]=useState<{result:string;read:string;note:string}|null>(null);
  const [loading,setLoading]=useState(false);
  const [showTarget,setShowTarget]=useState(true);
  const [tool,setTool]=useState("pen");
  const [canUndo,setCanUndo]=useState(false);
  const [canRedo,setCanRedo]=useState(false);
  const CANVAS_W=600;const CANVAS_H=180;
  const saveState=()=>{const c=canvasRef.current;if(!c)return;const img=c.getContext("2d")!.getImageData(0,0,c.width,c.height);history.current=history.current.slice(0,historyIdx.current+1);history.current.push(img);historyIdx.current=history.current.length-1;setCanUndo(historyIdx.current>0);setCanRedo(false);};
  const undo=()=>{if(historyIdx.current<=0)return;historyIdx.current--;canvasRef.current!.getContext("2d")!.putImageData(history.current[historyIdx.current],0,0);setCanUndo(historyIdx.current>0);setCanRedo(true);};
  const redo=()=>{if(historyIdx.current>=history.current.length-1)return;historyIdx.current++;canvasRef.current!.getContext("2d")!.putImageData(history.current[historyIdx.current],0,0);setCanUndo(true);setCanRedo(historyIdx.current<history.current.length-1);};
  useEffect(()=>{const c=canvasRef.current;if(!c)return;const ctx=c.getContext("2d")!;history.current=[ctx.getImageData(0,0,c.width,c.height)];historyIdx.current=0;},[]);
  const getPos=(e:React.MouseEvent|React.TouchEvent,c:HTMLCanvasElement)=>{
    const r=c.getBoundingClientRect();const sx=c.width/r.width;const sy=c.height/r.height;
    if("touches" in e)return{x:(e.touches[0].clientX-r.left)*sx,y:(e.touches[0].clientY-r.top)*sy};
    return{x:((e as React.MouseEvent).clientX-r.left)*sx,y:((e as React.MouseEvent).clientY-r.top)*sy};
  };
  const start=(e:React.MouseEvent|React.TouchEvent)=>{
    e.preventDefault();const c=canvasRef.current!;const ctx=c.getContext("2d")!;const p=getPos(e,c);lastPos.current=p;drawing.current=true;
    ctx.beginPath();ctx.arc(p.x,p.y,tool==="eraser"?12:2.5,0,Math.PI*2);ctx.fillStyle=tool==="eraser"?"#FFFFFF":"#1a1a1a";ctx.fill();
  };
  const move=(e:React.MouseEvent|React.TouchEvent)=>{
    e.preventDefault();if(!drawing.current||!lastPos.current)return;
    const c=canvasRef.current!;const ctx=c.getContext("2d")!;const p=getPos(e,c);
    ctx.beginPath();ctx.moveTo(lastPos.current.x,lastPos.current.y);ctx.lineTo(p.x,p.y);
    ctx.lineWidth=tool==="eraser"?24:5;ctx.lineCap="round";ctx.lineJoin="round";
    ctx.strokeStyle=tool==="eraser"?"#FFFFFF":"#1a1a1a";ctx.stroke();lastPos.current=p;
  };
  const end=(e:React.MouseEvent|React.TouchEvent)=>{e.preventDefault();if(drawing.current)saveState();drawing.current=false;lastPos.current=null;};
  const clearCanvas=()=>{const c=canvasRef.current!;const ctx=c.getContext("2d")!;ctx.clearRect(0,0,c.width,c.height);setChecked(false);setAiResult(null);history.current=[ctx.getImageData(0,0,c.width,c.height)];historyIdx.current=0;setCanUndo(false);setCanRedo(false);};
  const checkWithAI=async()=>{
    const c=canvasRef.current!;
    
    // Convert to solid background for AI
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = c.width;
    tempCanvas.height = c.height;
    const tCtx = tempCanvas.getContext("2d");
    if(tCtx) {
      tCtx.drawImage(c, 0, 0);
      tCtx.globalCompositeOperation = "source-in";
      tCtx.fillStyle = "#000000";
      tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tCtx.globalCompositeOperation = "destination-over";
      tCtx.fillStyle = "#FFFFFF";
      tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    }
    const base64 = tempCanvas.toDataURL("image/png").split(",")[1];

    setLoading(true);setChecked(false);setAiResult(null);
    try{
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("API key is missing! Check your .env file.");

      const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          contents:[{
            parts:[
              {text:`The student is learning Arabic and tried to write: ${targetWord}. Arabic is written right-to-left. Harakat (vowel marks) may be missing. Judge leniently on stroke quality — focus on whether the core letters are recognizable. If canvas is blank say BLANK. Reply:\nRESULT: [CORRECT/CLOSE/WRONG/BLANK]\nREAD: [what you see]\nNOTE: [one short encouraging sentence]`},
              {inline_data:{mime_type:"image/png",data:base64}}
            ]
          }],
          generationConfig:{maxOutputTokens:200}
        })
      });
      const data=await res.json();
      if (data.error) throw new Error(data.error.message);

      const txt=data.candidates?.[0]?.content?.parts?.[0]?.text||"";
      setAiResult({
        result:txt.match(/RESULT:\s*([A-Z]+)/)?.[1]||"UNKNOWN",
        read:txt.match(/READ:\s*(.+)/)?.[1]||"",
        note:txt.match(/NOTE:\s*(.+)/)?.[1]||""
      });
    }catch(e:any){
      setAiResult({result:"ERROR",read:"",note:e.message});
    }
    setLoading(false);setChecked(true);
  };
  const rc=(r:string)=>r==="CORRECT"?TEAL:r==="CLOSE"?AMBER:r==="BLANK"?GRAY:CORAL;
  return(
    <div>
      {!hideTarget&&<div style={{display:"flex",gap:6,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
        <Btn onClick={()=>setShowTarget(s=>!s)} sm col={GRAY}>{showTarget?"Hide target":"Show target"}</Btn>
      </div>}
      {!hideTarget&&showTarget&&<div style={{background:C.surface2,borderRadius:8,padding:"10px 16px",marginBottom:8,textAlign:"center"}}><span style={{fontSize:36,direction:"rtl",color:PURPLE.text,lineHeight:1.8}}>{targetWord}</span></div>}
      <div style={{position:"relative"}}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
          style={{width:"100%",height:CANVAS_H,background:"#FFFFFF",borderRadius:10,border:`2px dashed #555`,cursor:tool==="eraser"?"cell":"crosshair",touchAction:"none",display:"block"}}/>
      </div>
      <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
        <button onClick={()=>setTool("pen")} style={{background:tool==="pen"?PURPLE.bg:"transparent",border:`0.5px solid ${tool==="pen"?PURPLE.text:C.borderMed}`,borderRadius:8,padding:"5px 12px",fontSize:12,color:tool==="pen"?PURPLE.text:C.muted,cursor:"pointer"}}>✏ Pen</button>
        <button onClick={()=>setTool("eraser")} style={{background:tool==="eraser"?AMBER.bg:"transparent",border:`0.5px solid ${tool==="eraser"?AMBER.text:C.borderMed}`,borderRadius:8,padding:"5px 12px",fontSize:12,color:tool==="eraser"?AMBER.text:C.muted,cursor:"pointer"}}>◻ Eraser</button>
        <button onClick={undo} disabled={!canUndo} style={{background:canUndo?BLUE.bg:"transparent",border:`0.5px solid ${canUndo?BLUE.text:C.borderMed}`,borderRadius:8,padding:"5px 12px",fontSize:12,color:canUndo?BLUE.text:C.muted,cursor:canUndo?"pointer":"not-allowed",opacity:canUndo?1:0.45}}>↩ Undo</button>
        <button onClick={redo} disabled={!canRedo} style={{background:canRedo?BLUE.bg:"transparent",border:`0.5px solid ${canRedo?BLUE.text:C.borderMed}`,borderRadius:8,padding:"5px 12px",fontSize:12,color:canRedo?BLUE.text:C.muted,cursor:canRedo?"pointer":"not-allowed",opacity:canRedo?1:0.45}}>↪ Redo</button>
        <Btn onClick={checkWithAI} col={PURPLE} sm disabled={loading}>{loading?"Checking…":"Check with AI ✓"}</Btn>
        <Btn onClick={clearCanvas} col={AMBER} sm>Clear all</Btn>
        <Btn onClick={()=>onResult("correct")} col={TEAL} sm>I wrote it correctly ✓</Btn>
        <Btn onClick={()=>onResult("skip")} col={GRAY} sm>Skip</Btn>
      </div>
      {checked&&aiResult&&(
        <div style={{background:rc(aiResult.result).bg,border:`0.5px solid ${rc(aiResult.result).text}`,borderRadius:10,padding:"10px 14px",marginTop:10}}>
          <p style={{fontSize:13,fontWeight:500,color:rc(aiResult.result).text,margin:"0 0 4px"}}>{aiResult.result} {aiResult.result==="CORRECT"?"✓":""}</p>
          {aiResult.read&&<p style={{fontSize:13,color:C.text,margin:"0 0 4px",direction:"rtl"}}>{aiResult.read}</p>}
          <p style={{fontSize:12,color:C.muted,margin:0}}>{aiResult.note}</p>
          {aiResult.result==="CORRECT"&&<Btn onClick={()=>onResult("correct")} col={TEAL} sm>Continue →</Btn>}
        </div>
      )}
    </div>
  );
};

// ── STEP BAR ──────────────────────────────────────────────────────
const VERB_STEPS=["Meaning","Write","Conjugation","Write Sarf","Contexts"];
const NOUN_STEPS=["Meaning","Write","Plurals","Synonyms","Contexts"];
const StepBar=({steps,current,completed,onStepClick}:{steps:string[];current:number;completed:number[];onStepClick:(s:number)=>void})=>{
  const maxUnlocked = Math.max(-1, ...completed) + 1;
  return(
    <div style={{display:"flex",gap:0,marginBottom:16}}>
      {steps.map((s,i)=>{
        const done=completed.includes(i);
        const active=i===current;
        const locked=i>maxUnlocked;
        return(
          <div key={s} onClick={()=>!locked&&onStepClick(i)} style={{flex:1,textAlign:"center",cursor:locked?"not-allowed":"pointer",opacity:locked?0.4:1}}>
            <div style={{height:3,background:done?TEAL.text:active?PURPLE.text:C.surface2,transition:"background 0.3s"}}/>
            <p style={{fontSize:10,color:done?TEAL.text:active?PURPLE.text:C.muted,margin:"4px 0 0",fontWeight:active||done?500:400}}>{s}{locked&&" 🔒"}</p>
          </div>
        );
      })}
    </div>
  );
};

// ── BOTTOM EXAMPLES (masdar / ism fail / ism mafool per verb) ────
const BOTTOM_EXAMPLES={
  kataba:{
    masdar:[
      {form:"كِتَابَة",meaning:"the act of writing",ex:"الكِتَابَةُ فَنٌّ جَمِيل",tr:"Writing is a beautiful art",note:"Process/act of writing"},
      {form:"كَتْب",meaning:"writing as inscription / decree",ex:"كَتْبُ اللهِ لِعِبَادِهِ",tr:"Allah's decree for His servants",note:"Used in Quranic/classical contexts for divine decree"},
    ],
    fail:[{form:"كَاتِب",meaning:"writer / one who writes",ex:"هُوَ كَاتِبٌ مَاهِر",tr:"He is a skilled writer",note:null}],
    mafool:[{form:"مَكْتُوب",meaning:"that which is written / a letter",ex:"هَذَا مَكْتُوبٌ مِنَ الأُسْتَاذ",tr:"This is a letter from the professor",note:"Also means 'destined/fated' in colloquial use"}],
  },
  alima:{
    masdar:[
      {form:"عِلْم",meaning:"knowledge as a state / body of knowledge",ex:"العِلْمُ نُورٌ",tr:"Knowledge is light",note:"The state of knowing — used for divine and human knowledge"},
      {form:"مَعْرِفَة",meaning:"experiential / practical knowing",ex:"لَدَيْهِ مَعْرِفَةٌ بِالطَّبِّ",tr:"He has knowledge of medicine",note:"From عَرَفَ — knowing through experience, not عَلِمَ. Different root but closely related in meaning"},
    ],
    fail:[
      {form:"عَالِم",meaning:"scholar / one who knows",ex:"هُوَ عَالِمٌ فِي الفِقْه",tr:"He is a scholar of fiqh",note:"Plural: عُلَمَاء — the scholars"},
      {form:"عَلِيم",meaning:"all-knowing (intensive)",ex:"إِنَّ اللهَ عَلِيمٌ بِذَاتِ الصُّدُور",tr:"Indeed Allah is All-Knowing of what is in the chests",note:"فَعِيل pattern — intensive form, used almost exclusively for Allah in the Quran"},
    ],
    mafool:[{form:"مَعْلُوم",meaning:"known / that which is known",ex:"هَذَا أَمْرٌ مَعْلُوم",tr:"This is a known matter",note:null}],
  },
  qala:{
    masdar:[
      {form:"قَوْل",meaning:"a saying / speech",ex:"قَوْلُ الحَقِّ وَاجِب",tr:"Speaking the truth is obligatory",note:"The act or content of speech"},
      {form:"مَقَال",meaning:"an article / a discourse",ex:"كَتَبَ مَقَالًا فِي الجَرِيدَة",tr:"He wrote an article in the newspaper",note:"More specific — a composed piece of speech or writing"},
    ],
    fail:[{form:"قَائِل",meaning:"one who says / the speaker",ex:"مَنِ القَائِلُ؟",tr:"Who is the one saying this?",note:null}],
    mafool:[{form:"مَقُول",meaning:"that which is said",ex:"هَذَا قَوْلٌ مَقُول",tr:"This is a saying that is said",note:"Rarely used standalone — more common in the phrase مَقُولَة (a maxim/saying)"}],
  },
  rahima:{
    masdar:[{form:"رَحْمَة",meaning:"mercy / compassion",ex:"وَرَحْمَتِي وَسِعَتْ كُلَّ شَيْء",tr:"And My mercy encompasses all things",note:null}],
    fail:[{form:"رَاحِم",meaning:"one who shows mercy",ex:"اللهُ رَاحِمٌ بِعِبَادِه",tr:"Allah is merciful to His servants",note:"Differs from رَحِيم (intensive) — رَاحِم is the active participle, رَحِيم is an intensive attribute name of Allah"}],
    mafool:[{form:"مَرْحُوم",meaning:"one who has received mercy / the deceased",ex:"المَرْحُومُ الشَّيْخ...",tr:"The late (mercy-received) Sheikh…",note:"Commonly used as a respectful title for the deceased"}],
  },
};

// ── SARF WRITE TABLE ─────────────────────────────────────────────
const AMR_IDX=[6,7,8,9,10];
const SarfWriteTable=({word,onDone}:{word:Verb;onDone:()=>void})=>{
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [checked,setChecked]=useState(false);
  const [overlay,setOverlay]=useState<{key:string;target:string;label:string}|null>(null);
  const [useCanvas,setUseCanvas]=useState(false);
  const isAmr=(i:number)=>AMR_IDX.includes(i);
  const amrForm=(i:number)=>{const idx=AMR_IDX.indexOf(i);return["اِفْعَلْ","اِفْعَلِي","اِفْعَلَا","اِفْعَلُوا","اِفْعَلْنَ"][idx]||"—";};
  const presentMansub=(i:number)=>deriveMansub(getConjugation(word).present[i]);
  const presentMajzum=(i:number)=>deriveMajzum(getConjugation(word).present[i]);

  // Calculate total required answers including passive if it exists
  const total = PRONOUNS.length * 4 + AMR_IDX.length + (word.conjugation?.passive ? PRONOUNS.length * 4 : 0);

  const correct = checked ?
    PRONOUNS.reduce((acc, _, i) =>
      acc + (checkAr(answers[`past_${i}`] || "", getConjugation(word).past[i]) ? 1 : 0)
          + (checkAr(answers[`marfu_${i}`] || "", getConjugation(word).present[i]) ? 1 : 0)
          + (checkAr(answers[`mansub_${i}`] || "", presentMansub(i)) ? 1 : 0)
          + (checkAr(answers[`majzum_${i}`] || "", presentMajzum(i)) ? 1 : 0)
          + (word.conjugation?.passive ? (
              (checkAr(answers[`p_past_${i}`] || "", word.conjugation.passive.past[i]) ? 1 : 0)
            + (checkAr(answers[`p_marfu_${i}`] || "", word.conjugation.passive.present[i]) ? 1 : 0)
            + (checkAr(answers[`p_mansub_${i}`] || "", deriveMansub(word.conjugation.passive.present[i])) ? 1 : 0)
            + (checkAr(answers[`p_majzum_${i}`] || "", deriveMajzum(word.conjugation.passive.present[i])) ? 1 : 0)
          ) : 0)
    , 0) + AMR_IDX.reduce((acc, i) => acc + (checkAr(answers[`amr_${i}`] || "", amrForm(i)) ? 1 : 0), 0)
  : 0;

  const mkCell=(k:string,target:string,pr:{ar:string})=>{
    const ans=answers[k]||"";const ok=checked?checkAr(ans,target):null;
    return(<td key={k} style={{padding:"3px 5px"}}>
      <button onClick={()=>setOverlay({key:k,target,label:pr.ar})}
        style={{width:"100%",minWidth:70,background:checked?(ok?TEAL.bg:CORAL.bg):ans?PURPLE.bg:C.surface2,border:`0.5px solid ${checked?(ok?TEAL.text:CORAL.text):ans?PURPLE.text:C.border}`,borderRadius:5,padding:"5px 4px",cursor:"pointer",color:checked?(ok?TEAL.text:CORAL.text):ans?PURPLE.text:C.muted,fontSize:13,direction:"rtl",textAlign:"center"}}>
        {ans||<span style={{fontSize:10}}>tap</span>}
      </button>
    </td>);
  };
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
        <p style={{fontSize:14,fontWeight:500,color:C.text,margin:0}}>Fill in the sarf of <span style={{direction:"rtl",color:PURPLE.text}}>{word.ar}</span></p>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={()=>setUseCanvas(s=>!s)} style={{background:useCanvas?BLUE.bg:"transparent",border:`0.5px solid ${useCanvas?BLUE.text:C.borderMed}`,borderRadius:8,padding:"5px 10px",fontSize:11,color:useCanvas?BLUE.text:C.muted,cursor:"pointer"}}>{useCanvas?"✏ Canvas":"⌨ Keyboard"}</button>
          <Btn onClick={()=>setChecked(true)} col={TEAL} sm>Check ✓</Btn>
          {checked&&<Btn onClick={()=>{setAnswers({});setChecked(false);}} col={AMBER} sm>Reset</Btn>}
        </div>
      </div>
      {checked&&<div style={{background:PURPLE.bg,borderRadius:8,padding:"8px 14px",marginBottom:10}}><p style={{fontSize:13,color:PURPLE.text,margin:0}}>Score: {correct}/{total} — {Math.round(correct/total*100)}%</p></div>}
      
      {/* ── ACTIVE + PASSIVE FILL-IN (side by side) ── */}
      <div style={{overflowX:"auto",marginBottom:12}} dir="rtl">
        <table style={{borderCollapse:"collapse",fontSize:12,direction:"rtl"}}>
          <thead>
            <tr>
              <th rowSpan={2} style={{padding:"6px 8px",color:C.muted,fontWeight:500,textAlign:"right",minWidth:110,verticalAlign:"bottom",borderBottom:`0.5px solid ${C.border}`}}>الضمير</th>
              <th colSpan={word.conjugation.passive?5:5} style={{padding:"4px 8px",color:TEAL.text,fontWeight:600,textAlign:"center",borderBottom:`0.5px solid ${TEAL.text}`,borderLeft:`0.5px solid ${C.border}`}}>معلوم</th>
              {word.conjugation.passive&&<th colSpan={4} style={{padding:"4px 8px",color:CORAL.text,fontWeight:600,textAlign:"center",borderBottom:`0.5px solid ${CORAL.text}`,borderLeft:`2px solid ${C.borderMed}`}}>مجهول</th>}
            </tr>
            <tr style={{borderBottom:`0.5px solid ${C.border}`}}>
              <th style={{padding:"4px 5px",color:TEAL.text,fontWeight:500,textAlign:"center",minWidth:68,borderLeft:`0.5px solid ${C.border}`}}>ماضي</th>
              <th style={{padding:"4px 5px",color:PURPLE.text,fontWeight:500,textAlign:"center",minWidth:68}}>مرفوع</th>
              <th style={{padding:"4px 5px",color:CORAL.text,fontWeight:500,textAlign:"center",minWidth:68}}>منصوب</th>
              <th style={{padding:"4px 5px",color:AMBER.text,fontWeight:500,textAlign:"center",minWidth:68}}>مجزوم</th>
              <th style={{padding:"4px 5px",color:BLUE.text,fontWeight:500,textAlign:"center",minWidth:68}}>أمر</th>
              {word.conjugation.passive&&<>
                <th style={{padding:"4px 5px",color:CORAL.text,fontWeight:500,textAlign:"center",minWidth:68,borderLeft:`2px solid ${C.borderMed}`}}>ماضي</th>
                <th style={{padding:"4px 5px",color:CORAL.text,fontWeight:500,textAlign:"center",minWidth:68}}>مرفوع</th>
                <th style={{padding:"4px 5px",color:CORAL.text,fontWeight:500,textAlign:"center",minWidth:68}}>منصوب</th>
                <th style={{padding:"4px 5px",color:CORAL.text,fontWeight:500,textAlign:"center",minWidth:68}}>مجزوم</th>
              </>}
            </tr>
          </thead>
          <tbody>{PRONOUNS.map((pr,i)=>{
            const gc=gramColor(pr.gram);const isFirst=i===0||PRONOUNS[i-1].gram!==pr.gram;const canAmr=isAmr(i);
            const hasPas=!!word.conjugation?.passive;
            return(<tr key={i} style={{borderBottom:`0.5px solid ${C.border}`}}>
              <td style={{padding:"5px 8px",borderRight:isFirst?`2px solid ${gc.text}`:"2px solid transparent"}}>
                <span style={{direction:"rtl",display:"block",fontSize:13,color:C.text}}>{pr.ar}</span>
                <span style={{fontSize:10,color:gc.text}}>{pr.gram} · {pr.sub}</span>
              </td>
              {mkCell(`past_${i}`,getConjugation(word).past[i],pr)}
              {mkCell(`marfu_${i}`,getConjugation(word).present[i],pr)}
              {mkCell(`mansub_${i}`,presentMansub(i),pr)}
              {mkCell(`majzum_${i}`,presentMajzum(i),pr)}
              {canAmr
                ? mkCell(`amr_${i}`,amrForm(i),pr)
                : <td style={{padding:"3px 5px",textAlign:"center",fontSize:16,color:C.subtle}}>—</td>}
              {hasPas&&<>
                <td style={{padding:"2px 3px",borderLeft:`2px solid ${C.borderMed}`}}>{mkCell(`p_past_${i}`,word.conjugation!.passive!.past[i],pr)}</td>
                <td style={{padding:"2px 3px"}}>{mkCell(`p_marfu_${i}`,word.conjugation!.passive!.present[i],pr)}</td>
                <td style={{padding:"2px 3px"}}>{mkCell(`p_mansub_${i}`,deriveMansub(word.conjugation!.passive!.present[i]),pr)}</td>
                <td style={{padding:"2px 3px"}}>{mkCell(`p_majzum_${i}`,deriveMajzum(word.conjugation!.passive!.present[i]),pr)}</td>
              </>}
            </tr>);
          })}</tbody>
        </table>
      </div>
      {!word.conjugation.passive&&<AccentBar color={CORAL.text}>Passive data not found in verbs.ts for this word. Add it to practice passive conjugations!</AccentBar>}

      <Btn onClick={onDone} col={TEAL} full disabled={!checked || correct < total}>
        {checked && correct === total ? "Perfect! Done with sarf ✓ — next" : "Check answers and score 100% to advance 🔒"}
      </Btn>
      
      {overlay&&(useCanvas?(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end"}}>
          <div onClick={()=>setOverlay(null)} style={{position:"absolute",inset:0,backdropFilter:"blur(6px)",background:"rgba(0,0,0,0.7)"}}/>
          <div style={{position:"relative",width:"100%",maxWidth:600,background:C.surface,borderRadius:"16px 16px 0 0",padding:"1rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <p style={{fontSize:12,color:C.muted,margin:0}}>{overlay.label}</p>
              <button onClick={()=>setOverlay(null)} style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer"}}>✕</button>
            </div>
            <DrawCanvas targetWord={overlay.target} hideTarget onResult={v=>{if(v==="correct")setAnswers(a=>({...a,[overlay.key]:overlay.target}));setOverlay(null);}}/>
          </div>
        </div>
      ):(
        <KBOverlay label={overlay.label} initial={answers[overlay.key]||""} onConfirm={v=>{setAnswers(a=>({...a,[overlay.key]:v}));setOverlay(null);}} onClose={()=>setOverlay(null)}/>
      ))}
    </div>
  );
};

// ── VERB LEARN ────────────────────────────────────────────────────
const VerbLearn=({word,learned,onComplete,isReview,initialStep,onStepChange}:{word:Verb;learned:Record<string,any>;onComplete:(id:string,s:number[])=>void;isReview:boolean;initialStep:number;onStepChange?:(s:number)=>void})=>{
  const init=learned[word.id]?.learnedSteps||[];
  const [step,setStep]=useState(initialStep||0);
  const [completed,setCompleted]=useState<number[]>(init);
  const markDone=(s:number)=>{const nc=[...new Set([...completed,s])];setCompleted(nc);onComplete(word.id,nc);};
  const advance=(s:number)=>{markDone(s);const next=s+1;if(next<VERB_STEPS.length){setStep(next);onStepChange?.(next);}};
  const goStep=(s:number)=>{setStep(s);onStepChange?.(s);};
  if(step===0)return(<div>
    <StepBar steps={VERB_STEPS} current={0} completed={completed} onStepClick={goStep}/>
    <Card>
      <div style={{textAlign:"center",padding:"1rem 0"}}>
        <p style={{fontSize:40,direction:"rtl",color:C.text,margin:"0 0 6px",lineHeight:1.6}}>{word.ar}</p>
        <p style={{fontSize:14,color:PURPLE.text,margin:"0 0 4px"}}>Root: {word.root} · {word.form}</p>
        <p style={{fontSize:20,color:C.text,margin:"0 0 16px",fontWeight:500}}>{word.meaning}</p>
        {word.meanings.length>1&&<div style={{textAlign:"left"}}>{word.meanings.map((m,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:4}}><span style={{color:PURPLE.text,fontSize:13}}>{i+1}.</span><span style={{fontSize:13,color:C.text}}>{m}</span></div>)}</div>}
      </div>
      <Divider/>
      <p style={{fontSize:15,direction:"rtl",color:C.text,margin:"0 0 4px",lineHeight:1.8}}>{word.sentence}</p>
      <p style={{fontSize:12,color:C.muted,margin:0}}>{word.sentenceTr}</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:12}}>
        {([[PURPLE,"مصدر",word.masdar],[TEAL,"فاعل",word.fail],[CORAL,"مفعول",word.mafool]] as [typeof PURPLE,string,string][]).map(([col,lbl,val])=>(
          <div key={lbl} style={{background:col.bg,borderRadius:6,padding:"6px 8px"}}><p style={{fontSize:10,color:col.text,margin:"0 0 2px"}}>{lbl}</p><p style={{fontSize:13,direction:"rtl",color:col.text,margin:0}}>{val}</p></div>
        ))}
      </div>
    </Card>
    <Btn onClick={()=>advance(0)} col={PURPLE} full>I understand the meaning → next</Btn>
  </div>);
  if(step===1)return(<div>
    <StepBar steps={VERB_STEPS} current={1} completed={completed} onStepClick={goStep}/>
    <Card><p style={{fontSize:14,fontWeight:500,color:C.text,margin:"0 0 12px"}}>Practice writing: <span style={{direction:"rtl",color:PURPLE.text}}>{word.ar}</span></p>
      <DrawCanvas targetWord={word.ar} onResult={()=>advance(1)}/>
    </Card>
    {isReview&&<Btn onClick={()=>goStep(2)} col={GRAY} sm>Skip to conjugation →</Btn>}
  </div>);
  if(step===2)return(<div>
    <StepBar steps={VERB_STEPS} current={2} completed={completed} onStepClick={goStep}/>

    {/* ── Active + Passive side by side ── */}
    <SL>{word.conjugation?.passive ? "Active / Passive — معلوم / مجهول" : "Active conjugation — معلوم"}</SL>
    <div style={{overflowX:"auto",marginBottom:12}} dir="rtl">
      <table style={{borderCollapse:"collapse",fontSize:12,direction:"rtl"}}>
        <thead>
          <tr>
            <th rowSpan={2} style={{padding:"6px 8px",color:C.muted,fontWeight:500,textAlign:"right",minWidth:110,verticalAlign:"bottom",borderBottom:`0.5px solid ${C.border}`}}>الضمير</th>
            <th colSpan={4} style={{padding:"4px 8px",color:TEAL.text,fontWeight:600,textAlign:"center",borderBottom:`0.5px solid ${TEAL.text}`,borderLeft:`0.5px solid ${C.border}`}}>معلوم</th>
            {word.conjugation?.passive&&<th colSpan={4} style={{padding:"4px 8px",color:CORAL.text,fontWeight:600,textAlign:"center",borderBottom:`0.5px solid ${CORAL.text}`,borderLeft:`2px solid ${C.borderMed}`}}>مجهول</th>}
          </tr>
          <tr style={{borderBottom:`0.5px solid ${C.border}`}}>
            <th style={{padding:"4px 6px",color:TEAL.text,fontWeight:500,textAlign:"center",minWidth:75,borderLeft:`0.5px solid ${C.border}`}}>ماضي</th>
            <th style={{padding:"4px 6px",fontWeight:500,textAlign:"center",minWidth:75}}><span style={{display:"block",color:PURPLE.text}}>مرفوع</span></th>
            <th style={{padding:"4px 6px",fontWeight:500,textAlign:"center",minWidth:75}}><span style={{display:"block",color:CORAL.text}}>منصوب</span></th>
            <th style={{padding:"4px 6px",fontWeight:500,textAlign:"center",minWidth:75}}><span style={{display:"block",color:AMBER.text}}>مجزوم</span></th>
            {word.conjugation?.passive&&<>
              <th style={{padding:"4px 6px",color:CORAL.text,fontWeight:500,textAlign:"center",minWidth:75,borderLeft:`2px solid ${C.borderMed}`}}>ماضي</th>
              <th style={{padding:"4px 6px",color:CORAL.text,fontWeight:500,textAlign:"center",minWidth:75}}>مرفوع</th>
              <th style={{padding:"4px 6px",color:CORAL.text,fontWeight:500,textAlign:"center",minWidth:75}}>منصوب</th>
              <th style={{padding:"4px 6px",color:CORAL.text,fontWeight:500,textAlign:"center",minWidth:75}}>مجزوم</th>
            </>}
          </tr>
        </thead>
        <tbody>{PRONOUNS.map((pr,i)=>{
          const gc=gramColor(pr.gram);const isFirst=i===0||PRONOUNS[i-1].gram!==pr.gram;
          const marfu=getConjugation(word).present[i];
          const pMarfu=word.conjugation?.passive?.present[i];
          return(<tr key={i} style={{borderBottom:`0.5px solid ${C.border}`}}>
            <td style={{padding:"5px 8px",borderRight:isFirst?`2px solid ${gc.text}`:"2px solid transparent"}}>
              <span style={{direction:"rtl",display:"block",fontSize:13,color:C.text}}>{pr.ar}</span>
              <span style={{fontSize:10,color:gc.text}}>{pr.gram} · {pr.sub}</span>
            </td>
            <td style={{padding:"5px 6px",textAlign:"center",direction:"rtl",fontSize:13,color:TEAL.text,borderLeft:`0.5px solid ${C.border}`}}>{getConjugation(word).past[i]}</td>
            <td style={{padding:"5px 6px",textAlign:"center",direction:"rtl",fontSize:13,color:PURPLE.text}}>{marfu}</td>
            <td style={{padding:"5px 6px",textAlign:"center",direction:"rtl",fontSize:13,color:CORAL.text}}>{deriveMansub(marfu)}</td>
            <td style={{padding:"5px 6px",textAlign:"center",direction:"rtl",fontSize:13,color:AMBER.text}}>{deriveMajzum(marfu)}</td>
            {pMarfu&&<>
              <td style={{padding:"5px 6px",textAlign:"center",direction:"rtl",fontSize:13,color:CORAL.text,borderLeft:`2px solid ${C.borderMed}`,background:"rgba(74,27,12,0.2)"}}>{word.conjugation!.passive!.past[i]}</td>
              <td style={{padding:"5px 6px",textAlign:"center",direction:"rtl",fontSize:13,color:CORAL.text,background:"rgba(74,27,12,0.2)"}}>{pMarfu}</td>
              <td style={{padding:"5px 6px",textAlign:"center",direction:"rtl",fontSize:13,color:CORAL.text,background:"rgba(74,27,12,0.2)"}}>{deriveMansub(pMarfu)}</td>
              <td style={{padding:"5px 6px",textAlign:"center",direction:"rtl",fontSize:13,color:CORAL.text,background:"rgba(74,27,12,0.2)"}}>{deriveMajzum(pMarfu)}</td>
            </>}
          </tr>);
        })}</tbody>
      </table>
    </div>
    {!word.conjugation?.passive&&<AccentBar color={CORAL.text}>Passive (مجهول): change the prefix vowel to ضمة and the root's middle letter to فتحة — e.g. <span style={{direction:"rtl"}}>يَكْتُبُ → يُكْتَبُ</span>. Add a `passive` object (with `past` and `present` arrays) to this word's data in `src/words/verbs.ts` to see the full table here.</AccentBar>}

    {/* ── Mood rules ── */}
    <Card style={{marginBottom:12}}>
      <p style={{fontSize:12,fontWeight:500,color:C.text,margin:"0 0 8px"}}>How the moods differ</p>
      {[
        [PURPLE,"مرفوع","Default mood — used after no particle. Final vowel ُ (or long endings انِ / ونَ / ينَ)."],
        [CORAL,"منصوب","Used after أَنْ، لَنْ، كَيْ and similar. ُ→َ, ونَ drops ن to وا, ينَ drops ن to ي, انِ drops نِ to ا."],
        [AMBER,"مجزوم","Used after لَمْ، لَا الناهية and conditionals. ُ→ْ (sukun), same plural changes as منصوب."],
      ].map(([col,ar,desc])=>(
        <div key={ar as string} style={{display:"flex",gap:10,marginBottom:6,alignItems:"flex-start"}}>
          <Pill label={ar as string} color={col as any} sm/>
          <p style={{fontSize:12,color:C.muted,margin:0,lineHeight:1.6}}>{desc as string}</p>
        </div>
      ))}
    </Card>
    {/* ── Masdar / Ism Fail / Ism Mafool ── */}
    <div style={{marginTop:12,marginBottom:12}}>
      <SL>Verbal nouns & participles</SL>
      {(["masdar","fail","mafool"] as const).map((field,fi)=>{
        const labels=["مَصْدَر — verbal noun","اِسْم فَاعِل — active participle","اِسْم مَفْعُول — passive participle"];
        const cols=[PURPLE,TEAL,CORAL];
        const examples=(BOTTOM_EXAMPLES as any)[word.id]?.[field] as {form:string;meaning:string;ex:string;tr:string;note:string|null}[]|undefined;
        const fallback=(word as any)[field] as string;
        return(
          <Card key={field} style={{borderLeft:`2px solid ${cols[fi].text}`,marginBottom:8}}>
            <p style={{fontSize:11,color:cols[fi].text,fontWeight:500,margin:"0 0 8px"}}>{labels[fi]}</p>
            {examples?(
              examples.map((item,idx)=>(
                <div key={idx} style={{marginBottom:idx<examples.length-1?12:0,paddingBottom:idx<examples.length-1?12:0,borderBottom:idx<examples.length-1?`0.5px solid ${C.border}`:"none"}}>
                  <div style={{display:"flex",gap:8,alignItems:"baseline",marginBottom:4}}>
                    <span style={{fontSize:20,direction:"rtl",color:cols[fi].text,fontWeight:500}}>{item.form}</span>
                    <span style={{fontSize:13,color:C.muted}}>— {item.meaning}</span>
                    {examples.length>1&&idx===0&&<Pill label="primary" color={cols[fi]} sm/>}
                    {examples.length>1&&idx>0&&<Pill label="secondary" color={GRAY} sm/>}
                  </div>
                  <p style={{fontSize:14,direction:"rtl",color:C.text,margin:"0 0 3px",lineHeight:1.8}}>{item.ex}</p>
                  <p style={{fontSize:12,color:C.muted,margin:"0 0 6px"}}>{item.tr}</p>
                  {item.note&&<div style={{background:AMBER.bg,borderRadius:6,padding:"5px 10px"}}><p style={{fontSize:12,color:AMBER.text,margin:0}}>{item.note}</p></div>}
                  {idx>0&&examples.length>1&&<div style={{background:BLUE.bg,borderRadius:6,padding:"5px 10px",marginTop:6}}><p style={{fontSize:12,color:BLUE.text,margin:0}}>Distinction from the primary form above: compare the context and note how meaning or register shifts.</p></div>}
                </div>
              ))
            ):(
              <span style={{fontSize:18,direction:"rtl",color:cols[fi].text}}>{fallback}</span>
            )}
          </Card>
        );
      })}
    </div>
    <Btn onClick={()=>advance(2)} col={PURPLE} full>I have studied the conjugation → next</Btn>
  </div>);
  if(step===3)return(<div><StepBar steps={VERB_STEPS} current={3} completed={completed} onStepClick={goStep}/><SarfWriteTable word={word} onDone={()=>advance(3)}/></div>);
  if(step===4)return(<div>
    <StepBar steps={VERB_STEPS} current={4} completed={completed} onStepClick={goStep}/>
    <p style={{fontSize:13,color:C.muted,margin:"0 0 10px"}}>The same verb in different contexts:</p>
    {word.contexts.map((ctx,i)=>(
      <Card key={i}><p style={{fontSize:15,direction:"rtl",color:C.text,margin:"0 0 4px",lineHeight:1.8}}>{ctx.s}</p><p style={{fontSize:12,color:C.muted,margin:"0 0 6px"}}>{ctx.t}</p><Pill label={ctx.m} color={PURPLE} sm/></Card>
    ))}
    <Btn onClick={()=>advance(4)} col={TEAL} full>All contexts studied ✓ — unlock quiz</Btn>
  </div>);
  return null;
};

// ── NOUN LEARN ────────────────────────────────────────────────────
const NounLearn=({word,learned,onComplete,isReview:_,initialStep,onStepChange}:{word:Noun;learned:Record<string,any>;onComplete:(id:string,s:number[])=>void;isReview:boolean;initialStep:number;onStepChange?:(s:number)=>void})=>{
  const init=learned[word.id]?.learnedSteps||[];
  const [step,setStep]=useState(initialStep||0);
  const [completed,setCompleted]=useState<number[]>(init);
  const markDone=(s:number)=>{const nc=[...new Set([...completed,s])];setCompleted(nc);onComplete(word.id,nc);};
  const advance=(s:number)=>{markDone(s);const next=s+1;if(next<NOUN_STEPS.length){setStep(next);onStepChange?.(next);}};
  const goStep=(s:number)=>{setStep(s);onStepChange?.(s);};
  if(step===0)return(<div>
    <StepBar steps={NOUN_STEPS} current={0} completed={completed} onStepClick={goStep}/>
    <Card>
      <div style={{textAlign:"center",padding:"1rem 0"}}>
        <p style={{fontSize:40,direction:"rtl",color:C.text,margin:"0 0 6px",lineHeight:1.6}}>{word.ar}</p>
        <p style={{fontSize:14,color:TEAL.text,margin:"0 0 4px"}}>Root: {word.root}</p>
        <p style={{fontSize:22,color:C.text,margin:"0 0 16px",fontWeight:500}}>{word.meaning}</p>
      </div>
      <Divider/>
      <p style={{fontSize:15,direction:"rtl",color:C.text,margin:"0 0 4px",lineHeight:1.8}}>{word.sentence}</p>
      <p style={{fontSize:12,color:C.muted,margin:0}}>{word.sentenceTr}</p>
    </Card>
    <Btn onClick={()=>advance(0)} col={TEAL} full>I understand the meaning → next</Btn>
  </div>);
  if(step===1)return(<div>
    <StepBar steps={NOUN_STEPS} current={1} completed={completed} onStepClick={goStep}/>
    <Card><p style={{fontSize:14,fontWeight:500,color:C.text,margin:"0 0 12px"}}>Practice writing: <span style={{direction:"rtl",color:TEAL.text}}>{word.ar}</span></p>
      <DrawCanvas targetWord={word.ar} onResult={()=>advance(1)}/>
    </Card>
  </div>);
  if(step===2)return(<div>
    <StepBar steps={NOUN_STEPS} current={2} completed={completed} onStepClick={goStep}/>
    <p style={{fontSize:13,color:C.muted,margin:"0 0 10px"}}>Plurals of <span style={{direction:"rtl",color:TEAL.text}}>{word.ar}</span>:</p>
    {word.plurals.map((pl,i)=>(
      <Card key={i} style={{borderLeft:`2px solid ${pl.shift?CORAL.text:TEAL.text}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
          <span style={{fontSize:22,direction:"rtl",color:pl.shift?CORAL.text:TEAL.text,fontWeight:500}}>{pl.ar}</span>
          <Pill label={pl.type} color={pl.shift?CORAL:TEAL} sm/>
        </div>
        <p style={{fontSize:13,color:C.text,margin:"0 0 3px"}}>{pl.meaning}</p>
        {pl.shift&&<p style={{fontSize:11,color:CORAL.text,margin:0}}>Meaning shifts — needs its own card</p>}
      </Card>
    ))}
    <Btn onClick={()=>advance(2)} col={TEAL} full>I know the plurals → next</Btn>
  </div>);
  if(step===3)return(<div>
    <StepBar steps={NOUN_STEPS} current={3} completed={completed} onStepClick={goStep}/>
    {word.synonym&&<Card style={{borderLeft:`2px solid ${PURPLE.text}`}}>
      <p style={{fontSize:11,color:PURPLE.text,margin:"0 0 6px",fontWeight:500}}>SYNONYM</p>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}><span style={{fontSize:20,direction:"rtl",color:C.text,fontWeight:500}}>{word.synonym.ar}</span><span style={{fontSize:13,color:C.muted}}>— {word.synonym.meaning}</span></div>
      <p style={{fontSize:13,color:C.muted,margin:0,lineHeight:1.6}}>{word.synonym.distinction}</p>
    </Card>}
    {word.antonym&&<Card style={{borderLeft:`2px solid ${CORAL.text}`}}>
      <p style={{fontSize:11,color:CORAL.text,margin:"0 0 6px",fontWeight:500}}>ANTONYM</p>
      <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:20,direction:"rtl",color:C.text,fontWeight:500}}>{word.antonym.ar}</span><span style={{fontSize:13,color:C.muted}}>— {word.antonym.meaning}</span></div>
    </Card>}
    <Btn onClick={()=>advance(3)} col={TEAL} full>I know synonym & antonym → next</Btn>
  </div>);
  if(step===4)return(<div>
    <StepBar steps={NOUN_STEPS} current={4} completed={completed} onStepClick={goStep}/>
    <p style={{fontSize:13,color:C.muted,margin:"0 0 10px"}}>Contexts and usages:</p>
    {word.contexts.map((ctx,i)=>(
      <Card key={i}><p style={{fontSize:15,direction:"rtl",color:C.text,margin:"0 0 4px",lineHeight:1.8}}>{ctx.s}</p><p style={{fontSize:12,color:C.muted,margin:"0 0 6px"}}>{ctx.t}</p><Pill label={ctx.m} color={TEAL} sm/></Card>
    ))}
    <Btn onClick={()=>advance(4)} col={TEAL} full>All contexts studied ✓ — unlock quiz</Btn>
  </div>);
  return null;
};

// ── QUIZ ENGINE ───────────────────────────────────────────────────
const QuizEngine=({words,type,progress,onUpdateProgress}:{words:(Verb|Noun)[];type:string;progress:Record<string,any>;onUpdateProgress:(id:string,d:object)=>void})=>{
  const [phase,setPhase]=useState("intro");
  const [queue,setQueue]=useState<any[]>([]);
  const [qi,setQi]=useState(0);
  const [typed,setTyped]=useState("");
  const [submitted,setSubmitted]=useState(false);
  const [lastOk,setLastOk]=useState<boolean|null>(null);
  const [nearMiss,setNearMiss]=useState(false);
  const [score,setScore]=useState(0);
  const [showKb,setShowKb]=useState(false);
  const inputRef=useRef<HTMLInputElement>(null);
  const isVerb=type==="verb";
  const buildQ=()=>{
    const q=[...words].sort((a,b)=>{
      const ra=progress[a.id]?calcRet(progress[a.id].lastReview,progress[a.id].stability):0;
      const rb=progress[b.id]?calcRet(progress[b.id].lastReview,progress[b.id].stability):0;
      return ra-rb;
    }).map(w=>{
      const ret=progress[w.id]?calcRet(progress[w.id].lastReview,progress[w.id].stability):0;
      const lv=ret>=75?3:ret>=50?2:ret>=25?1:0;
      const pool=isVerb
        ?[["mc_meaning","mc_meaning","type_en"],["mc_meaning","type_en","mc_meaning"],["type_en","type_ar"],["type_ar","type_en"]][lv]
        :[["mc_meaning"],["mc_meaning","type_en"],["type_en","mc_plural"],["type_en","type_ar"]][lv];
      const qt=pool[Math.floor(Math.random()*pool.length)];
      const opts=[w.meaning,...words.filter((x:any)=>x.id!==w.id).slice(0,3).map((x:any)=>x.meaning)].sort(()=>Math.random()-0.5);
      return{...w,qtype:qt,opts};
    });
    setQueue(q);setQi(0);setScore(0);setPhase("quiz");
  };
  const w=queue[qi];
  useEffect(()=>{setTyped("");setSubmitted(false);setLastOk(null);setNearMiss(false);setShowKb(false);setTimeout(()=>inputRef.current?.focus(),100);},[qi,w?.id]);
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{if(e.key==="Enter"&&submitted)advance();if(e.key==="Enter"&&!submitted&&typed.trim()&&w?.qtype==="type_en")doSubmit(typed);};
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[submitted,typed,w]);
  const doSubmit=(ans:string)=>{
    if(submitted||!w)return;
    let ok=false;
    if(w.qtype.startsWith("mc"))ok=ans===w.meaning;
    else if(w.qtype==="type_en")ok=fuzzy(ans.toLowerCase(),w.meaning.toLowerCase())>=0.85;
    else if(w.qtype==="type_ar")ok=fuzzy(ans,w.ar)>=0.85;
    const nm=!ok&&w.qtype==="type_en"&&fuzzy(ans.toLowerCase(),w.meaning.toLowerCase())>=0.7;
    setNearMiss(nm);setLastOk(ok);setSubmitted(true);
    if(ok)setScore(s=>s+1);
    const prev=progress[w.id]||{stability:0.5,lastReview:null,correct:0,total:0};
    onUpdateProgress(w.id,{stability:nextS(prev.stability,ok),lastReview:Date.now(),correct:prev.correct+(ok?1:0),total:prev.total+1});
  };
  const dontKnow=()=>{if(!w)return;setLastOk(false);setSubmitted(true);setNearMiss(false);const prev=progress[w.id]||{stability:0.5,lastReview:null,correct:0,total:0};onUpdateProgress(w.id,{stability:0.5,lastReview:Date.now(),correct:prev.correct,total:prev.total+1});};
  const markOk=()=>{setLastOk(true);setNearMiss(false);setScore(s=>s+1);const prev=progress[w.id]||{stability:0.5,lastReview:null,correct:0,total:0};onUpdateProgress(w.id,{stability:nextS(prev.stability,true),lastReview:Date.now(),correct:prev.correct+1,total:prev.total+1});};
  const advance=()=>{if(qi+1>=queue.length){setPhase("done");return;}setQi(i=>i+1);};
  const speechAr=useSpeech("ar-SA");
  const speechEn=useSpeech("en-US");
  if(phase==="intro")return(<div style={{textAlign:"center",padding:"2rem 1rem"}}><p style={{fontSize:18,fontWeight:500,color:C.text,margin:"0 0 8px"}}>Quiz</p><p style={{fontSize:13,color:C.muted,margin:"0 0 24px",lineHeight:1.7}}>Lowest retention words come first. Question type scales with mastery. Press Enter to advance.</p><Btn onClick={buildQ} col={PURPLE}>Start quiz ↗</Btn></div>);
  if(phase==="done")return(<div style={{textAlign:"center",padding:"2rem 1rem"}}><p style={{fontSize:36,fontWeight:500,color:C.text,margin:"0 0 4px"}}>{score}/{queue.length}</p><p style={{fontSize:13,color:C.muted,margin:"0 0 20px"}}>{score===queue.length?"Perfect — Alhamdulillah!":score>=Math.round(queue.length*0.7)?"Strong session":"Review the explanations carefully"}</p><AccentBar color={AMBER.text}>Progress saved automatically.</AccentBar><Btn onClick={()=>setPhase("intro")} col={PURPLE}>New quiz</Btn></div>);
  if(!w)return null;
  const ret=progress[w.id]?calcRet(progress[w.id].lastReview,progress[w.id].stability):0;
  const st=statusR(ret);const isMC=w.qtype.startsWith("mc");const isTypeAr=w.qtype==="type_ar";
  return(<div>
    <div style={{display:"flex",gap:3,marginBottom:10,alignItems:"center"}}>
      {queue.map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:99,background:i<qi?TEAL.bg:i===qi?PURPLE.bg:C.surface2}}/>)}
      <span style={{fontSize:11,color:C.muted,marginLeft:8,flexShrink:0}}>{qi+1}/{queue.length}</span>
    </div>
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><Pill label={(w as any).form||w.root} color={PURPLE}/><Pill label={st.l} color={st.c} sm/></div>
      {isTypeAr?<p style={{fontSize:20,textAlign:"center",color:C.text,margin:"1rem 0"}}>{w.meaning}</p>:<p style={{fontSize:36,direction:"rtl",textAlign:"center",color:C.text,margin:"1rem 0",lineHeight:1.6}}>{w.ar}</p>}
      <RetBar r={ret}/>
      <p style={{fontSize:11,color:C.muted,margin:"3px 0 0",textAlign:"right"}}>{ret}% retained · Root: {w.root}</p>
    </Card>
    {!submitted?(isMC?(
      <div>
        <p style={{fontSize:12,color:C.muted,margin:"0 0 8px"}}>Select the correct meaning:</p>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
          {w.opts.map((opt:string)=><button key={opt} onClick={()=>doSubmit(opt)} style={{background:C.surface,border:`0.5px solid ${C.border}`,borderRadius:10,padding:"11px 16px",fontSize:14,color:C.text,cursor:"pointer",textAlign:"left"}}>{opt}</button>)}
        </div>
        <Btn onClick={dontKnow} col={AMBER}>لا أعرف</Btn>
      </div>
    ):(
      <div>
        <p style={{fontSize:12,color:C.muted,margin:"0 0 8px"}}>{isTypeAr?"Write the Arabic word:":"Type the English meaning:"}</p>
        {isTypeAr?(
          <div>
            <div style={{background:C.bg,border:`0.5px solid ${C.border}`,borderRadius:8,padding:"10px 14px",minHeight:44,marginBottom:8,direction:"rtl",fontSize:20,color:C.text,cursor:"pointer"}} onClick={()=>setShowKb(true)}>
              {typed||<span style={{color:C.subtle,fontSize:14}}>اضغط للكتابة…</span>}
            </div>
            <div style={{display:"flex",gap:6}}>
              <Btn onClick={()=>setShowKb(true)} col={PURPLE} sm>⌨ Keyboard</Btn>
              {speechAr.supported&&<button onClick={()=>{if(speechAr.listening)speechAr.stop();else speechAr.start(t=>{setTyped(t);doSubmit(t);});}} style={{background:speechAr.listening?"#7f1d1d":"transparent",border:`0.5px solid ${speechAr.listening?"#ef4444":C.borderMed}`,borderRadius:8,padding:"5px 10px",fontSize:14,color:speechAr.listening?"#ef4444":C.muted,cursor:"pointer",animation:speechAr.listening?"micPulse 1s ease-in-out infinite":"none"}}>{speechAr.listening?"🔴":"🎤"}</button>}
              {typed&&<Btn onClick={()=>doSubmit(typed)} col={TEAL} sm>Check ↗</Btn>}
              <Btn onClick={dontKnow} col={AMBER} sm>لا أعرف</Btn>
            </div>
            {showKb&&<KBOverlay label="Write the Arabic word" initial={typed} onConfirm={v=>{setTyped(v);setShowKb(false);}} onClose={()=>setShowKb(false)}/>}
          </div>
        ):(
          <div>
            <input ref={inputRef} value={typed} onChange={e=>setTyped(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&typed.trim())doSubmit(typed);}}
              placeholder="Type meaning… (Enter to submit)"
              style={{width:"100%",background:C.surface2,border:`0.5px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:14,marginBottom:8,boxSizing:"border-box"}}/>
            <div style={{display:"flex",gap:6}}>
              {speechEn.supported&&<button onClick={()=>{if(speechEn.listening)speechEn.stop();else speechEn.start(t=>{setTyped(t);doSubmit(t);});}} style={{background:speechEn.listening?"#7f1d1d":"transparent",border:`0.5px solid ${speechEn.listening?"#ef4444":C.borderMed}`,borderRadius:8,padding:"5px 10px",fontSize:14,color:speechEn.listening?"#ef4444":C.muted,cursor:"pointer",animation:speechEn.listening?"micPulse 1s ease-in-out infinite":"none"}}>{speechEn.listening?"🔴":"🎤"}</button>}
              <Btn onClick={()=>typed.trim()&&doSubmit(typed)} col={PURPLE}>Check ↗</Btn><Btn onClick={dontKnow} col={AMBER}>لا أعرف</Btn>
            </div>
          </div>
        )}
      </div>
    )):(
      <div>
        {nearMiss&&!lastOk&&(<div style={{background:AMBER.bg,border:`0.5px solid ${AMBER.text}`,borderRadius:10,padding:"10px 14px",marginBottom:10}}>
          <p style={{fontSize:13,color:AMBER.text,margin:"0 0 6px",fontWeight:500}}>Close — did you mean this?</p>
          <p style={{fontSize:13,color:C.text,margin:"0 0 8px"}}>You wrote: <em>{typed}</em> · Correct: <strong>{w.meaning}</strong></p>
          <Btn onClick={markOk} col={TEAL} sm>Mark correct</Btn><Btn onClick={()=>setNearMiss(false)} col={CORAL} sm>Keep as wrong</Btn>
        </div>)}
        {(!nearMiss||lastOk)&&(<div style={{background:lastOk?TEAL.bg:CORAL.bg,border:`0.5px solid ${lastOk?TEAL.text:CORAL.text}`,borderRadius:10,padding:"10px 14px",marginBottom:10}}>
          <p style={{fontSize:13,fontWeight:500,color:lastOk?TEAL.text:CORAL.text,margin:"0 0 4px"}}>{lastOk?"Correct! ✓":"Not quite"}</p>
          <p style={{fontSize:13,color:C.text,margin:0}}>Answer: <strong>{w.meaning}</strong> — <span style={{direction:"rtl"}}>{w.ar}</span></p>
        </div>)}
        <Card style={{marginBottom:8}}>
          <p style={{fontSize:15,direction:"rtl",color:C.text,margin:"0 0 4px",lineHeight:1.8}}>{w.sentence||w.contexts?.[0]?.s}</p>
          <p style={{fontSize:12,color:C.muted,margin:"0 0 10px"}}>{w.sentenceTr||w.contexts?.[0]?.t}</p>
          {isVerb&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            {([[PURPLE,"مصدر",(w as Verb).masdar],[TEAL,"فاعل",(w as Verb).fail],[CORAL,"مفعول",(w as Verb).mafool]] as [typeof PURPLE,string,string][]).map(([col,lbl,val])=>(
              <div key={lbl} style={{background:col.bg,borderRadius:6,padding:"6px 8px"}}><p style={{fontSize:10,color:col.text,margin:"0 0 2px"}}>{lbl}</p><p style={{fontSize:13,direction:"rtl",color:col.text,margin:0}}>{val}</p></div>
            ))}
          </div>}
          {!isVerb&&(w as Noun).plurals&&<div style={{marginTop:8}}>{(w as Noun).plurals.map((pl,i)=><div key={i} style={{fontSize:13,color:TEAL.text,marginBottom:2}}><span style={{direction:"rtl"}}>{pl.ar}</span> — {pl.meaning}</div>)}</div>}
        </Card>
        <Btn onClick={advance} col={PURPLE} full>{qi+1>=queue.length?"See results →":"Next → (Enter)"}</Btn>
      </div>
    )}
  </div>);
};

// ── LEARNED WORDS ─────────────────────────────────────────────────
const LearnedWords=({progress,words}:{progress:Record<string,any>;words:(Verb|Noun)[]})=>{
  const [filter,setFilter]=useState("All");
  const list=words.map(w=>{const p=progress[w.id]||{stability:0.5,lastReview:null,correct:0,total:0};const r=p.lastReview?calcRet(p.lastReview,p.stability):0;return{...w,...p,retention:r,status:statusR(r)};})
    .filter(w=>filter==="All"||w.status.l===filter).sort((a,b)=>b.retention-a.retention);
  return(<div>
    <div style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap"}}>
      {["All","Mastered","Familiar","Learning","New"].map(f=>(
        <button key={f} onClick={()=>setFilter(f)} style={{background:filter===f?PURPLE.bg:"transparent",border:`0.5px solid ${filter===f?PURPLE.text:C.borderMed}`,borderRadius:8,padding:"5px 12px",fontSize:12,color:filter===f?PURPLE.text:C.muted,cursor:"pointer"}}>{f}</button>
      ))}
    </div>
    <p style={{fontSize:12,color:C.muted,margin:"0 0 10px"}}>{list.length} words</p>
    {list.map(w=>(
      <div key={w.id} style={{background:C.surface,border:`0.5px solid ${C.border}`,borderRadius:10,padding:"10px 14px",marginBottom:7}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
          <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:18,direction:"rtl",color:C.text}}>{w.ar}</span><span style={{fontSize:13,color:C.muted}}>— {w.meaning}</span></div>
          <Pill label={w.status.l} color={w.status.c} sm/>
        </div>
        <RetBar r={w.retention}/>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
          <span style={{fontSize:11,color:C.muted}}>{w.root}</span>
          <span style={{fontSize:11,color:w.retention>=60?TEAL.text:CORAL.text}}>{w.retention}% · {(w as any).total||0} reviews</span>
        </div>
      </div>
    ))}
    {list.length===0&&<p style={{fontSize:13,color:C.muted,textAlign:"center",padding:"2rem"}}>No words in this category yet.</p>}
  </div>);
};

// ── SETTINGS ──────────────────────────────────────────────────────
const Settings=({progress,learned,onResetAll,onResetWord,settings,onSaveSetting}:{progress:Record<string,any>;learned:Record<string,any>;onResetAll:()=>void;onResetWord:(id:string)=>void;settings:Record<string,any>;onSaveSetting:(k:string,v:any)=>void})=>{
  const [confirmAll,setConfirmAll]=useState(false);
  const [resetWordId,setResetWordId]=useState<string|null>(null);
  const allWords=[...VERBS,...NOUNS];
  const Row=({label,sub,children}:{label:string;sub?:string;children:React.ReactNode})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`0.5px solid ${C.border}`}}>
      <div><p style={{fontSize:14,color:C.text,margin:0}}>{label}</p>{sub&&<p style={{fontSize:12,color:C.muted,margin:"2px 0 0"}}>{sub}</p>}</div>
      <div>{children}</div>
    </div>
  );
  const Toggle=({val,onChange}:{val:boolean;onChange:(v:boolean)=>void})=>(
    <button onClick={()=>onChange(!val)} style={{width:44,height:24,borderRadius:99,background:val?TEAL.bg:C.surface2,border:`0.5px solid ${val?TEAL.text:C.borderMed}`,cursor:"pointer",position:"relative",transition:"background 0.2s"}}>
      <div style={{width:18,height:18,borderRadius:"50%",background:val?TEAL.text:C.muted,position:"absolute",top:2,left:val?22:3,transition:"left 0.2s"}}/>
    </button>
  );
  const Select=({val,options,onChange}:{val:string;options:{value:string;label:string}[];onChange:(v:string)=>void})=>(
    <select value={val} onChange={e=>onChange(e.target.value)}
      style={{background:C.surface2,border:`0.5px solid ${C.borderMed}`,borderRadius:8,padding:"5px 10px",color:C.text,fontSize:13,cursor:"pointer"}}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
  return(<div style={{maxWidth:600}}>
    <SL>Learning preferences</SL>
    <Card>
      <Row label="Daily word goal" sub="Session limit warning fires at this number">
        <Select val={settings.dailyGoal||"10"} options={[{value:"5",label:"5 words"},{value:"10",label:"10 words"},{value:"15",label:"15 words"}]} onChange={v=>onSaveSetting("dailyGoal",v)}/>
      </Row>
      <Row label="Show harakat on keyboard" sub="Vowel marks row shown by default">
        <Toggle val={settings.showHarakat!==false} onChange={v=>onSaveSetting("showHarakat",v)}/>
      </Row>
      <Row label="Show retention %" sub="Show the retention percentage on word cards">
        <Toggle val={settings.showRetention!==false} onChange={v=>onSaveSetting("showRetention",v)}/>
      </Row>
    </Card>
    <div style={{marginTop:16}}><SL>Reset progress</SL></div>
    <Card>
      <div style={{paddingBottom:12,marginBottom:12,borderBottom:`0.5px solid ${C.border}`}}>
        <p style={{fontSize:14,color:C.text,margin:"0 0 4px"}}>Reset a single word</p>
        <p style={{fontSize:12,color:C.muted,margin:"0 0 10px"}}>Clears SRS retention and learned steps for one word only.</p>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {allWords.map(w=>{
            const hasData=progress[w.id]?.total>0||learned[w.id]?.learnedSteps?.length>0;
            if(!hasData)return null;
            const r=progress[w.id]?calcRet(progress[w.id].lastReview,progress[w.id].stability):0;
            const st=statusR(r);
            return(<div key={w.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.surface2,borderRadius:8,padding:"8px 12px"}}>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:16,direction:"rtl",color:C.text}}>{w.ar}</span>
                <span style={{fontSize:12,color:C.muted}}>— {w.meaning}</span>
                <Pill label={st.l} color={st.c} sm/>
              </div>
              {resetWordId===w.id?(
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <p style={{fontSize:11,color:CORAL.text,margin:0}}>Sure?</p>
                  <Btn onClick={()=>{onResetWord(w.id);setResetWordId(null);}} col={CORAL} sm>Yes, reset</Btn>
                  <Btn onClick={()=>setResetWordId(null)} col={GRAY} sm>Cancel</Btn>
                </div>
              ):(
                <Btn onClick={()=>setResetWordId(w.id)} col={AMBER} sm>Reset</Btn>
              )}
            </div>);
          })}
          {allWords.every(w=>!progress[w.id]?.total&&!learned[w.id]?.learnedSteps?.length)&&<p style={{fontSize:13,color:C.muted,margin:0}}>No word progress to reset yet.</p>}
        </div>
      </div>
      <div>
        <p style={{fontSize:14,color:C.text,margin:"0 0 4px"}}>Reset all progress</p>
        <p style={{fontSize:12,color:C.muted,margin:"0 0 10px"}}>Clears every word's SRS data and learning steps. Cannot be undone.</p>
        {!confirmAll?(
          <Btn onClick={()=>setConfirmAll(true)} col={CORAL}>Reset all progress</Btn>
        ):(
          <div style={{background:CORAL.bg,border:`0.5px solid ${CORAL.text}`,borderRadius:10,padding:"12px 16px"}}>
            <p style={{fontSize:14,fontWeight:500,color:CORAL.text,margin:"0 0 6px"}}>Are you sure?</p>
            <p style={{fontSize:13,color:CORAL.text,margin:"0 0 12px",opacity:0.85}}>All SRS data and completed steps will be permanently deleted.</p>
            <div style={{display:"flex",gap:6}}>
              <Btn onClick={()=>{onResetAll();setConfirmAll(false);}} col={CORAL}>Yes, delete everything</Btn>
              <Btn onClick={()=>setConfirmAll(false)} col={GRAY}>Cancel</Btn>
            </div>
          </div>
        )}
      </div>
    </Card>
    <div style={{marginTop:16}}><SL>Sources</SL></div>
    <Card>
      <p style={{fontSize:13,color:C.muted,margin:"0 0 10px",lineHeight:1.7}}>Words are sourced from almaany.com and corpus.quran.com. Add new words directly in <code style={{color:TEAL.text}}>src/words/verbs.ts</code> and <code style={{color:TEAL.text}}>src/words/nouns.ts</code>.</p>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <a href="https://www.almaany.com/en/dict/ar-en/" target="_blank" rel="noreferrer" style={{display:"inline-block",background:BLUE.bg,border:`0.5px solid ${BLUE.text}`,borderRadius:8,padding:"7px 14px",fontSize:13,color:BLUE.text,textDecoration:"none"}}>Open Almaany ↗</a>
        <a href="https://corpus.quran.com" target="_blank" rel="noreferrer" style={{display:"inline-block",background:TEAL.bg,border:`0.5px solid ${TEAL.text}`,borderRadius:8,padding:"7px 14px",fontSize:13,color:TEAL.text,textDecoration:"none"}}>Quran Corpus ↗</a>
      </div>
    </Card>
  </div>);
};

// ── GUIDE TAB ────────────────────────────────────────────────────
const STAGES=[
  {num:"1",color:PURPLE,label:"Foundation",title:"Learn the system before any words",verb:"Master all 10 form rules using the ف-ع-ل placeholder. Fill the sarf table for strong verbs until automatic.",noun:"Understand noun types. Learn why broken plurals must be memorised individually.",focus:"Two weeks here saves six months later."},
  {num:"2",color:TEAL,label:"High-frequency roots",title:"Start with what you already hear every day",verb:"Roots from daily prayer: صلى، سمع، علم، رحم، عبد، حمد، ملك. Full wizard sequence per word. 5–10 per week.",noun:"Daily life nouns first. Then Quranic nouns: رَحْمَة، نَفْس، قَلْب، نُور.",focus:"Familiarity is an anchor — use it."},
  {num:"3",color:AMBER,label:"Synonyms & depth",title:"Move from functional to expressive",verb:"Study how forms shift meaning. Notice which forms appear in Quran vs everyday speech.",noun:"Learn synonym pairs with distinction notes. The distinction is the lesson.",focus:"For every synonym: which would a native say, and which appears in the Quran?"},
  {num:"4",color:CORAL,label:"Weak verbs",title:"Only after strong patterns are automatic",verb:"Madinah order: مثال → مضاعف → أجوف → ناقص. Rule before every type.",noun:"Broken plural patterns systematically. Meaning shifts get their own card.",focus:"One type at a time. Fully. Then move on."},
  {num:"5",color:BLUE,label:"Active production",title:"Confidence comes from output, not input",verb:"Every session ends with an Arabic exchange. Conversation is non-negotiable.",noun:"Every noun used in a sentence you construct yourself before the session ends.",focus:"Your challenge is sentence construction. More output — not more input."},
];
const GuideTab=({mode}:{mode:string})=>(
  <div>
    <SL>Five stages — follow in order</SL>
    <AccentBar color="#AFA9EC">Your grammar is solid. Your gap is active vocabulary retrieval. Do not skip stages.</AccentBar>
    <Divider/>
    {STAGES.map((s,i)=>(
      <div key={s.num} style={{marginBottom:12}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <div style={{width:30,height:30,borderRadius:"50%",background:s.color.bg,color:s.color.text,fontSize:13,fontWeight:500,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{s.num}</div>
          <div style={{flex:1}}>
            <div style={{display:"flex",gap:8,marginBottom:3,flexWrap:"wrap",alignItems:"center"}}>
              <p style={{fontSize:14,fontWeight:500,color:C.text,margin:0}}>{s.title}</p>
              <Pill label={s.label} color={s.color}/>
            </div>
            <p style={{fontSize:13,color:C.muted,margin:"0 0 5px",lineHeight:1.65}}>{mode==="verb"?s.verb:s.noun}</p>
            <div style={{borderLeft:`2px solid ${s.color.text}`,paddingLeft:10}}><p style={{fontSize:12,color:s.color.text,margin:0}}>Focus: {s.focus}</p></div>
          </div>
        </div>
        {i<STAGES.length-1&&<div style={{width:1,height:14,background:C.border,marginLeft:14,marginTop:4}}/>}
      </div>
    ))}
  </div>
);

// ── WORD MODULE ───────────────────────────────────────────────────
const WordModule=({type,progress,learned,onUpdateProgress,onUpdateLearned}:{type:string;progress:Record<string,any>;learned:Record<string,any>;onUpdateProgress:(id:string,d:object)=>void;onUpdateLearned:(id:string,d:object)=>void})=>{
  const words=(type==="verb"?VERBS:NOUNS) as (Verb|Noun)[];
  const steps=type==="verb"?VERB_STEPS:NOUN_STEPS;
  const TABS=type==="verb"?["Form Rules","Learn","Quiz","Learned","Guide"]:["Learn","Quiz","Learned","Guide"];
  const [tab,setTab]=useState(0);
  const [selectedWord,setSelectedWord]=useState<string|null>(null);
  const [isReview,setIsReview]=useState(false);
  const [wordStep,setWordStep]=useState<Record<string,number>>({});
  const accentCol=type==="verb"?"#AFA9EC":"#9FE1CB";
  const isWordLearned=(id:string)=>{const l=learned[id];return l&&l.learnedSteps&&l.learnedSteps.length>=steps.length;};
  const learnedCount=words.filter(w=>isWordLearned(w.id)).length;
  const learnTabIdx=type==="verb"?1:0;
  const quizTabIdx=type==="verb"?2:1;
  const learnedTabIdx=type==="verb"?3:2;
  const guideTabIdx=type==="verb"?4:3;
  if(selectedWord){
    const w=words.find(x=>x.id===selectedWord)!;
    return(<div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <Btn onClick={()=>setSelectedWord(null)} sm col={GRAY}>← Back</Btn>
        <span style={{fontSize:16,direction:"rtl",color:C.text}}>{w.ar}</span>
        <span style={{fontSize:13,color:C.muted}}>— {w.meaning}</span>
      </div>
      {type==="verb"
        ?<VerbLearn word={w as Verb} learned={learned} isReview={isReview} initialStep={wordStep[w.id]||0} onStepChange={s=>setWordStep(p=>({...p,[w.id]:s}))} onComplete={(id,s)=>onUpdateLearned(id,{learnedSteps:s})}/>
        :<NounLearn word={w as Noun} learned={learned} isReview={isReview} initialStep={wordStep[w.id]||0} onStepChange={s=>setWordStep(p=>({...p,[w.id]:s}))} onComplete={(id,s)=>onUpdateLearned(id,{learnedSteps:s})}/>}
    </div>);
  }
  return(<div>
    <div style={{display:"flex",gap:2,marginBottom:"1.5rem",borderBottom:`0.5px solid ${C.border}`,overflowX:"auto"}}>
      {TABS.map((t,i)=>{
        const isQuiz=i===quizTabIdx;const locked=isQuiz&&learnedCount===0;
        return(<button key={t} onClick={()=>!locked&&setTab(i)}
          style={{background:"none",border:"none",borderBottom:tab===i?`2px solid ${accentCol}`:"2px solid transparent",padding:"8px 14px",fontSize:13,fontWeight:tab===i?500:400,color:locked?"#444":tab===i?accentCol:C.muted,cursor:locked?"not-allowed":"pointer",marginBottom:-1,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
          {t}{locked&&<span style={{fontSize:11}}>🔒</span>}
        </button>);
      })}
    </div>
    {type==="verb"&&tab===0&&<FormRulesTab/>}
    {tab===learnTabIdx&&(
      <div>
        <AccentBar color={accentCol}>Wizard on first encounter — steps in order. Complete all steps to unlock the quiz.</AccentBar>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {words.map(w=>{
            const done=isWordLearned(w.id);
            const r=progress[w.id]?calcRet(progress[w.id].lastReview,progress[w.id].stability):0;
            const st=statusR(r);const lSteps=learned[w.id]?.learnedSteps||[];
            return(<div key={w.id} style={{background:C.surface,border:`0.5px solid ${C.border}`,borderLeft:`3px solid ${done?TEAL.text:C.border}`,borderRadius:12,padding:"12px 14px",cursor:"pointer"}}
              onClick={()=>{setSelectedWord(w.id);setIsReview(done);}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:20,direction:"rtl",color:C.text}}>{w.ar}</span>
                  <span style={{fontSize:13,color:C.muted}}>— {w.meaning}</span>
                </div>
                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                  {done&&<Pill label={st.l} color={st.c} sm/>}
                  {done?<span style={{fontSize:12,color:TEAL.text}}>✓</span>:<span style={{fontSize:12,color:C.muted}}>{lSteps.length}/{steps.length}</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:3}}>
                {steps.map((s,i)=><div key={s} style={{flex:1,height:2,borderRadius:99,background:lSteps.includes(i)?TEAL.text:C.surface2}} title={s}/>)}
              </div>
              {done&&<RetBar r={r}/>}
            </div>);
          })}
        </div>
      </div>
    )}
    {tab===quizTabIdx&&<QuizEngine words={words.filter(w=>isWordLearned(w.id))} type={type} progress={progress} onUpdateProgress={onUpdateProgress}/>}
    {tab===learnedTabIdx&&<LearnedWords progress={progress} words={words}/>}
    {tab===guideTabIdx&&<GuideTab mode={type}/>}
  </div>);
};

// ── HOME ──────────────────────────────────────────────────────────
const Home=({onSelect}:{onSelect:(m:string)=>void})=>(
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"80vh",gap:24,textAlign:"center"}}>
    <div>
      <h1 style={{fontSize:24,fontWeight:500,margin:"0 0 6px",color:C.text}}>Arabic Learning System</h1>
      <p style={{fontSize:13,color:C.muted,margin:"0 0 4px",lineHeight:1.6}}>Learn vocabulary with a structured wizard — meaning, handwriting, conjugation, contexts.</p>
      <p style={{fontSize:12,color:C.subtle,margin:0}}>AI handwriting check · Spaced repetition (SRS) · 10 verb form rules</p>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,width:"100%",maxWidth:480}}>
      {[{mode:"verb",ar:"فَعَلَ",label:"Verbs",sub:"10 form rules · Learn roots · Write · Conjugation quiz",accent:"#AFA9EC"},{mode:"noun",ar:"اِسْم",label:"Nouns",sub:"Meaning · Write · Plurals · Synonyms · Quiz",accent:"#9FE1CB"}].map(o=>(
        <button key={o.mode} onClick={()=>onSelect(o.mode)} style={{background:C.surface,border:`0.5px solid ${C.border}`,borderTop:`3px solid ${o.accent}`,borderRadius:12,padding:"2rem 1.5rem",cursor:"pointer",textAlign:"center"}}>
          <p style={{fontSize:28,margin:"0 0 10px",direction:"rtl",color:o.accent}}>{o.ar}</p>
          <p style={{fontSize:15,fontWeight:500,color:C.text,margin:"0 0 6px"}}>{o.label}</p>
          <p style={{fontSize:12,color:C.muted,margin:0,lineHeight:1.5}}>{o.sub}</p>
        </button>
      ))}
    </div>
    <p style={{fontSize:11,color:C.subtle,maxWidth:440,lineHeight:1.6}}>Each word follows a 5-step wizard: meaning → write → conjugation → sarf practice → contexts. Complete all steps to unlock the quiz. Progress is saved automatically using spaced repetition.</p>
    <button onClick={()=>onSelect("settings")} style={{background:"none",border:`0.5px solid ${C.border}`,borderRadius:8,padding:"7px 16px",fontSize:13,color:C.muted,cursor:"pointer"}}>⚙ Settings</button>
  </div>
);

// ── ROOT ──────────────────────────────────────────────────────────
export default function App(){
  const [mode,setMode]=useState<string|null>(null);
  const [progress,setProgress]=useState<Record<string,any>>(()=>loadS().words||{});
  const [learned,setLearned]=useState<Record<string,any>>(()=>loadS().learned||{});
  const [settings,setSettings]=useState<Record<string,any>>(()=>loadS().settings||{});
  const updP=useCallback((id:string,data:object)=>{
    setProgress(p=>{const n={...p,[id]:data};saveS({words:n,learned,settings});return n;});
  },[learned,settings]);
  const updL=useCallback((id:string,data:object)=>{
    setLearned(l=>{const n={...l,[id]:data};saveS({words:progress,learned:n,settings});return n;});
  },[progress,settings]);
  const saveSetting=useCallback((key:string,val:any)=>{
    setSettings(s=>{const n={...s,[key]:val};saveS({words:progress,learned,settings:n});return n;});
  },[progress,learned]);
  const resetAll=useCallback(()=>{setProgress({});setLearned({});saveS({words:{},learned:{},settings});},[settings]);
  const resetWord=useCallback((id:string)=>{
    setProgress(p=>{const n={...p};delete n[id];saveS({words:n,learned,settings});return n;});
    setLearned(l=>{const n={...l};delete n[id];saveS({words:progress,learned:n,settings});return n;});
  },[learned,progress,settings]);
  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"system-ui,sans-serif",color:C.text}}>
      <div style={{maxWidth:1000,margin:"0 auto",padding:"1.5rem 1rem 4rem"}}>
        {mode&&(
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:"1.5rem"}}>
            <button onClick={()=>setMode(null)} style={{background:"none",border:`0.5px solid ${C.border}`,borderRadius:8,padding:"6px 12px",fontSize:12,color:C.muted,cursor:"pointer"}}>← Home</button>
            <h2 style={{fontSize:17,fontWeight:500,margin:0,color:C.text}}>{mode==="verb"?"Verb System":mode==="noun"?"Noun System":"Settings"}</h2>
          </div>
        )}
        {!mode&&<Home onSelect={setMode}/>}
        {mode==="settings"&&<Settings progress={progress} learned={learned} settings={settings} onSaveSetting={saveSetting} onResetAll={resetAll} onResetWord={resetWord}/>}
        {mode==="verb"&&<WordModule type="verb" progress={progress} learned={learned} onUpdateProgress={updP} onUpdateLearned={updL}/>}
        {mode==="noun"&&<WordModule type="noun" progress={progress} learned={learned} onUpdateProgress={updP} onUpdateLearned={updL}/>}
      </div>
    </div>
  );
}