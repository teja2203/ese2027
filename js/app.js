/* ════════════════════════════════════════════════════════════
   ESE2027 Study OS — app.js
   Views: Home · Plan · Focus · Stats · Settings
   Schedule data lives in js/data.js (verbatim user prep plan).
   ════════════════════════════════════════════════════════════ */
"use strict";
const APP_VERSION="v51";

/* ── storage ─────────────────────────────────────────── */
const STORAGE_KEY="ese_planner_checked_v3", IDX_KEY="ese_planner_index_v9",
      NAV_KEY="ese_planner_nav_v1", POMO_KEY="ese_planner_pomo_v5",
      LOG_KEY="ese_planner_log_v1", THEME_KEY="THEME", EXP_KEY="expandedSessions",
      ACH_KEY="ese_achievements_v1", CELEB_KEY="ese_celebrated_days_v1", NOTIF_KEY="ese_notif_v1", BLOCK_KEY="ese_block_v1",
      MOCK_KEY="ese_mocks_v1", SHAKY_KEY="ese_shaky_v1", RATE_KEY="ese_ratings_v1", FREEZE_KEY="ese_freeze_v1", BKUP_KEY="ese_last_backup_v1",
      SOUND_KEY="ese_sound_v1", REST_KEY="ese_rest_v1", RESTED_KEY="ese_rested_v1";
function loadJSON(k,f){ try{ const r=localStorage.getItem(k); return r===null?f:JSON.parse(r);}catch(e){ return f; } }
function saveJSON(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }

/* ── tag + subject styling — monochrome, red = stakes ───
   tier 2 = high-stakes (mock/PYQ) → solid red
   tier 1 = core subject work      → dim red
   tier 0 = revision / recovery    → grey            */
const TAGS={
ctrl:{label:"Controls",  t:1},
edc:{label:"EDC",        t:1},
dig:{label:"Digital",    t:1},
emft:{label:"EMFT",      t:1},
mat:{label:"Material Sci",t:1},
mpmc:{label:"MPMC",      t:1},
comm:{label:"Comm",      t:1},
sig:{label:"Signals",    t:1},
ana:{label:"Analogs",    t:1},
coa:{label:"COA",        t:1},
meas:{label:"Measurements",t:1},
net:{label:"Networks",   t:1},
pyq:{label:"PYQ",        t:2},
rev:{label:"Revision",   t:0},
mock:{label:"Mock Test", t:2},
};
const tagOf=t=>TAGS[t]||TAGS.rev;
function badgeTier(b){
const HOT=["MOCK","GRAND TEST","MOCK MARATHON","ESE EXAM DAY","APTRANSCO EXAM","EXAM PREP","APTRANSCO SPRINT","PYQ SPRINT"];
const REST=["REVISION","RECOVERY","TAPER"];
if(HOT.includes(b)) return "hot";
if(REST.includes(b)) return "rest";
return "core";
}

/* ── countdowns ───────────────────────────────────────── */
const APT_DATE=new Date("2026-08-22T09:00:00");
const ESE_DATE=new Date("2027-01-31T09:00:00");
function cd(t){ const d=t-Date.now(); if(d<=0) return {d:0,h:0,m:0};
return {d:Math.floor(d/864e5),h:Math.floor(d%864e5/36e5),m:Math.floor(d%36e5/6e4)}; }

/* ── state ────────────────────────────────────────────── */
const PRESETS=[{label:"25 · 5",work:25,brk:5},{label:"50 · 10",work:50,brk:10},{label:"90 · 20",work:90,brk:20}];
function normalizePomo(p){
const d={phase:"work",running:false,targetTs:null,timeLeft:50*60,workMins:50,breakMins:10,loop:true,logged:0,docked:true};
if(!p||typeof p!=="object") return d;
return Object.assign(d,p);
}
/* ── theme suits ─────────────────────────────────────────
   Each suit is a full palette defined in css/app.css under
   html[data-theme="<id>"]. Adding one here + a CSS block is
   all that's needed; the picker builds itself from THEMES. */
const THEMES=[
{id:"ember", name:"Mono Black", desc:"OLED black · red signal", meta:"#000000",
 sw:["#D71921","#000000","#0A0A0A","#F5F5F2"]},
{id:"lime", name:"Glyph Lime", desc:"Black · lime signal", meta:"#000000",
 sw:["#9EEB3B","#000000","#0A0A0A","#F5F5F2"]},
{id:"ice", name:"Arctic Ice", desc:"Black · ice-blue signal", meta:"#000000",
 sw:["#7FB8D9","#000000","#0A0A0A","#F5F5F2"]},
{id:"paper", name:"Mono White", desc:"Ceramic white · red signal", meta:"#F0EEE9",
 sw:["#C11218","#F0EEE9","#FAF9F6","#1A1A18"]}
];
const THEME_IDS=THEMES.map(t=>t.id);
/* migrate the old binary dark/light preference */
function loadTheme(){
  const v=loadJSON(THEME_KEY,"ember");
  if(v==="dark") return "ember";
  if(v==="light") return "paper";
  return THEME_IDS.includes(v)?v:"ember";
}
function themeMeta(id){ const t=THEMES.find(x=>x.id===id); return t?t.meta:"#000000"; }
function isLightTheme(id){ return id==="paper"; }

const state={
nav:loadJSON(NAV_KEY,"today"),
index:loadJSON(IDX_KEY,0),
checked:loadJSON(STORAGE_KEY,{}),
pomo:normalizePomo(loadJSON(POMO_KEY,null)),
log:loadJSON(LOG_KEY,{}),
theme:loadTheme(),
expandedSessions:loadJSON(EXP_KEY,{}),
achievements:loadJSON(ACH_KEY,{}),
celebratedDays:loadJSON(CELEB_KEY,{}),
notif:loadJSON(NOTIF_KEY,true),
block:loadJSON(BLOCK_KEY,{strict:false}),
mocks:loadJSON(MOCK_KEY,[]),
shaky:loadJSON(SHAKY_KEY,{}),
ratings:loadJSON(RATE_KEY,{}),
freeze:loadJSON(FREEZE_KEY,{}),
sound:loadJSON(SOUND_KEY,true),
restDayBank:loadJSON(REST_KEY,7),
restedDays:loadJSON(RESTED_KEY,[]),
};
if(state.index<0||state.index>=SCHED.length) state.index=0;

/* ── Web Audio Synth (Focus Sounds) ─────────────────── */
let audioCtx = null;
let soundNodes = { noise: null, gain: null, osc1: null, osc2: null };
let currentSoundMode = loadJSON("ese_sound_mode", "off");
/* migrate old mode names → reset to off if stale */
if (!["off","gamma40","beta17","alpha10"].includes(currentSoundMode)) currentSoundMode = "off";
let soundVolume = loadJSON("ese_sound_vol", 0.4);

function initAudioContext(){
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function stopFocusSound(){
  try {
    if (soundNodes.noise) { soundNodes.noise.stop(); soundNodes.noise.disconnect(); soundNodes.noise = null; }
    if (soundNodes.osc1) { soundNodes.osc1.stop(); soundNodes.osc1.disconnect(); soundNodes.osc1 = null; }
    if (soundNodes.osc2) { soundNodes.osc2.stop(); soundNodes.osc2.disconnect(); soundNodes.osc2 = null; }
    if (soundNodes.gain) { soundNodes.gain.disconnect(); soundNodes.gain = null; }
  } catch(e){}
}

function playFocusSound(mode, vol){
  stopFocusSound();
  if (mode === "off") return;
  initAudioContext();
  if (!audioCtx) return;

  try {
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = vol !== undefined ? vol : soundVolume;
    masterGain.connect(audioCtx.destination);
    soundNodes.gain = masterGain;

    /* ── binaural beats ───────────────────────────────────────────
       Left ear: carrier tone at BASE Hz
       Right ear: carrier + beat frequency
       Brain perceives the difference as an internal beat pulse.
       Requires headphones for the effect; still pleasant on speakers.
       gamma40 : 40 Hz  — deep focus, working memory, information binding
       beta17  : 17 Hz  — alert concentration, active study
       alpha10 : 10 Hz  — relaxed focus, stress reduction, calm clarity  */
    const BEATS = { gamma40: 40, beta17: 17, alpha10: 10 };
    const beat = BEATS[mode];
    if (beat === undefined) return;

    const BASE = 200;           /* carrier: low enough to be unobtrusive */
    const osc1 = audioCtx.createOscillator(); /* left ear  */
    const osc2 = audioCtx.createOscillator(); /* right ear */
    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.value = BASE;
    osc2.frequency.value = BASE + beat;

    /* hard-pan L/R — binaural effect requires each tone in one ear */
    const panL = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
    const panR = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
    if (panL) { panL.pan.value = -1; osc1.connect(panL).connect(masterGain); }
    else osc1.connect(masterGain);
    if (panR) { panR.pan.value =  1; osc2.connect(panR).connect(masterGain); }
    else osc2.connect(masterGain);

    osc1.start(); osc2.start();
    soundNodes.osc1 = osc1;
    soundNodes.osc2 = osc2;
  } catch(e){ console.error("Audio error:", e); }
}

function setFocusSoundMode(mode){
  currentSoundMode = mode;
  saveJSON("ese_sound_mode", mode);
  playFocusSound(mode, soundVolume);
}

const RANKER_QUOTES = [
  { q: "Consistent daily execution is the difference between an aspirant and Rank 1.", a: "ESE Topper Insight" },
  { q: "Solve 10 PYQs today. Build momentum. Victory will take care of itself.", a: "Mastery Principle" },
  { q: "Small daily improvements over time lead to stunning long-term results.", a: "Robin Sharma" },
  { q: "Focus is a muscle. Train it with 50-minute deep work blocks.", a: "Deep Work Protocol" },
  { q: "Your future is created by what you do today, not tomorrow.", a: "Robert Kiyosaki" }
];
let quoteIndex = loadJSON("ese_quote_idx", 0);
function nextQuote(){
  quoteIndex = (quoteIndex + 1) % RANKER_QUOTES.length;
  saveJSON("ese_quote_idx", quoteIndex);
  render();
}

/* ── helpers ──────────────────────────────────────────── */
const view=document.getElementById("view"), navEl=document.getElementById("nav");
function el(tag,styles){ const e=document.createElement(tag); if(styles) Object.assign(e.style,styles); return e; }
function html(h){ const d=document.createElement("div"); d.innerHTML=h; return d.firstElementChild||d; }
function toast(msg){ const t=document.getElementById("toast"); t.textContent=msg;
t.classList.add("show"); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove("show"),2200); }
function fmt(n){ return String(n).padStart(2,"0"); }
function fmtTime(s){ return `${fmt(Math.floor(s/60))}:${fmt(s%60)}`; }
function todayKey(){ const d=new Date(); return `${d.getFullYear()}-${fmt(d.getMonth()+1)}-${fmt(d.getDate())}`; }
function todayDateLabel(){ const d=new Date(); return MON[d.getMonth()]+" "+d.getDate(); }
function dayStats(i){ const d=SCHED[i];
const tot=d.sessions.reduce((a,s)=>a+s.tasks.length,0);
const dn=d.sessions.reduce((a,s,si)=>a+s.tasks.filter((_,ti)=>state.checked[`${i}-${si}-${ti}`]).length,0);
return {tot,dn,pct:tot?Math.round(dn/tot*100):0}; }
function overall(){ const tot=SCHED.reduce((a,d)=>a+d.sessions.reduce((b,s)=>b+s.tasks.length,0),0);
const dn=Object.values(state.checked).filter(Boolean).length;
return {tot,dn,pct:tot?Math.round(dn/tot*100):0}; }
function doneDaysCount(){ let n=0; for(let i=0;i<SCHED.length;i++){ const s=dayStats(i); if(s.tot&&s.dn===s.tot) n++; } return n; }
function computeStreak(){
let streak=0, frozenInStreak=false;
const d=new Date();
for(;;){ const k=`${d.getFullYear()}-${fmt(d.getMonth()+1)}-${fmt(d.getDate())}`;
const e=state.log[k];
if(e&&(e.minutes>0||e.sessions>0)) streak++;
else if(state.freeze[k]){ streak++; frozenInStreak=true; }  /* frozen day keeps the chain */
else if(streak===0&&k===todayKey()){ /* today not started yet — look back */ }
else break;
d.setDate(d.getDate()-1); }
return {count:streak, hasFrozen:frozenInStreak}; }
/* one streak-freeze token per calendar month, auto-spent on a missed day */
function maybeSpendFreeze(){
const y=new Date(); y.setDate(y.getDate()-1);
const yk=`${y.getFullYear()}-${fmt(y.getMonth()+1)}-${fmt(y.getDate())}`;
const e=state.log[yk];
if(e&&(e.minutes>0||e.sessions>0)) return;              /* yesterday was studied */
if(state.freeze[yk]) return;                            /* already frozen */
/* was there a streak worth saving before yesterday? */
const b=new Date(y); b.setDate(b.getDate()-1);
const bk=`${b.getFullYear()}-${fmt(b.getMonth()+1)}-${fmt(b.getDate())}`;
const be=state.log[bk];
if(!(be&&(be.minutes>0||be.sessions>0))&&!state.freeze[bk]) return;
const mon=yk.slice(0,7);
const used=Object.keys(state.freeze).some(k=>k.slice(0,7)===mon);
if(used) return;                                        /* token already spent this month */
state.freeze[yk]=true; saveJSON(FREEZE_KEY,state.freeze);
setTimeout(()=>toast("Streak freeze used for "+yk.slice(5)+" — one per month"),1200); }

/* ── rest days — shift the remaining plan forward ─────── */
function parsePlanDate(s){ const p=s.split(" "); const mi=MON.indexOf(p[0]); const y=mi>=6?2026:2027; return new Date(y,mi,parseInt(p[1],10)); }
function effDateLabel(i){ const b=parsePlanDate(SCHED[i].date); const sh=state.restedDays.filter(r=>r.i<=i).length; b.setDate(b.getDate()+sh); return MON[b.getMonth()]+" "+b.getDate(); }
function isRestToday(){ return state.restedDays.some(r=>r.d===todayKey()); }
function findTodayIndex(){ const t=todayDateLabel(); for(let i=0;i<SCHED.length;i++){ if(effDateLabel(i)===t) return i; } return -1; }

/* ── mock test scores ─────────────────────────────────── */
function addMockSheet(){
const prevFocus=document.activeElement;
const scrim=el("div"); scrim.className="scrim";
scrim.setAttribute("role","dialog"); scrim.setAttribute("aria-modal","true"); scrim.setAttribute("aria-label","Log mock score");
const sheet=el("div"); sheet.className="sheet";
const inp=(id,ph,type,attrs)=>`<input id="${id}" type="${type||"text"}" placeholder="${ph}" ${attrs||""} style="width:100%;box-sizing:border-box;margin-top:10px;padding:13px 15px;border-radius:13px;border:1px solid var(--line-2);background:var(--card-2);color:var(--ink);font-size:14px;outline:none">`;
sheet.innerHTML=`<div style="padding:22px">
<div class="display" style="font-size:19px;font-weight:800;color:var(--ink)">Log mock score</div>
${inp("mkName","Mock name (e.g. GT-3 Full Syllabus)")}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
${inp("mkScore","Marks scored","number",'inputmode="decimal"')}
${inp("mkMax","Out of (e.g. 200)","number",'inputmode="decimal" value="200"')}
</div>
${inp("mkNeg","Marks lost to negatives (optional)","number",'inputmode="decimal"')}
${inp("mkNote","Weak areas noted (optional)")}
<div id="mkErr" style="font-size:12px;color:var(--acc);margin-top:8px;min-height:15px"></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">
<button id="mkCancel" class="btn btn-ghost press">Cancel</button>
<button id="mkSave" class="btn btn-acc press">Save</button>
</div></div>`;
function close(){ scrim.classList.remove("in"); setTimeout(()=>{ scrim.remove(); if(prevFocus&&prevFocus.focus) prevFocus.focus(); },200); }
sheet.querySelector("#mkCancel").onclick=close;
scrim.onclick=e=>{ if(e.target===scrim) close(); };
sheet.querySelector("#mkSave").onclick=()=>{
const name=sheet.querySelector("#mkName").value.trim();
const sc=parseFloat(sheet.querySelector("#mkScore").value);
const mx=parseFloat(sheet.querySelector("#mkMax").value)||200;
const ng=parseFloat(sheet.querySelector("#mkNeg").value)||0;
const note=sheet.querySelector("#mkNote").value.trim();
if(!name||isNaN(sc)){ sheet.querySelector("#mkErr").textContent="Name and marks are required"; return; }
state.mocks.push({name,score:sc,max:mx,neg:ng,note,date:todayKey()});
saveJSON(MOCK_KEY,state.mocks); close(); render(); toast("Mock logged"); checkAchievements(); };
scrim.appendChild(sheet); document.body.appendChild(scrim);
requestAnimationFrame(()=>{ scrim.classList.add("in"); sheet.querySelector("#mkName").focus(); }); }
function deleteMock(i){ if(!confirm("Delete this mock entry?")) return;
state.mocks.splice(i,1); saveJSON(MOCK_KEY,state.mocks); render(); }

/* ── weak-topic (shaky) flags ─────────────────────────── */
function toggleShaky(si,ti){
const k=`${state.index}-${si}-${ti}`;
if(state.shaky[k]) delete state.shaky[k];
else state.shaky[k]={t:SCHED[state.index].sessions[si].tasks[ti],subj:SCHED[state.index].subject,d:SCHED[state.index].date};
saveJSON(SHAKY_KEY,state.shaky);
toast(state.shaky[k]?"Marked shaky — added to revision queue":"Removed from revision queue");
renderQuiet(); }

/* ── daily self-rating ────────────────────────────────── */
function maybeAskRating(){
const k=todayKey();
if(state.ratings[k]!==undefined) return;
const e=state.log[k];
if(!e||!e.minutes) return;                              /* nothing studied — nothing to rate */
if(new Date().getHours()<21) return;                    /* only from 9pm */
const prevFocus=document.activeElement;
const scrim=el("div"); scrim.className="scrim";
scrim.setAttribute("role","dialog"); scrim.setAttribute("aria-modal","true"); scrim.setAttribute("aria-label","Rate today");
const sheet=el("div"); sheet.className="sheet";
sheet.innerHTML=`<div style="padding:24px;text-align:center">
<div class="display" style="font-size:19px;font-weight:800;color:var(--ink)">How was today's study?</div>
<div style="font-size:12px;color:var(--ink-3);margin-top:6px">${e.minutes} min · ${e.sessions} sessions — honest rating, just for you</div>
<div style="display:flex;gap:8px;justify-content:center;margin-top:18px">
${[1,2,3,4,5].map(n=>`<button data-r="${n}" class="press" style="width:52px;height:52px;border-radius:16px;border:1px solid var(--line-2);background:var(--card-2);font-size:22px;cursor:pointer">${["😞","😕","😐","🙂","🔥"][n-1]}</button>`).join("")}
</div>
<button id="rtSkip" style="margin-top:16px;background:none;border:none;color:var(--ink-4);font-size:12px;cursor:pointer;font-weight:600">Skip tonight</button>
</div>`;
function close(){ scrim.classList.remove("in"); setTimeout(()=>{ scrim.remove(); if(prevFocus&&prevFocus.focus) prevFocus.focus(); },200); }
sheet.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{
state.ratings[k]=parseInt(b.dataset.r,10); saveJSON(RATE_KEY,state.ratings); close(); toast("Logged. Rest well."); });
sheet.querySelector("#rtSkip").onclick=()=>{ state.ratings[k]=null; saveJSON(RATE_KEY,state.ratings); close(); };
scrim.onclick=e=>{ if(e.target===scrim) close(); };
scrim.appendChild(sheet); document.body.appendChild(scrim);
requestAnimationFrame(()=>scrim.classList.add("in")); }
function greeting(){ const h=new Date().getHours();
if(h<5) return "Late night grind"; if(h<12) return "Good morning";
if(h<17) return "Good afternoon"; if(h<21) return "Good evening"; return "Night session"; }
const QUOTES=[
"Discipline is choosing what you want most over what you want now.",
"The exam is won in the daily sessions, not on exam day.",
"Small consistent steps beat heroic bursts.",
"You don't need motivation. You need momentum.",
"Every solved PYQ is a point you won't lose again.",
"Focus on the process — ranks follow.",
"One day, or day one. You decide.",
"Your future self is watching this session.",
"Consistency compounds. Keep showing up.",
"Hard now. Easy on Jan 31.",
"Somewhere, your competition just hit snooze. You didn't.",
"The syllabus doesn't shrink by staring at it.",
"A 90-minute session today is worth more than a 12-hour plan tomorrow.",
"Toppers aren't smarter. They're just still at the desk.",
"Every formula you revise tonight is a mark you keep forever.",
"You can rest after the slot — not instead of it.",
"The rank list doesn't care about your mood.",
"Weak topics don't fix themselves. Flag them, face them, finish them.",
"Mocks don't judge you. They prepare you.",
"Study like your posting depends on it — because it does.",
"The chair is the battlefield. Sit down and win.",
"Distraction is a loan. The interest is due in January.",
"You've already done harder things than today's session.",
"Green on the heat map or excuses in your head. Pick one.",
"An engineer's service begins with a student's discipline.",
"Nobody remembers the days you almost studied.",
"The gap between you and the rank closes one session at a time.",
"Today's 8 hours is tomorrow's interview call.",
"Don't count the days. Make the days count — then count them anyway.",
"Your streak is proof you can trust yourself.",
];
function dailyQuote(){ const n=new Date(); return QUOTES[(n.getFullYear()*372+n.getMonth()*31+n.getDate())%QUOTES.length]; }

/* ── icons ────────────────────────────────────────────── */
const IC={
home:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>',
plan:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="17" rx="3"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18"/><path d="m9 15 2 2 4-4"/></svg>',
focus:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9.5V13l2.5 2.5"/><path d="M9.5 2.5h5"/></svg>',
stats:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/></svg>',
settings:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/></svg>',
check:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="m4.5 12.5 5 5 10-11"/></svg>',
flame:'<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c4.4 0 7.5-2.9 7.5-7.2 0-3.4-2.1-5.6-3.7-7.4C14.3 5.7 13 4.3 13 2c-3.5 1.6-5 4.6-5 7 0 1.1.3 2 .3 2S6 10 6 7.5C4.7 9.1 4 11.6 4 13.6 4 18.6 7.6 22 12 22Z"/></svg>',
bolt:'<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/></svg>',
left:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
right:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
play:'<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5L7 4.5Z"/></svg>',
pause:'<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="5.5" y="4.5" width="4.5" height="15" rx="1.4"/><rect x="14" y="4.5" width="4.5" height="15" rx="1.4"/></svg>',
reset:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
skip:'<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M5 4.5v15l10-7.5L5 4.5Z"/><rect x="16.5" y="4.5" width="3" height="15" rx="1.2"/></svg>',
sun:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.4"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"/></svg>',
moon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/></svg>',
trophy:'<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6 3h12v2h3v3c0 2.5-1.9 4.5-4.3 4.9A6 6 0 0 1 13 16v2.2h3.4V21H7.6v-2.8H11V16a6 6 0 0 1-3.7-3.1C4.9 12.5 3 10.5 3 8V5h3V3Zm-1 4v1c0 1.3.8 2.4 2 2.8V7H5Zm14 0h-2v3.8c1.2-.4 2-1.5 2-2.8V7Z"/></svg>',
head:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a8 8 0 0 1 16 0"/><rect x="3" y="13.5" width="4" height="6" rx="1.6"/><rect x="17" y="13.5" width="4" height="6" rx="1.6"/></svg>',
cmd:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6Z"/></svg>',
clock:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9.5V13l2.5 2.5"/><path d="M9.5 2.5h5"/></svg>',
gear:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.4 5.4l1.7 1.7M16.9 16.9l1.7 1.7M5.4 18.6l1.7-1.7M16.9 7.1l1.7-1.7"/></svg>',
stop:'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2.4"/></svg>',
expand:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6"/></svg>',
warn:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9.5v4.5M12 17.2v.2"/></svg>',
lock:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>',
};

/* ── pomodoro engine ──────────────────────────────────── */
let pomoInterval=null, lastFlipMin=null, lastFlipSec=null;
function phaseSecs(){ return (state.pomo.phase==="work"?state.pomo.workMins:state.pomo.breakMins)*60; }
function getRemainingPomo(){
if(state.pomo.running&&state.pomo.targetTs) return Math.max(0,Math.round((state.pomo.targetTs-Date.now())/1000));
return Math.min(state.pomo.timeLeft??phaseSecs(),phaseSecs()); }
function syncPomoState(){
if(state.pomo.running){
const r=getRemainingPomo();
if(r<=0) completePhase(); else startPomoInterval();
} }
function startPomoInterval(){ stopPomoInterval(); pomoInterval=setInterval(tick,500); }
function stopPomoInterval(){ if(pomoInterval){ clearInterval(pomoInterval); pomoInterval=null; } }
function tick(){
const r=getRemainingPomo();
if(r<=0){ completePhase(); return; }
bankProgress();
renderTimerOnly(); renderTimerDock(); }
/* minute-by-minute banking: minutes are logged as they are earned, not on completion.
   pomo.logged = minutes already banked for the current work phase. */
function addMinutes(mins){
if(mins<=0) return;
const k=todayKey(); const e=state.log[k]||{sessions:0,minutes:0};
e.minutes+=mins;
const si=currentSlotIndex();
if(si>=0){ e.slotHits=e.slotHits||{}; e.slotHits[si]=true; }
state.log[k]=e; saveJSON(LOG_KEY,state.log); }
function bankProgress(){
if(state.pomo.phase!=="work") return;
const secs=phaseSecs(), remain=getRemainingPomo();
const elapsed=Math.floor(Math.max(0,secs-remain)/60);
const delta=elapsed-(state.pomo.logged||0);
if(delta>0){ addMinutes(delta); state.pomo.logged=elapsed; saveJSON(POMO_KEY,state.pomo); } }
function logSession(mins){
const k=todayKey(); const e=state.log[k]||{sessions:0,minutes:0};
e.sessions+=1;
const remainder=mins-(state.pomo.logged||0);
if(remainder>0) e.minutes+=remainder;
const si=currentSlotIndex();
if(si>=0){ e.slotHits=e.slotHits||{}; e.slotHits[si]=true; }
state.log[k]=e; saveJSON(LOG_KEY,state.log);
state.pomo.logged=0; }
/* ── sounds (WebAudio synth — no files, works offline) ── */
let _actx=null;
function actx(){
if(!_actx){ try{ _actx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; } }
if(_actx&&_actx.state==="suspended"){ try{ _actx.resume(); }catch(e){} }
return _actx; }
/* unlock audio on first user gesture (mobile autoplay policy) */
document.addEventListener("pointerdown",function unlock(){ actx(); document.removeEventListener("pointerdown",unlock); },{once:true,capture:true});
function tone(ctx,t0,freq,dur,type,vol,dest){
const o=ctx.createOscillator(), g=ctx.createGain();
o.type=type||"sine"; o.frequency.value=freq;
g.gain.setValueAtTime(0.0001,t0);
g.gain.exponentialRampToValueAtTime(vol||0.18,t0+0.02);
g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);  o.connect(g); g.connect(dest||ctx.destination);
  o.start(t0); o.stop(t0+dur+0.05); }
/* brass — sawtooth through a lowpass with a quick pitch bend + vibrato:
   a cheap, convincing trumpet/ta-da timbre with zero audio files */
function brass(ctx,t0,freq,dur,vol){
  const o=ctx.createOscillator(), g=ctx.createGain(), f=ctx.createBiquadFilter();
  o.type="sawtooth"; o.frequency.value=freq;
  f.type="lowpass"; f.frequency.value=freq*6; f.Q.value=1.4;
  g.gain.setValueAtTime(0.0001,t0);
  g.gain.exponentialRampToValueAtTime(vol||0.16,t0+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  o.connect(f); f.connect(g); g.connect(ctx.destination);
  o.frequency.setValueAtTime(freq*0.96,t0);
  o.frequency.linearRampToValueAtTime(freq,t0+0.04);
  const lfo=ctx.createOscillator(), lg=ctx.createGain();
  lfo.frequency.value=5.5; lg.gain.value=freq*0.012;
  lfo.connect(lg); lg.connect(o.frequency);
  lfo.start(t0); lfo.stop(t0+dur);
  o.start(t0); o.stop(t0+dur+0.05); }
function playSound(kind){
if(!state.sound) return;
const ctx=actx(); if(!ctx) return;
const t=ctx.currentTime+0.03;
if(kind==="start"){
/* rising three-note arpeggio with shimmer — lock in */
tone(ctx,t,392,.3,"sine",.13); tone(ctx,t+.14,523.25,.3,"sine",.15);
tone(ctx,t+.28,783.99,.55,"sine",.17); tone(ctx,t+.28,1567.98,.4,"sine",.05);
tone(ctx,t+.42,1046.5,.5,"sine",.06);
}else if(kind==="stop"){
/* mirrored descend with soft tail — winding down */
tone(ctx,t,783.99,.28,"sine",.14); tone(ctx,t+.14,523.25,.3,"sine",.14);
tone(ctx,t+.28,392,.65,"sine",.15); tone(ctx,t+.28,196,.6,"sine",.05);
}else if(kind==="complete"){
/* full victory phrase: rising triad, resolving chord, sparkle tail */
tone(ctx,t,523.25,.32,"sine",.15); tone(ctx,t+.16,659.25,.32,"sine",.15);
tone(ctx,t+.32,783.99,.5,"sine",.17);
[523.25,659.25,783.99,1046.5].forEach(f=>tone(ctx,t+.55,f,.9,"triangle",.09));
tone(ctx,t+.75,1567.98,.5,"sine",.07); tone(ctx,t+.95,2093,.6,"sine",.05);
}else if(kind==="break"){
/* gentle three-note descend, warm tail — breathe */
tone(ctx,t,783.99,.3,"sine",.13); tone(ctx,t+.18,659.25,.3,"sine",.13);
tone(ctx,t+.36,523.25,.7,"sine",.15); tone(ctx,t+.36,261.63,.7,"sine",.05);
  }else if(kind==="fanfare"||kind==="achievement"){
  /* trumpet fanfare — brass ta-da: short short short LOOOONG */
  brass(ctx,t,392,.16,.15); brass(ctx,t+.13,523.25,.16,.15);
  brass(ctx,t+.26,659.25,.16,.15); brass(ctx,t+.39,783.99,.62,.17);
  brass(ctx,t+.39,392,.62,.08); brass(ctx,t+.56,1046.5,.3,.12);
  tone(ctx,t+.9,1567.98,.5,"sine",.06); tone(ctx,t+1.08,2093,.6,"sine",.05);
  }else if(kind==="day"){
  /* brighter ascending trumpet: C E G C, held top note + chord */
  brass(ctx,t,523.25,.2,.15); brass(ctx,t+.16,659.25,.2,.15);
  brass(ctx,t+.32,783.99,.2,.15); brass(ctx,t+.48,1046.5,.7,.18);
  [523.25,659.25,783.99,1046.5].forEach(f=>brass(ctx,t+.48,f,.7,.06));
  tone(ctx,t+.9,2093,.6,"sine",.05);
  }else if(kind==="shatter"){
  /* ice crack — glassy noise burst, high shard plinks, low thud */
  const sd=.09;
  const sbuf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*sd),ctx.sampleRate);
  const sch=sbuf.getChannelData(0);
  for(let i=0;i<sch.length;i++) sch[i]=(Math.random()*2-1)*Math.pow(1-i/sch.length,1.5);
  const sns=ctx.createBufferSource(); sns.buffer=sbuf;
  const sbf=ctx.createBiquadFilter(); sbf.type="highpass"; sbf.frequency.value=1700;
  const sg=ctx.createGain(); sg.gain.setValueAtTime(.22,t);
  sg.gain.exponentialRampToValueAtTime(.0001,t+sd);
  sns.connect(sbf); sbf.connect(sg); sg.connect(ctx.destination); sns.start(t);
  [2500,2000,1600,1200].forEach((f,i)=>tone(ctx,t+.025+i*.045,f,.09,"sine",.075));
  tone(ctx,t+.06,900,.07,"sine",.06); tone(ctx,t,100,.13,"sine",.12);
  }else if(kind==="flip"){
/* mechanical flip-clock tick — filtered noise snap (debounced: one click per flip pair) */
if(playSound._ft&&performance.now()-playSound._ft<90) return;
playSound._ft=performance.now();
const dur=.045;
const buf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*dur),ctx.sampleRate);
const ch=buf.getChannelData(0);
for(let i=0;i<ch.length;i++) ch[i]=(Math.random()*2-1)*Math.pow(1-i/ch.length,2.4);
const nsrc=ctx.createBufferSource(); nsrc.buffer=buf;
const bp=ctx.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=2400; bp.Q.value=1.1;
const g=ctx.createGain(); g.gain.setValueAtTime(.11,t);
nsrc.connect(bp); bp.connect(g); g.connect(ctx.destination);
nsrc.start(t);
/* soft low thock underneath for body */
tone(ctx,t+.015,190,.05,"sine",.05);
}
}

/* ── session notifications ────────────────────────────── */
function notifSupported(){
  return !!(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.Plugins?.LocalNotifications || ("Notification" in window));
}
function askNotifPermission(){
  if(!notifSupported()) return Promise.resolve("unsupported");
  if(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.Plugins?.LocalNotifications){
    const LN = window.Capacitor?.Plugins?.LocalNotifications;
    if(LN){
      return LN.requestPermissions().then(res => res.display === 'granted' ? 'granted' : 'denied').catch(() => 'denied');
    }
  }
  if(typeof Notification !== "undefined" && Notification.permission!=="default") return Promise.resolve(Notification.permission);
  return new Promise(res=>{
    let done=false;
    const finish=()=>{ if(done) return; done=true; res(typeof Notification !== "undefined" ? Notification.permission : "granted"); };
    try{
      if(typeof Notification !== "undefined" && Notification.requestPermission){
        const r=Notification.requestPermission(finish);
        if(r&&r.then) r.then(finish).catch(finish);
      } else finish();
    }catch(e){ finish(); }
    let n=0; const iv=setInterval(()=>{ n++;
    if((typeof Notification !== "undefined" && Notification.permission!=="default")||n>40){ clearInterval(iv); finish(); } },500);
  });
}
function notify(title,body){
  if(!state.notif||!notifSupported()) return;
  if(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.Plugins?.LocalNotifications){
    const LN = window.Capacitor?.Plugins?.LocalNotifications;
    if(LN){
      LN.schedule({
        notifications: [{
          title: title,
          body: body,
          id: Math.floor(Date.now() % 100000),
          schedule: { at: new Date(Date.now() + 100) },
          sound: null,
          actionTypeId: "",
          extra: null
        }]
      }).catch(()=>{});
      return;
    }
  }
  if(typeof Notification === "undefined" || Notification.permission!=="granted") return;
  const opts={body,icon:"./icons/icon-192.png",badge:"./icons/icon-192.png",tag:"ese-session",renotify:true,vibrate:[120,60,120]};
  try{
    if(navigator.serviceWorker){
      navigator.serviceWorker.getRegistration().then(reg=>{
        if(reg&&reg.showNotification) return reg.showNotification(title,opts);
        try{ new Notification(title,opts); }catch(_){}
      }).catch(()=>{ try{ new Notification(title,opts); }catch(_){} });
    }else new Notification(title,opts);
  }catch(e){ try{ new Notification(title,{body,icon:"./icons/icon-192.png"}); }catch(_){} }
}
function notifOn(){
  if(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.Plugins?.LocalNotifications) return !!state.notif;
  return state.notif&&notifSupported()&&(typeof Notification !== "undefined" && Notification.permission==="granted");
}
function toggleNotif(){
  if(!notifSupported()){ toast("Notifications not supported on this device"); return; }
  if(!notifOn()){
    state.notif=true; saveJSON(NOTIF_KEY,true);
    askNotifPermission().then(p=>{
      if(p==="granted"){ toast("Session notifications on"); notify("Notifications enabled","You'll be pinged when a session or break ends."); }
      else if(p==="denied"){ state.notif=false; saveJSON(NOTIF_KEY,false); toast("Blocked — enable notifications for this app in Android Settings"); }
      else toast("Waiting for permission…");
      render(); });
    render();
  }else{ state.notif=false; saveJSON(NOTIF_KEY,false); toast("Session notifications off"); render(); } }

/* ── plan slot notifications (scheduled study reminders) ─ */
const SLOT_NOTIF_KEY="ese_slot_notified_v1";
let _slotStarts=null;
function slotStarts(){
if(_slotStarts) return _slotStarts;
let prev=-1;
_slotStarts=SLOTS.map(s=>{
const m=/^(\d{1,2}):(\d{2})/.exec(s.time||""); if(!m) return null;
let t=(+m[1])*60+(+m[2]);
while(t<=prev) t+=720;              /* times ascend through the day → am/pm rollover */
prev=t; return t; });
return _slotStarts; }
let _slotEnds=null;
function slotEnds(){
if(_slotEnds) return _slotEnds;
const starts=slotStarts();
_slotEnds=SLOTS.map((s,i)=>{
const st=starts[i]; if(st==null) return null;
const m=/–(\d{1,2}):(\d{2})/.exec(s.time||""); if(!m) return st+120;
let t=(+m[1])*60+(+m[2]);
while(t<=st) t+=720;                /* end is after start, rolling into pm if needed */
return t; });
return _slotEnds; }
/* which scheduled slot are we inside right now? −1 if none (15 min grace after end) */
function currentSlotIndex(){
const now=new Date(), mins=now.getHours()*60+now.getMinutes();
const st=slotStarts(), en=slotEnds();
for(let i=0;i<SLOTS.length;i++){
if(st[i]!=null&&mins>=st[i]&&mins<en[i]+15) return i; }
return -1; }
/* per-slot streak — consecutive days this specific slot was secured */
function slotStreak(si){
let streak=0; const d=new Date();
for(;;){ const k=`${d.getFullYear()}-${fmt(d.getMonth()+1)}-${fmt(d.getDate())}`;
const e=state.log[k];
const hit=e&&e.slotHits&&e.slotHits[si];
if(hit) streak++;
else if(streak===0&&k===todayKey()){ /* today's slot may still be ahead */ }
else break;
d.setDate(d.getDate()-1); }
return streak; }
/* session streak — consecutive days with a focus session completed INSIDE a slot window */
function computeSessionStreak(){
let streak=0; const d=new Date();
for(;;){ const k=`${d.getFullYear()}-${fmt(d.getMonth()+1)}-${fmt(d.getDate())}`;
const e=state.log[k];
const hit=e&&e.slotHits&&Object.keys(e.slotHits).length>0;
if(hit) streak++;
else if(streak===0&&k===todayKey()){ /* today's slots may still be ahead */ }
else break;
d.setDate(d.getDate()-1); }
return streak; }
function checkSlotNotifications(){
if(!notifOn()) return;
if(isRestToday()) return;                     /* rest day — no slot pings, actually rest */
const di=findTodayIndex();
if(di<0) return;
const now=new Date(), mins=now.getHours()*60+now.getMinutes();
const tk=todayKey();
let fired=loadJSON(SLOT_NOTIF_KEY,{});
/* keep only today's entries so storage never grows */
if(fired._day!==tk) fired={_day:tk};
const starts=slotStarts();
SCHED[di].sessions.forEach((s,si)=>{
const st=starts[si]; if(st==null||fired[si]) return;
if(mins<st||mins>=st+60) return;    /* fire at start, or within the hour if app opened late */
fired[si]=true;
const done=s.tasks.every((_,ti)=>state.checked[`${di}-${si}-${ti}`]);
if(!done){
const slot=SLOTS[si];
notify(`${slot.label} · ${slot.time}`,`${s.title} — ${slot.desc}`);
} });
saveJSON(SLOT_NOTIF_KEY,fired); }

/* ── strict blocking ──────────────────────────────────── */
function strictActive(){ return state.block.strict&&state.pomo.running&&state.pomo.phase==="work"; }
function toggleStrict(){
if(!state.block.strict){
if(!confirm("Strict mode:\n\n• During a focus session, Stop/Pause/Back require a 5-second hold\n• Leaving the app mid-session is counted as a distraction\n\nEnable?")) return;
state.block.strict=true; toast("Strict mode armed");
}else{
if(state.pomo.running&&state.pomo.phase==="work"){ toast("Can't disarm during a focus session"); return; }
state.block.strict=false; toast("Strict mode off");
}
saveJSON(BLOCK_KEY,state.block); render(); }
function logDistraction(){
const k=todayKey(); const e=state.log[k]||{sessions:0,minutes:0};
e.distract=(e.distract||0)+1; state.log[k]=e; saveJSON(LOG_KEY,state.log); }
/* hold-to-confirm: fires action only after holding pointer for `secs` */
function holdToConfirm(btn,secs,action,label){
let t=null,start=0,raf=null;
const orig=btn.innerHTML;
/* stop the browser long-press menu (share/download/select) from stealing the hold */
btn.oncontextmenu=e=>{ e.preventDefault(); return false; };
Object.assign(btn.style,{webkitTouchCallout:"none",webkitUserSelect:"none",userSelect:"none",touchAction:"none"});
function tick(){
const p=Math.min(1,(Date.now()-start)/(secs*1000));
btn.innerHTML=`${label} ${Math.ceil(secs-p*secs)}s`;
if(p<1) raf=requestAnimationFrame(tick); }
function cancel(){ if(t){ clearTimeout(t); t=null; } if(raf) cancelAnimationFrame(raf);
btn.innerHTML=orig; }
btn.onpointerdown=e=>{ e.preventDefault();
try{ btn.setPointerCapture(e.pointerId); }catch(_){}
if(!strictActive()){ action(); return; }
start=Date.now(); tick();
t=setTimeout(()=>{ t=null; cancel(); action(); },secs*1000); };
btn.onpointerup=cancel; btn.onpointerleave=cancel; btn.onpointercancel=cancel;
btn.onclick=e=>{ if(strictActive()) e.preventDefault(); }; }


let wakeLock=null;
async function acquireWakeLock(){
if(!("wakeLock" in navigator)||wakeLock) return;
try{
wakeLock=await navigator.wakeLock.request("screen");
wakeLock.addEventListener("release",()=>{ wakeLock=null; });
}catch(e){ wakeLock=null; } }
function releaseWakeLock(){
if(!wakeLock) return;
try{ wakeLock.release(); }catch(e){}
wakeLock=null; }
function syncWakeLock(){
if(state.pomo.running&&document.visibilityState==="visible") acquireWakeLock();
else releaseWakeLock(); }

function completePhase(){
stopPomoInterval();
const wasWork=state.pomo.phase==="work";
if(wasWork){
const preHits=(state.log[todayKey()]||{}).slotHits||{};
const preCount=Object.keys(preHits).length;
logSession(state.pomo.workMins);
const postHits=(state.log[todayKey()]||{}).slotHits||{};
if(Object.keys(postHits).length>preCount){
const si=currentSlotIndex(), slot=SLOTS[si]||{label:"slot"};
setTimeout(()=>toast(`${slot.label} secured — session streak alive`),600);
} }
try{ navigator.vibrate&&navigator.vibrate([120,60,120]); }catch(e){}
playSound(wasWork?"complete":"break");
notify(wasWork?"Focus session complete":"Break over",
wasWork?`${state.pomo.workMins} min of deep work logged.${state.pomo.loop?` ${state.pomo.breakMins} min break starts now.`:" Take a breather."}`
:`Time to get back to focus${state.pomo.loop?` — ${state.pomo.workMins} min session starting.`:"."}`);
if(state.pomo.loop){
state.pomo.phase=wasWork?"break":"work";
state.pomo.targetTs=Date.now()+phaseSecs()*1000;
state.pomo.timeLeft=phaseSecs();
state.pomo.running=true;
startPomoInterval();
toast(wasWork?"Break time — you earned it":"Back to focus");
}else{
state.pomo.running=false; state.pomo.targetTs=null;
state.pomo.phase=wasWork?"break":"work";
state.pomo.timeLeft=phaseSecs();
toast(wasWork?"Session complete":"Break over");
}
saveJSON(POMO_KEY,state.pomo); render();
if(wasWork) checkAchievements(); }
function toggleRunning(){
if(state.pomo.running){
bankProgress();                    /* pausing — bank what's been earned so far */
state.pomo.timeLeft=getRemainingPomo(); state.pomo.running=false; state.pomo.targetTs=null; stopPomoInterval();
playSound("stop");
}else{
state.pomo.docked=true;
state.pomo.running=true; state.pomo.targetTs=Date.now()+getRemainingPomo()*1000; startPomoInterval();
playSound("start");
clockOn=true;                      /* entering focus → show flip clock */
requestAppFullscreen();
if(state.notif&&notifSupported()&&Notification.permission==="default") askNotifPermission();
}
saveJSON(POMO_KEY,state.pomo); render(); }
function toggleDocked(){ state.pomo.docked=!state.pomo.docked; saveJSON(POMO_KEY,state.pomo); render(); }
function resetPomo(){ bankProgress(); const hadMins=(state.pomo.logged||0)>0;
if(hadMins){ const k=todayKey(); const e=state.log[k]; if(e){ e.sessions+=1; saveJSON(LOG_KEY,state.log); } }
state.pomo.logged=0;
const wasRunning=state.pomo.running;
state.pomo.running=false; state.pomo.targetTs=null; state.pomo.timeLeft=phaseSecs(); stopPomoInterval(); saveJSON(POMO_KEY,state.pomo); render();
if(wasRunning) playSound("stop");
if(hadMins) toast("Stopped — partial time logged"); }
function skipPhase(){ completePhase(); }
function setPhase(p){ bankProgress(); state.pomo.logged=0; state.pomo.phase=p; state.pomo.running=false; state.pomo.targetTs=null; state.pomo.timeLeft=phaseSecs(); stopPomoInterval(); saveJSON(POMO_KEY,state.pomo); render(); }
function applyPreset(w,b){ bankProgress(); state.pomo.logged=0; state.pomo.workMins=w; state.pomo.breakMins=b; state.pomo.running=false; state.pomo.targetTs=null; state.pomo.timeLeft=phaseSecs(); stopPomoInterval(); saveJSON(POMO_KEY,state.pomo); render(); }
function adjustDuration(which,delta){
if(which==="work") state.pomo.workMins=Math.max(5,Math.min(180,state.pomo.workMins+delta));
else state.pomo.breakMins=Math.max(1,Math.min(60,state.pomo.breakMins+delta));
if(!state.pomo.running) state.pomo.timeLeft=phaseSecs();
saveJSON(POMO_KEY,state.pomo); render(); }
function toggleLoop(){ state.pomo.loop=!state.pomo.loop; saveJSON(POMO_KEY,state.pomo); render(); }

/* ── task toggling + undo ─────────────────────────────── */
let lastToggle=null;
function toggleTask(si,ti){
const k=`${state.index}-${si}-${ti}`;
lastToggle={key:k,prev:!!state.checked[k],ts:Date.now()};
state.checked[k]=!state.checked[k];
if(!state.checked[k]) delete state.checked[k];
saveJSON(STORAGE_KEY,state.checked);
const session=SCHED[state.index].sessions[si];
const completed=session.tasks.every((_,x)=>state.checked[`${state.index}-${si}-${x}`]);
if(completed){ state.expandedSessions[`${state.index}-${si}`]=false;
try{ navigator.vibrate&&navigator.vibrate(40); }catch(e){} }
saveJSON(EXP_KEY,state.expandedSessions);
renderQuiet();
const day=dayStats(state.index);
if(day.tot&&day.dn===day.tot&&!state.celebratedDays[state.index]){
state.celebratedDays[state.index]=true; saveJSON(CELEB_KEY,state.celebratedDays);
setTimeout(()=>celebrateDay(),350);
}else{
checkAchievements();
} }
function undoLast(){
if(!lastToggle||Date.now()-lastToggle.ts>8000){ toast("Nothing to undo"); return; }
if(lastToggle.prev) state.checked[lastToggle.key]=true; else delete state.checked[lastToggle.key];
saveJSON(STORAGE_KEY,state.checked); lastToggle=null; render(); toast("Undone"); }

/* ── navigation ───────────────────────────────────────── */
function navDay(dir){ state.index=Math.max(0,Math.min(SCHED.length-1,state.index+dir)); saveJSON(IDX_KEY,state.index); window.scrollTo({top:0,behavior:"smooth"}); render(); }
function jumpTo(i){ state.index=Math.max(0,Math.min(SCHED.length-1,i)); saveJSON(IDX_KEY,state.index); window.scrollTo({top:0,behavior:"smooth"}); render(); }
function goToday(){ const idx=findTodayIndex(); jumpTo(idx>=0?idx:0); }

/* ── rest days (non-destructive) ──────────────────────── */
(function(){
const k=todayKey();
const e=state.log[k];
if(!e||!e.minutes||!e.sessions){
/* if nothing was studied by 9pm, flag today as a rest day */
const d=SCHED[state.index];
if(d&&d.badge!=="RECOVERY"){
setTimeout(()=>{ if(!(state.log[todayKey()]||{}).sessions){ toast("Rest day detected — no sessions tracked. Health comes first."); } },22*3600000-60000*new Date().getHours()); /* ~10pm */
} } })();
function setNav(id){
if(state.nav===id) return;
view.style.transition="opacity .15s ease, transform .15s ease";
view.style.opacity="0"; view.style.transform="translateY(8px)";
setTimeout(()=>{
state.nav=id; saveJSON(NAV_KEY,id);
try{ history.replaceState(null,"","#"+id); }catch(e){}
window.scrollTo({top:0}); render();
view.style.opacity="1"; view.style.transform="translateY(0)";
},150); }

/* ── export / import ──────────────────────────────────── */
function exportData(){
const payload={checked:state.checked,log:state.log,pomo:state.pomo,theme:state.theme,achievements:state.achievements,celebratedDays:state.celebratedDays,mocks:state.mocks,shaky:state.shaky,ratings:state.ratings,freeze:state.freeze,exportedAt:new Date().toISOString()};
const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
const url=URL.createObjectURL(blob); const a=document.createElement("a");
a.href=url; a.download="ese2027-backup-"+todayKey()+".json"; a.click();
setTimeout(()=>URL.revokeObjectURL(url),4000);
saveJSON(BKUP_KEY,todayKey());
toast("Backup downloaded"); }
function handleImportFile(e){
const f=e.target.files[0]; if(!f) return;
const rd=new FileReader();
rd.onload=()=>{ try{
const d=JSON.parse(rd.result);
if(d.checked) state.checked=d.checked;
if(d.log) state.log=d.log;
if(d.theme) state.theme=d.theme;
if(d.achievements) state.achievements=d.achievements;
if(d.celebratedDays) state.celebratedDays=d.celebratedDays;
if(d.mocks) state.mocks=d.mocks;
if(d.shaky) state.shaky=d.shaky;
if(d.ratings) state.ratings=d.ratings;
if(d.freeze) state.freeze=d.freeze;
saveJSON(STORAGE_KEY,state.checked); saveJSON(LOG_KEY,state.log); saveJSON(THEME_KEY,state.theme);
saveJSON(ACH_KEY,state.achievements); saveJSON(CELEB_KEY,state.celebratedDays);
saveJSON(MOCK_KEY,state.mocks); saveJSON(SHAKY_KEY,state.shaky); saveJSON(RATE_KEY,state.ratings); saveJSON(FREEZE_KEY,state.freeze);
render(); toast("Backup restored");
}catch(err){ toast("Invalid backup file"); } };
rd.readAsText(f); e.target.value=""; }

/* ── shared UI pieces ─────────────────────────────────── */
function header(title,sub){
return html(`<header style="margin-bottom:18px">
<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
<div>
<h1 class="display" style="font-size:26px;font-weight:800;color:var(--ink)">${title}</h1>
${sub?`<div style="font-size:12.5px;color:var(--ink-3);margin-top:4px;font-weight:500">${sub}</div>`:""}
</div>
<button id="themeBtn" class="iconbtn press" aria-label="Toggle theme">${isLightTheme(state.theme)?IC.moon:IC.sun}</button>
</div>
</header>`); }
function wireTheme(root){
const b=root.querySelector("#themeBtn");
if(b) b.onclick=cycleTheme; }
function ring(size,stroke,pct,color,track){
const r=(size-stroke)/2, c=2*Math.PI*r;
return `<svg width="${size}" height="${size}" style="transform:rotate(-90deg)" aria-hidden="true">
<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${track||"var(--card-2)"}" stroke-width="${stroke}"/>
<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"  stroke-dasharray="${c}" stroke-dashoffset="${c*(1-pct/100)}" style="transition:stroke-dashoffset .8s var(--ease)"/>
  </svg>`; }

/* ── ice-shatter showcase: frozen flame flies in, cracks, fire reveals ── */
function iceShatterShowcase(iconEl, opts){
  opts = opts || {};
  if (!iconEl) return;
  playSound("shatter");
  iconEl.style.position = iconEl.style.position || "relative";
  iconEl.style.display = "inline-block";
  /* 1) the FROZEN FLAME (ice state of the fire) flies in from off-screen */
  iconEl.querySelectorAll(".ice-shard").forEach(s=>s.remove());
  iconEl.innerHTML = IC.flame;
  iconEl.classList.remove("ice-shatter","fire-glow","frost-flame","ice-fly-in");
  void iconEl.offsetWidth;
  iconEl.classList.add("frost-flame","ice-fly-in");
  setTimeout(()=>{
    /* 2) it lands, frost holds a beat, then CRACKS like shattered ice */
    iconEl.classList.remove("ice-fly-in","frost-flame");
    void iconEl.offsetWidth;
    iconEl.classList.add("ice-shatter");
    [-45,0,45,90,135,180,225,270,315].forEach((a) => {
      const s = el("span"); s.className = "ice-shard";
      const rad = a * Math.PI / 180, dist = 24 + Math.random() * 22;
      s.style.setProperty("--dx", (Math.cos(rad) * dist).toFixed(1) + "px");
      s.style.setProperty("--dy", (Math.sin(rad) * dist).toFixed(1) + "px");
      s.style.setProperty("--rot", (Math.random() * 200 - 100).toFixed(0) + "deg");
      s.style.animationDuration = (0.45 + Math.random() * 0.3).toFixed(2) + "s";
      s.style.animationDelay = (Math.random() * 0.1).toFixed(2) + "s";
      iconEl.appendChild(s);
      setTimeout(() => s.remove(), 1300);
    });
    if (window.confetti) window.confetti({ particleCount: 80, colors: ["#E0F2FE", "#7DD3FC", "#38BDF8", "#FFFFFF"], spread: 100, origin: { y: 0.5 } });
    /* 3) the glowing FIRE flame is revealed */
    setTimeout(() => {
      iconEl.classList.remove("ice-shatter");
      iconEl.innerHTML = IC.flame;
      iconEl.classList.add(opts.backToIce ? "frost-flame" : "fire-glow");
      if (!opts.backToIce) toast("Ice shattered — streak continues");
    }, 820);
  }, 1050);
}

/* shared top command deck — identical across all 5 screens */
function topDeck(){
const cdDate = cd(ESE_DATE);
const streakObj = computeStreak(), tlog = state.log[todayKey()]||{minutes:0};
const d = el("div"); d.className = "top-deck";
d.innerHTML = `
<div class="td-left">
<span class="nt-brand cd-pill press" title="Target: ESE 2027">ESE<span class="sl">//</span>2027</span>
<span class="nt-tag cd-tag press" title="Days to ESE 2027">${cdDate.d}<small>D</small></span>
</div>
<div class="td-right">
<span class="nt-tag streak-tag press ${streakObj.hasFrozen && tlog.minutes===0?'ice-pill':'fire-pill'}" title="Streak Status">${IC.flame} ${streakObj.count}d</span>
<button class="nt-icon press sound-pill" title="Toggle Ambient Audio">${IC.head}</button>
<button class="nt-icon press theme-btn" aria-label="Toggle theme">${isLightTheme(state.theme)?IC.moon:IC.sun}</button>
</div>`;
const cdToast = () => toast(`Target: ESE 2027 · ${cdDate.d} days remaining`);
d.querySelector(".nt-brand").onclick = cdToast;
d.querySelector(".cd-tag").onclick = cdToast;
d.querySelector(".streak-tag").onclick = () => setNav("progress");
d.querySelector(".sound-pill").onclick = () => toggleDockDrawer();
d.querySelector(".theme-btn").onclick = cycleTheme;
return d;
}

/* ── ONE celebration — a burst of hard red pixels from a point ── */
function ntPixelBurst(x,y){
if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
const N=16;
for(let i=0;i<N;i++){
const s=el("span"); s.className="nt-spark";
s.style.left=x+"px"; s.style.top=y+"px";
document.body.appendChild(s);
const ang=(Math.PI*2*i/N)+(Math.random()*0.4-0.2), vel=48+Math.random()*58;
const dx=Math.cos(ang)*vel, dy=Math.sin(ang)*vel-18;
s.animate([
{transform:"translate(-50%,-50%)",opacity:1},
{transform:`translate(calc(-50% + ${dx}px), calc(-50% + ${dy+88}px))`,opacity:0}
],{duration:560+Math.random()*260,easing:"cubic-bezier(.2,.7,.2,1)"});
setTimeout(()=>s.remove(),880);
}
}

/* ════════════════ TODAY — NOTHING LAYOUT (hero → spine → whisper) ════════════════ */
function renderToday(){
const wrap=el("div"); wrap.className="screen view";
const today=todayDateLabel();
let idx=SCHED.findIndex(d=>d.date===today);
const focusIdx=idx>=0?idx:state.index;
const fd=SCHED[focusIdx], st=dayStats(focusIdx);
const streakObj=computeStreak(), streak=streakObj.count, tlog=state.log[todayKey()]||{sessions:0,minutes:0};
const inner=el("div"); inner.className="stagger";

/* ── top command deck ── */
inner.appendChild(topDeck());

/* ── greeting — dot-matrix date, weekday in red ── */
inner.appendChild(html(`<div class="nt-greet">
<div class="k">${greeting()} · Teja</div>
<div class="h"><span class="day">${fd.day}</span> ${today}</div>
</div>`));

/* ── find the current (first unfinished) session ── */
let curSi=-1;
for(let si=0;si<fd.sessions.length;si++){
const done=fd.sessions[si].tasks.every((_,ti)=>state.checked[`${focusIdx}-${si}-${ti}`]);
if(!done){ curSi=si; break; }
}
if(curSi===-1) curSi=fd.sessions.length-1;
const curSession=fd.sessions[curSi];
const slot=SLOTS[curSi]||{label:"Session",time:"",icon:"•",desc:""};
const tasksDone=curSession.tasks.filter((_,ti)=>state.checked[`${focusIdx}-${curSi}-${ti}`]).length;
const total=curSession.tasks.length;
const pct=Math.round(tasksDone/total*100);
const allDone=tasksDone===total;

/* ── hero — the one subject, the one action ── */
const segs=curSession.tasks.map((_,ti)=>`<i class="${state.checked[`${focusIdx}-${curSi}-${ti}`]?'on':''}"></i>`).join("");
const hero=el("div"); hero.className="nt-hero";
hero.innerHTML=`
<div class="top">
<span class="now"><span class="live"></span>${allDone?'Session cleared':'Study now'}</span>
<span class="slot">${(slot.label||'Session').toUpperCase()}${slot.time?' · '+slot.time:''}</span>
</div>
<div class="body">
<div class="subject">${curSession.title}</div>
<div class="desc">${slot.desc||'Complete every task to master this session.'}</div>
<div class="nt-seg">${segs}</div>
<div class="nt-segrow"><span>Session ${curSi+1} / ${fd.sessions.length}</span><span><b>${tasksDone}</b> / ${total} · ${pct}%</span></div>
<button class="btn ${allDone?'btn-ghost':'btn-acc'} press cta" id="heroStartBtn">${allDone?'Completed — review':'Enter Focus Space'}</button>
<button class="btn btn-ghost press cta audio" id="heroAudioBtn">${IC.head} Ambient Focus Sound</button>
</div>`;
hero.querySelector("#heroStartBtn").onclick=()=>{ if(!state.pomo.running) toggleRunning(); else expandFocusOverlay(); };
hero.querySelector("#heroAudioBtn").onclick=toggleDockDrawer;
inner.appendChild(hero);

/* ── metrics — technical 3-cell grid (streak / today / on-track) ── */
const isFrozen=streakObj.hasFrozen && tlog.minutes===0;
const hrs=Math.floor(tlog.minutes/60), mins=tlog.minutes%60;
const metrics=el("div"); metrics.className="nt-metrics";
metrics.innerHTML=`
<div class="cell fire-cell ${isFrozen?'':'on-fire'}"><div class="n" id="streakIcon">${streak}<small>D</small></div><div class="l">${isFrozen?'Frozen':'Streak'}</div></div>
<div class="cell"><div class="n">${hrs>0?hrs:mins}<small>${hrs>0?'H':'M'}</small>${hrs>0?mins+'<small>M</small>':''}</div><div class="l">Today</div></div>
<div class="cell"><div class="n">${st.pct}<small>%</small></div><div class="l">On track</div></div>`;
metrics.querySelector(".fire-cell").onclick=()=>{ if(isFrozen) iceShatterShowcase(document.getElementById("streakIcon"),{backToIce:true}); else setNav("progress"); };
inner.appendChild(metrics);

/* ── the spine — this session's checklist ── */
const spine=el("div"); spine.className="nt-spine";
spine.innerHTML=`
<div class="head"><span class="t">This Session</span><span class="c">${tasksDone} / ${total}</span></div>
<div class="sub">Tap to complete · ! to flag shaky</div>`;
const list=el("div"); list.className="tasklist";
curSession.tasks.forEach((task,ti)=>{
const k=`${focusIdx}-${curSi}-${ti}`, on=!!state.checked[k], shk=!!state.shaky[k];
const row=el("div"); row.className="taskrow"+(on?" done":"");
row.setAttribute("role","checkbox"); row.setAttribute("aria-checked",on?"true":"false"); row.tabIndex=0;
row.innerHTML=`<span class="chk${on?" on":""}" style="color:var(--acc-ink)">${on?IC.check:""}</span><span class="txt" style="flex:1">${task}</span>
<button class="shakybtn press${shk?" on":""}" aria-label="${shk?"Remove shaky flag":"Mark as shaky"}" title="Mark topic as shaky">!</button>`;
row.onclick=()=>{ if(!on){ const b=row.querySelector(".chk").getBoundingClientRect(); ntPixelBurst(b.left+b.width/2,b.top+b.height/2); try{navigator.vibrate&&navigator.vibrate(12);}catch(e){} } state.index=focusIdx; toggleTask(curSi,ti); };
row.querySelector(".shakybtn").onclick=e=>{ e.stopPropagation(); state.index=focusIdx; toggleShaky(curSi,ti); };
row.onkeydown=e=>{ if(e.key===" "||e.key==="Enter"){ e.preventDefault(); state.index=focusIdx; toggleTask(curSi,ti); } };
list.appendChild(row);
});
spine.appendChild(list);
inner.appendChild(spine);

/* ── whisper — motivation as a quiet mono footnote (tap to cycle) ── */
const qObj=RANKER_QUOTES[quoteIndex % RANKER_QUOTES.length];
const whisper=el("div"); whisper.className="nt-whisper press";
whisper.innerHTML=`<div class="q">"${qObj.q}"</div><div class="a">— ${qObj.a} · tap to cycle</div>`;
whisper.onclick=()=>{ nextQuote(); };
inner.appendChild(whisper);

/* ── ice-shatter splash when a frozen streak resumes (one shot / day) ── */
if(streakObj.hasFrozen && tlog.minutes>0){
const y=new Date(); y.setDate(y.getDate()-1);
const yk=`${y.getFullYear()}-${fmt(y.getMonth()+1)}-${fmt(y.getDate())}`;
if(state.freeze[yk] && !sessionStorage.getItem("shatter-"+todayKey())){
sessionStorage.setItem("shatter-"+todayKey(),"1");
setTimeout(()=>iceShatterShowcase(document.getElementById("streakIcon")),650);
}
}

wrap.appendChild(inner); wireTheme(wrap); return wrap; }

/* ════════════════ PLAN — NOTHING LAYOUT (instrument list of days) ════════════════ */
function renderPlan(){
const wrap=el("div"); wrap.className="screen view";
const day=SCHED[state.index], st=dayStats(state.index);
const inner=el("div"); inner.className="stagger nt-plan";

/* ── top command deck ── */
inner.appendChild(topDeck());

/* ── header — title + jump-to-today ── */
const head=html(`<div class="nt-plan-head">
<div class="t">Plan<span style="color:var(--acc)">.</span></div>
<button id="todayBtn" class="today-btn press">TODAY</button>
</div>`);
head.querySelector("#todayBtn").onclick=goToday;
inner.appendChild(head);

/* ── phase jump ── */
const sel=el("select"); sel.className="nt-jump"; sel.setAttribute("aria-label","Jump to phase");
JUMPS.forEach(j=>{ const o=document.createElement("option"); o.value=j.i; o.textContent=`${j.label} · ${j.date}`; sel.appendChild(o); });
let cur=0; for(let k=0;k<JUMPS.length;k++){ if(JUMPS[k].i<=state.index) cur=JUMPS[k].i; }
sel.value=cur; sel.onchange=e=>jumpTo(parseInt(e.target.value,10));
inner.appendChild(sel);

/* ── day header — dot-matrix date + segmented readout ── */
const segMarks=day.sessions.map((s,si)=>s.tasks.every((_,ti)=>state.checked[`${state.index}-${si}-${ti}`])?'<i class="on"></i>':'<i></i>').join("");
inner.appendChild(html(`<div class="nt-dayhdr">
<div class="ey">${day.day} · Day ${state.index+1} / ${SCHED.length}</div>
<div class="d">${day.date}</div>
<div class="sub">${day.subject}</div>
${day.badge?`<span class="badge ${badgeTier(day.badge)}">${day.badge}</span>`:""}
<div class="prog">
<div class="progrow"><span class="n">${st.pct}<small>%</small></span><span class="l">${st.dn} / ${st.tot} tasks · Day complete</span></div>
<div class="nt-seg">${segMarks}</div>
</div>
</div>`));

/* ── sessions — hairline cards, "Now" = red left-border ── */
const list=el("div"); list.className="sesslist";
let currentFound=false;
day.sessions.forEach((s,si)=>{
const sd=s.tasks.filter((_,ti)=>state.checked[`${state.index}-${si}-${ti}`]).length;
const done=sd===s.tasks.length;
const isCurrent=!done&&!currentFound; if(isCurrent) currentFound=true;
const expKey=`${state.index}-${si}`;
const expanded=state.expandedSessions[expKey]!==undefined?state.expandedSessions[expKey]:!done;
const slot=SLOTS[si]||{label:"Session",time:"",icon:"•"};
const sstreak=slotStreak(si);
const card=el("div"); card.className="sess"+(isCurrent?" now":"")+(done?" done":"");
const top=el("button"); top.className="shead press";
top.innerHTML=`
<span class="count">${sd}<small>/${s.tasks.length}</small></span>
<span class="meta">
<span class="tags">
<span class="mtag">${slot.label}${slot.time?" · "+slot.time:""}</span>
${sstreak>0?`<span class="mtag streak">${IC.flame} ${sstreak}</span>`:""}
${isCurrent?`<span class="mtag now">NOW</span>`:""}
${done?`<span class="mtag done">DONE</span>`:""}
</span>
<span class="stitle">${s.title}</span>
</span>
<span class="caret${expanded?" open":""}">${IC.right}</span>`;
top.onclick=()=>{ state.expandedSessions[expKey]=!expanded; saveJSON(EXP_KEY,state.expandedSessions); renderQuiet(); };
card.appendChild(top);
if(expanded){
const tl=el("div"); tl.className="tl";
s.tasks.forEach((task,ti)=>{
const k=`${state.index}-${si}-${ti}`, on=!!state.checked[k], shk=!!state.shaky[k];
const row=el("div"); row.className="taskrow"+(on?" done":"");
row.setAttribute("role","checkbox"); row.setAttribute("aria-checked",on?"true":"false"); row.tabIndex=0;
row.innerHTML=`<span class="chk${on?" on":""}" style="color:var(--acc-ink)">${on?IC.check:""}</span><span class="txt" style="flex:1">${task}</span>
<button class="shakybtn press${shk?" on":""}" aria-label="${shk?"Remove shaky flag":"Mark as shaky"}" title="Mark topic as shaky">!</button>`;
row.onclick=()=>{ if(!on){ const b=row.querySelector(".chk").getBoundingClientRect(); ntPixelBurst(b.left+b.width/2,b.top+b.height/2); try{navigator.vibrate&&navigator.vibrate(12);}catch(e){} } toggleTask(si,ti); };
row.querySelector(".shakybtn").onclick=e=>{ e.stopPropagation(); toggleShaky(si,ti); };
row.onkeydown=e=>{ if(e.key===" "||e.key==="Enter"){ e.preventDefault(); toggleTask(si,ti); } };
tl.appendChild(row); });
card.appendChild(tl); }
list.appendChild(card); });
inner.appendChild(list);

/* ── prev / next ── */
const nav2=el("div"); nav2.className="daynav";
const prev=html(`<button class="press" ${state.index===0?"disabled":""}>${IC.left} Prev</button>`);
const next=html(`<button class="press" ${state.index===SCHED.length-1?"disabled":""}>Next ${IC.right}</button>`);
prev.onclick=()=>navDay(-1); next.onclick=()=>navDay(1);
nav2.appendChild(prev); nav2.appendChild(next);
inner.appendChild(nav2);

wrap.appendChild(inner); wireTheme(wrap); return wrap; }

/* ════════════════ FOCUS ════════════════ */
function renderFocus(){
const wrap=el("div"); wrap.className="screen view";
const inner=el("div"); inner.className="stagger";

/* ── Top Header Command Deck ── */
inner.appendChild(topDeck());

/* ── section label ── */
inner.appendChild(html(`<div class="nt-flabel"><span class="t">FOCUS SPACE</span><span class="s">DEEP WORK · POMODORO</span></div>`));

/* ── phase switch — two square segmented keys ── */
const seg=html(`<div class="nt-fphase">
<button class="press ${state.pomo.phase==="work"?"on":""}" data-p="work"><span class="pl">FOCUS</span><span class="pm">${state.pomo.workMins}<i>M</i></span></button>
<button class="press ${state.pomo.phase==="break"?"on":""}" data-p="break"><span class="pl">BREAK</span><span class="pm">${state.pomo.breakMins}<i>M</i></span></button>
</div>`);
seg.querySelectorAll("button").forEach(b=>b.onclick=()=>setPhase(b.dataset.p));
inner.appendChild(seg);

/* ── the ONE readout — big dot-matrix countdown ── */
const secs=phaseSecs(), remain=getRemainingPomo();
const pct=secs?((secs-remain)/secs)*100:0;
const NSEG=24, onSeg=Math.round((pct/100)*NSEG);
let fsegs=""; for(let i=0;i<NSEG;i++) fsegs+=`<i class="${i<onSeg?"on":""}"></i>`;
const tw=html(`<div class="nt-fclock">
<div class="phase" id="phase-display">${state.pomo.phase==="work"?"FOCUS":"BREAK"}</div>
<div class="big" id="timer-display">${fmtTime(remain)}</div>
<div class="nt-seg fseg" id="focus-seg">${fsegs}</div>
<div class="loopnote">${state.pomo.loop?"AUTO LOOP ON":"SINGLE SESSION"}</div>
</div>`);
/* hidden legacy node — keeps renderTimerOnly's ring update a no-op safely */
inner.appendChild(tw);

/* ── controls — square keys, red run key ── */
const controls=html(`<div class="nt-fctrl">
<button class="fkey press" data-a="reset" aria-label="Reset timer">${IC.reset}</button>
<button class="fkey run press" data-a="run" aria-label="${state.pomo.running?"Pause":"Start"}">${state.pomo.running?IC.pause:IC.play}</button>
<button class="fkey press" data-a="skip" aria-label="Skip phase">${IC.skip}</button>
</div>`);
controls.querySelector('[data-a="reset"]').onclick=resetPomo;
controls.querySelector('[data-a="run"]').onclick=toggleRunning;
controls.querySelector('[data-a="skip"]').onclick=skipPhase;
inner.appendChild(controls);

/* re-enter clock mode while running */
if(state.pomo.running&&!clockOn){
const re=html(`<button class="nt-fclockbtn press">${IC.expand} ENTER CLOCK MODE</button>`);
re.onclick=()=>{ clockOn=true; requestAppFullscreen(); updateLandscape(); };
inner.appendChild(re); }

/* ── presets — mono square chips ── */
const pr=html(`<div class="nt-fpresets"></div>`);
PRESETS.forEach(p=>{
const active=state.pomo.workMins===p.work&&state.pomo.breakMins===p.brk;
const c=html(`<button class="fpre press ${active?"on":""}">${p.label}</button>`);
c.onclick=()=>applyPreset(p.work,p.brk); pr.appendChild(c); });
inner.appendChild(pr);

/* ── steppers — hairline cells, square +/− ── */
const opts=html(`<div class="nt-fsteppers"></div>`);
[["work","FOCUS MIN",state.pomo.workMins],["break","BREAK MIN",state.pomo.breakMins]].forEach(([w,label,val])=>{
const s=html(`<div class="fstep">
<div class="lab">
<div class="k">${label}</div>
<div class="v" data-role="val">${val}</div>
</div>
<div class="btns">
<button class="press" data-d="5">+</button>
<button class="press" data-d="-5">−</button>
</div></div>`);
s.querySelectorAll(".btns button").forEach(b=>b.onclick=()=>adjustDuration(w,parseInt(b.dataset.d,10)));
opts.appendChild(s); });
inner.appendChild(opts);

/* ── loop toggle — hairline row, square mechanical switch ── */
const loop=html(`<button class="nt-floop press ${state.pomo.loop?"on":""}">
<span class="lt">AUTO LOOP · FOCUS → BREAK</span>
<span class="sw"><i></i></span>
</button>`);
loop.onclick=toggleLoop;
inner.appendChild(loop);

/* current session hint — prefer the slot matching the time of day */
const today=SCHED[state.index];
let cur=null,curSi=-1;
(function(){
const nowM=new Date().getHours()*60+new Date().getMinutes();
const starts=slotStarts();
let live=-1;
for(let i=0;i<today.sessions.length;i++){ const st=starts[i];
if(st!=null&&nowM>=st&&nowM<st+150) live=i; }
if(live>=0){ const s=today.sessions[live];
const dn=s.tasks.filter((_,ti)=>state.checked[`${state.index}-${live}-${ti}`]).length;
if(dn<s.tasks.length){ cur=s; curSi=live; return; } }
today.sessions.some((s,i)=>{ const dn=s.tasks.filter((_,ti)=>state.checked[`${state.index}-${i}-${ti}`]).length;
if(dn<s.tasks.length){ cur=s; curSi=i; return true; } return false; });
})();
if(cur){
const t=tagOf(cur.tag);
const slot=SLOTS[curSi]||{label:"Session",time:""};
const card=html(`<button class="nt-fnext press">
<div class="nh">
<span class="ntag t${t.t}">${t.label}</span>
<span class="nslot">${slot.label}${slot.time?" · "+slot.time:""}</span>
</div>
<div class="ntitle">${cur.title}</div>
<div class="nopen">OPEN IN PLAN ${IC.right}</div>
</button>`);
card.onclick=()=>setNav("plan");
inner.appendChild(card); }

/* today's totals — hairline instrument grid */
const tlog=state.log[todayKey()]||{sessions:0,minutes:0};
const hrs=Math.floor(tlog.minutes/60), mins=tlog.minutes%60;
const stats=html(`<div class="nt-fstats ${tlog.distract?"c3":"c2"}">
<div class="fst"><div class="n">${tlog.sessions||0}</div><div class="l">Sessions today</div></div>
<div class="fst"><div class="n">${hrs>0?hrs+'<i>H</i> '+mins+'<i>M</i>':mins+'<i>M</i>'}</div><div class="l">Studied today</div></div>
${tlog.distract?`<div class="fst"><div class="n">${tlog.distract}</div><div class="l">Distractions</div></div>`:""}
</div>`);
inner.appendChild(stats);

wrap.appendChild(inner); wireTheme(wrap); return wrap; }

function renderTimerOnly(){
const remain=getRemainingPomo(), secs=phaseSecs();
/* update the full-focus overlay FIRST — it must tick live even if the
   legacy timer-display nodes no longer exist in the DOM */
const ov=document.getElementById("focusOverlay");
if(ov&&ov.classList.contains("active")){
const mm=Math.floor(remain/60), ss=remain%60;
const bignum=ov.querySelector(".bignum");
if(bignum) bignum.textContent=`${fmt(mm)}:${fmt(ss)}`;
/* keep the phase chip + sub-label live too — they can go stale if the
   phase auto-flips (work↔break) while the overlay is open */
const phaseChip=ov.querySelector(".fchip"); if(phaseChip) phaseChip.textContent=state.pomo.phase==="work"?"FOCUS":"BREAK";
const bigsub=ov.querySelector(".bigsub"); if(bigsub) bigsub.textContent=state.pomo.phase==="work"?"MINUTES FOCUS":"MINUTES BREAK";
const svg=ov.querySelector(".breather svg circle:last-child");
if(svg){
const pct=secs?Math.round((1-remain/secs)*100):0;
/* circumference read from the ring's own stroke-dasharray — single source of truth */
const c=parseFloat(svg.getAttribute("stroke-dasharray"))||597;
svg.setAttribute("stroke-dashoffset",c*(1-pct/100));
}
}
const disp=document.getElementById("timer-display"), ph=document.getElementById("phase-display");
updateLandscape();
if(!disp) return;
disp.textContent=fmtTime(remain);
if(ph) ph.textContent=state.pomo.phase==="work"?"FOCUS":"BREAK";
const segbar=document.getElementById("focus-seg");
if(segbar){
const nodes=segbar.querySelectorAll("i"), n=nodes.length;
const on=Math.round((secs?(secs-remain)/secs:0)*n);
nodes.forEach((el,i)=>el.classList.toggle("on",i<on));
}
}

/* ── flip clock focus mode ────────────────────────────── */
let wfcEl=null, clockOn=false;
function requestAppFullscreen(){
try{ const d=document.documentElement;
if(d.requestFullscreen&&!document.fullscreenElement) d.requestFullscreen({navigationUI:"hide"}).catch(()=>{});
}catch(e){} }
function exitAppFullscreen(){
try{ if(document.fullscreenElement&&document.exitFullscreen) document.exitFullscreen().catch(()=>{}); }catch(e){} }
function leaveClock(){ clockOn=false; exitAppFullscreen(); render(); }
function buildWfc(){
if(wfcEl) return wfcEl;
wfcEl=html(`<div class="wfc-overlay" id="wfcOverlay" role="dialog" aria-label="Focus clock">
<button class="wfc-end press" id="wfcBack" aria-label="Back to app">&larr; BACK</button>
<div class="wfc-state"><div class="phase" id="wfcPhase">Focus</div><div class="sub" id="wfcSub">Auto loop on</div></div>
<div class="wfc-clock">
<div class="wfc" id="wfcMin"><div class="wfc-top"><span></span></div><div class="wfc-bottom"><span></span></div>
<div class="wfc-flip top"><span></span></div><div class="wfc-flip bottom"><span></span></div><div class="wfc-seam"></div></div>
<div class="wfc-colon"><i></i><i></i></div>
<div class="wfc" id="wfcSec"><div class="wfc-top"><span></span></div><div class="wfc-bottom"><span></span></div>
<div class="wfc-flip top"><span></span></div><div class="wfc-flip bottom"><span></span></div><div class="wfc-seam"></div></div>
</div>
<div class="wfc-btns">
<button class="wfc-end press wfc-stop" id="wfcStop">STOP</button>
<button class="wfc-end press wfc-pause" id="wfcPause">PAUSE</button>
</div></div>`);
document.body.appendChild(wfcEl);
holdToConfirm(wfcEl.querySelector("#wfcBack"),5,leaveClock,"Hold…");
holdToConfirm(wfcEl.querySelector("#wfcPause"),5,()=>{ toggleRunning(); },"Hold…");
holdToConfirm(wfcEl.querySelector("#wfcStop"),5,()=>{ clockOn=false; exitAppFullscreen(); resetPomo(); },"Hold…");
return wfcEl; }
function setFlip(card,val,instant){
const top=card.querySelector(".wfc-top span"), bottom=card.querySelector(".wfc-bottom span");
const ft=card.querySelector(".wfc-flip.top span"), fb=card.querySelector(".wfc-flip.bottom span");
if(card._shown===val) return;                    /* already showing / animating to this value */
if(instant||!card._shown){                        /* first paint or forced snap: no fold */
if(card._t1){ clearTimeout(card._t1); card._t1=null; }
if(card._t2){ clearTimeout(card._t2); card._t2=null; }
card.classList.remove("go");
card._shown=val; top.textContent=val; bottom.textContent=val; return; }
/* a flip is still mid-air → finish it instantly before starting the new one */
if(card._t1||card._t2){
clearTimeout(card._t1); clearTimeout(card._t2); card._t1=card._t2=null;
card.classList.remove("go");
top.textContent=card._shown; bottom.textContent=card._shown;
void card.offsetWidth; }
const from=card._shown; card._shown=val;
ft.textContent=from; fb.textContent=val;
card.classList.remove("go"); void card.offsetWidth; card.classList.add("go");
playSound("flip");
card._t1=setTimeout(()=>{ top.textContent=val; card._t1=null; },300);
card._t2=setTimeout(()=>{ bottom.textContent=val; card.classList.remove("go"); card._t2=null; },620); }
function updateLandscape(){
const ov=buildWfc();
const wasActive=ov.classList.contains("active");
ov.classList.toggle("active",clockOn);
document.body.style.overflow=clockOn?"hidden":"";
if(!clockOn) return;
const remain=getRemainingPomo();
const phaseTxt=state.pomo.phase==="work"?"FOCUS":"BREAK";
const subTxt=state.pomo.running?(state.pomo.loop?"AUTO LOOP ON":"SINGLE SESSION"):"PAUSED";
const ph=ov.querySelector("#wfcPhase"), sb=ov.querySelector("#wfcSub"), pb=ov.querySelector("#wfcPause");
if(ph.textContent!==phaseTxt) ph.textContent=phaseTxt;
if(sb.textContent!==subTxt) sb.textContent=subTxt;
const pbTxt=state.pomo.running?"PAUSE":"RESUME";
if(pb._label!==pbTxt){ pb.innerHTML=pbTxt; pb._label=pbTxt; }
const instant=!wasActive;                         /* opening frame: snap digits, no fold */
setFlip(ov.querySelector("#wfcMin"),fmt(Math.floor(remain/60)),instant);
setFlip(ov.querySelector("#wfcSec"),fmt(remain%60),instant); }

/* ════════════════ PROGRESS ════════════════ */
function renderProgress(){
const wrap=el("div"); wrap.className="screen view";
const inner=el("div"); inner.className="stagger";

/* ── Top Header Command Deck ── */
inner.appendChild(topDeck());

/* ── section label ── */
inner.appendChild(html(`<div class="nt-flabel"><span class="t">PROGRESS</span><span class="s">MASTERY BREAKDOWN</span></div>`));
const ov=overall();

/* ── overall readout — big dot-matrix % + segmented ── */
const NSEG=28, onSeg=Math.round((ov.pct/100)*NSEG);
let osegs=""; for(let i=0;i<NSEG;i++) osegs+=`<i class="${i<onSeg?"on":""}"></i>`;
inner.appendChild(html(`<div class="nt-phead">
<div class="phrow"><span class="pk">OVERALL COMPLETE</span><span class="pv">${ov.dn} / ${ov.tot} TASKS</span></div>
<div class="pbig">${ov.pct}<span class="pc">%</span></div>
<div class="nt-seg phseg">${osegs}</div>
</div>`));

/* ── counters — hairline instrument grid ── */
const totSessions=Object.values(state.log).reduce((a,e)=>a+(e.sessions||0),0);
const totHours=Math.floor(Object.values(state.log).reduce((a,e)=>a+(e.minutes||0),0)/60);
inner.appendChild(html(`<div class="nt-pgrid">
<div class="pcell"><div class="n">${doneDaysCount()}</div><div class="l">Days cleared</div></div>
<div class="pcell"><div class="n">${ov.dn}</div><div class="l">Tasks done</div></div>
<div class="pcell"><div class="n">${totSessions}</div><div class="l">Total sessions</div></div>
<div class="pcell"><div class="n">${totHours}<i>H</i></div><div class="l">Total hours</div></div>
</div>`));

/* ── streaks — two hairline cells ── */
const pStreakObj = computeStreak();
const pIsFrozen = pStreakObj.hasFrozen && (state.log[todayKey()]||{minutes:0}).minutes === 0;
inner.appendChild(html(`<div class="nt-pstreak">
<div class="pstk ${pIsFrozen?"frozen":""}">
<div class="sk">${pIsFrozen?"FROZEN STREAK":"DAY STREAK"}</div>
<div class="sn">${pStreakObj.count}<i>D</i></div>
<div class="ss">${pIsFrozen?"PROTECTED BY FREEZE":"CONSECUTIVE DAYS"}</div>
</div>
<div class="pstk">
<div class="sk acc">SESSION STREAK</div>
<div class="sn acc">${computeSessionStreak()}</div>
<div class="ss">IN-SLOT FOCUS</div>
</div>
</div>`));

/* ── achievements ── */
const achSection=html(`<div class="nt-pach">
<div class="pachhd"><span class="t">ACHIEVEMENTS</span><span class="c">${ACHIEVEMENTS.filter(a=>state.achievements[a.id]).length} / ${ACHIEVEMENTS.length}</span></div>
</div>`);
achSection.appendChild(buildAchievements());
inner.appendChild(achSection);

/* ── consistency heat map — 5 weeks ── */
const heat=html(`<div class="nt-pcard"><div class="pch">CONSISTENCY · LAST 5 WEEKS</div></div>`);
const tk=todayKey();
let hh='<div class="heatgrid">';
for(let i=34;i>=0;i--){
const d=new Date(); d.setDate(d.getDate()-i);
const k=`${d.getFullYear()}-${fmt(d.getMonth()+1)}-${fmt(d.getDate())}`;
const m=(state.log[k]||{minutes:0}).minutes;
let lvl=0; if(m>0) lvl=1; if(m>=120) lvl=2; if(m>=300) lvl=3; if(m>=480) lvl=4;
const hrsTxt=m===0?"0h (No study)":`${Math.floor(m/60)}h ${m%60}m`;
hh+=`<div class="hcell l${lvl} ${k===tk?"today":""}" title="${k} · ${hrsTxt}" style="animation-delay:${i*9}ms"></div>`; }
hh+='</div><div class="heatleg"><span>0H</span>';
for(let l=0;l<5;l++) hh+=`<span class="hkey l${l}"></span>`;
hh+='<span>8H+</span></div>';
heat.insertAdjacentHTML("beforeend",hh);
inner.appendChild(heat);

/* ── 7-day study bars ── */
const bars=html(`<div class="nt-pcard"><div class="pch">STUDY TIME · LAST 7 DAYS</div></div>`);
let maxM=1; const days=[];
for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i);
const k=`${d.getFullYear()}-${fmt(d.getMonth()+1)}-${fmt(d.getDate())}`;
const e=state.log[k]||{minutes:0}; maxM=Math.max(maxM,e.minutes);
days.push({d,e,isT:i===0}); }
let bh='<div class="barrow">';
days.forEach(({d,e,isT})=>{
const h=Math.max(4,Math.round(e.minutes/maxM*72));
const lbl=e.minutes>=60?(Math.floor(e.minutes/60)+"h"+(e.minutes%60?fmt(e.minutes%60):"")):(e.minutes>0?e.minutes+"m":"");
bh+=`<div class="barcol">
<span class="bv ${e.minutes?(isT?"on":""):"z"}">${lbl||"·"}</span>
<div class="bcap ${e.minutes?(isT?"on":"dim"):"z"}" style="height:${h}px"></div>
<span class="bd ${isT?"on":""}">${WD[d.getDay()]}</span></div>`; });
bh+="</div>";
bars.insertAdjacentHTML("beforeend",bh);
inner.appendChild(bars);

/* ── session quality — evening self-ratings, finally on screen ──
   equalizer trace (last 14 days) + avg + quality↔hours correlation */
(function(){
const entries=[];                              /* [{k,r,m}] rated days, oldest→newest */
for(let i=13;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i);
const k=`${d.getFullYear()}-${fmt(d.getMonth()+1)}-${fmt(d.getDate())}`;
const r=state.ratings[k];
entries.push({k,r:(typeof r==="number"?r:0),m:(state.log[k]||{minutes:0}).minutes,isT:i===0}); }
const rated=Object.keys(state.ratings).filter(k=>typeof state.ratings[k]==="number");
if(!rated.length) return;                      /* nothing rated yet — stay silent */
const avg=rated.reduce((s,k)=>s+state.ratings[k],0)/rated.length;
/* correlation: avg minutes on high-rated (4-5) vs low-rated (1-2) days */
let hiM=0,hiN=0,loM=0,loN=0;
rated.forEach(k=>{ const m=(state.log[k]||{minutes:0}).minutes, r=state.ratings[k];
if(r>=4){ hiM+=m; hiN++; } else if(r<=2){ loM+=m; loN++; } });
const hrs=m=>Math.round(m/60*10)/10;
let insight="RATE EVERY EVENING — THE PATTERN WILL SURFACE";
if(hiN&&loN) insight=`GOOD DAYS AVERAGE ${hrs(hiM/hiN)}H · ROUGH DAYS ${hrs(loM/loN)}H`;
else if(hiN) insight=`YOUR ${rated.length>1?avg.toFixed(1):"5.0"}★ FORM RUNS ON ${hrs(hiM/hiN)}H DAYS`;
const q=html(`<div class="nt-pcard"><div class="pch">SESSION QUALITY · SELF-RATED</div></div>`);
let qh='<div class="qrow"><div class="qavg"><span class="qn">'+avg.toFixed(1)+'</span><span class="qd">AVG · '+rated.length+' DAYS RATED</span></div><div class="qtrace">';
entries.forEach(({r,isT,k,m})=>{
let col=`<div class="qcol ${isT?"today":""}" title="${k} · ${r?r+"/5":"not rated"}${m?" · "+Math.floor(m/60)+"h"+(m%60?m%60:""):""}">`;
for(let l=5;l>=1;l--) col+=`<i class="${r>=l?"on":""} ${r>=4&&r>=l?"hi":""}"></i>`;
qh+=col+"</div>"; });
qh+='</div></div><div class="qinsight">'+insight+'</div>';
q.insertAdjacentHTML("beforeend",qh);
inner.appendChild(q);
})();

/* ── subject completion — segmented per-subject bars ── */
const subj=html(`<div class="nt-pcard"><div class="pch">SUBJECT COMPLETION</div></div>`);
const bySubj={};
SCHED.forEach((d,i)=>{ const b=baseSubj(d.subject);
if(!bySubj[b]) bySubj[b]={tot:0,dn:0};
d.sessions.forEach((s,si)=>{ bySubj[b].tot+=s.tasks.length;
s.tasks.forEach((_,ti)=>{ if(state.checked[`${i}-${si}-${ti}`]) bySubj[b].dn++; }); }); });
let sh='<div class="subjlist">';
const SSEG=16;
Object.keys(bySubj).forEach(name=>{
const e=bySubj[name]; if(!e.tot) return;
const pc=Math.round(e.dn/e.tot*100); if(pc===0&&e.tot<20) return;
const son=Math.round((pc/100)*SSEG);
let segs=""; for(let i=0;i<SSEG;i++) segs+=`<i class="${i<son?"on":""}"></i>`;
sh+=`<div class="subj ${pc===100?"full":""}">
<div class="srow"><span class="sn">${name}</span><span class="sp">${pc}<i>%</i></span></div>
<div class="nt-seg sseg">${segs}</div></div>`; });
sh+="</div>";
subj.insertAdjacentHTML("beforeend",sh);
inner.appendChild(subj);

wrap.appendChild(inner); wireTheme(wrap); return wrap; }

/* ── profile building blocks (shared) ─────────────────── */
function buildMockCard(){
const mk=el("div");
let mh=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px">
<button id="mkAdd" class="btn btn-acc press" style="padding:8px 16px;font-size:12px">+ Log mock</button></div>`;
if(!state.mocks.length){
mh+=`<div style="font-size:12.5px;color:var(--ink-3);text-align:center;padding:8px 0 4px">No mocks logged yet.<br>Score every mock — the trend tells you more than the hours do.</div>`;
}else{
const last=state.mocks.slice(-8);
const pcts=last.map(m=>Math.round(m.score/m.max*100));
const mmax=Math.max(...pcts,1);
mh+=`<div style="display:flex;align-items:flex-end;gap:6px;height:70px;margin-bottom:10px">`;
last.forEach((m,i)=>{ const h=Math.max(6,Math.round(pcts[i]/mmax*64));
const up=i>0&&pcts[i]>=pcts[i-1];
mh+=`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px" title="${m.name} · ${m.score}/${m.max}">
<span class="mono" style="font-size:9px;font-weight:800;color:${up?"var(--acc)":"var(--ink-3)"}">${pcts[i]}%</span>
<div style="width:100%;height:${h}px;border-radius:6px 6px 3px 3px;background:${up?"var(--acc)":"var(--ink-4)"};opacity:${i===last.length-1?1:.55}"></div></div>`; });
mh+=`</div>`;
const lastM=state.mocks[state.mocks.length-1];
const trend=state.mocks.length>1?(pcts[pcts.length-1]-pcts[pcts.length-2]):0;
mh+=`<div style="font-size:11.5px;color:var(--ink-3);font-weight:600">Latest: <b style="color:var(--ink)">${lastM.name}</b> — ${lastM.score}/${lastM.max}${lastM.neg?` · ${lastM.neg} lost to negatives`:""}${state.mocks.length>1?` · <b style="color:${trend>=0?"var(--acc)":"var(--ink-2)"}">${trend>=0?"+":""}${trend}%</b> vs previous`:""}</div>`;
mh+=`<div style="margin-top:10px;max-height:130px;overflow-y:auto">`;
state.mocks.slice().reverse().forEach((m,ri)=>{ const i=state.mocks.length-1-ri;
mh+=`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid var(--line);font-size:12px">
<span class="mono" style="color:var(--ink-4);font-size:10px">${m.date.slice(5)}</span>
<span style="flex:1;color:var(--ink-2);font-weight:600">${m.name}</span>
<span class="mono" style="font-weight:800;color:var(--ink)">${m.score}/${m.max}</span>
<button data-di="${i}" class="press" style="border:none;background:none;color:var(--ink-4);cursor:pointer;font-size:13px">✕</button></div>`; });
mh+=`</div>`; }
mk.innerHTML=mh;
mk.querySelector("#mkAdd").onclick=addMockSheet;
mk.querySelectorAll("[data-di]").forEach(b=>b.onclick=()=>deleteMock(parseInt(b.dataset.di,10)));
return mk; }
function buildShakyCard(){
const shakyKeys=Object.keys(state.shaky);
const sq=el("div");
if(!shakyKeys.length){
sq.innerHTML=`<div style="font-size:12.5px;color:var(--ink-3);text-align:center;padding:8px 0 4px">Nothing flagged. Tap ! on any task in the Plan to queue it for revision.</div>`;
return sq; }
let qh=`<div style="max-height:200px;overflow-y:auto">`;
shakyKeys.forEach(k=>{ const s=state.shaky[k];
qh+=`<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-top:1px solid var(--line)">
<div style="flex:1;min-width:0"><div style="font-size:12.5px;color:var(--ink-2);font-weight:600;line-height:1.4">${s.t}</div>
<div style="font-size:10px;color:var(--ink-4);margin-top:2px;font-weight:600">${s.subj} · ${s.d}</div></div>
<button data-sk="${k}" class="press" style="border:1px solid var(--line-2);background:var(--card-2);color:var(--ink-2);border-radius:9px;padding:5px 10px;cursor:pointer;font-size:10.5px;font-weight:700;flex-shrink:0">Solid now</button></div>`; });
qh+=`</div>`;
sq.innerHTML=qh;
sq.querySelectorAll("[data-sk]").forEach(b=>b.onclick=()=>{ delete state.shaky[b.dataset.sk]; saveJSON(SHAKY_KEY,state.shaky); render(); toast("Cleared — well recovered"); });
return sq; }
function buildAchievements(){
const m=achMetrics();
const nx=nextAchievement();
const ach=el("div");
function fmtUnlockDate(iso){ try{ const d=new Date(iso); return MON[d.getMonth()]+" "+d.getDate()+", "+d.getFullYear(); }catch(e){ return ""; } }
let ah=`<div class="nt-achgrid">`;
ACHIEVEMENTS.forEach(a=>{
const rec=state.achievements[a.id], on=!!rec;
const have=achProgress(a,m), pct=Math.round(have/a.goal*100);
const isNext=nx&&nx.a.id===a.id;
const fresh=on&&rec.at&&(Date.now()-new Date(rec.at).getTime())<8000;
ah+=`<div class="achwrap ${on?"on":"locked"} ${isNext?"next":""} ${fresh?"fresh":""}" title="${a.desc}">
<div class="achicon">${a.icon}</div>
<div class="achtitle">${a.title}</div>
${on?`<div class="achdate">${fmtUnlockDate(rec.at)}</div>`
:isNext?`<div class="achprog"><div class="nt-seg achseg"><i class="${pct>=25?"on":""}"></i><i class="${pct>=50?"on":""}"></i><i class="${pct>=75?"on":""}"></i><i class="${pct>=100?"on":""}"></i></div><div class="achpc">${have} / ${a.goal}</div></div>`
:`<div class="achdate locked">${have} / ${a.goal}</div>`}
</div>`; });
ah+="</div>";
ach.innerHTML=ah;
return ach; }

/* ════════════════ YOU ════════════════ */
let profExp=loadJSON("ese_prof_exp_v1",{badges:true});
function renderYou(){
const wrap=el("div"); wrap.className="screen view";
const inner=el("div"); inner.className="stagger";

/* ── Top Header Command Deck ── */
inner.appendChild(topDeck());

inner.appendChild(header("Profile & Settings","Mastery Dashboard"));

/* identity card */
const streakObj=computeStreak();
const streak=streakObj.count, sstreak=computeSessionStreak();
const unlockedCount=ACHIEVEMENTS.filter(a=>state.achievements[a.id]).length;
const ese=cd(ESE_DATE);
const totMin=Object.values(state.log).reduce((a,e)=>a+(e.minutes||0),0);
inner.appendChild(html(`<div class="nt-you">
<div class="ytop">
<div class="yav">T</div>
<div class="ymeta">
<div class="yname">TEJA</div>
<div class="ysub">ESE 2027 ASPIRANT · ${ese.d}D TO GO</div>
</div>
</div>
<div class="ystats">
<div class="yst"><div class="n">${streak}</div><div class="l">Streak</div></div>
<div class="yst"><div class="n">${sstreak}</div><div class="l">Sessions</div></div>
<div class="yst"><div class="n">${Math.floor(totMin/60)}<i>H</i></div><div class="l">Studied</div></div>
<div class="yst"><div class="n">${unlockedCount}</div><div class="l">Badges</div></div>
</div>
</div>`));

/* accordion */
function acc(id,icon,title,badge,build){
const open=!!profExp[id];
const card=el("div"); card.className="nt-acc";
const head=el("button"); head.className="acchead press";
head.innerHTML=`<span class="ai">${icon}</span>
<span class="at">${title}</span>
${badge?`<span class="ab">${badge}</span>`:""}
<span class="acar ${open?"open":""}">${IC.right}</span>`;
head.onclick=()=>{ profExp[id]=!open; saveJSON("ese_prof_exp_v1",profExp); render(); };
card.appendChild(head);
if(open){ const body=el("div"); body.className="accbody"; body.appendChild(build()); card.appendChild(body); }
return card; }
function rows(list){ const d=el("div"); list.forEach(r=>d.appendChild(r)); return d; }
function row(label,desc,right,onclick){
const r=el("button"); r.className="nt-setrow press";
if(!onclick) r.classList.add("static");
r.innerHTML=`<div class="sl">
<div class="slt">${label}</div>
${desc?`<div class="sld">${desc}</div>`:""}</div>
<div class="sr">${right||""}</div>`;
if(onclick) r.onclick=onclick;
return r; }
function toggleUI(on){
return `<span class="nt-sw ${on?"on":""}"><i></i></span>`; }

const shakyCount=Object.keys(state.shaky).length;
inner.appendChild(acc("badges",IC.trophy,"Achievements",`${unlockedCount} / ${ACHIEVEMENTS.length}`,buildAchievements));
inner.appendChild(acc("mocks",IC.stats,"Mock scores",state.mocks.length?`${state.mocks.length} logged`:"",buildMockCard));
inner.appendChild(acc("shaky",IC.warn,"Revision queue",shakyCount?`${shakyCount} shaky`:"",buildShakyCard));
inner.appendChild(acc("timer",IC.clock,"Timer & notifications","",()=>rows([
row("Auto loop","Cycle focus → break automatically",toggleUI(state.pomo.loop),toggleLoop),
row("Sounds","Chimes for session completion & achievements",toggleUI(state.sound),()=>{ state.sound=!state.sound; saveJSON(SOUND_KEY,state.sound); if(state.sound) playSound("complete"); render(); }),
row("Session notifications","Ping when a focus session or break ends",toggleUI(notifOn()),toggleNotif),
row("Notification status",
`App ${APP_VERSION} · permission: <b>${notifSupported()?Notification.permission:"unsupported"}</b> · pref: ${state.notif?"on":"off"}${notifSupported()&&Notification.permission==="denied"?"<br>Blocked by the system — tap to see the fix":""}`,
"ⓘ",()=>{
if(!notifSupported()){ toast("This browser has no Notification API"); return; }
if(Notification.permission==="granted"){ notify("Test notification","If you can read this, notifications work."); toast("Test sent — did it appear?"); }
else if(Notification.permission==="denied"){
guideSheet("Unblock notifications",
G_NOTE("Android is blocking notifications for this app — the in-app switch can't override it.")+
G_HEAD("If installed as an app (APK)")+
G_STEP(1,"Long-press the ESE2027 icon → App info (ⓘ)")+
G_STEP(2,"Notifications → turn <b>ON</b> and allow all")+
G_STEP(3,"Also open Chrome → ⋮ → Settings → Site settings → Notifications → find your vercel.app URL → <b>Allow</b> (a TWA app follows Chrome's site permission)")+
G_STEP(4,"Reopen this app and toggle Session notifications on")+
G_HEAD("If using in the browser")+
G_STEP(1,"Tap the lock icon in the address bar → Permissions → Notifications → Allow")); }
else{ askNotifPermission().then(()=>render()); toast("Permission dialog requested"); } }),
])));
inner.appendChild(acc("blocking",IC.lock,"Blocking & strict mode",state.block.strict?"armed":"",()=>rows([
row("Strict focus lock","During focus: Stop / Pause / Back need a 5-second hold, Esc is blocked, leaving the app is logged as a distraction",toggleUI(state.block.strict),toggleStrict),
row("Block adult sites — whole device","Free, built into Android & Windows via DNS. Tap for 2-min setup","→",showBlockGuide),
row("Block distracting apps","Uses Android Focus Mode / Windows Focus — tap for setup","→",showAppBlockGuide),
])));
inner.appendChild(acc("app",IC.gear,"App & data","",()=>{
const wrap=el("div");
/* theme picker */
const themeRow=el("div"); themeRow.className="nt-themerow";
const themeLabel=el("div"); themeLabel.className="ntl";
themeLabel.textContent="THEME SUIT";
const themeDesc=el("div"); themeDesc.className="ntd";
themeDesc.textContent="Choose a palette — applies instantly everywhere.";
const grid=el("div"); grid.className="theme-grid";
THEMES.forEach(t=>{
const card=el("button"); card.className=`theme-card ${state.theme===t.id?"on":""}`;
card.setAttribute("data-id",t.id);
card.innerHTML=`<div class="swatch">${t.sw.map(c=>`<i style="background:${c}"></i>`).join("")}</div>
<span class="tname">${t.name}</span>
<span class="tdesc">${t.desc}</span>
<span class="tick">✓</span>`;
card.onclick=()=>setTheme(t.id);
grid.appendChild(card); });
themeRow.appendChild(themeLabel); themeRow.appendChild(themeDesc); themeRow.appendChild(grid);
wrap.appendChild(themeRow);
/* rest of app settings */
return rows([
wrap,
isStandalone()
? row("Installed as app","Running standalone · offline ready","ON")
: row("Install app","Add to home screen — full screen, offline, notifications","⬇",installApp),
row("Backup data","Download all progress as JSON","⬇",exportData),
row("Restore backup","Load a previous backup file","⬆",()=>document.getElementById("importFile").click()),
row("Reset progress","Clears every checked task — cannot be undone","",()=>{
if(confirm("Reset ALL task progress? This cannot be undone.")){ state.checked={}; saveJSON(STORAGE_KEY,state.checked); render(); toast("Progress reset"); } }),
(window.eseSyncUser&&window.eseSyncUser())
? row("Cloud sync","Signed in · progress backs up automatically","ON",async()=>{
if(!confirm("Sign out from cloud sync? Your progress stays on this device.")) return;
try{ if(window.sbAuth) await window.sbAuth.signOut(); }catch(e){}
toast("Signed out — still saved on this device"); render(); })
: row("Cloud sync","Optional — sign in to back up across devices","OFF",()=>{ if(window.eseSignIn) window.eseSignIn(); }),
row("Shortcuts","1-5 tabs · T theme · Z undo · Space timer",""),
]); }));

inner.appendChild(html(`<div class="nt-youfoot">ESE<span class="sl">//</span>2027 STUDY OS · ${APP_VERSION}<br>BUILT FOR ONE GOAL — JAN 31 2027</div>`));
wrap.appendChild(inner); wireTheme(wrap); return wrap; }

/* ════════════════ ACHIEVEMENTS ════════════════ */
/* icon = dot-matrix goal numeral (rendered in --display-font); all 30 kept */
const ACHIEVEMENTS=[
{id:"first_session",icon:"01",title:"First Focus Session",desc:"Complete your first timed session",goal:1,type:"sessions"},
{id:"first_day",icon:"D1",title:"Day One Done",desc:"Clear every task of a day",goal:1,type:"days"},
{id:"sessions10",icon:"10",title:"10 Sessions",desc:"Ten focus sessions in the bank",goal:10,type:"sessions"},
{id:"sessions50",icon:"50",title:"50 Sessions",desc:"Fifty rounds of deep work",goal:50,type:"sessions"},
{id:"sessions150",icon:"150",title:"150 Sessions",desc:"A hundred and fifty battles fought",goal:150,type:"sessions"},
{id:"streak3",icon:"3D",title:"3-Day Streak",desc:"Study three days in a row",goal:3,type:"streak"},
{id:"streak7",icon:"7D",title:"7-Day Streak",desc:"A full week without breaking",goal:7,type:"streak"},
{id:"streak30",icon:"30D",title:"30-Day Streak",desc:"One month of pure discipline",goal:30,type:"streak"},
{id:"streak60",icon:"60D",title:"60-Day Streak",desc:"Two months. Relentless",goal:60,type:"streak"},
{id:"streak100",icon:"100",title:"100-Day Streak",desc:"Triple digits of consistency",goal:100,type:"streak"},
{id:"sstreak3",icon:"S3",title:"On Schedule ×3",desc:"3-day session streak — in-slot focus",goal:3,type:"sstreak"},
{id:"sstreak7",icon:"S7",title:"On Schedule ×7",desc:"A week of hitting your slots",goal:7,type:"sstreak"},
{id:"sstreak21",icon:"S21",title:"Slot Sniper",desc:"21 days of in-slot discipline",goal:21,type:"sstreak"},
{id:"hours10",icon:"10H",title:"10 Study Hours",desc:"Ten hours of tracked focus",goal:10,type:"hours"},
{id:"hours50",icon:"50H",title:"50 Study Hours",desc:"Fifty hours — serious momentum",goal:50,type:"hours"},
{id:"hours100",icon:"100",title:"100 Study Hours",desc:"Triple digits. Elite territory",goal:100,type:"hours"},
{id:"hours250",icon:"250",title:"250 Study Hours",desc:"A quarter-thousand hours deep",goal:250,type:"hours"},
{id:"hours500",icon:"500",title:"500 Study Hours",desc:"Half a thousand. Rank material",goal:500,type:"hours"},
{id:"tasks100",icon:"100",title:"100 Tasks Done",desc:"A hundred boxes ticked",goal:100,type:"tasks"},
{id:"tasks500",icon:"500",title:"500 Tasks Done",desc:"Five hundred steps closer",goal:500,type:"tasks"},
{id:"tasks1000",icon:"1K",title:"1000 Tasks Done",desc:"A thousand. Unstoppable",goal:1000,type:"tasks"},
{id:"tasks2000",icon:"2K",title:"2000 Tasks Done",desc:"Two thousand. Monumental",goal:2000,type:"tasks"},
{id:"days10",icon:"10D",title:"10 Days Cleared",desc:"Ten perfect days",goal:10,type:"days"},
{id:"days50",icon:"50D",title:"50 Days Cleared",desc:"Fifty flawless days",goal:50,type:"days"},
{id:"days100",icon:"100",title:"100 Days Cleared",desc:"One hundred perfect days",goal:100,type:"days"},
{id:"mock1",icon:"M1",title:"First Mock Logged",desc:"Face the scoreboard once",goal:1,type:"mocks"},
{id:"mock5",icon:"M5",title:"5 Mocks Logged",desc:"Five honest data points",goal:5,type:"mocks"},
{id:"mock15",icon:"M15",title:"15 Mocks Logged",desc:"Fifteen tests faced head-on",goal:15,type:"mocks"},
{id:"subject1",icon:"S//1",title:"First Subject Mastered",desc:"Finish 100% of any subject",goal:1,type:"subjects"},
{id:"subject3",icon:"S//3",title:"Three Subjects Down",desc:"Master three full subjects",goal:3,type:"subjects"},
];
function achMetrics(){
let sessions=0,minutes=0;
Object.values(state.log).forEach(e=>{ sessions+=e.sessions||0; minutes+=e.minutes||0; });
const tasks=Object.values(state.checked).filter(Boolean).length;
const bySubj={};
SCHED.forEach((d,i)=>{ const b=baseSubj(d.subject);
if(!bySubj[b]) bySubj[b]={tot:0,dn:0};
d.sessions.forEach((s,si)=>{ bySubj[b].tot+=s.tasks.length;
s.tasks.forEach((_,ti)=>{ if(state.checked[`${i}-${si}-${ti}`]) bySubj[b].dn++; }); }); });
const subjects=Object.values(bySubj).filter(e=>e.tot>=30&&e.dn===e.tot).length;
return {sessions,hours:Math.floor(minutes/60),tasks,days:doneDaysCount(),streak:computeStreak().count,subjects,sstreak:computeSessionStreak(),mocks:state.mocks.length}; }
function achProgress(a,m){ const v=m[a.type]||0; return Math.min(v,a.goal); }
function checkAchievements(){
const m=achMetrics();
for(const a of ACHIEVEMENTS){
if(state.achievements[a.id]) continue;
if((m[a.type]||0)>=a.goal){
state.achievements[a.id]={at:new Date().toISOString()};
saveJSON(ACH_KEY,state.achievements);
setTimeout(()=>celebrateBadge(a),300);
return a; } }
return null; }
function nextAchievement(){
const m=achMetrics();
let best=null,bestPct=-1;
for(const a of ACHIEVEMENTS){
if(state.achievements[a.id]) continue;
const pct=achProgress(a,m)/a.goal;
if(pct>bestPct){ bestPct=pct; best=a; } }
return best?{a:best,have:achProgress(best,m),pct:Math.round(bestPct*100)}:null; }

/* ── confetti engine (canvas, spring physics, 60fps) ──── */
function fireConfetti(opts){
if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
const o=Object.assign({count:140,spread:1,power:1},opts);
let cv=document.getElementById("confettiCanvas");
if(!cv){ cv=document.createElement("canvas"); cv.id="confettiCanvas"; document.body.appendChild(cv); }
const ctx=cv.getContext("2d");
cv.width=innerWidth*devicePixelRatio; cv.height=innerHeight*devicePixelRatio;
ctx.scale(devicePixelRatio,devicePixelRatio);
const isL=document.body.classList.contains("light");
/* Nothing palette — red / white / grey only, no rainbow */
const colors=isL?["#D71921","#000000","#5A5A5A","#9A9A9A","#D71921"]
:["#D71921","#FFFFFF","#9A9A9A","#5A5A5A","#D71921"];
const parts=[];
const cx=innerWidth/2, cy=innerHeight*0.42;
for(let i=0;i<o.count;i++){
const ang=(Math.random()*Math.PI*2), v=(6+Math.random()*11)*o.power;
parts.push({
x:cx+(Math.random()-0.5)*40, y:cy+(Math.random()-0.5)*40,
vx:Math.cos(ang)*v*o.spread, vy:Math.sin(ang)*v-9,
w:5+Math.random()*6, h:8+Math.random()*8,
rot:Math.random()*Math.PI*2, vr:(Math.random()-0.5)*0.32,
c:colors[i%colors.length],
shape:Math.random()<0.12?"circle":"rect",
life:1, decay:0.006+Math.random()*0.008, wob:Math.random()*Math.PI*2 }); }
let raf;
function step(){
ctx.clearRect(0,0,innerWidth,innerHeight);
let alive=false;
for(const p of parts){
if(p.life<=0) continue; alive=true;
p.vy+=0.32; p.vx*=0.985; p.vy*=0.99;
p.wob+=0.12; p.x+=p.vx+Math.sin(p.wob)*0.7; p.y+=p.vy; p.rot+=p.vr;
p.life-=p.decay;
ctx.save(); ctx.globalAlpha=Math.max(0,p.life);
ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle=p.c;
if(p.shape==="circle"){ ctx.beginPath(); ctx.arc(0,0,p.w/2,0,Math.PI*2); ctx.fill(); }
else ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h*Math.abs(Math.cos(p.wob*0.55)));
ctx.restore(); }
if(alive) raf=requestAnimationFrame(step);
else { ctx.clearRect(0,0,innerWidth,innerHeight); cv.remove(); } }
cancelAnimationFrame(raf); step(); }

/* ── celebration popup (badge unlock / day conquered) ─── */
let celebrating=false;
function showCelebration({eyebrow,icon,title,sub,next,cta}){
if(celebrating) return; celebrating=true;
const prevFocus=document.activeElement;
const ov=el("div"); ov.id="celebrate";
ov.setAttribute("role","dialog"); ov.setAttribute("aria-modal","true"); ov.setAttribute("aria-label",title);
/* next study session of the current day */
const day=SCHED[state.index]; let nxtSess=null;
if(day&&day.sessions){ const si=day.sessions.findIndex((s,i)=>!s.tasks.every((_,ti)=>state.checked[`${state.index}-${i}-${ti}`]));
if(si>=0){ const s=day.sessions[si], slot=SLOTS[si]||{}; nxtSess={icon:"S"+(si+1),time:slot.time||"",title:s.title}; } }
ov.innerHTML=`
<div class="celebrate-stage">
<div class="medallion">
<div class="burst"></div>
<div class="halo"></div>
<div class="core">${icon}</div>
</div>
<div class="celebrate-eyebrow">${eyebrow}</div>
<div class="celebrate-title">${title}</div>
<div class="celebrate-stamp"><span class="celebrate-seal">${IC.check}</span></div>
<div class="celebrate-sub">${sub}</div>
${(nxtSess||next)?`<div class="celebrate-next">
${nxtSess?`<div class="nrow">
<span class="nchip">${nxtSess.icon}</span>
<div style="flex:1;min-width:0">
<div style="font-family:var(--mono-font);font-size:9.5px;font-weight:700;color:var(--acc);letter-spacing:.18em;text-transform:uppercase">Next session · ${nxtSess.time}</div>
<div style="font-size:12.5px;font-weight:700;color:var(--ink);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nxtSess.title}</div>
</div></div>`:""}
${next?`<div class="nrow">
<span class="nchip dim">${next.a.icon}</span>
<div style="flex:1;min-width:0">
<div style="font-family:var(--mono-font);font-size:9.5px;font-weight:700;color:var(--ink-4);letter-spacing:.18em;text-transform:uppercase">Next achievement</div>
<div style="font-size:11px;font-weight:700;color:var(--ink-2);margin-top:2px">${next.a.title}</div>
<div class="nt-seg" style="margin-top:6px"><i class="${next.pct>=25?"on":""}"></i><i class="${next.pct>=50?"on":""}"></i><i class="${next.pct>=75?"on":""}"></i><i class="${next.pct>=100?"on":""}"></i></div>
<div style="font-family:var(--mono-font);font-size:10px;color:var(--ink-4);margin-top:4px;font-weight:700">${next.have} / ${next.a.goal} · ${next.pct}%</div>
</div></div>`:""}
</div>`:""}
<button class="btn btn-acc press celebrate-cta">${cta||"Keep going"}</button>
</div>`;
function close(){
ov.classList.remove("in");
setTimeout(()=>{ ov.remove(); celebrating=false;
if(prevFocus&&prevFocus.focus) prevFocus.focus();
/* chain: check if another badge also unlocked */
checkAchievements(); },240);
document.removeEventListener("keydown",onKey,true); }
function onKey(e){ if(e.key==="Escape"||e.key==="Enter"){ e.preventDefault(); close(); } }
ov.querySelector(".celebrate-cta").onclick=close;
ov.onclick=e=>{ if(e.target===ov) close(); };
document.addEventListener("keydown",onKey,true);
document.body.appendChild(ov);
requestAnimationFrame(()=>ov.classList.add("in"));
try{ navigator.vibrate&&navigator.vibrate([90,40,90,40,150]); }catch(e){}
fireConfetti({count:150,power:1.15});
setTimeout(()=>fireConfetti({count:60,power:0.7}),450);
const btn=ov.querySelector(".celebrate-cta"); if(btn) setTimeout(()=>btn.focus(),650); }
function celebrateBadge(a){
playSound("achievement");
const n=nextAchievement();
const LINES=["That's how ranks are built.","Momentum looks good on you.","The syllabus is shrinking.","Consistency is your superpower.","Another brick in the wall."];
showCelebration({eyebrow:"Achievement unlocked",icon:a.icon,title:a.title,
sub:a.desc+". "+LINES[Math.floor(Math.random()*LINES.length)],
next:n,cta:"Claim it"}); }
function celebrateDay(){
playSound("day");
const day=SCHED[state.index];
const streak=computeStreak().count;
const n=nextAchievement();
showCelebration({eyebrow:"Day conquered",icon:"100",
title:day.date+" — 100%",
sub:`Every task of "${day.subject}" is done.${streak>1?` ${streak}-day streak alive.`:""} Tomorrow builds on today.`,
next:n,cta:"On to tomorrow"}); }

/* ════════════════ RENDER CORE ════════════════ */
function applyTheme(){
document.documentElement.setAttribute("data-theme",state.theme);
document.body.classList.toggle("light",isLightTheme(state.theme));
const tc=document.querySelector('meta[name="theme-color"]');
if(tc) tc.setAttribute("content",themeMeta(state.theme)); }
function setTheme(id){
if(!THEME_IDS.includes(id)) return;
state.theme=id; saveJSON(THEME_KEY,id); applyTheme(); render();
const t=THEMES.find(x=>x.id===id); toast(t.name); }
/* the top-deck sun/moon key promises a light ⇄ dark toggle,
   so jump between families here; the full 4-suit picker
   (Mono Black / Glyph Lime / Arctic Ice / Mono White) lives in You. */
function cycleTheme(){
setTheme(isLightTheme(state.theme)?"ember":"paper"); }

function render(quiet){
document.body.classList.toggle("no-stagger", !!quiet);
applyTheme();
syncPomoState();
syncWakeLock();
/* migrate old nav values */
if(state.nav==="home") state.nav="today";
if(state.nav==="stats") state.nav="progress";
if(state.nav==="settings") state.nav="you";
/* build the new screen OFF-DOM, then swap atomically — never blank the view (kills the blink) */
let screen;
if(state.nav==="today") screen=renderToday();
else if(state.nav==="plan") screen=renderPlan();
else if(state.nav==="focus") screen=renderFocus();
else if(state.nav==="progress") screen=renderProgress();
else if(state.nav==="you") screen=renderYou();
else screen=renderToday(); /* fallback */
view.replaceChildren(screen);
renderNav(); renderTimerDock(); updateLandscape(); }
/* re-render in place (task toggles) without replaying the entrance animation */
function renderQuiet(){ render(true); }
function renderNav(){
navEl.innerHTML="";
[["today","Today",IC.home],["plan","Plan",IC.plan],["focus","Focus",IC.focus],["progress","Progress",IC.stats],["you","You",IC.settings]].forEach(([id,label,icon])=>{
const b=el("button"); b.className="navbtn press"+(state.nav===id?" active":"");
b.setAttribute("aria-label",label);
b.setAttribute("aria-current",state.nav===id?"page":"false");
b.innerHTML=icon+`<span>${label}</span>`;
b.onclick=()=>setNav(id);
navEl.appendChild(b); }); }

/* ── docked timer + customization drawer + focus overlay ─────── */
let dockDrawerOpen = false;

function toggleDockDrawer(){
dockDrawerOpen = !dockDrawerOpen;
renderTimerDockDrawer();
const customBtn = document.querySelector("#timerDock #dockCustom");
if(customBtn) customBtn.classList.toggle("active", dockDrawerOpen);
}

function closeTimerDockDrawer(){
dockDrawerOpen = false;
const drawer = document.getElementById("timerDockDrawer");
if(drawer) drawer.remove();
const customBtn = document.querySelector("#timerDock #dockCustom");
if(customBtn) customBtn.classList.remove("active");
}

function renderTimerDockDrawer(){
let drawer = document.getElementById("timerDockDrawer");
if(!dockDrawerOpen){
if(drawer) drawer.remove();
return;
}
if(!drawer){
drawer = el("div"); drawer.id="timerDockDrawer";
drawer.className = "card";
document.body.appendChild(drawer);
}

drawer.innerHTML = `
<div class="ddrawer-header">
<span class="ddrawer-title">QUICK TIMER CUSTOMIZATION</span>
<button class="ddrawer-close press" id="dockDrawerClose">✕</button>
</div>
<div class="ddrawer-presets">
${PRESETS.map(p=>`
<button class="dpreset-chip press ${state.pomo.workMins===p.work&&state.pomo.breakMins===p.brk?'active':''}"
data-work="${p.work}" data-brk="${p.brk}">
${p.label}
</button>
`).join("")}
</div>
<div class="ddrawer-grid">
<div class="ddrawer-box">
<span class="ddrawer-lbl">Focus: <b>${state.pomo.workMins}m</b></span>
<div style="display:flex;gap:4px">
<button class="ddrawer-btn press" data-target="work" data-delta="-5">−5m</button>
<button class="ddrawer-btn press" data-target="work" data-delta="5">+5m</button>
</div>
</div>
<div class="ddrawer-box">
<span class="ddrawer-lbl">Break: <b>${state.pomo.breakMins}m</b></span>
<div style="display:flex;gap:4px">
<button class="ddrawer-btn press" data-target="break" data-delta="-5">−5m</button>
<button class="ddrawer-btn press" data-target="break" data-delta="5">+5m</button>
</div>
</div>
</div>
<div style="display:flex;gap:8px;margin-top:10px">
<button class="press ddrawer-action ${state.pomo.loop?'active':''}" id="dockLoopBtn" style="flex:1">
Loop: ${state.pomo.loop ? "ON" : "OFF"}
</button>
<button class="press ddrawer-action" id="dockPhaseBtn" style="flex:1">
${state.pomo.phase === "work" ? "Focus Phase" : "Break Phase"}
</button>
<button class="press ddrawer-action" id="dockFullscreenBtn" style="flex:none" title="Expand Full Screen">
${IC.expand} Overlay
</button>
</div>
<div style="margin-top:10px;padding:10px;border-radius:12px;background:var(--card-2);border:1px solid var(--border)">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
<span style="font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)">${IC.head} AMBIENT FOCUS AUDIO</span>
<span style="font-size:10px;font-weight:700;color:var(--acc)">${currentSoundMode.toUpperCase()}</span>
</div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">
<button class="press dsound-btn ${currentSoundMode==='off'?'active':''}" data-mode="off" style="padding:6px;border-radius:8px;font-size:10.5px;font-weight:700;border:1px solid ${currentSoundMode==='off'?'var(--acc)':'var(--line-2)'};background:${currentSoundMode==='off'?'var(--acc-dim)':'var(--surface-2)'};color:${currentSoundMode==='off'?'var(--acc)':'var(--ink-2)'};cursor:pointer">Off</button>
<button class="press dsound-btn ${currentSoundMode==='gamma40'?'active':''}" data-mode="gamma40" style="padding:6px;border-radius:8px;font-size:10.5px;font-weight:700;border:1px solid ${currentSoundMode==='gamma40'?'var(--acc)':'var(--line-2)'};background:${currentSoundMode==='gamma40'?'var(--acc-dim)':'var(--surface-2)'};color:${currentSoundMode==='gamma40'?'var(--acc)':'var(--ink-2)'};cursor:pointer">40Hz</button>
<button class="press dsound-btn ${currentSoundMode==='beta17'?'active':''}" data-mode="beta17" style="padding:6px;border-radius:8px;font-size:10.5px;font-weight:700;border:1px solid ${currentSoundMode==='beta17'?'var(--acc)':'var(--line-2)'};background:${currentSoundMode==='beta17'?'var(--acc-dim)':'var(--surface-2)'};color:${currentSoundMode==='beta17'?'var(--acc)':'var(--ink-2)'};cursor:pointer">17Hz</button>
<button class="press dsound-btn ${currentSoundMode==='alpha10'?'active':''}" data-mode="alpha10" style="padding:6px;border-radius:8px;font-size:10.5px;font-weight:700;border:1px solid ${currentSoundMode==='alpha10'?'var(--acc)':'var(--line-2)'};background:${currentSoundMode==='alpha10'?'var(--acc-dim)':'var(--surface-2)'};color:${currentSoundMode==='alpha10'?'var(--acc)':'var(--ink-2)'};cursor:pointer">10Hz</button>
</div>
</div>
`;

drawer.querySelector("#dockDrawerClose").onclick = closeTimerDockDrawer;
drawer.querySelectorAll(".dpreset-chip").forEach(b => {
b.onclick = () => {
applyPreset(parseInt(b.dataset.work, 10), parseInt(b.dataset.brk, 10));
renderTimerDockDrawer();
};
});
drawer.querySelectorAll(".ddrawer-btn").forEach(b => {
b.onclick = () => {
adjustDuration(b.dataset.target, parseInt(b.dataset.delta, 10));
renderTimerDockDrawer();
};
});
drawer.querySelectorAll(".dsound-btn").forEach(b => {
b.onclick = () => {
setFocusSoundMode(b.dataset.mode);
renderTimerDockDrawer();
};
});
drawer.querySelector("#dockLoopBtn").onclick = () => {
toggleLoop();
renderTimerDockDrawer();
};
drawer.querySelector("#dockPhaseBtn").onclick = () => {
setPhase(state.pomo.phase === "work" ? "break" : "work");
renderTimerDockDrawer();
};
drawer.querySelector("#dockFullscreenBtn").onclick = () => {
closeTimerDockDrawer();
expandFocusOverlay();
};
}

function renderTimerDock(){
try{
let existing=document.getElementById("timerDock");
const isDockActive = state.pomo.docked !== false;
if(!isDockActive){
if(existing){ existing.classList.remove("show"); closeTimerDockDrawer(); }
return;
}
if(!SCHED||!SCHED[state.index]){ if(existing) existing.classList.remove("show"); return; }
const rem=getRemainingPomo();
const mm=Math.floor(rem/60), ss=rem%60;
const timeStr=`${fmt(mm)}:${fmt(ss)}`;
const phaseLabel=state.pomo.phase==="work"?"FOCUS":"BREAK";
let taskTitle="Study session";
try{
const fd=SCHED[state.index];
if(fd&&fd.sessions){
const curSession=fd.sessions.find((_,si)=>!fd.sessions[si].tasks.every((_,ti)=>state.checked[`${state.index}-${si}-${ti}`]));
if(curSession&&curSession.subject) taskTitle=curSession.subject.split("—")[0].trim();
else if(fd.subject) taskTitle=fd.subject.split("—")[0].trim();
}
}catch(err){}

if(!existing){
existing=el("div"); existing.id="timerDock"; existing.className="show";
existing.innerHTML=`
<div class="dtime-box" id="dockTimeBox">
<div class="dtime">${timeStr}</div>
<div class="dphase">${phaseLabel}</div>
</div>
<div class="dmeta" id="dockMeta">
<div class="dtask">${taskTitle}</div>
</div>
<button class="dbtn press main" id="dockPlayPause">${state.pomo.running?IC.pause:IC.play}</button>
`;
document.body.appendChild(existing);

existing.querySelector("#dockTimeBox").onclick=()=>expandFocusOverlay();
existing.querySelector("#dockMeta").onclick=()=>expandFocusOverlay();
existing.querySelector("#dockPlayPause").onclick=(e)=>{ e.stopPropagation(); toggleRunning(); };
}else{
existing.classList.add("show");
existing.querySelector(".dtime").textContent=timeStr;
existing.querySelector(".dphase").textContent=phaseLabel;
existing.querySelector(".dtask").textContent=taskTitle;
existing.querySelector("#dockPlayPause").innerHTML=state.pomo.running?IC.pause:IC.play;
const customBtn = existing.querySelector("#dockCustom");
if(customBtn) customBtn.classList.toggle("active", dockDrawerOpen);
}
if(dockDrawerOpen) renderTimerDockDrawer();
}catch(e){ console.error("renderTimerDock error:",e); }
}

function updateOverlayUI(ov){
if(!ov) return;
const rem=getRemainingPomo(), secs=phaseSecs();
const mm=Math.floor(rem/60), ss=rem%60;
const phaseLabel=state.pomo.phase==="work"?"FOCUS":"BREAK";
const pct=secs?Math.round((1-rem/secs)*100):0;
const phaseChip=ov.querySelector(".fchip"); if(phaseChip) phaseChip.textContent=phaseLabel;
const bignum=ov.querySelector(".bignum"); if(bignum) bignum.textContent=`${fmt(mm)}:${fmt(ss)}`;
const bigsub=ov.querySelector(".bigsub"); if(bigsub) bigsub.textContent=state.pomo.phase==="work"?"MINUTES FOCUS":"MINUTES BREAK";
const svg=ov.querySelector(".breather svg circle:last-child");
if(svg){ const c=parseFloat(svg.getAttribute("stroke-dasharray"))||597; svg.setAttribute("stroke-dashoffset",c*(1-pct/100)); }
const toggleBtn=ov.querySelector("#fToggle"); if(toggleBtn) toggleBtn.innerHTML=state.pomo.running?IC.pause:IC.play;
const loopBtn=ov.querySelector("#fLoopBtn");
if(loopBtn){
loopBtn.style.borderColor=state.pomo.loop?"var(--acc)":"var(--line-2)";
loopBtn.style.color=state.pomo.loop?"var(--acc)":"var(--ink-2)";
loopBtn.textContent=`Auto Loop: ${state.pomo.loop?"ON":"OFF"}`;
}
ov.querySelectorAll(".fpreset-chip").forEach(btn=>{
const w=parseInt(btn.dataset.work,10), b=parseInt(btn.dataset.brk,10);
const active=state.pomo.workMins===w&&state.pomo.breakMins===b;
btn.style.borderColor=active?"var(--acc)":"var(--line-2)";
btn.style.color=active?"var(--acc)":"var(--ink-2)";
btn.style.background=active?"var(--acc-dim)":"var(--card-2)";
});
const wVal=ov.querySelector("#fWorkVal"); if(wVal) wVal.textContent=`${state.pomo.workMins}m Focus`;
const bVal=ov.querySelector("#fBreakVal"); if(bVal) bVal.textContent=`${state.pomo.breakMins}m Break`;
}

function expandFocusOverlay(){
try{
if(!SCHED||!SCHED[state.index]) return;
let ov=document.getElementById("focusOverlay");
if(!ov){
ov=el("div"); ov.id="focusOverlay";
const rem=getRemainingPomo(), secs=phaseSecs();
const mm=Math.floor(rem/60), ss=rem%60;
const phaseLabel=state.pomo.phase==="work"?"FOCUS":"BREAK";
const fd=SCHED[state.index];
const curSession=fd.sessions.find((_,si)=>!fd.sessions[si].tasks.every((_,ti)=>state.checked[`${state.index}-${si}-${ti}`]));
const taskTitle=curSession?(curSession.subject||curSession.title||"Study session").split("—")[0].trim():"Study session";
const pct=secs?Math.round((1-rem/secs)*100):0;  ov.innerHTML=`
<div class="foverlay-stack">
<div class="foverlay-header">
<button class="fbtn-sub press" id="fSettings">${IC.gear} Full Focus View</button>
<button class="fexit press">Done ✕</button>
</div>
<button class="fchip press" id="fPhaseToggle" title="Switch Focus/Break">${phaseLabel}</button>
<div class="breather">
<div class="halo"></div>  ${ring(200,10,pct,"var(--acc)","var(--card-2)")}
<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
<div class="bignum">${fmt(mm)}:${fmt(ss)}</div>
<div class="bigsub">${state.pomo.phase==="work"?"MINUTES FOCUS":"MINUTES BREAK"}</div>
</div>
</div>
<div class="ftask">
<div class="fk">CURRENT TASK</div>
<div class="ft">${taskTitle}</div>
</div>
<div class="fctrl">
<button class="fbtn press" id="fSkip" title="Skip phase">${IC.skip}</button>
<button class="fbtn main press" id="fToggle" title="Play/Pause">${state.pomo.running?IC.pause:IC.play}</button>
<button class="fbtn press" id="fReset" title="Reset timer">${IC.stop}</button>
</div>
<div class="fcustom-panel">
<div class="fcustom-title">CUSTOMIZE SESSION TIMING</div>
<div class="fpresets-row">
${PRESETS.map(p=>`
<button class="fpreset-chip press" data-work="${p.work}" data-brk="${p.brk}"
style="cursor:pointer;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:700;font-family:var(--mono-font);
border:1px solid ${state.pomo.workMins===p.work&&state.pomo.breakMins===p.brk?"var(--acc)":"var(--line-2)"};
color:${state.pomo.workMins===p.work&&state.pomo.breakMins===p.brk?"var(--acc)":"var(--ink-2)"};
background:${state.pomo.workMins===p.work&&state.pomo.breakMins===p.brk?"var(--acc-dim)":"var(--card-2)"}">
${p.label}
</button>
`).join("")}
</div>
<div class="fsteppers-grid">
<div class="fstepper-box">
<span id="fWorkVal" style="font-size:12px;font-weight:700;color:var(--ink-2)">${state.pomo.workMins}m Focus</span>
<div style="display:flex;gap:6px">
<button class="fstep-btn press" data-target="work" data-delta="-5">−5m</button>
<button class="fstep-btn press" data-target="work" data-delta="5">+5m</button>
</div>
</div>
<div class="fstepper-box">
<span id="fBreakVal" style="font-size:12px;font-weight:700;color:var(--ink-2)">${state.pomo.breakMins}m Break</span>
<div style="display:flex;gap:6px">
<button class="fstep-btn press" data-target="break" data-delta="-5">−5m</button>
<button class="fstep-btn press" data-target="break" data-delta="5">+5m</button>
</div>
</div>
</div>
<button class="press" id="fLoopBtn" style="margin-top:10px;width:100%;padding:10px;border-radius:12px;
border:1px solid ${state.pomo.loop?"var(--acc)":"var(--line-2)"};
background:var(--card-2);color:${state.pomo.loop?"var(--acc)":"var(--ink-2)"};
font-size:12px;font-weight:700;cursor:pointer">  Auto Loop: ${state.pomo.loop?"ON":"OFF"}
</button>
</div>
</div>`;
document.body.appendChild(ov);
ov.querySelector(".fexit").onclick=collapseFocusOverlay;
ov.querySelector("#fSettings").onclick=()=>{ collapseFocusOverlay(); setNav("focus"); };
ov.querySelector("#fPhaseToggle").onclick=()=>{ setPhase(state.pomo.phase==="work"?"break":"work"); updateOverlayUI(ov); };
ov.querySelector("#fToggle").onclick=()=>{ toggleRunning(); updateOverlayUI(ov); };
ov.querySelector("#fSkip").onclick=()=>{ skipPhase(); updateOverlayUI(ov); };
ov.querySelector("#fReset").onclick=()=>{ resetPomo(); updateOverlayUI(ov); };
ov.querySelectorAll(".fpreset-chip").forEach(btn=>{
btn.onclick=()=>{
const w=parseInt(btn.dataset.work,10), b=parseInt(btn.dataset.brk,10);
applyPreset(w,b); updateOverlayUI(ov);
};
});
ov.querySelectorAll(".fstep-btn").forEach(btn=>{
btn.onclick=()=>{
const target=btn.dataset.target, delta=parseInt(btn.dataset.delta,10);
adjustDuration(target,delta); updateOverlayUI(ov);
};
});
ov.querySelector("#fLoopBtn").onclick=()=>{ toggleLoop(); updateOverlayUI(ov); };
requestAnimationFrame(()=>{ ov.classList.add("active"); ov.scrollTop=0; });
}else{
updateOverlayUI(ov);
ov.classList.add("active");
}
}catch(e){ console.error("expandFocusOverlay error:",e); }
}
function collapseFocusOverlay(){
try{
const ov=document.getElementById("focusOverlay");
if(ov){
ov.classList.remove("active");
setTimeout(()=>ov.remove(),350);
}
state.pomo.docked=true;
saveJSON(POMO_KEY,state.pomo);
renderTimerDock();
}catch(e){ console.error("collapseFocusOverlay error:",e); }
}


/* ── global shortcuts ─────────────────────────────────── */
document.addEventListener("keydown",e=>{
/* flip clock: Esc = back to normal UI */
if(e.key==="Escape"&&clockOn){ e.preventDefault(); if(strictActive()){ toast("Strict mode — hold the Back button 5s"); return; } leaveClock(); return; }
const t=e.target;
if(t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA"||t.tagName==="SELECT"||t.isContentEditable)) return;
if(e.ctrlKey||e.metaKey||e.altKey) return;
switch(e.key){
case "1": setNav("today"); break;
case "2": setNav("plan"); break;
case "3": setNav("focus"); break;
case "4": setNav("progress"); break;
case "5": setNav("you"); break;
case "t": case "T": cycleTheme(); break;
case " ": if(state.pomo.running||state.nav==="today"){ e.preventDefault(); if(strictActive()){ toast("Strict mode — hold Pause on the clock"); break; } toggleRunning(); } break;
case "ArrowLeft": if(state.nav==="plan"&&state.index>0) navDay(-1); break;
case "ArrowRight": if(state.nav==="plan"&&state.index<SCHED.length-1) navDay(1); break;
case "z": case "Z": undoLast(); break; } });

/* ── blocking setup guides (device-level, free, no app) ── */
function guideSheet(title,bodyHtml){
const prevFocus=document.activeElement;
const scrim=el("div"); scrim.className="scrim";
scrim.setAttribute("role","dialog"); scrim.setAttribute("aria-modal","true"); scrim.setAttribute("aria-label",title);
const sheet=el("div"); sheet.className="sheet";
sheet.innerHTML=`<div style="padding:22px 22px 8px">
<div class="display" style="font-size:19px;font-weight:800;color:var(--ink)">${title}</div></div>
<div style="padding:0 22px;max-height:56vh;overflow-y:auto;font-size:13px;line-height:1.65;color:var(--ink-2)">${bodyHtml}</div>
<div style="padding:14px 22px 20px"><button class="btn btn-acc press" style="width:100%">Got it</button></div>`;
function close(){ scrim.classList.remove("in"); setTimeout(()=>{ scrim.remove(); if(prevFocus&&prevFocus.focus) prevFocus.focus(); },200);
document.removeEventListener("keydown",onKey,true); }
function onKey(e){ if(e.key==="Escape"){ e.preventDefault(); close(); } }
sheet.querySelector("button").onclick=close;
scrim.onclick=e=>{ if(e.target===scrim) close(); };
document.addEventListener("keydown",onKey,true);
scrim.appendChild(sheet); document.body.appendChild(scrim);
requestAnimationFrame(()=>scrim.classList.add("in")); }
const G_STEP=(n,t)=>`<div style="display:flex;gap:10px;margin:10px 0"><span style="flex-shrink:0;width:22px;height:22px;border-radius:50%;background:var(--acc-dim);color:var(--acc);font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center">${n}</span><span>${t}</span></div>`;
const G_HEAD=t=>`<div style="font-weight:800;color:var(--ink);margin:16px 0 2px;font-size:13.5px">${t}</div>`;
const G_NOTE=t=>`<div style="background:var(--card-2);border-radius:12px;padding:10px 14px;margin:10px 0;font-size:12px;color:var(--ink-3)">${t}</div>`;
function showBlockGuide(){
guideSheet("Block adult sites — whole device",
G_NOTE("This uses <b>CleanBrowsing</b>, a free family DNS. It blocks adult content in <b>every app and browser</b> on the device — no app install, no account.")+
G_HEAD("Android")+
G_STEP(1,"Settings → Network &amp; Internet → <b>Private DNS</b>")+
G_STEP(2,"Choose \"Private DNS provider hostname\"")+
G_STEP(3,"Enter: <b>adult-filter-dns.cleanbrowsing.org</b>")+
G_STEP(4,"Save. Done — works on Wi-Fi and mobile data.")+
G_HEAD("Windows 11")+
G_STEP(1,"Settings → Network &amp; Internet → Wi-Fi → your network → <b>DNS server assignment</b> → Edit")+
G_STEP(2,"Switch to Manual → turn on IPv4")+
G_STEP(3,"Preferred DNS: <b>185.228.168.10</b> · Alternate: <b>185.228.169.11</b>")+
G_STEP(4,"Set \"DNS over HTTPS\" to On (automatic) → Save")+
G_HEAD("Make it hard to undo (strict)")+
G_STEP(1,"Android: Settings → Digital Wellbeing → set a Screen-time PIN, or use Family Link with a parent/friend holding the PIN")+
G_STEP(2,"Windows: create a separate non-admin account for daily use — changing DNS then requires the admin password. Give that password to someone you trust")+
G_NOTE("DNS blocking works at the network level, so it covers Chrome, incognito mode, and in-app browsers too.")); }
function showAppBlockGuide(){
guideSheet("Block distracting apps",
G_NOTE("A web app can't block other apps — that needs OS power. Use the built-in blockers; here's the fastest setup.")+
G_HEAD("Android — Focus Mode (built in)")+
G_STEP(1,"Settings → Digital Wellbeing → <b>Focus mode</b>")+
G_STEP(2,"Tick your distracting apps (Instagram, YouTube…)")+
G_STEP(3,"Tap \"Turn on now\" before each study session — icons grey out and notifications mute")+
G_STEP(4,"Optional: \"Set a schedule\" to auto-enable during your 5 study slots (8:30, 11:00, 3:00, 6:30, 9:30)")+
G_HEAD("Android — strict (uninstall-proof)")+
G_STEP(1,"Digital Wellbeing → App timers → set 1-minute timers on distracting apps")+
G_STEP(2,"Set a Screen-time PIN and have a friend/parent keep it — you literally can't extend the timer alone")+
G_HEAD("Windows 11")+
G_STEP(1,"Click the clock on the taskbar (or Settings → System → Focus) → <b>Start focus session</b> — silences all notifications")+
G_STEP(2,"For hard app blocking: Microsoft Family Safety (free) → App limits → block games/social apps; a second account holds the password")+
G_NOTE("Then arm <b>Strict focus lock</b> here in the app — the timer itself becomes hard to quit, and every escape attempt is logged as a distraction on your stats.")); }

/* ── PWA install prompt ───────────────────────────────── */
let deferredInstall=null;
window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); deferredInstall=e;
if(state.nav==="settings") render(); });
window.addEventListener("appinstalled",()=>{ deferredInstall=null; toast("App installed 🎉"); render(); });
function isStandalone(){ return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true; }
function installApp(){
if(deferredInstall){
deferredInstall.prompt();
deferredInstall.userChoice.then(r=>{ if(r.outcome==="accepted") deferredInstall=null; render(); });
}else if(/iphone|ipad|ipod/i.test(navigator.userAgent)){
alert("To install on iPhone/iPad:\n\n1. Tap the Share button (□↑) in Safari\n2. Scroll down → \"Add to Home Screen\"\n3. Tap Add");
}else{
alert("To install:\n\nOpen the browser menu (⋮) and choose \"Install app\" / \"Add to Home screen\".\n\nNote: install requires the app to be served over https or localhost — not from a file:// path."); } }

/* ── ripple ───────────────────────────────────────────── */
document.addEventListener("pointerdown",e=>{
if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
const btn=e.target.closest(".press"); if(!btn) return;
const r=btn.getBoundingClientRect(), d=Math.max(r.width,r.height);
const rip=document.createElement("span"); rip.className="ripple";
rip.style.width=rip.style.height=d+"px";
rip.style.left=(e.clientX-r.left-d/2)+"px"; rip.style.top=(e.clientY-r.top-d/2)+"px";
btn.appendChild(rip); setTimeout(()=>rip.remove(),520); },{passive:true});

/* ── hash routing (PWA shortcuts) ─────────────────────── */
(function(){ const h=(location.hash||"").replace("#","");
/* migrate old routes */
let nav=h;
if(h==="home") nav="today";
if(h==="stats") nav="progress";
if(h==="settings") nav="you";
if(["today","plan","focus","progress","you"].includes(nav)) state.nav=nav; })();
window.addEventListener("hashchange",()=>{
const h=(location.hash||"").replace("#","");
/* migrate old routes */
let nav=h;
if(h==="home") nav="today";
if(h==="stats") nav="progress";
if(h==="settings") nav="you";
if(["today","plan","focus","progress","you"].includes(nav)&&state.nav!==nav) setNav(nav);
renderTimerDock(); });
window.addEventListener("popstate",()=>{
const ov=document.getElementById("focusOverlay");
if(ov){
ov.classList.remove("active");
setTimeout(()=>ov.remove(),350);
}
if(clockOn){
clockOn=false;
exitAppFullscreen();
}
state.pomo.docked=true;
saveJSON(POMO_KEY,state.pomo);
renderTimerDock(); });

/* ── lifecycle ────────────────────────────────────────── */
document.getElementById("importFile").addEventListener("change",handleImportFile);
window.addEventListener("resize",()=>{ updateLandscape(); });
window.addEventListener("orientationchange",()=>setTimeout(()=>{ updateLandscape(); renderTimerOnly(); },120));
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible"){ syncPomoState(); render(); } else{ bankProgress(); if(strictActive()){ logDistraction(); notify("Focus broken 🚨","You left mid-session. It's logged. Get back in."); } releaseWakeLock(); saveJSON(POMO_KEY,state.pomo); } });
window.addEventListener("pagehide",()=>{ bankProgress(); saveJSON(POMO_KEY,state.pomo); });
window.addEventListener("pageshow",()=>{ syncPomoState(); render(); });

/* ── service worker ───────────────────────────────────── */
if("serviceWorker" in navigator && location.protocol!=="file:"){
window.addEventListener("load",()=>{ navigator.serviceWorker.register("./sw.js").catch(()=>{}); }); }

/* ── supabase sync (cloud backup of progress) ─────────── */
(function(){
var SB_URL="https://vfpyymmpenitljeobwot.supabase.co";
var SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcHl5bW1wZW5pdGxqZW9id290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NDI4NzgsImV4cCI6MjA5OTExODg3OH0.73O1tNgeelXIgqsA-xjKYCOPKwxLY54FPqYth1SzG0U";
if(!window.supabase||!window.supabase.createClient) return;
var sb=window.supabase.createClient(SB_URL,SB_KEY);
window.sbAuth=sb.auth;
var CHANGE="ese_last_change"; var user=null,lastSnap=null;
function snap(){ return {checked:state.checked,log:state.log,theme:state.theme,achievements:state.achievements,celebratedDays:state.celebratedDays,mocks:state.mocks,shaky:state.shaky,ratings:state.ratings,freeze:state.freeze}; }
function restore(d){ if(!d) return;
if(d.checked){ state.checked=d.checked; saveJSON(STORAGE_KEY,state.checked); }
if(d.log){ state.log=d.log; saveJSON(LOG_KEY,state.log); }
if(d.theme){ state.theme=d.theme; saveJSON(THEME_KEY,state.theme); }
if(d.achievements){ state.achievements=d.achievements; saveJSON(ACH_KEY,state.achievements); }
if(d.celebratedDays){ state.celebratedDays=d.celebratedDays; saveJSON(CELEB_KEY,state.celebratedDays); }
if(d.mocks){ state.mocks=d.mocks; saveJSON(MOCK_KEY,state.mocks); }
if(d.shaky){ state.shaky=d.shaky; saveJSON(SHAKY_KEY,state.shaky); }
if(d.ratings){ state.ratings=d.ratings; saveJSON(RATE_KEY,state.ratings); }
if(d.freeze){ state.freeze=d.freeze; saveJSON(FREEZE_KEY,state.freeze); } }
var ov=document.createElement("div");
ov.style.cssText="position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--bg);font-family:Inter,system-ui,sans-serif";
function card(inner){ ov.innerHTML='<div class="card" style="max-width:400px;width:100%;border-radius:24px;padding:30px">'+inner+"</div>"; if(!ov.parentNode) document.body.appendChild(ov); }
function hide(){ if(ov.parentNode) ov.parentNode.removeChild(ov); }
function form(mode){
var t=mode==="up"?"Create your account":"Welcome back";
card('<div style="text-align:center"><div style="font-family:Outfit,sans-serif;font-size:26px;font-weight:800;color:var(--ink)">ESE2027</div><div style="font-size:13px;color:var(--ink-3);margin-top:6px">'+t+"</div></div>"+
'<input id="ce" type="email" placeholder="Email" style="width:100%;box-sizing:border-box;margin-top:20px;padding:14px 16px;border-radius:14px;border:1px solid var(--line-2);background:var(--card-2);color:var(--ink);font-size:14px;outline:none">'+
'<input id="cp" type="password" placeholder="Password" style="width:100%;box-sizing:border-box;margin-top:10px;padding:14px 16px;border-radius:14px;border:1px solid var(--line-2);background:var(--card-2);color:var(--ink);font-size:14px;outline:none">'+
'<button id="cgo" class="btn btn-acc" style="width:100%;margin-top:18px">'+(mode==="up"?"Sign up":"Sign in")+"</button>"+
'<div id="cmsg" style="font-size:12px;color:var(--acc);text-align:center;margin-top:10px;min-height:16px"></div>'+
'<div style="text-align:center;margin-top:6px;font-size:13px;color:var(--ink-3)">'+(mode==="up"?"Have an account? ":"New here? ")+'<a id="ctog" href="#" style="color:var(--acc);font-weight:700;text-decoration:none">'+(mode==="up"?"Sign in":"Create one")+"</a></div>"+
'<div style="text-align:center;margin-top:14px"><a id="cskip" href="#" style="color:var(--ink-4);font-weight:600;font-size:12px;text-decoration:none">Maybe later — use offline</a></div>');
document.getElementById("cskip").onclick=function(e){ e.preventDefault(); hide(); };
document.getElementById("ctog").onclick=function(e){ e.preventDefault(); form(mode==="up"?"in":"up"); };
document.getElementById("cgo").onclick=function(){
var em=document.getElementById("ce").value.trim(), pw=document.getElementById("cp").value, m=document.getElementById("cmsg");
if(!em||!pw){ m.textContent="Enter email and password"; return; }
m.style.color="var(--ink-3)"; m.textContent="Please wait…";
var p=mode==="up"?sb.auth.signUp({email:em,password:pw}):sb.auth.signInWithPassword({email:em,password:pw});
p.then(function(r){ if(r.error){ m.style.color="var(--acc)"; m.textContent=r.error.message; } }); }; }
function push(){ if(!user) return; sb.from("user_progress").upsert({user_id:user.id,data:snap(),updated_at:new Date().toISOString()}).then(function(){}); }
function afterLogin(session){
user=session.user;
/* silent background sync — never blocks the app */
sb.from("user_progress").select("data,updated_at").eq("user_id",user.id).maybeSingle().then(function(res){
var cloud=res.data, localChange=localStorage.getItem(CHANGE);
if(cloud&&cloud.data&&Object.keys(cloud.data).length){
if(!localChange||cloud.updated_at>localChange){ restore(cloud.data); localStorage.setItem(CHANGE,cloud.updated_at); }
else push(); }
else push();
lastSnap=JSON.stringify(snap()); hide(); render();
}).catch(function(){ hide(); }); }
/* optional cloud sync — the app is fully usable signed-out. If a session
   is already stored we sync silently; otherwise we do NOT gate the app. */
sb.auth.onAuthStateChange(function(_e,session){ if(session){ afterLogin(session); } else { user=null; render(); } });
/* You → "Sign in to sync" opens the form on demand; dismissable */
window.eseSignIn=function(){ form("in"); };
window.eseSyncUser=function(){ return user?(user.email||"synced"):null; };
ov.onclick=function(e){ if(e.target===ov) hide(); };
setInterval(function(){ if(!user) return; var s=JSON.stringify(snap());
if(s!==lastSnap){ lastSnap=s; localStorage.setItem(CHANGE,new Date().toISOString()); push(); } },3000);
window.addEventListener("beforeunload",function(){ if(user) push(); });
})();

/* ── boot ─────────────────────────────────────────────── */
applyTheme();
render();
/* dot-matrix logo reveal → hand off to the app once the intro has played */
(function(){
const sp=document.getElementById("splash"); if(!sp) return;
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const hold=reduce?300:4200;                       /* ~4.2s reveal, then settle */
let done=false;
const dismiss=()=>{ if(done)return; done=true;
  sp.classList.add("out"); setTimeout(()=>sp.remove(),560); };
const timer=setTimeout(dismiss,hold);
/* tap/click anywhere to skip — returning users needn't wait each launch */
sp.addEventListener("click",()=>{ clearTimeout(timer); dismiss(); },{once:true});
})();
/* refresh countdowns + streak once a minute while on Today */
setInterval(()=>{ if(state.nav==="today"&&!document.hidden) render(); },60000);
/* plan slot reminders — check now and every minute */
checkSlotNotifications();
setInterval(checkSlotNotifications,60000);
/* streak freeze + evening rating + weekly backup nudge + sunday summary */
maybeSpendFreeze();
setTimeout(maybeAskRating,4000);
setInterval(maybeAskRating,10*60000);
(function(){
const last=loadJSON(BKUP_KEY,null);
if(last){ const days=(Date.now()-new Date(last).getTime())/864e5;
if(days>7) setTimeout(()=>toast("💾 Last backup was "+Math.floor(days)+" days ago — Settings → Backup"),6000); }
else if(Object.keys(state.log).length>5) setTimeout(()=>toast("💾 No backup yet — Settings → Backup data"),6000);
})();
(function(){
const now=new Date();
if(now.getDay()!==0||now.getHours()<19) return;         /* Sunday from 7pm */
const wk="wksum-"+todayKey();
if(loadJSON(wk,false)) return; saveJSON(wk,true);
let mins=0,sess=0,mins2=0;
for(let i=0;i<7;i++){ const d=new Date(); d.setDate(d.getDate()-i);
const k=`${d.getFullYear()}-${fmt(d.getMonth()+1)}-${fmt(d.getDate())}`;
const e=state.log[k]||{}; mins+=e.minutes||0; sess+=e.sessions||0; }
for(let i=7;i<14;i++){ const d=new Date(); d.setDate(d.getDate()-i);
const k=`${d.getFullYear()}-${fmt(d.getMonth()+1)}-${fmt(d.getDate())}`;
mins2+=(state.log[k]||{}).minutes||0; }
const diff=mins-mins2, h=Math.floor(mins/60);
setTimeout(()=>notify("📈 Week in review",`${h}h ${mins%60}m across ${sess} sessions — ${diff>=0?"up":"down"} ${Math.abs(Math.round(diff/60*10)/10)}h vs last week. ${diff>=0?"Keep the slope.":"Reset tomorrow morning."}`),8000);
})();
