// ─────────────────────────────────────────────────────────────────
// App.tsx — Arabic Learning System
// Pure functionality. No word data stored here.
// Add words in: src/words/verbs.ts and src/words/nouns.ts
// ─────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import { VERBS } from "./words/verbs";
import { NOUNS } from "./words/nouns";

// ── TYPES ────────────────────────────────────────────────────────
export interface VerbContext { s: string; t: string; m: string; }
export interface Verb {
  id: string; ar: string; root: string; form: string;
  meaning: string; meanings: string[];
  sentence: string; sentenceTr: string;
  contexts: VerbContext[];
  masdar: string; fail: string; mafool: string;
  conjugation: { past: string[]; present: string[] };
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

// Sarf templates (ف-ع-ل placeholder)
const STRONG={root:"ف-ع-ل",display:"فَعَلَ",meaning:"placeholder strong verb",
  active:{
    marfu:["يَفْعَلُ","تَفْعَلُ","يَفْعَلَانِ","تَفْعَلَانِ","يَفْعَلُونَ","يَفْعَلْنَ","تَفْعَلُ","تَفْعَلِينَ","تَفْعَلَانِ","تَفْعَلُونَ","تَفْعَلْنَ","أَفْعَلُ","نَفْعَلُ"],
    mansub:["يَفْعَلَ","تَفْعَلَ","يَفْعَلَا","تَفْعَلَا","يَفْعَلُوا","يَفْعَلْنَ","تَفْعَلَ","تَفْعَلِي","تَفْعَلَا","تَفْعَلُوا","تَفْعَلْنَ","أَفْعَلَ","نَفْعَلَ"],
    majzum:["يَفْعَلْ","تَفْعَلْ","يَفْعَلَا","تَفْعَلَا","يَفْعَلُوا","يَفْعَلْنَ","تَفْعَلْ","تَفْعَلِي","تَفْعَلَا","تَفْعَلُوا","تَفْعَلْنَ","أَفْعَلْ","نَفْعَلْ"],
  },
  passive:{
    marfu:["يُفْعَلُ","تُفْعَلُ","يُفْعَلَانِ","تُفْعَلَانِ","يُفْعَلُونَ","يُفْعَلْنَ","تُفْعَلُ","تُفْعَلِينَ","تُفْعَلَانِ","تُفْعَلُونَ","تُفْعَلْنَ","أُفْعَلُ","نُفْعَلُ"],
    mansub:["يُفْعَلَ","تُفْعَلَ","يُفْعَلَا","تُفْعَلَا","يُفْعَلُوا","يُفْعَلْنَ","تُفْعَلَ","تُفْعَلِي","تُفْعَلَا","تُفْعَلُوا","تُفْعَلْنَ","أُفْعَلَ","نُفْعَلَ"],
    majzum:["يُفْعَلْ","تُفْعَلْ","يُفْعَلَا","تُفْعَلَا","يُفْعَلُوا","يُفْعَلْنَ","تُفْعَلْ","تُفْعَلِي","تُفْعَلَا","تُفْعَلُوا","تُفْعَلْنَ","أُفْعَلْ","نُفْعَلْ"],
  },
  amr:["اِفْعَلْ","اِفْعَلِي","اِفْعَلَا","اِفْعَلُوا","اِفْعَلْنَ"],
  masdar:"فَعْل",fail:"فَاعِل",mafool:"مَفْعُول",
};
const AJWAF={root:"ق-و-ل",display:"قَالَ",meaning:"to say",weakType:"أجوف (و)",
  weakNote:"In مجزوم, the weak middle letter و drops: يَقُولُ → يَقُلْ.",
  active:{
    marfu:["يَقُولُ","تَقُولُ","يَقُولَانِ","تَقُولَانِ","يَقُولُونَ","يَقُلْنَ","تَقُولُ","تَقُولِينَ","تَقُولَانِ","تَقُولُونَ","تَقُلْنَ","أَقُولُ","نَقُولُ"],
    mansub:["يَقُولَ","تَقُولَ","يَقُولَا","تَقُولَا","يَقُولُوا","يَقُلْنَ","تَقُولَ","تَقُولِي","تَقُولَا","تَقُولُوا","تَقُلْنَ","أَقُولَ","نَقُولَ"],
    majzum:["يَقُلْ","تَقُلْ","يَقُولَا","تَقُولَا","يَقُولُوا","يَقُلْنَ","تَقُلْ","تَقُولِي","تَقُولَا","تَقُولُوا","تَقُلْنَ","أَقُلْ","نَقُلْ"],
  },
  passive:{
    marfu:["يُقَالُ","تُقَالُ","يُقَالَانِ","تُقَالَانِ","يُقَالُونَ","يُقَلْنَ","تُقَالُ","تُقَالِينَ","تُقَالَانِ","تُقَالُونَ","تُقَلْنَ","أُقَالُ","نُقَالُ"],
    mansub:["يُقَالَ","تُقَالَ","يُقَالَا","تُقَالَا","يُقَالُوا","يُقَلْنَ","تُقَالَ","تُقَالِي","تُقَالَا","تُقَالُوا","تُقَلْنَ","أُقَالَ","نُقَالَ"],
    majzum:["يُقَلْ","تُقَلْ","يُقَالَا","تُقَالَا","يُقَالُوا","يُقَلْنَ","تُقَلْ","تُقَالِي","تُقَالَا","تُقَالُوا","تُقَلْنَ","أُقَلْ","نُقَلْ"],
  },
  amr:["قُلْ","قُولِي","قُولَا","قُولُوا","قُلْنَ"],
  masdar:"قَوْل",fail:"قَائِل",mafool:"مَقُول",
};

// ── FORM RULES ───────────────────────────────────────────────────
const FORM_RULES=[
  {num:"I",  pat:"فَعَلَ",   rule:"Base meaning of the root",            ex:"فَعَلَ",   sentence:"فَعَلَ الرَّجُلُ الخَيْرَ",        sentenceTr:"The man did good",                  color:PURPLE},
  {num:"II", pat:"فَعَّلَ",  rule:"Intensive or causative",              ex:"فَعَّلَ",  sentence:"فَعَّلَ المُعَلِّمُ الدَّرْسَ",    sentenceTr:"The teacher activated the lesson",  color:TEAL},
  {num:"III",pat:"فَاعَلَ",  rule:"Mutual — action toward another",      ex:"فَاعَلَ",  sentence:"فَاعَلَ الرَّجُلُ صَدِيقَهُ",      sentenceTr:"The man acted alongside his friend",color:TEAL},
  {num:"IV", pat:"أَفْعَلَ", rule:"Causative — bring about the action",  ex:"أَفْعَلَ", sentence:"أَفْعَلَ الأَمِيرُ الخَيْرَ",      sentenceTr:"The prince brought about good",     color:CORAL},
  {num:"V",  pat:"تَفَعَّلَ",rule:"Reflexive of II — done to oneself",   ex:"تَفَعَّلَ",sentence:"تَفَعَّلَ العِلْمُ فِي قَلْبِهِ",  sentenceTr:"Knowledge worked into his heart",   color:PINK},
  {num:"VI", pat:"تَفَاعَلَ",rule:"Reciprocal between parties",          ex:"تَفَاعَلَ",sentence:"تَفَاعَلَ الطَّرَفَانِ",           sentenceTr:"The two parties acted mutually",    color:PINK},
  {num:"VII",pat:"اِنْفَعَلَ",rule:"Passive — subject receives action",  ex:"اِنْفَعَلَ",sentence:"اِنْفَعَلَ الشَّيْءُ",            sentenceTr:"The thing was acted upon",          color:AMBER},
  {num:"VIII",pat:"اِفْتَعَلَ",rule:"Reflexive-intensive of I",          ex:"اِفْتَعَلَ",sentence:"اِفْتَعَلَ الفِعْلَ بِجِدٍّ",    sentenceTr:"He performed it with effort",       color:AMBER},
  {num:"IX", pat:"اِفْعَلَّ", rule:"Colours and physical states only",   ex:"اِفْعَلَّ", sentence:"اِفْعَلَّ لَوْنُهُ",              sentenceTr:"Its colour changed",                color:GRAY},
  {num:"X",  pat:"اِسْتَفْعَلَ",rule:"To seek or request the action",   ex:"اِسْتَفْعَلَ",sentence:"اِسْتَفْعَلَ الرَّجُلُ الفِعْلَ",sentenceTr:"The man sought the act",           color:BLUE},
];

// ── ARABIC KEYBOARD OVERLAY ──────────────────────────────────────
const KB_ROWS=[["ض","ص","ث","ق","ف","غ","ع","ه","خ","ح","ج","د"],["ش","س","ي","ب","ل","ا","ت","ن","م","ك","ط"],["ئ","ء","ؤ","ر","لا","ى","ة","و","ز","ظ","ذ"]];
const HARAKAT=["َ","ِ","ُ","ً","ٍ","ٌ","ْ","ّ"];
const KBOverlay=({label,initial,onConfirm,onClose}:{label:string;initial?:string;onConfirm:(v:string)=>void;onClose:()=>void})=>{
  const [val,setVal]=useState(initial||"");
  const [cur,setCur]=useState((initial||"").length);
  const [showH,setShowH]=useState(true);
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
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [checked,setChecked]=useState(false);
  const [overlay,setOverlay]=useState<{key:string;label:string;target:string;store:string;field?:string}|null>(null);
  const [amrPage,setAmrPage]=useState(false);
  const [amrAns,setAmrAns]=useState<Record<string,string>>({});
  const [bottom,setBottom]=useState({masdar:"",fail:"",mafool:""});
  const [bottomChecked,setBottomChecked]=useState(false);
  const ck=(s:string,m:string,i:number)=>`${s}_${m}_${i}`;
  const total=MOODS.length*PRONOUNS.length*2;
  const correct=checked?Object.keys(answers).filter(k=>{const[s,m,i]=k.split("_");return checkAr(answers[k]||"",(data as any)[s][m][parseInt(i)]);}).length:0;
  if(amrPage)return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <Btn onClick={()=>setAmrPage(false)} sm col={GRAY}>← Back</Btn>
        <p style={{fontSize:15,fontWeight:500,color:C.text,margin:0}}>فِعل الأمر — {data.display}</p>
      </div>
      <AccentBar color={TEAL.text}>Only المخاطب pronouns take الأمر — you cannot command an absent person.</AccentBar>
      <Card>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{borderBottom:`0.5px solid ${C.border}`}}>
            <th style={{padding:"6px 10px",color:C.muted,fontWeight:500,textAlign:"left"}}>المخاطب</th>
            <th style={{padding:"6px 10px",color:TEAL.text,fontWeight:500,textAlign:"right"}}>الأمر</th>
            <th style={{padding:"6px 10px",color:C.muted,fontWeight:500,textAlign:"center"}}>Your answer</th>
          </tr></thead>
          <tbody>{AMR_PRONOUNS.map((pr,i)=>{
            const k=`amr_${i}`;const ans=amrAns[k]||"";
            return(<tr key={i} style={{borderBottom:`0.5px solid ${C.border}`}}>
              <td style={{padding:"8px 10px"}}><span style={{direction:"rtl",display:"block",color:C.text,fontSize:14}}>{pr.ar}</span><span style={{fontSize:11,color:C.muted}}>{pr.sub}</span></td>
              <td style={{padding:"8px 10px",textAlign:"right",direction:"rtl",fontSize:16,color:TEAL.text}}>{data.amr[i]}</td>
              <td style={{padding:"4px 8px",textAlign:"center"}}>
                <button onClick={()=>setOverlay({key:k,label:`الأمر — ${pr.ar}`,target:data.amr[i],store:"amr"})}
                  style={{background:ans?PURPLE.bg:C.surface2,border:`0.5px solid ${ans?PURPLE.text:C.border}`,borderRadius:6,padding:"6px 12px",cursor:"pointer",color:ans?PURPLE.text:C.muted,fontSize:14,direction:"rtl",minWidth:80}}>
                  {ans||<span style={{fontSize:11}}>tap to fill</span>}
                </button>
              </td>
            </tr>);
          })}</tbody>
        </table>
      </Card>
      {overlay&&<KBOverlay label={overlay.label} initial={amrAns[overlay.key]||""} onConfirm={v=>{setAmrAns(a=>({...a,[overlay.key]:v}));setOverlay(null);}} onClose={()=>setOverlay(null)}/>}
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
        <div style={{display:"flex",gap:6}}>
          <Btn onClick={()=>{setMode(m=>m==="fill"?"view":"fill");setChecked(false);setAnswers({});}} col={mode==="fill"?TEAL:PURPLE} sm>{mode==="fill"?"View mode":"Fill in"}</Btn>
          {mode==="fill"&&<Btn onClick={()=>setChecked(true)} col={TEAL} sm>Check ✓</Btn>}
          {checked&&<Btn onClick={()=>{setAnswers({});setChecked(false);}} col={AMBER} sm>Reset</Btn>}
        </div>
      </div>
      {(data as any).weakNote&&<AccentBar color={AMBER.text}>{(data as any).weakNote}</AccentBar>}
      {checked&&<div style={{background:PURPLE.bg,borderRadius:8,padding:"8px 14px",marginBottom:10}}><p style={{fontSize:13,color:PURPLE.text,margin:0}}>Score: {correct}/{total} — {Math.round(correct/total*100)}%</p></div>}
      <div style={{overflowX:"auto",marginBottom:12}}>
        <table style={{borderCollapse:"collapse",fontSize:12,minWidth:720}}>
          <thead><tr style={{borderBottom:`0.5px solid ${C.border}`}}>
            <th style={{padding:"6px 8px",color:C.muted,fontWeight:500,textAlign:"left",width:130}}>الضمير</th>
            {MOODS.map(m=><th key={m.key+"a"} style={{padding:"6px 8px",color:TEAL.text,fontWeight:500,textAlign:"right",minWidth:90}}><span style={{direction:"rtl",display:"block"}}>{m.ar}</span><span style={{fontSize:10,color:C.muted}}>معلوم</span></th>)}
            {MOODS.map(m=><th key={m.key+"p"} style={{padding:"6px 8px",color:CORAL.text,fontWeight:500,textAlign:"right",minWidth:90}}><span style={{direction:"rtl",display:"block"}}>{m.ar}</span><span style={{fontSize:10,color:C.muted}}>مجهول</span></th>)}
          </tr></thead>
          <tbody>{PRONOUNS.map((pr,i)=>{
            const gc=gramColor(pr.gram);const isFirst=i===0||PRONOUNS[i-1].gram!==pr.gram;
            return(<tr key={i} style={{borderBottom:`0.5px solid ${C.border}`,background:i%2===0?"transparent":"rgba(255,255,255,0.01)"}}>
              <td style={{padding:"5px 8px",borderLeft:isFirst?`2px solid ${gc.text}`:"2px solid transparent"}}>
                <span style={{direction:"rtl",display:"block",fontSize:14,color:C.text}}>{pr.ar}</span>
                <span style={{fontSize:10,color:gc.text,fontWeight:500}}>{pr.gram}</span>
                <span style={{fontSize:10,color:C.muted,display:"block"}}>{pr.sub}</span>
              </td>
              {MOODS.map(m=>{
                const k=ck("active",m.key,i);const ans=answers[k]||"";const ok=checked?checkAr(ans,data.active[m.key as keyof typeof data.active][i]):null;
                return(<td key={m.key+"a"} style={{padding:"3px 5px"}}>
                  {mode==="fill"?(
                    <button onClick={()=>setOverlay({key:k,label:`معلوم ${m.ar} — ${pr.ar}`,target:data.active[m.key as keyof typeof data.active][i],store:"main"})}
                      style={{width:"100%",background:checked?(ok?TEAL.bg:CORAL.bg):ans?PURPLE.bg:C.surface2,border:`0.5px solid ${checked?(ok?TEAL.text:CORAL.text):ans?PURPLE.text:C.border}`,borderRadius:5,padding:"5px 4px",cursor:"pointer",color:checked?(ok?TEAL.text:CORAL.text):ans?PURPLE.text:C.muted,fontSize:13,direction:"rtl",textAlign:"right",minWidth:70}}>
                      {ans||<span style={{fontSize:10}}>tap</span>}
                    </button>
                  ):(
                    <div style={{direction:"rtl",textAlign:"right",fontSize:14,color:TEAL.text,padding:"5px 6px",background:C.surface2,borderRadius:5}}>{data.active[m.key as keyof typeof data.active][i]}</div>
                  )}
                </td>);
              })}
              {MOODS.map(m=>{
                const k=ck("passive",m.key,i);const ans=answers[k]||"";const ok=checked?checkAr(ans,data.passive[m.key as keyof typeof data.passive][i]):null;
                return(<td key={m.key+"p"} style={{padding:"3px 5px"}}>
                  {mode==="fill"?(
                    <button onClick={()=>setOverlay({key:k,label:`مجهول ${m.ar} — ${pr.ar}`,target:data.passive[m.key as keyof typeof data.passive][i],store:"main"})}
                      style={{width:"100%",background:checked?(ok?TEAL.bg:CORAL.bg):ans?PURPLE.bg:C.surface2,border:`0.5px solid ${checked?(ok?TEAL.text:CORAL.text):ans?PURPLE.text:C.border}`,borderRadius:5,padding:"5px 4px",cursor:"pointer",color:checked?(ok?TEAL.text:CORAL.text):ans?PURPLE.text:C.muted,fontSize:13,direction:"rtl",textAlign:"right",minWidth:70}}>
                      {ans||<span style={{fontSize:10}}>tap</span>}
                    </button>
                  ):(
                    <div style={{direction:"rtl",textAlign:"right",fontSize:14,color:CORAL.text,padding:"5px 6px",background:C.surface2,borderRadius:5}}>{data.passive[m.key as keyof typeof data.passive][i]}</div>
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
      {overlay&&<KBOverlay label={overlay.label} initial={overlay.store==="bottom"?bottom[overlay.field as keyof typeof bottom]||"":overlay.store==="amr"?amrAns[overlay.key]||"":answers[overlay.key]||""}
        onConfirm={v=>{
          if(overlay.store==="bottom")setBottom(b=>({...b,[overlay.field!]:v}));
          else if(overlay.store==="amr")setAmrAns(a=>({...a,[overlay.key]:v}));
          else setAnswers(a=>({...a,[overlay.key]:v}));
          setOverlay(null);
        }}
        onClose={()=>setOverlay(null)}/>}
    </div>
  );
};

// ── FORM RULES TAB ────────────────────────────────────────────────
const FormRulesTab=()=>{
  const [selected,setSelected]=useState<typeof FORM_RULES[0]|null>(null);
  const [showCanvas,setShowCanvas]=useState(false);
  const handleSelect=(f:typeof FORM_RULES[0])=>{const same=selected?.num===f.num;setSelected(same?null:f);setShowCanvas(false);};
  return(
    <div>
      <SL>10 form rules — all use the ف-ع-ل placeholder root</SL>
      <AccentBar>Every form uses the same root so the pattern change is immediately visible. Tap any row to open its full sarf table and example sentence.</AccentBar>
      {selected&&(
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:6}}>
            <Pill label={`Form ${selected.num}`} color={selected.color}/>
            <div style={{display:"flex",gap:6}}>
              <Btn onClick={()=>setShowCanvas(s=>!s)} sm col={showCanvas?GRAY:selected.color}>{showCanvas?"Close canvas ✕":"Practice writing ✏"}</Btn>
              <Btn onClick={()=>{setSelected(null);setShowCanvas(false);}} sm col={GRAY}>Close ✕</Btn>
            </div>
          </div>
          {showCanvas&&(
            <Card style={{marginBottom:10}}>
              <p style={{fontSize:13,fontWeight:500,color:C.text,margin:"0 0 8px"}}>Practice writing: <span style={{direction:"rtl",color:selected.color.text,fontSize:18}}>{selected.pat}</span></p>
              <DrawCanvas targetWord={selected.pat} onResult={()=>setShowCanvas(false)}/>
            </Card>
          )}
          <SarfTable data={STRONG}/>
          <Card style={{marginTop:10}}>
            <p style={{fontSize:13,fontWeight:500,color:C.text,margin:"0 0 6px"}}>Example — Form {selected.num}</p>
            <p style={{fontSize:18,direction:"rtl",color:selected.color.text,margin:"0 0 4px",lineHeight:1.8}}>{selected.sentence}</p>
            <p style={{fontSize:12,color:C.muted,margin:0}}>{selected.sentenceTr}</p>
          </Card>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        {FORM_RULES.map(f=>(
          <button key={f.num} onClick={()=>handleSelect(f)}
            style={{background:selected?.num===f.num?f.color.bg:C.surface,border:`0.5px solid ${selected?.num===f.num?f.color.text:C.border}`,borderRadius:10,padding:"10px 14px",cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,flexWrap:"wrap",gap:6}}>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <Pill label={`Form ${f.num}`} color={f.color}/>
                <span style={{fontSize:17,direction:"rtl",color:f.color.text}}>{f.pat}</span>
                <span style={{fontSize:13,color:C.muted}}>— {f.rule}</span>
              </div>
              <span style={{fontSize:16,direction:"rtl",color:C.text}}>{f.ex}</span>
            </div>
            <p style={{fontSize:12,direction:"rtl",color:C.muted,margin:0,textAlign:"right"}}>{f.sentence} <span style={{color:C.subtle}}>({f.sentenceTr})</span></p>
          </button>
        ))}
      </div>
    </div>
  );
};

// ── DRAWING CANVAS ────────────────────────────────────────────────
const DrawCanvas=({targetWord,onResult}:{targetWord:string;onResult:(r:string)=>void})=>{
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
  const BASELINE=CANVAS_H*0.72;const TOPLINE=CANVAS_H*0.18;
  const drawRulers=(ctx:CanvasRenderingContext2D)=>{
    ctx.save();ctx.setLineDash([6,6]);
    ctx.strokeStyle="rgba(255,255,255,0.12)";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,BASELINE);ctx.lineTo(CANVAS_W,BASELINE);ctx.stroke();
    ctx.strokeStyle="rgba(255,255,255,0.06)";
    ctx.beginPath();ctx.moveTo(0,TOPLINE);ctx.lineTo(CANVAS_W,TOPLINE);ctx.stroke();
    ctx.restore();
  };
  const saveState=()=>{const c=canvasRef.current;if(!c)return;const img=c.getContext("2d")!.getImageData(0,0,c.width,c.height);history.current=history.current.slice(0,historyIdx.current+1);history.current.push(img);historyIdx.current=history.current.length-1;setCanUndo(historyIdx.current>0);setCanRedo(false);};
  const undo=()=>{if(historyIdx.current<=0)return;historyIdx.current--;canvasRef.current!.getContext("2d")!.putImageData(history.current[historyIdx.current],0,0);setCanUndo(historyIdx.current>0);setCanRedo(true);};
  const redo=()=>{if(historyIdx.current>=history.current.length-1)return;historyIdx.current++;canvasRef.current!.getContext("2d")!.putImageData(history.current[historyIdx.current],0,0);setCanUndo(true);setCanRedo(historyIdx.current<history.current.length-1);};
  useEffect(()=>{const c=canvasRef.current;if(!c)return;const ctx=c.getContext("2d")!;drawRulers(ctx);history.current=[ctx.getImageData(0,0,c.width,c.height)];historyIdx.current=0;},[]);
  const getPos=(e:React.MouseEvent|React.TouchEvent,c:HTMLCanvasElement)=>{
    const r=c.getBoundingClientRect();const sx=c.width/r.width;const sy=c.height/r.height;
    if("touches" in e)return{x:(e.touches[0].clientX-r.left)*sx,y:(e.touches[0].clientY-r.top)*sy};
    return{x:((e as React.MouseEvent).clientX-r.left)*sx,y:((e as React.MouseEvent).clientY-r.top)*sy};
  };
  const start=(e:React.MouseEvent|React.TouchEvent)=>{
    e.preventDefault();const c=canvasRef.current!;const ctx=c.getContext("2d")!;const p=getPos(e,c);lastPos.current=p;drawing.current=true;
    ctx.beginPath();ctx.arc(p.x,p.y,tool==="eraser"?12:2.5,0,Math.PI*2);ctx.fillStyle=tool==="eraser"?"#111":"#CECBF6";ctx.fill();
  };
  const move=(e:React.MouseEvent|React.TouchEvent)=>{
    e.preventDefault();if(!drawing.current||!lastPos.current)return;
    const c=canvasRef.current!;const ctx=c.getContext("2d")!;const p=getPos(e,c);
    ctx.beginPath();ctx.moveTo(lastPos.current.x,lastPos.current.y);ctx.lineTo(p.x,p.y);
    ctx.lineWidth=tool==="eraser"?24:4.5;ctx.lineCap="round";ctx.lineJoin="round";
    ctx.strokeStyle=tool==="eraser"?"#111":"#CECBF6";ctx.stroke();lastPos.current=p;
  };
  const end=(e:React.MouseEvent|React.TouchEvent)=>{e.preventDefault();if(drawing.current)saveState();drawing.current=false;lastPos.current=null;};
  const clearCanvas=()=>{const c=canvasRef.current!;const ctx=c.getContext("2d")!;ctx.clearRect(0,0,c.width,c.height);drawRulers(ctx);setChecked(false);setAiResult(null);history.current=[ctx.getImageData(0,0,c.width,c.height)];historyIdx.current=0;setCanUndo(false);setCanRedo(false);};
  const checkWithAI=async()=>{
    const c=canvasRef.current!;const base64=c.toDataURL("image/png").split(",")[1];
    setLoading(true);setChecked(false);setAiResult(null);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true","x-api-key":import.meta.env.VITE_ANTHROPIC_API_KEY||""},
        body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:200,messages:[{role:"user",content:[
          {type:"image",source:{type:"base64",media_type:"image/png",data:base64}},
          {type:"text",text:`The student was trying to write the Arabic word: ${targetWord}. If canvas is blank say BLANK. Otherwise read and compare. Reply:\nRESULT: [CORRECT/CLOSE/WRONG/BLANK]\nREAD: [what you read]\nNOTE: [one short encouraging sentence]`}
        ]}]})
      });
      const data=await res.json();const txt=data.content?.[0]?.text||"";
      setAiResult({result:txt.match(/RESULT:\s*(\w+)/)?.[1]||"UNKNOWN",read:txt.match(/READ:\s*(.+)/)?.[1]||"",note:txt.match(/NOTE:\s*(.+)/)?.[1]||""});
    }catch{setAiResult({result:"ERROR",read:"",note:"Could not connect. Use manual check below."});}
    setLoading(false);setChecked(true);
  };
  const rc=(r:string)=>r==="CORRECT"?TEAL:r==="CLOSE"?AMBER:r==="BLANK"?GRAY:CORAL;
  return(
    <div>
      <div style={{display:"flex",gap:6,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
        <Btn onClick={()=>setShowTarget(s=>!s)} sm col={GRAY}>{showTarget?"Hide target":"Show target"}</Btn>
      </div>
      {showTarget&&<div style={{background:C.surface2,borderRadius:8,padding:"10px 16px",marginBottom:8,textAlign:"center"}}><span style={{fontSize:36,direction:"rtl",color:PURPLE.text,lineHeight:1.8}}>{targetWord}</span></div>}
      <div style={{position:"relative"}}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
          style={{width:"100%",height:CANVAS_H,background:"#111",borderRadius:10,border:`0.5px solid ${C.border}`,cursor:tool==="eraser"?"cell":"crosshair",touchAction:"none",display:"block"}}/>
        <p style={{position:"absolute",bottom:6,right:10,fontSize:10,color:"rgba(255,255,255,0.18)",margin:0,pointerEvents:"none"}}>— baseline</p>
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
const StepBar=({steps,current,completed}:{steps:string[];current:number;completed:number[]})=>(
  <div style={{display:"flex",gap:0,marginBottom:16}}>
    {steps.map((s,i)=>{const done=completed.includes(i);const active=i===current;return(
      <div key={s} style={{flex:1,textAlign:"center"}}>
        <div style={{height:3,background:done?TEAL.text:active?PURPLE.text:C.surface2,transition:"background 0.3s"}}/>
        <p style={{fontSize:10,color:done?TEAL.text:active?PURPLE.text:C.muted,margin:"4px 0 0",fontWeight:active||done?500:400}}>{s}</p>
      </div>
    );})}
  </div>
);

// ── SARF WRITE TABLE ─────────────────────────────────────────────
const AMR_IDX=[6,7,8,9,10];
const SarfWriteTable=({word,onDone}:{word:Verb;onDone:()=>void})=>{
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [checked,setChecked]=useState(false);
  const [overlay,setOverlay]=useState<{key:string;target:string;label:string}|null>(null);
  const isAmr=(i:number)=>AMR_IDX.includes(i);
  const amrForm=(i:number)=>{
    const idx=AMR_IDX.indexOf(i);
    return["اِفْعَلْ","اِفْعَلِي","اِفْعَلَا","اِفْعَلُوا","اِفْعَلْنَ"][idx]||"—";
  };
  const total=PRONOUNS.length*2+AMR_IDX.length;
  const correct=checked?
    PRONOUNS.reduce((acc,_,i)=>acc+(checkAr(answers[`past_${i}`]||"",word.conjugation.past[i])?1:0)+(checkAr(answers[`present_${i}`]||"",word.conjugation.present[i])?1:0),0)
    +AMR_IDX.reduce((acc,i)=>acc+(checkAr(answers[`amr_${i}`]||"",amrForm(i))?1:0),0):0;
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
        <p style={{fontSize:14,fontWeight:500,color:C.text,margin:0}}>Fill in the sarf of <span style={{direction:"rtl",color:PURPLE.text}}>{word.ar}</span></p>
        <div style={{display:"flex",gap:6}}>
          <Btn onClick={()=>setChecked(true)} col={TEAL} sm>Check ✓</Btn>
          {checked&&<Btn onClick={()=>{setAnswers({});setChecked(false);}} col={AMBER} sm>Reset</Btn>}
        </div>
      </div>
      {checked&&<div style={{background:PURPLE.bg,borderRadius:8,padding:"8px 14px",marginBottom:10}}><p style={{fontSize:13,color:PURPLE.text,margin:0}}>Score: {correct}/{total} — {Math.round(correct/total*100)}%</p></div>}
      <div style={{overflowX:"auto",marginBottom:12}}>
        <table style={{borderCollapse:"collapse",fontSize:12,minWidth:360}}>
          <thead><tr style={{borderBottom:`0.5px solid ${C.border}`}}>
            <th style={{padding:"6px 8px",color:C.muted,fontWeight:500,textAlign:"left",minWidth:110}}>الضمير</th>
            <th style={{padding:"6px 8px",color:TEAL.text,fontWeight:500,textAlign:"right",minWidth:90}}>ماضي</th>
            <th style={{padding:"6px 8px",color:PURPLE.text,fontWeight:500,textAlign:"right",minWidth:90}}>مضارع</th>
            <th style={{padding:"6px 8px",color:BLUE.text,fontWeight:500,textAlign:"right",minWidth:90}}>أمر</th>
          </tr></thead>
          <tbody>{PRONOUNS.map((pr,i)=>{
            const gc=gramColor(pr.gram);const isFirst=i===0||PRONOUNS[i-1].gram!==pr.gram;const canAmr=isAmr(i);
            const mkCell=(k:string,target:string)=>{
              const ans=answers[k]||"";const ok=checked?checkAr(ans,target):null;
              return(<td style={{padding:"3px 5px"}}>
                <button onClick={()=>setOverlay({key:k,target,label:`${pr.ar}`})}
                  style={{width:"100%",minWidth:80,background:checked?(ok?TEAL.bg:CORAL.bg):ans?PURPLE.bg:C.surface2,border:`0.5px solid ${checked?(ok?TEAL.text:CORAL.text):ans?PURPLE.text:C.border}`,borderRadius:5,padding:"5px 4px",cursor:"pointer",color:checked?(ok?TEAL.text:CORAL.text):ans?PURPLE.text:C.muted,fontSize:13,direction:"rtl",textAlign:"right"}}>
                  {ans||<span style={{fontSize:10}}>tap</span>}
                </button>
              </td>);
            };
            return(<tr key={i} style={{borderBottom:`0.5px solid ${C.border}`}}>
              <td style={{padding:"5px 8px",borderLeft:isFirst?`2px solid ${gc.text}`:"2px solid transparent"}}>
                <span style={{direction:"rtl",display:"block",fontSize:13,color:C.text}}>{pr.ar}</span>
                <span style={{fontSize:10,color:gc.text}}>{pr.gram} · {pr.sub}</span>
              </td>
              {mkCell(`past_${i}`,word.conjugation.past[i])}
              {mkCell(`present_${i}`,word.conjugation.present[i])}
              <td style={{padding:"3px 5px"}}>
                {canAmr?mkCell(`amr_${i}`,amrForm(i)).props.children:
                  <div style={{textAlign:"center",fontSize:16,color:C.subtle}}>—</div>}
              </td>
            </tr>);
          })}</tbody>
        </table>
      </div>
      <Btn onClick={onDone} col={TEAL} full>Done with sarf ✓ — next</Btn>
      {overlay&&<KBOverlay label={overlay.label} initial={answers[overlay.key]||""} onConfirm={v=>{setAnswers(a=>({...a,[overlay.key]:v}));setOverlay(null);}} onClose={()=>setOverlay(null)}/>}
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
    <StepBar steps={VERB_STEPS} current={0} completed={completed}/>
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
    <StepBar steps={VERB_STEPS} current={1} completed={completed}/>
    <Card><p style={{fontSize:14,fontWeight:500,color:C.text,margin:"0 0 12px"}}>Practice writing: <span style={{direction:"rtl",color:PURPLE.text}}>{word.ar}</span></p>
      <DrawCanvas targetWord={word.ar} onResult={()=>advance(1)}/>
    </Card>
    {isReview&&<Btn onClick={()=>goStep(2)} col={GRAY} sm>Skip to conjugation →</Btn>}
  </div>);
  if(step===2)return(<div>
    <StepBar steps={VERB_STEPS} current={2} completed={completed}/>
    <Card>
      <p style={{fontSize:14,fontWeight:500,color:C.text,margin:"0 0 8px"}}>Conjugation of <span style={{direction:"rtl",color:PURPLE.text}}>{word.ar}</span></p>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:340}}>
          <thead><tr style={{borderBottom:`0.5px solid ${C.border}`}}>
            <th style={{padding:"6px 8px",color:C.muted,textAlign:"left",fontWeight:500}}>الضمير</th>
            <th style={{padding:"6px 8px",color:TEAL.text,textAlign:"right",fontWeight:500}}>ماضي</th>
            <th style={{padding:"6px 8px",color:PURPLE.text,textAlign:"right",fontWeight:500}}>مضارع</th>
          </tr></thead>
          <tbody>{PRONOUNS.map((pr,i)=>{
            const gc=gramColor(pr.gram);const isFirst=i===0||PRONOUNS[i-1].gram!==pr.gram;
            return(<tr key={i} style={{borderBottom:`0.5px solid ${C.border}`}}>
              <td style={{padding:"5px 8px",borderLeft:isFirst?`2px solid ${gc.text}`:"2px solid transparent"}}>
                <span style={{direction:"rtl",display:"block",fontSize:13,color:C.text}}>{pr.ar}</span>
                <span style={{fontSize:10,color:gc.text}}>{pr.gram} · {pr.sub}</span>
              </td>
              <td style={{padding:"5px 8px",textAlign:"right",direction:"rtl",fontSize:14,color:TEAL.text}}>{word.conjugation.past[i]}</td>
              <td style={{padding:"5px 8px",textAlign:"right",direction:"rtl",fontSize:14,color:PURPLE.text}}>{word.conjugation.present[i]}</td>
            </tr>);
          })}</tbody>
        </table>
      </div>
    </Card>
    <Btn onClick={()=>advance(2)} col={PURPLE} full>I have read the conjugation → next</Btn>
  </div>);
  if(step===3)return(<div><StepBar steps={VERB_STEPS} current={3} completed={completed}/><SarfWriteTable word={word} onDone={()=>advance(3)}/></div>);
  if(step===4)return(<div>
    <StepBar steps={VERB_STEPS} current={4} completed={completed}/>
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
  if(step===0)return(<div>
    <StepBar steps={NOUN_STEPS} current={0} completed={completed}/>
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
    <StepBar steps={NOUN_STEPS} current={1} completed={completed}/>
    <Card><p style={{fontSize:14,fontWeight:500,color:C.text,margin:"0 0 12px"}}>Practice writing: <span style={{direction:"rtl",color:TEAL.text}}>{word.ar}</span></p>
      <DrawCanvas targetWord={word.ar} onResult={()=>advance(1)}/>
    </Card>
  </div>);
  if(step===2)return(<div>
    <StepBar steps={NOUN_STEPS} current={2} completed={completed}/>
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
    <StepBar steps={NOUN_STEPS} current={3} completed={completed}/>
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
    <StepBar steps={NOUN_STEPS} current={4} completed={completed}/>
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
            <div style={{display:"flex",gap:6}}><Btn onClick={()=>typed.trim()&&doSubmit(typed)} col={PURPLE}>Check ↗</Btn><Btn onClick={dontKnow} col={AMBER}>لا أعرف</Btn></div>
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
  const TABS=type==="verb"?["Form Rules","Sarf Table","Learn","Quiz","Learned","Guide"]:["Learn","Quiz","Learned","Guide"];
  const [tab,setTab]=useState(0);
  const [sarfVerb,setSarfVerb]=useState("strong");
  const [selectedWord,setSelectedWord]=useState<string|null>(null);
  const [isReview,setIsReview]=useState(false);
  const [wordStep,setWordStep]=useState<Record<string,number>>({});
  const accentCol=type==="verb"?"#AFA9EC":"#9FE1CB";
  const isWordLearned=(id:string)=>{const l=learned[id];return l&&l.learnedSteps&&l.learnedSteps.length>=steps.length;};
  const learnedCount=words.filter(w=>isWordLearned(w.id)).length;
  const learnTabIdx=type==="verb"?2:0;
  const quizTabIdx=type==="verb"?3:1;
  const learnedTabIdx=type==="verb"?4:2;
  const guideTabIdx=type==="verb"?5:3;
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
    {type==="verb"&&tab===1&&(
      <div>
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          <Btn onClick={()=>setSarfVerb("strong")} col={sarfVerb==="strong"?PURPLE:undefined} sm>Strong — فَعَلَ</Btn>
          <Btn onClick={()=>setSarfVerb("ajwaf")} col={sarfVerb==="ajwaf"?TEAL:undefined} sm>Weak أجوف — قَالَ</Btn>
        </div>
        <SarfTable data={sarfVerb==="strong"?STRONG:AJWAF}/>
      </div>
    )}
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
      <p style={{fontSize:13,color:C.muted,margin:0}}>Learn · Write · Quiz · Ebbinghaus SRS</p>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,width:"100%",maxWidth:480}}>
      {[{mode:"verb",ar:"فَعَلَ",label:"Verbs",sub:"Form Rules · Sarf · Learn · Quiz",accent:"#AFA9EC"},{mode:"noun",ar:"اِسْم",label:"Nouns",sub:"Learn · Plurals · Synonyms · Quiz",accent:"#9FE1CB"}].map(o=>(
        <button key={o.mode} onClick={()=>onSelect(o.mode)} style={{background:C.surface,border:`0.5px solid ${C.border}`,borderTop:`3px solid ${o.accent}`,borderRadius:12,padding:"2rem 1.5rem",cursor:"pointer",textAlign:"center"}}>
          <p style={{fontSize:28,margin:"0 0 10px",direction:"rtl",color:o.accent}}>{o.ar}</p>
          <p style={{fontSize:15,fontWeight:500,color:C.text,margin:"0 0 6px"}}>{o.label}</p>
          <p style={{fontSize:12,color:C.muted,margin:0,lineHeight:1.5}}>{o.sub}</p>
        </button>
      ))}
    </div>
    <p style={{fontSize:11,color:C.subtle,maxWidth:400}}>Add words in <code style={{color:TEAL.text}}>src/words/verbs.ts</code> and <code style={{color:TEAL.text}}>src/words/nouns.ts</code></p>
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
      <div style={{maxWidth:820,margin:"0 auto",padding:"1.5rem 1rem 4rem"}}>
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
