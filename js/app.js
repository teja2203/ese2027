/* ════════════════════════════════════════════════════════════
   ESE2027 Study OS — app.js
   Views: Home · Plan · Focus · Stats · Settings
   Schedule data lives in js/data.js (verbatim user prep plan).
   ════════════════════════════════════════════════════════════ */
"use strict";
const APP_VERSION="v25";

/* ── storage ─────────────────────────────────────────── */
const STORAGE_KEY="ese_planner_checked_v3", IDX_KEY="ese_planner_index_v9",
      NAV_KEY="ese_planner_nav_v1", POMO_KEY="ese_planner_pomo_v5",
      LOG_KEY="ese_planner_log_v1", THEME_KEY="THEME", EXP_KEY="expandedSessions",
      ACH_KEY="ese_achievements_v1", CELEB_KEY="ese_celebrated_days_v1", NOTIF_KEY="ese_notif_v1", BLOCK_KEY="ese_block_v1",
      MOCK_KEY="ese_mocks_v1", SHAKY_KEY="ese_shaky_v1", RATE_KEY="ese_ratings_v1", FREEZE_KEY="ese_freeze_v1", BKUP_KEY="ese_last_backup_v1",
      SOUND_KEY="ese_sound_v1";
function loadJSON(k,f){ try{ const r=localStorage.getItem(k); return r===null?f:JSON.parse(r);}catch(e){ return f; } }
function saveJSON(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }

/* ── tag + subject styling (design-system tokens) ─────── */
const TAGS={
ctrl:{label:"Controls",  c:"var(--amber)", s:"var(--amber-soft)"},
edc:{label:"EDC",        c:"var(--acc)",   s:"var(--acc-dim)"},
dig:{label:"Digital",    c:"var(--lilac)", s:"var(--lilac-soft)"},
emft:{label:"EMFT",      c:"var(--amber)", s:"var(--amber-soft)"},
mat:{label:"Material Sci",c:"var(--amber)",s:"var(--amber-soft)"},
mpmc:{label:"MPMC",      c:"var(--sky)",   s:"var(--sky-soft)"},
comm:{label:"Comm",      c:"var(--mint)",  s:"var(--mint-soft)"},
sig:{label:"Signals",    c:"var(--mint)",  s:"var(--mint-soft)"},
ana:{label:"Analogs",    c:"var(--lilac)", s:"var(--lilac-soft)"},
coa:{label:"COA",        c:"var(--sky)",   s:"var(--sky-soft)"},
meas:{label:"Measurements",c:"var(--mint)",s:"var(--mint-soft)"},
net:{label:"Networks",   c:"var(--sky)",   s:"var(--sky-soft)"},
pyq:{label:"PYQ",        c:"var(--rose)",  s:"var(--rose-soft)"},
rev:{label:"Revision",   c:"var(--ink-3)", s:"var(--card-2)"},
mock:{label:"Mock Test", c:"var(--rose)",  s:"var(--rose-soft)"},
};
const tagOf=t=>TAGS[t]||TAGS.rev;
function badgeStyle(b){
const R={c:"var(--rose)",s:"var(--rose-soft)"},A={c:"var(--amber)",s:"var(--amber-soft)"},
      S={c:"var(--sky)",s:"var(--sky-soft)"},G={c:"var(--mint)",s:"var(--mint-soft)"},
      N={c:"var(--ink-3)",s:"var(--card-2)"},L={c:"var(--acc)",s:"var(--acc-dim)"};
const m={"MOCK":R,"GRAND TEST":R,"MOCK MARATHON":R,"ESE EXAM DAY":L,"APTRANSCO EXAM":R,
"EXAM PREP":R,"APTRANSCO SPRINT":R,"APTRANSCO + ESE":S,"ESE":S,"ESE ONLY":S,
"REVISION":N,"REVISION PASS 1":G,"REVISION PASS 2":G,"PYQ SPRINT":R,"TAPER":A,"RECOVERY":N};
return m[b]||N;
}

/* ── countdowns ───────────────────────────────────────── */
const APT_DATE=new Date("2026-08-22T09:00:00");
const ESE_DATE=new Date("2027-01-31T09:00:00");
function cd(t){ const d=t-Date.now(); if(d<=0) return {d:0,h:0,m:0};
return {d:Math.floor(d/864e5),h:Math.floor(d%864e5/36e5),m:Math.floor(d%36e5/6e4)}; }

/* ── state ────────────────────────────────────────────── */
const PRESETS=[{label:"25 · 5",work:25,brk:5},{label:"50 · 10",work:50,brk:10},{label:"90 · 20",work:90,brk:20}];
function normalizePomo(p){
const d={phase:"work",running:false,targetTs:null,timeLeft:50*60,workMins:50,breakMins:10,loop:true,logged:0};
if(!p||typeof p!=="object") return d;
return Object.assign(d,p);
}
const state={
nav:loadJSON(NAV_KEY,"home"),
index:loadJSON(IDX_KEY,0),
checked:loadJSON(STORAGE_KEY,{}),
pomo:normalizePomo(loadJSON(POMO_KEY,null)),
log:loadJSON(LOG_KEY,{}),
theme:loadJSON(THEME_KEY,"dark"),
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
};
if(state.index<0||state.index>=SCHED.length) state.index=0;

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
let streak=0; const d=new Date();
for(;;){ const k=`${d.getFullYear()}-${fmt(d.getMonth()+1)}-${fmt(d.getDate())}`;
const e=state.log[k];
if(e&&(e.minutes>0||e.sessions>0)) streak++;
else if(state.freeze[k]) streak++;                      /* frozen day keeps the chain */
else if(streak===0&&k===todayKey()){ /* today not started yet — look back */ }
else break;
d.setDate(d.getDate()-1); }
return streak; }
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
setTimeout(()=>toast("🧊 Streak freeze used for "+yk.slice(5)+" — one per month"),1200); }

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
<div id="mkErr" style="font-size:12px;color:var(--rose);margin-top:8px;min-height:15px"></div>
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
saveJSON(MOCK_KEY,state.mocks); close(); render(); toast("Mock logged 📊"); checkAchievements(); };
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
render(); }

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
renderTimerOnly(); }
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
g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
o.connect(g); g.connect(dest||ctx.destination);
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
}else if(kind==="achievement"){
/* proper fanfare: call, answer, resolving chord + long sparkles */
tone(ctx,t,523.25,.18,"triangle",.15); tone(ctx,t+.12,659.25,.18,"triangle",.15);
tone(ctx,t+.24,783.99,.18,"triangle",.16); tone(ctx,t+.36,1046.5,.4,"triangle",.19);
tone(ctx,t+.6,783.99,.16,"triangle",.13); tone(ctx,t+.72,1046.5,.16,"triangle",.15);
tone(ctx,t+.84,1318.5,.7,"triangle",.18);
[1046.5,1318.5,1567.98].forEach(f=>tone(ctx,t+.84,f,.8,"sine",.06));
tone(ctx,t+1.1,2093,.5,"sine",.06); tone(ctx,t+1.25,2637,.55,"sine",.04);
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
}else if(kind==="day"){
/* day conquered: grand rolled chord, octave answer, long shimmer tail */
[261.63,329.63,392,523.25].forEach((f,i)=>tone(ctx,t+i*.09,f,1.1,"triangle",.12));
[523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(ctx,t+.5+i*.07,f,1.0,"triangle",.1));
tone(ctx,t+.9,1567.98,.7,"sine",.07); tone(ctx,t+1.1,2093,.8,"sine",.06);
tone(ctx,t+1.35,2637,.7,"sine",.04);
} }

/* ── session notifications ────────────────────────────── */
function notifSupported(){ return "Notification" in window; }
function askNotifPermission(){
if(!notifSupported()) return Promise.resolve("unsupported");
if(Notification.permission!=="default") return Promise.resolve(Notification.permission);
return new Promise(res=>{
let done=false;
const finish=()=>{ if(done) return; done=true; res(Notification.permission); };
try{
const r=Notification.requestPermission(finish);      /* old callback style */
if(r&&r.then) r.then(finish).catch(finish);          /* promise style */
}catch(e){ finish(); }
/* some Android WebViews never settle the promise — poll the real value */
let n=0; const iv=setInterval(()=>{ n++;
if(Notification.permission!=="default"||n>40){ clearInterval(iv); finish(); } },500);
}); }
function notify(title,body){
if(!state.notif||!notifSupported()||Notification.permission!=="granted") return;
const opts={body,icon:"./icons/icon-192.png",badge:"./icons/icon-192.png",tag:"ese-session",renotify:true,vibrate:[120,60,120]};
try{
if(navigator.serviceWorker){
navigator.serviceWorker.getRegistration().then(reg=>{
if(reg&&reg.showNotification) return reg.showNotification(title,opts);
try{ new Notification(title,opts); }catch(_){}
}).catch(()=>{ try{ new Notification(title,opts); }catch(_){} });
}else new Notification(title,opts);
}catch(e){ try{ new Notification(title,{body,icon:"./icons/icon-192.png"}); }catch(_){} } }
/* Permissions API observer — fires even when requestPermission's promise doesn't */
if("permissions" in navigator&&navigator.permissions.query){
navigator.permissions.query({name:"notifications"}).then(st=>{
st.onchange=()=>{ if(st.state==="granted"&&state.notif){ subscribePush(); render(); } };
}).catch(()=>{}); }

function notifOn(){ return state.notif&&notifSupported()&&Notification.permission==="granted"; }
function toggleNotif(){
if(!notifSupported()){ toast("Notifications not supported on this browser"); return; }
if(!notifOn()){
/* opt in first, so the switch works even if the permission event is flaky */
state.notif=true; saveJSON(NOTIF_KEY,true);
askNotifPermission().then(p=>{
if(p==="granted"){ subscribePush(); toast("Session notifications on"); notify("Notifications enabled","You'll be pinged when a session or break ends."); }
else if(p==="denied"){ state.notif=false; saveJSON(NOTIF_KEY,false); toast("Blocked — enable notifications for this app in Android Settings"); }
else toast("Waiting for permission…");
render(); });
render();
}else{ state.notif=false; saveJSON(NOTIF_KEY,false); toast("Session notifications off"); render(); } }

/* ── web push (closed-app notifications) ──────────────── */
const VAPID_PUBLIC="BF0fC7HEttfCmKd6cBrI92_fJI2eYRJDF3qoPaOvJ3FpLfiyhla2oc3G_G1sYMki5gBLfN176y6ShsDvvFv-eu0";
function b64ToU8(s){ const p="=".repeat((4-s.length%4)%4), b=(s+p).replace(/-/g,"+").replace(/_/g,"/");
const raw=atob(b), a=new Uint8Array(raw.length); for(let i=0;i<raw.length;i++) a[i]=raw.charCodeAt(i); return a; }
async function subscribePush(){
try{
if(!("serviceWorker" in navigator)||!("PushManager" in window)) return null;
if(Notification.permission!=="granted") return null;
const reg=await navigator.serviceWorker.ready;
let sub=await reg.pushManager.getSubscription();
if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToU8(VAPID_PUBLIC)});
if(window._sbSavePush) window._sbSavePush(sub.toJSON());
return sub;
}catch(e){ return null; } }

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
const today=todayDateLabel(); const di=SCHED.findIndex(d=>d.date===today);
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
notify(`${slot.icon} ${slot.label} · ${slot.time}`,`${s.title} — ${slot.desc}`);
} });
saveJSON(SLOT_NOTIF_KEY,fired); }

/* ── strict blocking ──────────────────────────────────── */
function strictActive(){ return state.block.strict&&state.pomo.running&&state.pomo.phase==="work"; }
function toggleStrict(){
if(!state.block.strict){
if(!confirm("Strict mode:\n\n• During a focus session, Stop/Pause/Back require a 5-second hold\n• Leaving the app mid-session is counted as a distraction\n\nEnable?")) return;
state.block.strict=true; toast("Strict mode armed 🔒");
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
setTimeout(()=>toast(`🎯 ${slot.label} secured — session streak alive`),600);
} }
try{ navigator.vibrate&&navigator.vibrate([120,60,120]); }catch(e){}
playSound(wasWork?"complete":"break");
notify(wasWork?"Focus session complete 🎉":"Break over ⏰",
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
state.pomo.running=true; state.pomo.targetTs=Date.now()+getRemainingPomo()*1000; startPomoInterval();
playSound("start");
clockOn=true;                      /* entering focus → show flip clock */
requestAppFullscreen();
if(state.notif&&notifSupported()&&Notification.permission==="default") askNotifPermission();
}
saveJSON(POMO_KEY,state.pomo); render(); }
function resetPomo(){ bankProgress(); const hadMins=(state.pomo.logged||0)>0;
if(hadMins){ const k=todayKey(); const e=state.log[k]; if(e){ e.sessions+=1; saveJSON(LOG_KEY,state.log); } }
state.pomo.logged=0;
const wasRunning=state.pomo.running;
state.pomo.running=false; state.pomo.targetTs=null; state.pomo.timeLeft=phaseSecs(); stopPomoInterval(); saveJSON(POMO_KEY,state.pomo); render();
if(wasRunning) playSound("stop");
if(hadMins) toast("Stopped — partial time logged ✓"); }
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
render();
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
function goToday(){ const t=todayDateLabel(); const idx=SCHED.findIndex(d=>d.date===t); jumpTo(idx>=0?idx:0); }
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
<button id="themeBtn" class="iconbtn press" aria-label="Toggle theme">${state.theme==="dark"?IC.sun:IC.moon}</button>
</div>
</header>`); }
function wireTheme(root){
const b=root.querySelector("#themeBtn");
if(b) b.onclick=()=>{ state.theme=state.theme==="dark"?"light":"dark"; saveJSON(THEME_KEY,state.theme); render(); }; }
function ring(size,stroke,pct,color,track){
const r=(size-stroke)/2, c=2*Math.PI*r;
return `<svg width="${size}" height="${size}" style="transform:rotate(-90deg)" aria-hidden="true">
<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${track||"var(--card-2)"}" stroke-width="${stroke}"/>
<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
stroke-dasharray="${c}" stroke-dashoffset="${c*(1-pct/100)}" style="transition:stroke-dashoffset .8s var(--ease)"/>
</svg>`; }

/* ════════════════ HOME ════════════════ */
function renderHome(){
const wrap=el("div"); wrap.className="screen view";
const today=todayDateLabel();
let idx=SCHED.findIndex(d=>d.date===today);
const focusIdx=idx>=0?idx:state.index;
const fd=SCHED[focusIdx], st=dayStats(focusIdx);
const streak=computeStreak(), tlog=state.log[todayKey()]||{sessions:0,minutes:0};
const ov=overall(); const apt=cd(APT_DATE), ese=cd(ESE_DATE);
const inner=el("div"); inner.className="stagger";

inner.appendChild(header("ESE 2027","Study OS"));

/* greeting */
inner.appendChild(html(`<div style="margin-bottom:18px">
<div style="font-size:13px;color:var(--ink-3);font-weight:600">${greeting()}, Teja</div>
<div style="font-size:13.5px;color:var(--ink-2);margin-top:6px;line-height:1.55;font-style:italic">“${dailyQuote()}”</div>
</div>`));

/* hero — today's mission */
const hero=el("div"); hero.className="card lift press";
Object.assign(hero.style,{borderRadius:"var(--r-lg)",padding:"22px",marginBottom:"14px",cursor:"pointer",border:"1px solid var(--line-2)"});
hero.innerHTML=`
<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px">
<div style="flex:1;min-width:0">
<span class="pill" style="background:var(--acc-dim);color:var(--acc)">${idx>=0?"Today · "+fd.day:"Up next"}</span>
<div class="display" style="font-size:28px;font-weight:800;margin-top:12px;color:var(--ink);line-height:1.1">${fd.subject}</div>
<div style="font-size:12.5px;color:var(--ink-3);margin-top:7px;font-weight:600">${fd.date} · ${st.dn}/${st.tot} tasks done</div>
<div class="track" style="height:8px;margin-top:16px">
<div class="fill" style="width:${st.pct}%"></div>
</div>
</div>
<div style="position:relative;flex-shrink:0;width:76px;height:76px">
${ring(76,7,st.pct,"var(--acc)")}
<div class="mono" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800;color:var(--ink)">${st.pct}%</div>
</div>
</div>
<div style="display:flex;align-items:center;gap:8px;margin-top:16px;color:var(--acc);font-size:13px;font-weight:700">
Open today's plan ${IC.right}
</div>`;
hero.onclick=()=>{ jumpTo(focusIdx); setNav("plan"); };
inner.appendChild(hero);

/* stat tiles */
const tiles=el("div",{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px"});
[[IC.flame,streak,"day streak","var(--amber)","var(--amber-soft)"],
 ["🎯",computeSessionStreak(),"session streak","var(--acc)","var(--acc-dim)"],
 [IC.bolt,(tlog.minutes>=60?Math.floor(tlog.minutes/60)+"h "+(tlog.minutes%60)+"m":tlog.minutes+"m"),"today","var(--sky)","var(--sky-soft)"],
 [IC.trophy,doneDaysCount(),"days cleared","var(--mint)","var(--mint-soft)"]
].forEach(([ic,big,label,c,s])=>{
tiles.appendChild(html(`<div class="card lift" style="padding:14px 10px;text-align:center;border-radius:var(--r)">
<div style="display:inline-flex;width:32px;height:32px;border-radius:10px;background:${s};color:${c};align-items:center;justify-content:center;font-size:15px">${ic}</div>
<div class="display" style="font-size:22px;font-weight:800;color:var(--ink);margin-top:8px">${big}</div>
<div style="font-size:9.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);font-weight:700;margin-top:4px">${label}</div>
</div>`)); });
inner.appendChild(tiles);

/* countdowns — single compact strip */
inner.appendChild(html(`<div class="card" style="padding:13px 16px;border-radius:var(--r);margin-bottom:14px;display:flex;align-items:center;gap:12px">
<div style="flex:1;display:flex;align-items:center;gap:8px">
<span style="width:7px;height:7px;border-radius:50%;background:var(--rose);flex-shrink:0"></span>
<div><div style="font-size:9px;color:var(--rose);font-weight:800;letter-spacing:.06em;text-transform:uppercase">APTRANSCO</div>
<div class="display mono" style="font-size:17px;font-weight:800;color:var(--ink)">${apt.d}<span style="font-size:10px;color:var(--ink-3)">d</span> ${apt.h}<span style="font-size:10px;color:var(--ink-3)">h</span></div></div>
</div>
<div style="width:1px;height:32px;background:var(--line-2)"></div>
<div style="flex:1;display:flex;align-items:center;gap:8px">
<span style="width:7px;height:7px;border-radius:50%;background:var(--sky);flex-shrink:0"></span>
<div><div style="font-size:9px;color:var(--sky);font-weight:800;letter-spacing:.06em;text-transform:uppercase">ESE 2027</div>
<div class="display mono" style="font-size:17px;font-weight:800;color:var(--ink)">${ese.d}<span style="font-size:10px;color:var(--ink-3)">d</span> ${ese.h}<span style="font-size:10px;color:var(--ink-3)">h</span></div></div>
</div>
</div>`));

/* next achievement teaser — the carrot (tap → Profile) */
const nx=nextAchievement();
if(nx){
const t=html(`<div class="card lift press" style="padding:12px 16px;border-radius:var(--r);margin-bottom:14px;cursor:pointer;display:flex;align-items:center;gap:12px;border:1px solid var(--line-2)">
<div style="width:36px;height:36px;border-radius:12px;background:var(--card-2);display:flex;align-items:center;justify-content:center;font-size:17px;filter:grayscale(1);opacity:.8;flex-shrink:0">${nx.a.icon}</div>
<div style="flex:1;min-width:0">
<div style="display:flex;justify-content:space-between;align-items:center">
<span style="font-size:12px;font-weight:700;color:var(--ink)">${nx.a.title}</span>
<span class="mono" style="font-size:10px;font-weight:800;color:var(--amber)">${nx.pct}%</span></div>
<div class="track" style="height:4px;margin-top:6px"><div class="fill" style="width:${nx.pct}%;background:var(--amber)"></div></div>
</div>
</div>`);
t.onclick=()=>setNav("settings");
inner.appendChild(t); }

/* overall progress — compact strip */
inner.appendChild(html(`<div class="card" style="padding:13px 16px;border-radius:var(--r);margin-bottom:14px">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
<span style="font-size:11.5px;font-weight:700;color:var(--ink-2)">Full syllabus · ${ov.dn}/${ov.tot}</span>
<span class="mono" style="font-size:11.5px;font-weight:800;color:var(--acc)">${ov.pct}%</span>
</div>
<div class="track" style="height:7px"><div class="fill" style="width:${ov.pct}%"></div></div>
</div>`));

/* quick actions */
const qa=el("div",{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"});
const q1=html(`<button class="btn btn-acc press" style="width:100%">${IC.play} Start focus</button>`);
q1.onclick=()=>setNav("focus");
const q2=html(`<button class="btn btn-ghost press" style="width:100%">${IC.stats} Progress</button>`);
q2.onclick=()=>setNav("stats");
qa.appendChild(q1); qa.appendChild(q2);
inner.appendChild(qa);

wrap.appendChild(inner); wireTheme(wrap); return wrap; }

/* ════════════════ PLAN ════════════════ */
function renderPlan(){
const wrap=el("div"); wrap.className="screen view";
const day=SCHED[state.index], st=dayStats(state.index);
const bs=badgeStyle(day.badge);
const inner=el("div"); inner.className="stagger";

const head=html(`<header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
<h1 class="display" style="font-size:26px;font-weight:800;color:var(--ink)">Plan</h1>
<button id="todayBtn" class="btn btn-acc press" style="padding:10px 20px;font-size:12.5px">Today</button>
</header>`);
head.querySelector("#todayBtn").onclick=goToday;
inner.appendChild(head);

/* jump select */
const sel=el("select"); sel.setAttribute("aria-label","Jump to phase");
Object.assign(sel.style,{width:"100%",padding:"14px 42px 14px 16px",borderRadius:"var(--r-sm)",
border:"1px solid var(--line-2)",background:"var(--card)",color:"var(--ink)",
fontSize:"13px",fontWeight:"600",cursor:"pointer",marginBottom:"14px"});
JUMPS.forEach(j=>{ const o=document.createElement("option"); o.value=j.i; o.textContent=`${j.label} · ${j.date}`; sel.appendChild(o); });
let cur=0; for(let k=0;k<JUMPS.length;k++){ if(JUMPS[k].i<=state.index) cur=JUMPS[k].i; }
sel.value=cur; sel.onchange=e=>jumpTo(parseInt(e.target.value,10));
inner.appendChild(sel);

/* day header card */
inner.appendChild(html(`<div class="card" style="padding:20px;border-radius:var(--r-lg);margin-bottom:14px;border:1px solid var(--line-2)">
<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px">
<div style="flex:1;min-width:0">
<div style="font-size:11px;color:var(--ink-3);font-weight:700">${day.day} · Day ${state.index+1} of ${SCHED.length}</div>
<div class="display" style="font-size:30px;font-weight:800;color:var(--ink);margin-top:5px">${day.date}</div>
<div style="font-size:14px;font-weight:700;color:var(--ink-2);margin-top:5px">${day.subject}</div>
${day.badge?`<span class="pill" style="margin-top:11px;background:${bs.s};color:${bs.c}">${day.badge}</span>`:""}
</div>
<div style="position:relative;width:64px;height:64px;flex-shrink:0">
${ring(64,6,st.pct,"var(--acc)")}
<div class="mono" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:var(--ink)">${st.pct}</div>
</div>
</div>
</div>`));

/* sessions */
const list=el("div",{display:"flex",flexDirection:"column",gap:"12px"});
let currentFound=false;
day.sessions.forEach((s,si)=>{
const t=tagOf(s.tag);
const sd=s.tasks.filter((_,ti)=>state.checked[`${state.index}-${si}-${ti}`]).length;
const done=sd===s.tasks.length;
const isCurrent=!done&&!currentFound; if(isCurrent) currentFound=true;
const expKey=`${state.index}-${si}`;
const expanded=state.expandedSessions[expKey]!==undefined?state.expandedSessions[expKey]:!done;
const slot=SLOTS[si]||{label:"Session",time:"",icon:"•"};
const sstreak=slotStreak(si);
const card=el("div"); card.className="card";
Object.assign(card.style,{borderRadius:"var(--r)",padding:"16px",
border:isCurrent?"1.5px solid var(--acc)":"1px solid var(--line)",
boxShadow:isCurrent?"var(--glow)":"var(--shadow)"});
const top=el("div"); top.className="press";
Object.assign(top.style,{display:"flex",alignItems:"center",gap:"12px",cursor:"pointer",background:"transparent",border:"none",width:"100%",textAlign:"left",padding:"0"});
top.innerHTML=`
<div style="width:38px;height:38px;border-radius:12px;background:${t.s};color:${t.c};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:15px;font-weight:800">${sd}<span style="font-size:9px;opacity:.7">/${s.tasks.length}</span></div>
<div style="flex:1;min-width:0">
<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
<span style="font-size:10px;color:var(--ink-3);font-weight:700">${slot.label}${slot.time?" · "+slot.time:""}</span>
${sstreak>0?`<span class="pill" style="background:var(--amber-soft);color:var(--amber);font-size:8.5px;padding:3px 8px">🔥 ${sstreak}</span>`:""}
<span class="pill" style="background:${t.s};color:${t.c};font-size:8.5px;padding:3px 8px">${t.label}</span>
${isCurrent?`<span class="pill" style="background:var(--acc-dim);color:var(--acc);font-size:8.5px;padding:3px 8px">Now</span>`:""}
${done?`<span class="pill" style="background:var(--mint-soft);color:var(--mint);font-size:8.5px;padding:3px 8px">Done</span>`:""}
</div>
<div style="font-size:14px;font-weight:700;color:${done?"var(--ink-4)":"var(--ink)"};margin-top:4px;line-height:1.35">${s.title}</div>
<div class="track" style="height:4px;margin-top:9px"><div class="fill" style="width:${(sd/s.tasks.length)*100}%"></div></div>
</div>
<span style="color:var(--ink-4);transform:rotate(${expanded?"90deg":"0deg"});transition:transform .25s var(--spring)">${IC.right}</span>`;
top.onclick=()=>{ state.expandedSessions[expKey]=!expanded; saveJSON(EXP_KEY,state.expandedSessions); render(); };
card.appendChild(top);
if(expanded){
const tl=el("div",{marginTop:"12px",paddingTop:"10px",borderTop:"1px solid var(--line)"});
s.tasks.forEach((task,ti)=>{
const k=`${state.index}-${si}-${ti}`, on=!!state.checked[k], shk=!!state.shaky[k];
const row=el("div"); row.className="taskrow"+(on?" done":"");
row.setAttribute("role","checkbox"); row.setAttribute("aria-checked",on?"true":"false"); row.tabIndex=0;
row.innerHTML=`<span class="chk${on?" on":""}" style="color:var(--acc-ink)">${on?IC.check:""}</span><span class="txt" style="flex:1">${task}</span>
<button class="shakybtn press" aria-label="${shk?"Remove shaky flag":"Mark as shaky"}" title="Mark topic as shaky" style="border:none;background:none;cursor:pointer;font-size:14px;padding:2px 4px;flex-shrink:0;opacity:${shk?"1":".28"};filter:${shk?"none":"grayscale(1)"}">⚠️</button>`;
row.onclick=()=>toggleTask(si,ti);
row.querySelector(".shakybtn").onclick=e=>{ e.stopPropagation(); toggleShaky(si,ti); };
row.onkeydown=e=>{ if(e.key===" "||e.key==="Enter"){ e.preventDefault(); toggleTask(si,ti); } };
tl.appendChild(row); });
card.appendChild(tl); }
list.appendChild(card); });
inner.appendChild(list);

/* prev / next */
const nav2=el("div",{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginTop:"14px"});
const prev=html(`<button class="btn btn-ghost press" style="width:100%" ${state.index===0?"disabled":""}>${IC.left} Prev day</button>`);
const next=html(`<button class="btn btn-ghost press" style="width:100%" ${state.index===SCHED.length-1?"disabled":""}>Next day ${IC.right}</button>`);
if(state.index===0) prev.style.opacity=".4";
if(state.index===SCHED.length-1) next.style.opacity=".4";
prev.onclick=()=>navDay(-1); next.onclick=()=>navDay(1);
nav2.appendChild(prev); nav2.appendChild(next);
inner.appendChild(nav2);

wrap.appendChild(inner); return wrap; }

/* ════════════════ FOCUS ════════════════ */
function renderFocus(){
const wrap=el("div"); wrap.className="screen view";
const inner=el("div"); inner.className="stagger";
inner.appendChild(header("Focus","Deep work timer"));

/* phase switch */
const seg=el("div",{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",background:"var(--card-2)",padding:"6px",borderRadius:"999px",marginBottom:"16px"});
[["work","Focus"],["break","Break"]].forEach(([p,label])=>{
const active=state.pomo.phase===p;
const b=html(`<button class="press" style="padding:12px;border-radius:999px;border:none;cursor:pointer;font-size:13px;font-weight:700;
background:${active?"var(--acc)":"transparent"};color:${active?"var(--acc-ink)":"var(--ink-3)"}">${label} · ${p==="work"?state.pomo.workMins:state.pomo.breakMins}m</button>`);
b.onclick=()=>setPhase(p); seg.appendChild(b); });
inner.appendChild(seg);

/* ring timer */
const secs=phaseSecs(), remain=getRemainingPomo();
const pct=secs?((secs-remain)/secs)*100:0;
const tw=el("div",{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:"20px"});
tw.innerHTML=`
<div style="position:relative;width:250px;height:250px">
<svg width="250" height="250" style="transform:rotate(-90deg)">
<circle cx="125" cy="125" r="110" fill="none" stroke="var(--card-2)" stroke-width="12"/>
<circle id="timer-progress" cx="125" cy="125" r="110" fill="none" stroke="var(--acc)" stroke-width="12" stroke-linecap="round"
stroke-dasharray="${2*Math.PI*110}" stroke-dashoffset="${2*Math.PI*110*(1-pct/100)}" style="transition:stroke-dashoffset .9s linear"/>
</svg>
<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
<div id="phase-display" style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3);font-weight:800">${state.pomo.phase==="work"?"Focus":"Break"}</div>
<div id="timer-display" class="mono display" style="font-size:56px;font-weight:800;color:var(--ink);margin-top:4px">${fmtTime(remain)}</div>
<div style="font-size:11px;color:var(--ink-4);font-weight:600;margin-top:4px">${state.pomo.loop?"auto loop on":"single session"}</div>
</div>
</div>`;
inner.appendChild(tw);

/* controls */
const controls=el("div",{display:"flex",gap:"10px",justifyContent:"center",alignItems:"center",marginBottom:"20px"});
const rst=html(`<button class="iconbtn press" aria-label="Reset timer" style="border-radius:999px;width:52px;height:52px">${IC.reset}</button>`);
rst.onclick=resetPomo;
const play=html(`<button class="btn btn-acc press" aria-label="${state.pomo.running?"Pause":"Start"}" style="width:84px;height:84px;border-radius:999px;padding:0;font-size:0">${state.pomo.running?IC.pause:IC.play}</button>`);
play.onclick=toggleRunning;
const skp=html(`<button class="iconbtn press" aria-label="Skip phase" style="border-radius:999px;width:52px;height:52px">${IC.skip}</button>`);
skp.onclick=skipPhase;
controls.appendChild(rst); controls.appendChild(play); controls.appendChild(skp);
inner.appendChild(controls);

/* re-enter clock mode while running */
if(state.pomo.running&&!clockOn){
const re=html(`<button class="chip press" style="display:flex;margin:0 auto 16px;cursor:pointer;border:1px solid var(--acc);color:var(--acc)">⛶ Enter clock mode</button>`);
re.onclick=()=>{ clockOn=true; requestAppFullscreen(); updateLandscape(); };
inner.appendChild(re); }

/* presets */
const pr=el("div",{display:"flex",gap:"8px",justifyContent:"center",marginBottom:"16px"});
PRESETS.forEach(p=>{
const active=state.pomo.workMins===p.work&&state.pomo.breakMins===p.brk;
const c=html(`<button class="chip mono press" style="cursor:pointer;border:1px solid ${active?"var(--acc)":"transparent"};color:${active?"var(--acc)":"var(--ink-2)"}">${p.label}</button>`);
c.onclick=()=>applyPreset(p.work,p.brk); pr.appendChild(c); });
inner.appendChild(pr);

/* steppers + loop */
const opts=el("div",{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px"});
[["work","Focus mins",state.pomo.workMins],["break","Break mins",state.pomo.breakMins]].forEach(([w,label,val])=>{
const s=html(`<div class="card" style="padding:12px 14px;border-radius:var(--r-sm);display:flex;align-items:center;justify-content:space-between">
<div><div style="font-size:10px;color:var(--ink-3);font-weight:700;text-transform:uppercase;letter-spacing:.06em">${label}</div>
<div class="mono" style="font-size:20px;font-weight:800;color:var(--ink);margin-top:2px">${val}</div></div>
<div style="display:flex;flex-direction:column;gap:4px">
<button class="press" data-d="5" style="width:30px;height:24px;border-radius:8px;border:1px solid var(--line-2);background:var(--card-2);color:var(--ink-2);cursor:pointer;font-weight:800">+</button>
<button class="press" data-d="-5" style="width:30px;height:24px;border-radius:8px;border:1px solid var(--line-2);background:var(--card-2);color:var(--ink-2);cursor:pointer;font-weight:800">−</button>
</div></div>`);
s.querySelectorAll("button").forEach(b=>b.onclick=()=>adjustDuration(w,parseInt(b.dataset.d,10)));
opts.appendChild(s); });
inner.appendChild(opts);

const loop=html(`<button class="card press" style="width:100%;padding:14px;border-radius:var(--r-sm);cursor:pointer;display:flex;align-items:center;justify-content:space-between;border:1px solid ${state.pomo.loop?"var(--acc)":"var(--line)"}">
<span style="font-size:13px;font-weight:700;color:var(--ink-2)">Auto loop focus → break</span>
<span style="width:44px;height:26px;border-radius:999px;background:${state.pomo.loop?"var(--acc)":"var(--card-2)"};position:relative;transition:background .2s">
<span style="position:absolute;top:3px;left:${state.pomo.loop?"21px":"3px"};width:20px;height:20px;border-radius:50%;background:${state.pomo.loop?"var(--acc-ink)":"var(--ink-4)"};transition:left .25s var(--spring)"></span>
</span></button>`);
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
const card=html(`<div class="card lift press" style="padding:16px;border-radius:var(--r);margin-top:14px;cursor:pointer">
<div style="display:flex;align-items:center;gap:10px">
<span class="pill" style="background:${t.s};color:${t.c}">${t.label}</span>
<span style="font-size:10px;color:var(--ink-3);font-weight:700">${slot.label}${slot.time?" · "+slot.time:""}</span>
</div>
<div style="font-size:14px;font-weight:700;color:var(--ink);margin-top:8px;line-height:1.4">${cur.title}</div>
<div style="display:flex;align-items:center;gap:6px;margin-top:8px;color:var(--acc);font-size:12px;font-weight:700">Open in plan ${IC.right}</div>
</div>`);
card.onclick=()=>setNav("plan");
inner.appendChild(card); }

/* today's totals */
const tlog=state.log[todayKey()]||{sessions:0,minutes:0};
const hrs=Math.floor(tlog.minutes/60), mins=tlog.minutes%60;
const stats=el("div",{display:"grid",gridTemplateColumns:tlog.distract?"1fr 1fr 1fr":"1fr 1fr",gap:"10px",marginTop:"14px"});
stats.innerHTML=`
<div class="card" style="padding:16px;text-align:center;border-radius:var(--r)"><div class="display" style="font-size:28px;font-weight:800;color:var(--amber)">${tlog.sessions}</div><div style="font-size:9.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.07em;margin-top:4px;font-weight:700">Sessions today</div></div>
<div class="card" style="padding:16px;text-align:center;border-radius:var(--r)"><div class="display" style="font-size:28px;font-weight:800;color:var(--acc)">${hrs>0?hrs+"h "+mins+"m":mins+"m"}</div><div style="font-size:9.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.07em;margin-top:4px;font-weight:700">Studied today</div></div>
${tlog.distract?`<div class="card" style="padding:16px;text-align:center;border-radius:var(--r)"><div class="display" style="font-size:28px;font-weight:800;color:var(--rose)">${tlog.distract}</div><div style="font-size:9.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.07em;margin-top:4px;font-weight:700">Distractions</div></div>`:""}`;
inner.appendChild(stats);

wrap.appendChild(inner); wireTheme(wrap); return wrap; }

function renderTimerOnly(){
const disp=document.getElementById("timer-display"), prog=document.getElementById("timer-progress"), ph=document.getElementById("phase-display");
updateLandscape();
if(!disp||!prog||!ph) return;
const remain=getRemainingPomo(), secs=phaseSecs();
disp.textContent=fmtTime(remain);
ph.textContent=state.pomo.phase==="work"?"Focus":"Break";
const c=2*Math.PI*110;
prog.setAttribute("stroke-dashoffset",c*(1-(secs?(secs-remain)/secs:0))); }

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
<button class="wfc-end press" id="wfcBack" aria-label="Back to app">← Back</button>
<div class="wfc-state"><div class="phase" id="wfcPhase">Focus</div><div class="sub" id="wfcSub">Auto loop on</div></div>
<div class="wfc-clock">
<div class="wfc" id="wfcMin"><div class="wfc-top"><span></span></div><div class="wfc-bottom"><span></span></div>
<div class="wfc-flip top"><span></span></div><div class="wfc-flip bottom"><span></span></div><div class="wfc-seam"></div></div>
<div class="wfc-colon"><i></i><i></i></div>
<div class="wfc" id="wfcSec"><div class="wfc-top"><span></span></div><div class="wfc-bottom"><span></span></div>
<div class="wfc-flip top"><span></span></div><div class="wfc-flip bottom"><span></span></div><div class="wfc-seam"></div></div>
</div>
<div style="display:flex;gap:12px">
<button class="wfc-end press" id="wfcStop" style="position:static;background:var(--rose-soft);color:var(--rose)">■ Stop</button>
<button class="wfc-end press" id="wfcPause" style="position:static;background:var(--acc);color:var(--acc-ink)">⏸ Pause</button>
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
const phaseTxt=state.pomo.phase==="work"?"Focus Session":"Break";
const subTxt=state.pomo.running?(state.pomo.loop?"Auto loop on":"Single session"):"Paused";
const ph=ov.querySelector("#wfcPhase"), sb=ov.querySelector("#wfcSub"), pb=ov.querySelector("#wfcPause");
if(ph.textContent!==phaseTxt) ph.textContent=phaseTxt;
if(sb.textContent!==subTxt) sb.textContent=subTxt;
const pbTxt=state.pomo.running?"⏸ Pause":"▶ Resume";
if(pb._label!==pbTxt){ pb.innerHTML=pbTxt; pb._label=pbTxt; }
const instant=!wasActive;                         /* opening frame: snap digits, no fold */
setFlip(ov.querySelector("#wfcMin"),fmt(Math.floor(remain/60)),instant);
setFlip(ov.querySelector("#wfcSec"),fmt(remain%60),instant); }

/* ════════════════ STATS ════════════════ */
function renderStats(){
const wrap=el("div"); wrap.className="screen view";
const inner=el("div"); inner.className="stagger";
inner.appendChild(header("Progress","Your numbers, honestly"));
const ov=overall();

/* overall ring + counters */
const top=el("div"); top.className="card";
Object.assign(top.style,{padding:"20px",borderRadius:"var(--r-lg)",marginBottom:"14px",display:"flex",alignItems:"center",gap:"20px"});
top.innerHTML=`
<div style="position:relative;width:118px;height:118px;flex-shrink:0">
${ring(118,11,ov.pct,"var(--acc)")}
<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
<span class="display mono" style="font-size:26px;font-weight:800;color:var(--ink)">${ov.pct}%</span>
<span style="font-size:9px;color:var(--ink-3);font-weight:700;text-transform:uppercase;letter-spacing:.08em">complete</span>
</div></div>
<div style="flex:1;display:flex;flex-direction:column;gap:10px">
<div><div class="display" style="font-size:20px;font-weight:800;color:var(--mint)">${doneDaysCount()}</div><div style="font-size:9.5px;color:var(--ink-3);font-weight:700;text-transform:uppercase;letter-spacing:.06em">days cleared</div></div>
<div><div class="display" style="font-size:20px;font-weight:800;color:var(--amber)">${computeStreak()}</div><div style="font-size:9.5px;color:var(--ink-3);font-weight:700;text-transform:uppercase;letter-spacing:.06em">day streak</div></div>
<div><div class="display" style="font-size:20px;font-weight:800;color:var(--acc)">${computeSessionStreak()}</div><div style="font-size:9.5px;color:var(--ink-3);font-weight:700;text-transform:uppercase;letter-spacing:.06em">session streak</div></div>
<div><div class="display" style="font-size:20px;font-weight:800;color:var(--sky)">${ov.dn}</div><div style="font-size:9.5px;color:var(--ink-3);font-weight:700;text-transform:uppercase;letter-spacing:.06em">tasks done</div></div>
</div>`;
inner.appendChild(top);

/* 7-day study bars */
const bars=el("div"); bars.className="card";
Object.assign(bars.style,{padding:"18px",borderRadius:"var(--r)",marginBottom:"14px"});
let bh='<div style="font-size:12px;font-weight:700;color:var(--ink-2);margin-bottom:14px">Study time · last 7 days</div><div style="display:flex;align-items:flex-end;gap:8px;height:104px">';
let maxM=1; const days=[];
for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i);
const k=`${d.getFullYear()}-${fmt(d.getMonth()+1)}-${fmt(d.getDate())}`;
const e=state.log[k]||{minutes:0}; maxM=Math.max(maxM,e.minutes);
days.push({d,e,isT:i===0}); }
days.forEach(({d,e,isT})=>{
const h=Math.max(5,Math.round(e.minutes/maxM*66));
const lbl=e.minutes>=60?(Math.floor(e.minutes/60)+"h"+(e.minutes%60?fmt(e.minutes%60):"")):(e.minutes>0?e.minutes+"m":"");
bh+=`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
<span class="mono" style="font-size:8.5px;font-weight:800;color:${e.minutes?(isT?"var(--acc)":"var(--ink-3)"):"transparent"};white-space:nowrap">${lbl||"·"}</span>
<div style="width:100%;height:${h}px;border-radius:8px 8px 4px 4px;background:${e.minutes?(isT?"var(--acc)":"var(--acc-dim)"):"var(--card-2)"};transition:height .6s var(--ease)"></div>
<span style="font-size:9px;color:${isT?"var(--acc)":"var(--ink-4)"};font-weight:700">${WD[d.getDay()]}</span></div>`; });
bh+="</div>";
bars.innerHTML=bh;
inner.appendChild(bars);

/* heat map — 5 weeks */
const heat=el("div"); heat.className="card";
Object.assign(heat.style,{padding:"18px",borderRadius:"var(--r)",marginBottom:"14px"});
let hh='<div style="font-size:12px;font-weight:700;color:var(--ink-2);margin-bottom:14px">Consistency · last 5 weeks</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">';
const tk=todayKey();
for(let i=34;i>=0;i--){
const d=new Date(); d.setDate(d.getDate()-i);
const k=`${d.getFullYear()}-${fmt(d.getMonth()+1)}-${fmt(d.getDate())}`;
const m=(state.log[k]||{minutes:0}).minutes;
let c="var(--heat-0)";                                   /* 0 min = red — no hiding */
if(m>0) c="var(--heat-1)"; if(m>=120) c="var(--heat-2)"; if(m>=300) c="var(--heat-3)"; if(m>=480) c="var(--heat-4)";
hh+=`<div title="${k} · ${m} min" style="aspect-ratio:1;border-radius:7px;background:${c};${k===tk?"box-shadow:0 0 0 2px var(--acc);":""}"></div>`; }
hh+='</div><div style="display:flex;align-items:center;gap:6px;margin-top:12px;justify-content:flex-end"><span style="font-size:9px;color:var(--ink-4);font-weight:600">0h</span>';
["var(--heat-0)","var(--heat-1)","var(--heat-2)","var(--heat-3)","var(--heat-4)"].forEach(c=>hh+=`<span style="width:10px;height:10px;border-radius:3px;background:${c}"></span>`);
hh+='<span style="font-size:9px;color:var(--ink-4);font-weight:600">8h+</span></div>';
heat.innerHTML=hh;
inner.appendChild(heat);

/* subject completion */
const subj=el("div"); subj.className="card";
Object.assign(subj.style,{padding:"18px",borderRadius:"var(--r)",marginBottom:"14px"});
let sh='<div style="font-size:12px;font-weight:700;color:var(--ink-2);margin-bottom:14px">Subject completion</div>';
const bySubj={};
SCHED.forEach((d,i)=>{ const b=baseSubj(d.subject);
if(!bySubj[b]) bySubj[b]={tot:0,dn:0};
d.sessions.forEach((s,si)=>{ bySubj[b].tot+=s.tasks.length;
s.tasks.forEach((_,ti)=>{ if(state.checked[`${i}-${si}-${ti}`]) bySubj[b].dn++; }); }); });
Object.keys(bySubj).forEach(name=>{
const e=bySubj[name]; if(!e.tot) return;
const pc=Math.round(e.dn/e.tot*100); if(pc===0&&e.tot<20) return;
sh+=`<div style="margin-bottom:12px">
<div style="display:flex;justify-content:space-between;margin-bottom:6px">
<span style="font-size:12px;font-weight:600;color:var(--ink-2)">${name}</span>
<span class="mono" style="font-size:11px;font-weight:800;color:${pc===100?"var(--acc)":"var(--ink-3)"}">${pc}%</span></div>
<div class="track" style="height:6px"><div class="fill" style="width:${pc}%"></div></div></div>`; });
subj.innerHTML=sh;
inner.appendChild(subj);

/* pointer to profile for badges & mocks */
const pf=html(`<div class="card lift press" style="padding:14px 16px;border-radius:var(--r);cursor:pointer;display:flex;align-items:center;gap:12px">
<span style="font-size:18px">🏅</span>
<div style="flex:1;min-width:0">
<div style="font-size:13px;font-weight:700;color:var(--ink)">Badges, mocks & revision queue</div>
<div style="font-size:11px;color:var(--ink-3);margin-top:2px">Moved to your Profile tab</div>
</div><span style="color:var(--ink-4)">${IC.right}</span></div>`);
pf.onclick=()=>setNav("settings");
inner.appendChild(pf);

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
<span class="mono" style="font-size:9px;font-weight:800;color:${up?"var(--acc)":"var(--rose)"}">${pcts[i]}%</span>
<div style="width:100%;height:${h}px;border-radius:6px 6px 3px 3px;background:${up?"var(--acc)":"var(--rose)"};opacity:${i===last.length-1?1:.55}"></div></div>`; });
mh+=`</div>`;
const lastM=state.mocks[state.mocks.length-1];
const trend=state.mocks.length>1?(pcts[pcts.length-1]-pcts[pcts.length-2]):0;
mh+=`<div style="font-size:11.5px;color:var(--ink-3);font-weight:600">Latest: <b style="color:var(--ink)">${lastM.name}</b> — ${lastM.score}/${lastM.max}${lastM.neg?` · ${lastM.neg} lost to negatives`:""}${state.mocks.length>1?` · <b style="color:${trend>=0?"var(--acc)":"var(--rose)"}">${trend>=0?"+":""}${trend}%</b> vs previous`:""}</div>`;
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
sq.innerHTML=`<div style="font-size:12.5px;color:var(--ink-3);text-align:center;padding:8px 0 4px">Nothing flagged. Tap ⚠️ on any task in the Plan to queue it for revision.</div>`;
return sq; }
let qh=`<div style="max-height:200px;overflow-y:auto">`;
shakyKeys.forEach(k=>{ const s=state.shaky[k];
qh+=`<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-top:1px solid var(--line)">
<div style="flex:1;min-width:0"><div style="font-size:12.5px;color:var(--ink-2);font-weight:600;line-height:1.4">${s.t}</div>
<div style="font-size:10px;color:var(--ink-4);margin-top:2px;font-weight:600">${s.subj} · ${s.d}</div></div>
<button data-sk="${k}" class="press" style="border:1px solid var(--line-2);background:var(--card-2);color:var(--mint);border-radius:9px;padding:5px 10px;cursor:pointer;font-size:10.5px;font-weight:700;flex-shrink:0">Solid now</button></div>`; });
qh+=`</div>`;
sq.innerHTML=qh;
sq.querySelectorAll("[data-sk]").forEach(b=>b.onclick=()=>{ delete state.shaky[b.dataset.sk]; saveJSON(SHAKY_KEY,state.shaky); render(); toast("Cleared — well recovered"); });
return sq; }
function buildAchievements(){
const m=achMetrics();
const nx=nextAchievement();
const ach=el("div");
function fmtUnlockDate(iso){ try{ const d=new Date(iso); return MON[d.getMonth()]+" "+d.getDate()+", "+d.getFullYear(); }catch(e){ return ""; } }
let ah=`<div class="hex-grid">`;
ACHIEVEMENTS.forEach(a=>{
const rec=state.achievements[a.id], on=!!rec;
const have=achProgress(a,m), pct=Math.round(have/a.goal*100);
const isNext=nx&&nx.a.id===a.id;
ah+=`<div class="hexwrap" title="${a.desc}">
<div class="hex ${on?"on":"locked"}" style="--bc:${a.bc||"var(--amber)"}">
<div class="hicon">${a.icon}</div>
<div class="hlabel">${a.title}</div>
</div>
${on?`<div class="hdate">${fmtUnlockDate(rec.at)}</div>`
:isNext?`<div class="hprog"><div class="track" style="height:4px"><div class="fill" style="width:${pct}%;background:${a.bc||"var(--amber)"}"></div></div>
<div style="font-size:9px;color:var(--ink-3);margin-top:4px;font-weight:700">${have} / ${a.goal}</div></div>`
:`<div class="hdate" style="color:var(--ink-4)">${have} / ${a.goal}</div>`}
</div>`; });
ah+="</div>";
ach.innerHTML=ah;
return ach; }

/* ════════════════ PROFILE ════════════════ */
let profExp=loadJSON("ese_prof_exp_v1",{badges:true});
function renderSettings(){
const wrap=el("div"); wrap.className="screen view";
const inner=el("div"); inner.className="stagger";
inner.appendChild(header("Profile",""));

/* identity card */
const streak=computeStreak(), sstreak=computeSessionStreak();
const unlockedCount=ACHIEVEMENTS.filter(a=>state.achievements[a.id]).length;
const ese=cd(ESE_DATE);
const totMin=Object.values(state.log).reduce((a,e)=>a+(e.minutes||0),0);
inner.appendChild(html(`<div class="card" style="padding:20px;border-radius:var(--r-lg);margin-bottom:14px;border:1px solid var(--line-2)">
<div style="display:flex;align-items:center;gap:14px">
<div style="width:58px;height:58px;border-radius:50%;background:var(--acc);color:var(--acc-ink);display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-size:24px;font-weight:800;flex-shrink:0">T</div>
<div style="flex:1;min-width:0">
<div class="display" style="font-size:20px;font-weight:800;color:var(--ink)">Teja</div>
<div style="font-size:11.5px;color:var(--ink-3);font-weight:600;margin-top:2px">ESE 2027 aspirant · ${ese.d} days to go</div>
</div></div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:16px">
<div style="text-align:center"><div class="display" style="font-size:17px;font-weight:800;color:var(--amber)">${streak}</div><div style="font-size:8.5px;color:var(--ink-3);font-weight:700;text-transform:uppercase;letter-spacing:.05em">streak</div></div>
<div style="text-align:center"><div class="display" style="font-size:17px;font-weight:800;color:var(--acc)">${sstreak}</div><div style="font-size:8.5px;color:var(--ink-3);font-weight:700;text-transform:uppercase;letter-spacing:.05em">sessions</div></div>
<div style="text-align:center"><div class="display" style="font-size:17px;font-weight:800;color:var(--sky)">${Math.floor(totMin/60)}h</div><div style="font-size:8.5px;color:var(--ink-3);font-weight:700;text-transform:uppercase;letter-spacing:.05em">studied</div></div>
<div style="text-align:center"><div class="display" style="font-size:17px;font-weight:800;color:var(--mint)">${unlockedCount}</div><div style="font-size:8.5px;color:var(--ink-3);font-weight:700;text-transform:uppercase;letter-spacing:.05em">badges</div></div>
</div></div>`));

/* accordion */
function acc(id,icon,title,badge,build){
const open=!!profExp[id];
const card=el("div"); card.className="card";
Object.assign(card.style,{borderRadius:"var(--r)",marginBottom:"10px",overflow:"hidden"});
const head=el("button"); head.className="press";
Object.assign(head.style,{display:"flex",alignItems:"center",gap:"12px",width:"100%",padding:"15px 16px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left"});
head.innerHTML=`<span style="font-size:16px;width:22px;text-align:center">${icon}</span>
<span style="flex:1;font-size:13.5px;font-weight:700;color:var(--ink)">${title}</span>
${badge?`<span class="pill" style="background:var(--card-2);color:var(--ink-3);font-size:9px">${badge}</span>`:""}
<span style="color:var(--ink-4);transform:rotate(${open?"90deg":"0deg"});transition:transform .25s var(--spring)">${IC.right}</span>`;
head.onclick=()=>{ profExp[id]=!open; saveJSON("ese_prof_exp_v1",profExp); render(); };
card.appendChild(head);
if(open){ const body=el("div",{padding:"0 16px 16px"}); body.appendChild(build()); card.appendChild(body); }
return card; }
function rows(list){ const d=el("div"); list.forEach(r=>d.appendChild(r)); return d; }
function row(label,desc,right,onclick){
const r=el("button"); r.className="press";
Object.assign(r.style,{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",width:"100%",
padding:"13px 2px",border:"none",borderTop:"1px solid var(--line)",background:"transparent",cursor:onclick?"pointer":"default",textAlign:"left"});
r.innerHTML=`<div style="flex:1;min-width:0">
<div style="font-size:13px;font-weight:700;color:var(--ink)">${label}</div>
${desc?`<div style="font-size:11px;color:var(--ink-3);margin-top:3px;line-height:1.4">${desc}</div>`:""}</div>
<div style="flex-shrink:0;color:var(--ink-3)">${right||""}</div>`;
if(onclick) r.onclick=onclick;
return r; }
function toggleUI(on){
return `<span style="display:inline-block;width:44px;height:26px;border-radius:999px;background:${on?"var(--acc)":"var(--card-2)"};position:relative;transition:background .2s">
<span style="position:absolute;top:3px;left:${on?"21px":"3px"};width:20px;height:20px;border-radius:50%;background:${on?"var(--acc-ink)":"var(--ink-4)"};transition:left .25s var(--spring)"></span></span>`; }

const shakyCount=Object.keys(state.shaky).length;
inner.appendChild(acc("badges","🏅","Achievements",`${unlockedCount} / ${ACHIEVEMENTS.length}`,buildAchievements));
inner.appendChild(acc("mocks","📊","Mock scores",state.mocks.length?`${state.mocks.length} logged`:"",buildMockCard));
inner.appendChild(acc("shaky","⚠️","Revision queue",shakyCount?`${shakyCount} shaky`:"",buildShakyCard));
inner.appendChild(acc("timer","⏱","Timer & notifications","",()=>rows([
row("Auto loop","Cycle focus → break automatically",toggleUI(state.pomo.loop),toggleLoop),
row("Sounds","Chimes for session completion & achievements",toggleUI(state.sound),()=>{ state.sound=!state.sound; saveJSON(SOUND_KEY,state.sound); if(state.sound) playSound("complete"); render(); }),
row("Session notifications","Ping when a focus session or break ends",toggleUI(notifOn()),toggleNotif),
row("Notification status",
`App ${APP_VERSION} · permission: <b>${notifSupported()?Notification.permission:"unsupported"}</b> · pref: ${state.notif?"on":"off"}${notifSupported()&&Notification.permission==="denied"?"<br>Blocked by the system — tap to see the fix":""}`,
"ⓘ",()=>{
if(!notifSupported()){ toast("This browser has no Notification API"); return; }
if(Notification.permission==="granted"){ notify("Test notification 🔔","If you can read this, notifications work."); toast("Test sent — did it appear?"); }
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
inner.appendChild(acc("blocking","🔒","Blocking & strict mode",state.block.strict?"armed":"",()=>rows([
row("Strict focus lock","During focus: Stop / Pause / Back need a 5-second hold, Esc is blocked, leaving the app is logged as a distraction",toggleUI(state.block.strict),toggleStrict),
row("Block adult sites — whole device","Free, built into Android & Windows via DNS. Tap for 2-min setup","→",showBlockGuide),
row("Block distracting apps","Uses Android Focus Mode / Windows Focus — tap for setup","→",showAppBlockGuide),
])));
inner.appendChild(acc("app","⚙️","App & data","",()=>rows([
row("Dark theme","Easier on the eyes for long sessions",toggleUI(state.theme==="dark"),()=>{ state.theme=state.theme==="dark"?"light":"dark"; saveJSON(THEME_KEY,state.theme); render(); }),
isStandalone()
? row("Installed as app","Running standalone · offline ready","✓")
: row("Install app","Add to home screen — full screen, offline, notifications","⬇",installApp),
row("Backup data","Download all progress as JSON","⬇",exportData),
row("Restore backup","Load a previous backup file","⬆",()=>document.getElementById("importFile").click()),
row("Reset progress","Clears every checked task — cannot be undone","",()=>{
if(confirm("Reset ALL task progress? This cannot be undone.")){ state.checked={}; saveJSON(STORAGE_KEY,state.checked); render(); toast("Progress reset"); } }),
row("Sign out","Stop syncing on this device","",async()=>{
if(!confirm("Sign out from ESE2027?")) return;
try{ if(window.sbAuth) await window.sbAuth.signOut(); }catch(e){}
toast("Signed out"); }),
row("Shortcuts","⌘K palette · 1–5 tabs · T theme · Z undo · Space timer",""),
])));

inner.appendChild(html(`<div style="text-align:center;font-size:11px;color:var(--ink-4);line-height:1.9;padding:8px 0 20px">
ESE2027 Study OS · ${APP_VERSION}<br>Built for one goal — Jan 31, 2027</div>`));
wrap.appendChild(inner); wireTheme(wrap); return wrap; }

/* ════════════════ ACHIEVEMENTS ════════════════ */
const ACHIEVEMENTS=[
{id:"first_session",icon:"🥇",title:"First Focus Session",desc:"Complete your first timed session",goal:1,type:"sessions",bc:"#E8B04B"},
{id:"first_day",icon:"🌅",title:"Day One Done",desc:"Clear every task of a day",goal:1,type:"days",bc:"#5BB8E8"},
{id:"sessions10",icon:"🎬",title:"10 Sessions",desc:"Ten focus sessions in the bank",goal:10,type:"sessions",bc:"#5BD6A9"},
{id:"sessions50",icon:"🎖",title:"50 Sessions",desc:"Fifty rounds of deep work",goal:50,type:"sessions",bc:"#4BA8E8"},
{id:"sessions150",icon:"🛡",title:"150 Sessions",desc:"A hundred and fifty battles fought",goal:150,type:"sessions",bc:"#A78BFA"},
{id:"streak3",icon:"🔥",title:"3-Day Streak",desc:"Study three days in a row",goal:3,type:"streak",bc:"#E8834B"},
{id:"streak7",icon:"🔥",title:"7-Day Streak",desc:"A full week without breaking",goal:7,type:"streak",bc:"#E86A6A"},
{id:"streak30",icon:"⚡",title:"30-Day Streak",desc:"One month of pure discipline",goal:30,type:"streak",bc:"#A78BFA"},
{id:"streak60",icon:"🌪",title:"60-Day Streak",desc:"Two months. Relentless",goal:60,type:"streak",bc:"#E8574B"},
{id:"streak100",icon:"💫",title:"100-Day Streak",desc:"Triple digits of consistency",goal:100,type:"streak",bc:"#D6B84B"},
{id:"sstreak3",icon:"🎯",title:"On Schedule ×3",desc:"3-day session streak — in-slot focus",goal:3,type:"sstreak",bc:"#C9F24E"},
{id:"sstreak7",icon:"🎯",title:"On Schedule ×7",desc:"A week of hitting your slots",goal:7,type:"sstreak",bc:"#A8D437"},
{id:"sstreak21",icon:"🏹",title:"Slot Sniper",desc:"21 days of in-slot discipline",goal:21,type:"sstreak",bc:"#7AAA14"},
{id:"hours10",icon:"⏱",title:"10 Study Hours",desc:"Ten hours of tracked focus",goal:10,type:"hours",bc:"#5BD6A9"},
{id:"hours50",icon:"⏳",title:"50 Study Hours",desc:"Fifty hours — serious momentum",goal:50,type:"hours",bc:"#4BA8E8"},
{id:"hours100",icon:"🕰",title:"100 Study Hours",desc:"Triple digits. Elite territory",goal:100,type:"hours",bc:"#8B6FD9"},
{id:"hours250",icon:"🌗",title:"250 Study Hours",desc:"A quarter-thousand hours deep",goal:250,type:"hours",bc:"#E8B04B"},
{id:"hours500",icon:"🌕",title:"500 Study Hours",desc:"Half a thousand. Rank material",goal:500,type:"hours",bc:"#D6B84B"},
{id:"tasks100",icon:"📚",title:"100 Tasks Done",desc:"A hundred boxes ticked",goal:100,type:"tasks",bc:"#5BB8E8"},
{id:"tasks500",icon:"📖",title:"500 Tasks Done",desc:"Five hundred steps closer",goal:500,type:"tasks",bc:"#E8B04B"},
{id:"tasks1000",icon:"🏛",title:"1000 Tasks Done",desc:"A thousand. Unstoppable",goal:1000,type:"tasks",bc:"#E86A6A"},
{id:"tasks2000",icon:"🗿",title:"2000 Tasks Done",desc:"Two thousand. Monumental",goal:2000,type:"tasks",bc:"#8B6FD9"},
{id:"days10",icon:"🏆",title:"10 Days Cleared",desc:"Ten perfect days",goal:10,type:"days",bc:"#D6B84B"},
{id:"days50",icon:"👑",title:"50 Days Cleared",desc:"Fifty flawless days",goal:50,type:"days",bc:"#E8A04B"},
{id:"days100",icon:"💎",title:"100 Days Cleared",desc:"One hundred perfect days",goal:100,type:"days",bc:"#5BE8D6"},
{id:"mock1",icon:"📝",title:"First Mock Logged",desc:"Face the scoreboard once",goal:1,type:"mocks",bc:"#E86A6A"},
{id:"mock5",icon:"📊",title:"5 Mocks Logged",desc:"Five honest data points",goal:5,type:"mocks",bc:"#5BB8E8"},
{id:"mock15",icon:"🧪",title:"15 Mocks Logged",desc:"Fifteen tests faced head-on",goal:15,type:"mocks",bc:"#A78BFA"},
{id:"subject1",icon:"🎓",title:"First Subject Mastered",desc:"Finish 100% of any subject",goal:1,type:"subjects",bc:"#5BD6A9"},
{id:"subject3",icon:"🧠",title:"Three Subjects Down",desc:"Master three full subjects",goal:3,type:"subjects",bc:"#C9F24E"},
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
return {sessions,hours:Math.floor(minutes/60),tasks,days:doneDaysCount(),streak:computeStreak(),subjects,sstreak:computeSessionStreak(),mocks:state.mocks.length}; }
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
const colors=isL?["#5C8A00","#7AAA14","#B07508","#1C7FB5","#C24040","#6D4FC9"]
:["#C9F24E","#A8D437","#E8B04B","#5BB8E8","#E86A6A","#A78BFA","#F2F4F1"];
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
shape:Math.random()<0.25?"circle":"rect",
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
ov.innerHTML=`
<div class="celebrate-card">
<div class="medallion">
<div class="burst"></div>
<div class="halo"></div>
<div class="core">${icon}</div>
</div>
<div class="celebrate-eyebrow">${eyebrow}</div>
<div class="celebrate-title">${title}</div>
<div class="celebrate-sub">${sub}</div>
${next?`<div class="celebrate-next">
<span style="font-size:20px;filter:grayscale(1);opacity:.7">${next.a.icon}</span>
<div style="flex:1;min-width:0">
<div style="font-size:11px;font-weight:800;color:var(--ink-2)">Next: ${next.a.title}</div>
<div class="track" style="height:5px;margin-top:6px"><div class="fill" style="width:${next.pct}%"></div></div>
<div style="font-size:10px;color:var(--ink-4);margin-top:4px;font-weight:600">${next.have} / ${next.a.goal} · ${next.pct}%</div>
</div></div>`:""}
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
const streak=computeStreak();
const n=nextAchievement();
showCelebration({eyebrow:"Day conquered",icon:"🏆",
title:day.date+" — 100%",
sub:`Every task of “${day.subject}” is done.${streak>1?` ${streak}-day streak alive.`:""} Tomorrow builds on today.`,
next:n,cta:"On to tomorrow"}); }

/* ════════════════ RENDER CORE ════════════════ */
function render(){
document.body.classList.toggle("light",state.theme==="light");
const tc=document.querySelector('meta[name="theme-color"]');
if(tc) tc.setAttribute("content",state.theme==="light"?"#F4F5F2":"#0D0F12");
syncPomoState();
syncWakeLock();
view.innerHTML="";
if(state.nav==="home") view.appendChild(renderHome());
else if(state.nav==="plan") view.appendChild(renderPlan());
else if(state.nav==="focus") view.appendChild(renderFocus());
else if(state.nav==="stats") view.appendChild(renderStats());
else view.appendChild(renderSettings());
renderNav(); updateLandscape(); }
function renderNav(){
navEl.innerHTML="";
[["home","Home"],["plan","Plan"],["focus","Focus"],["stats","Stats"],["settings","Profile"]].forEach(([id,label])=>{
const b=el("button"); b.className="navbtn press"+(state.nav===id?" active":"");
b.setAttribute("aria-label",label);
b.setAttribute("aria-current",state.nav===id?"page":"false");
b.innerHTML=IC[id]+`<span>${label}</span>`;
b.onclick=()=>setNav(id);
navEl.appendChild(b); }); }

/* ── command palette ──────────────────────────────────── */
let cmdOpen=false;
function commandList(){
const c=[
{i:"◈",l:"Go to Home",r:()=>setNav("home")},
{i:"◈",l:"Go to Plan",r:()=>setNav("plan")},
{i:"◈",l:"Go to Focus",r:()=>setNav("focus")},
{i:"◈",l:"Go to Progress",r:()=>setNav("stats")},
{i:"◈",l:"Go to Settings",r:()=>setNav("settings")},
{i:"→",l:"Jump to today",r:()=>{ goToday(); if(state.nav!=="plan") setNav("plan"); }},
{i:"◐",l:state.theme==="dark"?"Switch to light theme":"Switch to dark theme",r:()=>{ state.theme=state.theme==="dark"?"light":"dark"; saveJSON(THEME_KEY,state.theme); render(); }},
{i:"▸",l:state.pomo.running?"Pause timer":"Start timer",r:toggleRunning},
{i:"↺",l:"Reset timer",r:resetPomo},
{i:"⌫",l:"Undo last check",r:undoLast},
{i:"⬇",l:"Backup data",r:exportData},
];
SCHED.forEach((d,i)=>c.push({i:"▪",l:`Open ${d.date} · ${d.subject}`,day:true,r:()=>{ jumpTo(i); if(state.nav!=="plan") setNav("plan"); }}));
return c; }
function openCmd(){
if(cmdOpen) return; cmdOpen=true;
const prevFocus=document.activeElement;
const scrim=el("div"); scrim.className="scrim";
scrim.setAttribute("role","dialog"); scrim.setAttribute("aria-modal","true"); scrim.setAttribute("aria-label","Command palette");
Object.assign(scrim.style,{alignItems:"flex-start",paddingTop:"12vh"});
const sheet=el("div"); sheet.className="sheet";
const inp=document.createElement("input");
inp.type="text"; inp.placeholder="Search commands or days…"; inp.setAttribute("aria-label","Search commands");
Object.assign(inp.style,{width:"100%",boxSizing:"border-box",padding:"17px 20px",border:"none",
borderBottom:"1px solid var(--line)",background:"transparent",color:"var(--ink)",fontSize:"15px",outline:"none",fontFamily:"inherit"});
const list=el("div"); list.setAttribute("role","listbox");
Object.assign(list.style,{maxHeight:"44vh",overflowY:"auto",padding:"6px"});
let items=[],sel=0;
function paint(q){
const all=commandList(); const ql=(q||"").toLowerCase().trim();
items=ql?all.filter(c=>c.l.toLowerCase().includes(ql)):all.filter(c=>!c.day).concat(all.filter(c=>c.day).slice(0,5));
sel=0; list.innerHTML="";
if(!items.length){ list.innerHTML=`<div style="padding:24px;text-align:center;color:var(--ink-3);font-size:13px">Nothing matches</div>`; return; }
items.forEach((c,i)=>{
const row=el("button"); row.setAttribute("role","option");
Object.assign(row.style,{width:"100%",display:"flex",alignItems:"center",gap:"12px",padding:"12px 14px",
border:"none",borderRadius:"12px",background:i===sel?"var(--acc-dim)":"transparent",
color:i===sel?"var(--acc)":"var(--ink-2)",fontSize:"13.5px",fontWeight:"600",cursor:"pointer",textAlign:"left"});
row.innerHTML=`<span style="width:18px;text-align:center;opacity:.8">${c.i}</span><span style="flex:1">${c.l}</span>`;
row.onmouseenter=()=>{ sel=i; refresh(); };
row.onclick=()=>{ close(); c.r(); };
list.appendChild(row); }); }
function refresh(){ [...list.children].forEach((r,i)=>{ r.style.background=i===sel?"var(--acc-dim)":"transparent"; r.style.color=i===sel?"var(--acc)":"var(--ink-2)"; }); }
function close(){ cmdOpen=false; scrim.classList.remove("in");
setTimeout(()=>{ scrim.remove(); if(prevFocus&&prevFocus.focus) prevFocus.focus(); },200);
document.removeEventListener("keydown",onKey,true); }
function onKey(e){
if(e.key==="Escape"){ e.preventDefault(); close(); }
else if(e.key==="ArrowDown"){ e.preventDefault(); sel=Math.min(sel+1,items.length-1); refresh(); list.children[sel]&&list.children[sel].scrollIntoView({block:"nearest"}); }
else if(e.key==="ArrowUp"){ e.preventDefault(); sel=Math.max(sel-1,0); refresh(); list.children[sel]&&list.children[sel].scrollIntoView({block:"nearest"}); }
else if(e.key==="Enter"){ e.preventDefault(); const c=items[sel]; if(c){ close(); c.r(); } } }
inp.oninput=()=>paint(inp.value);
scrim.onclick=e=>{ if(e.target===scrim) close(); };
document.addEventListener("keydown",onKey,true);
sheet.appendChild(inp); sheet.appendChild(list);
sheet.appendChild(html(`<div style="display:flex;gap:16px;padding:10px 16px;border-top:1px solid var(--line);font-size:10.5px;color:var(--ink-4);font-weight:600"><span>↑↓ navigate</span><span>↵ run</span><span>esc close</span></div>`));
scrim.appendChild(sheet); document.body.appendChild(scrim);
requestAnimationFrame(()=>scrim.classList.add("in"));
paint(""); inp.focus(); }

/* ── global shortcuts ─────────────────────────────────── */
document.addEventListener("keydown",e=>{
if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){ e.preventDefault(); openCmd(); return; }
if(cmdOpen) return;
/* flip clock: Esc = back to normal UI */
if(e.key==="Escape"&&clockOn){ e.preventDefault(); if(strictActive()){ toast("Strict mode — hold the Back button 5s"); return; } leaveClock(); return; }
const t=e.target;
if(t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA"||t.tagName==="SELECT"||t.isContentEditable)) return;
if(e.ctrlKey||e.metaKey||e.altKey) return;
switch(e.key){
case "1": setNav("home"); break;
case "2": setNav("plan"); break;
case "3": setNav("focus"); break;
case "4": setNav("stats"); break;
case "5": setNav("settings"); break;
case "t": case "T": state.theme=state.theme==="dark"?"light":"dark"; saveJSON(THEME_KEY,state.theme); render(); break;
case " ": if(state.nav==="focus"){ e.preventDefault(); if(strictActive()){ toast("Strict mode — hold Pause on the clock"); break; } toggleRunning(); } break;
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
G_STEP(2,"Choose “Private DNS provider hostname”")+
G_STEP(3,"Enter: <b>adult-filter-dns.cleanbrowsing.org</b>")+
G_STEP(4,"Save. Done — works on Wi-Fi and mobile data.")+
G_HEAD("Windows 11")+
G_STEP(1,"Settings → Network &amp; Internet → Wi-Fi → your network → <b>DNS server assignment</b> → Edit")+
G_STEP(2,"Switch to Manual → turn on IPv4")+
G_STEP(3,"Preferred DNS: <b>185.228.168.10</b> · Alternate: <b>185.228.169.11</b>")+
G_STEP(4,"Set “DNS over HTTPS” to On (automatic) → Save")+
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
G_STEP(3,"Tap “Turn on now” before each study session — icons grey out and notifications mute")+
G_STEP(4,"Optional: “Set a schedule” to auto-enable during your 5 study slots (8:30, 11:00, 3:00, 6:30, 9:30)")+
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
alert("To install on iPhone/iPad:\n\n1. Tap the Share button (□↑) in Safari\n2. Scroll down → “Add to Home Screen”\n3. Tap Add");
}else{
alert("To install:\n\nOpen the browser menu (⋮) and choose “Install app” / “Add to Home screen”.\n\nNote: install requires the app to be served over https or localhost — not from a file:// path."); } }

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
if(["home","plan","focus","stats","settings"].includes(h)) state.nav=h; })();
window.addEventListener("hashchange",()=>{
const h=(location.hash||"").replace("#","");
if(["home","plan","focus","stats","settings"].includes(h)&&state.nav!==h) setNav(h); });

/* ── lifecycle ────────────────────────────────────────── */
document.getElementById("importFile").addEventListener("change",handleImportFile);
window.addEventListener("resize",()=>{ updateLandscape(); });
window.addEventListener("orientationchange",()=>setTimeout(()=>{ updateLandscape(); renderTimerOnly(); },120));
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible"){ syncPomoState(); render(); } else{ bankProgress(); if(strictActive()){ logDistraction(); notify("Focus broken 🚨","You left mid-session. It's logged. Get back in."); } releaseWakeLock(); saveJSON(POMO_KEY,state.pomo); } });
window.addEventListener("pagehide",()=>{ bankProgress(); saveJSON(POMO_KEY,state.pomo); });
window.addEventListener("pageshow",()=>{ syncPomoState(); render(); });
/* re-assert push subscription on every launch (tokens can rotate) */
if("Notification" in window&&Notification.permission==="granted") setTimeout(subscribePush,2500);

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
'<div id="cmsg" style="font-size:12px;color:var(--rose);text-align:center;margin-top:10px;min-height:16px"></div>'+
'<div style="text-align:center;margin-top:6px;font-size:13px;color:var(--ink-3)">'+(mode==="up"?"Have an account? ":"New here? ")+'<a id="ctog" href="#" style="color:var(--acc);font-weight:700;text-decoration:none">'+(mode==="up"?"Sign in":"Create one")+"</a></div>");
document.getElementById("ctog").onclick=function(e){ e.preventDefault(); form(mode==="up"?"in":"up"); };
document.getElementById("cgo").onclick=function(){
var em=document.getElementById("ce").value.trim(), pw=document.getElementById("cp").value, m=document.getElementById("cmsg");
if(!em||!pw){ m.textContent="Enter email and password"; return; }
m.style.color="var(--ink-3)"; m.textContent="Please wait…";
var p=mode==="up"?sb.auth.signUp({email:em,password:pw}):sb.auth.signInWithPassword({email:em,password:pw});
p.then(function(r){ if(r.error){ m.style.color="var(--rose)"; m.textContent=r.error.message; } }); }; }
function loading(){ card('<div style="text-align:center;padding:20px 0;font-size:14px;color:var(--ink-3)">Loading your progress…</div>'); }
function push(){ if(!user) return; sb.from("user_progress").upsert({user_id:user.id,data:snap(),updated_at:new Date().toISOString()}).then(function(){}); }
window._sbSavePush=function(subJson){
if(!user||!subJson||!subJson.endpoint) return;
sb.from("push_subs").upsert({endpoint:subJson.endpoint,user_id:user.id,sub:subJson,updated_at:new Date().toISOString()},{onConflict:"endpoint"}).then(function(){}); };
function afterLogin(session){
user=session.user; loading();
sb.from("user_progress").select("data,updated_at").eq("user_id",user.id).maybeSingle().then(function(res){
var cloud=res.data, localChange=localStorage.getItem(CHANGE);
if(cloud&&cloud.data&&Object.keys(cloud.data).length){
if(!localChange||cloud.updated_at>localChange){ restore(cloud.data); localStorage.setItem(CHANGE,cloud.updated_at); render(); }
else push(); }
else push();
lastSnap=JSON.stringify(snap()); hide(); render();
}).catch(function(){ hide(); }); }
sb.auth.onAuthStateChange(function(_e,session){ if(session) afterLogin(session); else form("in"); });
setInterval(function(){ if(!user) return; var s=JSON.stringify(snap());
if(s!==lastSnap){ lastSnap=s; localStorage.setItem(CHANGE,new Date().toISOString()); push(); } },3000);
window.addEventListener("beforeunload",function(){ if(user) push(); });
})();

/* ── boot ─────────────────────────────────────────────── */
render();
/* animated splash → hand off to the app once the intro has played */
(function(){
const sp=document.getElementById("splash"); if(!sp) return;
const min=matchMedia("(prefers-reduced-motion: reduce)").matches?250:4800;
setTimeout(()=>{ sp.classList.add("out"); setTimeout(()=>sp.remove(),520); },min);
})();
/* refresh countdowns + streak once a minute while on Home */
setInterval(()=>{ if(state.nav==="home"&&!document.hidden) render(); },60000);
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
