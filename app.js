// ==================== STATE ====================
let players=[],pScores={};
let teams=[],tScores={};
let mode='solo'; // 'solo' or 'team'
let curPage='hp';

// Per-game state
let curTOD=0, curWA=0, curWAHints=[], curWAWord=null, curWACat=null;
let curBomb=0, bombTimer_=null, bombRunning=false, bombSecs=15, bombSelCat=null, bombQ=null;
let wNames=[],wAngle=0,wSpin=false;
let mCards=[],mFlipped=[],mMatched=0,mLocked=false,mMoves=0,mTimer=null,mSecs=0,mPScores={},mCurP=0;
let stLines=[],stCurP=0,stTimer=null,stSecs=20,stRunning=false;
let chalCurP=0,selChalCat=null;
let qzIdx=0,qzScore=0,qzStreak=0,qzCurP=0,qzAnswered=false;
let ffCurQ=null,ffAnswered=false;
let numsCurP=0,numsTarget=null,numsRevealed=false;
let wsiAnswered=false;
let obsCurP=0,obsTimer=null,obsScene=null,obsHidden=false;
let photoCurTeam=0;
let tinfoCurTeam=0,tinfoIdx=0,tinfoAnswered=false;
let whereCurTeam=0,whereIdx=0,whereAnswered=false;
let rebusCurTeam=0,rebusIdx=0,rebusAnswered=false;

// ==================== SETUP ====================
function switchMode(m){
  mode=m;
  document.querySelectorAll('.mtab').forEach((t,i)=>t.classList.toggle('act',i===(m==='solo'?0:1)));
  document.getElementById('solo-setup').style.display=m==='solo'?'block':'none';
  document.getElementById('team-setup').classList.toggle('show',m==='team');
  if(m==='team'&&teams.length===0){addTeam();addTeam();}
  validateStart();
}

function addP(){
  const i=document.getElementById('pinp');
  const n=i.value.trim();
  if(!n||players.includes(n)||players.length>=12)return;
  players.push(n);pScores[n]=0;i.value='';
  renderPList();validateStart();
}
function removeP(i){players.splice(i,1);pScores={};players.forEach(p=>pScores[p]=0);renderPList();validateStart();}
function renderPList(){
  const l=document.getElementById('plist');
  if(!players.length){l.innerHTML='<div class="ehint">أضف على الأقل شخصين</div>';return;}
  l.innerHTML=players.map((n,i)=>{
    const c=PC[i%PC.length];
    return`<div class="pitem"><div class="pav" style="background:${c.dk};color:${c.bg}">${n[0]}</div><div class="pname">${n}</div><button class="pdel" onclick="removeP(${i})">×</button></div>`;
  }).join('');
}

let teamIdCounter=0;
function addTeam(){
  if(teams.length>=8)return;
  const id=teamIdCounter++;
  const c=TC[teams.length%TC.length];
  teams.push({id,name:c.name,count:2,color:c});
  tScores[id]=0;
  renderTeamList();validateStart();
}
function removeTeam(id){
  teams=teams.filter(t=>t.id!==id);
  delete tScores[id];
  renderTeamList();validateStart();
}
function renderTeamList(){
  document.getElementById('teams-list').innerHTML=teams.map((t,i)=>`
    <div class="team-row">
      <div class="team-color" style="background:${t.color.dk};color:${t.color.bg}">${t.color.emoji}</div>
      <input class="team-name-inp" value="${t.name}" oninput="teams[${i}].name=this.value">
      <div class="team-count">
        <button class="tc-btn" onclick="chgTeamCount(${i},-1)">−</button>
        <div class="tc-val">${t.count}</div>
        <button class="tc-btn" onclick="chgTeamCount(${i},1)">+</button>
      </div>
      <button class="del-team" onclick="removeTeam(${t.id})">×</button>
    </div>`).join('')+
    `<div style="font-size:12px;color:var(--sub);text-align:center;margin-bottom:8px">عدد الأفراد لكل فريق</div>`;
}
function chgTeamCount(i,d){teams[i].count=Math.max(1,teams[i].count+d);renderTeamList();}

function validateStart(){
  const ok=mode==='solo'?players.length>=2:teams.length>=2;
  document.getElementById('stbtn').disabled=!ok;
}

function startGame(){
  if(mode==='solo'&&players.length<2)return;
  if(mode==='team'&&teams.length<2)return;
  // reset scores
  players.forEach(p=>pScores[p]=0);
  teams.forEach(t=>tScores[t.id]=0);
  // init wheel with players
  wNames=[...players];
  // go to main
  document.getElementById('stp').classList.remove('on');
  document.getElementById('main').classList.add('on');
  document.getElementById('fbtn').style.display='flex';
  renderHome();
  goPage('hp');
  setTopbar('🎊 لعبة الألعاب',goSetup);
}

function goSetup(){
  stopAllTimers();
  document.getElementById('main').classList.remove('on');
  document.getElementById('stp').classList.add('on');
  document.getElementById('fbtn').style.display='none';
  closeSP();
}

// ==================== HOME ====================
const soloGames=[
  {id:'tod-page',ico:'🎯',title:'صراحة أو جراءة',desc:'أسئلة وتحديات للجمعة',stripe:'linear-gradient(90deg,#38BDF8,#7C3AED)'},
  {id:'wheel-page',ico:'🎡',title:'دولاب الحظ',desc:'يدور ويختار بضربة حظ',stripe:'linear-gradient(90deg,#EC4899,#F97316)'},
  {id:'mem-page',ico:'🧩',title:'تطابق الأشكال',desc:'اقلب البطاقات وطابق الأزواج',stripe:'linear-gradient(90deg,#22C55E,#38BDF8)'},
  {id:'bomb-page',ico:'💣',title:'الكرسي الساخن',desc:'أجب قبل تنفجر القنبلة!',stripe:'linear-gradient(90deg,#EF4444,#F97316)'},
  {id:'story-page',ico:'📖',title:'كمّل القصة',desc:'كل واحد يضيف جملة — القنبلة تضغط!',stripe:'linear-gradient(90deg,#06B6D4,#22C55E)'},
  {id:'chal-page',ico:'⚡',title:'تحديات الجمعة',desc:'تحديات مجنونة ومضحكة',stripe:'linear-gradient(90deg,#F97316,#EF4444)'},
  {id:'quiz-page',ico:'🧠',title:'مسابقة المعلومات',desc:'أسئلة ثقافية ودينية',stripe:'linear-gradient(90deg,#A855F7,#38BDF8)'},
  {id:'fast-page',ico:'⚡',title:'أسرع واحد',desc:'أول واحد يكمّل التحدي يفوز!',stripe:'linear-gradient(90deg,#F59E0B,#EF4444)'},
  {id:'nums-page',ico:'🔢',title:'لعبة الأرقام',desc:'تلميحات تساعدك تخمن الرقم',stripe:'linear-gradient(90deg,#06B6D4,#8B5CF6)'},
  {id:'obs-page',ico:'👁',title:'لعبة الملاحظة',desc:'شاهد وتذكر التفاصيل',stripe:'linear-gradient(90deg,#22C55E,#F59E0B)'},
];
const teamGames=[
  {id:'photo-page',ico:'📸',title:'تحدي الصور',desc:'شوف الصورة المضبّبة وخمّن!',stripe:'linear-gradient(90deg,#F59E0B,#EC4899)'},
  {id:'tinfo-page',ico:'⚔️',title:'تحدي المعلومات',desc:'فريق ضد فريق — أسئلة وأجوبة',stripe:'linear-gradient(90deg,#EF4444,#A855F7)'},
  {id:'where-page',ico:'🗺️',title:'وين هذا؟',desc:'خمّن المكان من الصورة والوصف',stripe:'linear-gradient(90deg,#38BDF8,#22C55E)'},
  {id:'rebus-page',ico:'📜',title:'أمثال',desc:'خمّن معنى المثل الصح',stripe:'linear-gradient(90deg,#8B5CF6,#F97316)'},
];

function renderHome(){
  document.getElementById('solo-grid').innerHTML=soloGames.map(g=>`
    <div class="gcard" onclick="openGame('${g.id}','${g.ico} ${g.title}')">
      <div class="gstripe" style="background:${g.stripe}"></div>
      <span class="gicon">${g.ico}</span>
      <div class="gtitle">${g.title}</div>
      <div class="gdesc">${g.desc}</div>
    </div>`).join('');
  document.getElementById('team-grid').innerHTML=teamGames.map(g=>`
    <div class="gcard" onclick="openGame('${g.id}','${g.ico} ${g.title}')">
      <div class="gstripe" style="background:${g.stripe}"></div>
      <span class="gicon">${g.ico}</span>
      <div class="gtitle">${g.title}</div>
      <div class="gdesc">${g.desc}</div>
    </div>`).join('');
}

// ==================== NAVIGATION ====================
function openGame(pid,title){
  // Team games require teams — if none, redirect to setup in team mode
  const isTeamGame=teamGames.some(g=>g.id===pid);
  if(isTeamGame&&teams.length<2){
    // Go back to setup in team mode
    goSetup();
    setTimeout(()=>switchMode('team'),80);
    showOvl('👥','سوّي الفرق أول!','ضيف فريقين على الأقل عشان تلعب ألعاب الأفرقة');
    return;
  }
  stopAllTimers();
  goPage(pid,title);
  initGame(pid);
}
function goHome(){
  stopAllTimers();
  goPage('hp');
  setTopbar('🎊 لعبة الألعاب',goSetup);
}
function goPage(pid,title){
  document.querySelectorAll('.gpage').forEach(p=>p.classList.remove('on'));
  document.getElementById('hp').style.display=pid==='hp'?'block':'none';
  if(pid!=='hp') document.getElementById(pid).classList.add('on');
  curPage=pid;
}
function setTopbar(title,fn){
  document.getElementById('tbtitle').textContent=title;
  document.getElementById('backbtn').onclick=fn;
  document.getElementById('backbtn').textContent=fn===goSetup?'← رجوع':'← الرئيسية';
}

function stopAllTimers(){
  if(mTimer){clearInterval(mTimer);mTimer=null;}
  if(bombTimer_){clearInterval(bombTimer_);bombTimer_=null;bombRunning=false;}
  if(stTimer){clearInterval(stTimer);stTimer=null;stRunning=false;}
  if(obsTimer){clearInterval(obsTimer);obsTimer=null;}
}

function initGame(pid){
  const title=(soloGames.concat(teamGames).find(g=>g.id===pid)||{title:''});
  const titleStr=(soloGames.concat(teamGames).find(g=>g.id===pid)||{ico:'',title:''});
  setTopbar(`${titleStr.ico} ${titleStr.title}`,goHome);
  if(pid==='tod-page'){initTOD();}
  else if(pid==='wheel-page'){initWheel();}
  else if(pid==='mem-page'){initMem();}
  else if(pid==='whoami-page'){initWA();}
  else if(pid==='bomb-page'){initBomb();}
  else if(pid==='story-page'){initStory();}
  else if(pid==='chal-page'){initChal();}
  else if(pid==='quiz-page'){initQZ();}
  else if(pid==='fast-page'){initFF();}
  else if(pid==='nums-page'){initNums();}
  else if(pid==='wsi-page'){initWSI();}
  else if(pid==='obs-page'){initObs();}
  else if(pid==='photo-page'){initPhoto();}
  else if(pid==='tinfo-page'){initTInfo();}
  else if(pid==='where-page'){initWhere();}
  else if(pid==='rebus-page'){initRebus();}
}

// ==================== BADGE HELPERS ====================
function setBadge(id,emoji,pname,c){
  const b=document.getElementById(id);
  if(!b)return;
  b.style.background=c.dk;b.style.borderColor=c.bg;b.style.color=c.bg;
  b.innerHTML=`${emoji} دور: <span>${pname}</span>`;
}
function setTeamBadge(id,emoji,tname,c){
  const b=document.getElementById(id);
  if(!b)return;
  b.style.background=c.dk;b.style.borderColor=c.bg;b.style.color=c.bg;
  b.innerHTML=`${emoji} دور فريق: <span>${tname}</span>`;
}
function renderTeamScoreBar(elId,cur){
  const el=document.getElementById(elId);
  if(!el)return;
  el.innerHTML=teams.slice(0,2).map((t,i)=>`
    <div class="tsbar-item" style="${i===cur?`border-color:${t.color.bg};background:${t.color.dk}`:''};border-color:${i===cur?t.color.bg:'var(--b2)'}">
      <div class="tsbar-name" style="color:${t.color.bg}">${t.color.emoji} ${t.name}</div>
      <div class="tsbar-pts">${tScores[t.id]||0}</div>
    </div>`).join('');
}

// ==================== SCORE PANEL ====================
function openSP(){renderSP();document.getElementById('spanel').classList.add('open');}
function closeSP(){document.getElementById('spanel').classList.remove('open');}
function renderSP(){
  const medals=['🥇','🥈','🥉'];
  if(mode==='team'){
    const sorted=[...teams].sort((a,b)=>(tScores[b.id]||0)-(tScores[a.id]||0));
    const best=sorted[0];
    document.getElementById('best-box-wrap').innerHTML=`<div class="best-box"><div class="btitle">🏆 أفضل فريق</div><div class="bval">${best.color.emoji} ${best.name}</div><div class="bsub">${tScores[best.id]||0} نقطة</div></div>`;
    document.getElementById('slist').innerHTML=sorted.map((t,i)=>`
      <div class="srow">
        <div class="spos">${medals[i]||i+1}</div>
        <div class="sav" style="background:${t.color.dk};color:${t.color.bg}">${t.color.emoji}</div>
        <div class="sinf"><div class="sn">${t.name}</div><div class="st">${t.count} أشخاص</div></div>
        <div class="spts">${tScores[t.id]||0}</div>
        <div class="sctrl">
          <button class="scbtn m" onclick="chgTScore(${t.id},-1)">−</button>
          <button class="scbtn p" onclick="chgTScore(${t.id},1)">+</button>
        </div>
      </div>`).join('');
  } else {
    const sorted=[...players].sort((a,b)=>pScores[b]-pScores[a]);
    const best=sorted[0];
    const half=Math.max(1,Math.floor(sorted.length/2));
    const tA=sorted.slice(0,half),tB=sorted.slice(half);
    const sA=tA.reduce((s,p)=>s+pScores[p],0),sB=tB.reduce((s,p)=>s+pScores[p],0);
    const bestT=sA>=sB?tA:tB;
    document.getElementById('best-box-wrap').innerHTML=`
      <div class="best-box">
        <div class="btitle">🏆 أفضل لاعب</div><div class="bval">${best} — ${pScores[best]} نقطة</div>
        <div class="btitle" style="margin-top:10px">⭐ أفضل فريق</div>
        <div class="bval">${bestT.join(' & ')}</div><div class="bsub">${Math.max(sA,sB)} نقطة</div>
      </div>`;
    document.getElementById('slist').innerHTML=sorted.map((p,i)=>{
      const c=PC[players.indexOf(p)%PC.length];
      return`<div class="srow">
        <div class="spos">${medals[i]||i+1}</div>
        <div class="sav" style="background:${c.dk};color:${c.bg}">${p[0]}</div>
        <div class="sinf"><div class="sn">${p}</div><div class="st">${i===0?'🔥 المتصدر':i===sorted.length-1?'💪 يتعافى':'🎮 في السباق'}</div></div>
        <div class="spts">${pScores[p]}</div>
        <div class="sctrl">
          <button class="scbtn m" onclick="chgScore('${p}',-1)">−</button>
          <button class="scbtn p" onclick="chgScore('${p}',1)">+</button>
        </div>
      </div>`;}).join('');
  }
}
function chgScore(p,d){pScores[p]=Math.max(0,(pScores[p]||0)+d);renderSP();if(d>0)boom(12);}
function chgTScore(id,d){tScores[id]=Math.max(0,(tScores[id]||0)+d);renderSP();if(d>0)boom(12);}

// ==================== OVERLAY ====================
function showOvl(ico,title,sub){
  document.getElementById('o-ico').textContent=ico;
  document.getElementById('o-title').textContent=title;
  document.getElementById('o-sub').textContent=sub;
  document.getElementById('ovl').classList.add('show');
}
function closeOvl(){document.getElementById('ovl').classList.remove('show');}

// ==================== CONFETTI ====================
function boom(n=60){
  const c=document.getElementById('cft');
  const cols=['#F5C518','#EC4899','#38BDF8','#22C55E','#A855F7','#EF4444','#fff'];
  for(let i=0;i<n;i++){
    setTimeout(()=>{
      const p=document.createElement('div');p.className='cp';
      p.style.cssText=`left:${Math.random()*100}vw;background:${cols[~~(Math.random()*cols.length)]};width:${Math.random()*9+4}px;height:${Math.random()*9+4}px;border-radius:${Math.random()>.5?'50%':'2px'};animation-duration:${Math.random()*2+2}s`;
      c.appendChild(p);setTimeout(()=>p.remove(),4000);
    },i*22);
  }
}

// ==================== TOD ====================
function initTOD(){curTOD=0;updTODBadge();}
function updTODBadge(){setBadge('tod-badge','🎯',players[curTOD]||'-',PC[curTOD%PC.length]);}
function drawTOD(t){
  const list=t==='t'?todT:todD;
  const txt=list[~~(Math.random()*list.length)];
  const col=t==='t'?'#38BDF8':'#EF4444';
  const lbl=t==='t'?'🤍 صراحة':'🔥 جراءة';
  const c=document.getElementById('tod-card');
  c.innerHTML=`<div class="card-lbl" style="color:${col}">${lbl}</div><div class="card-txt">${txt}</div>`;
  c.style.borderColor=col+'55';
  c.style.animation='none';requestAnimationFrame(()=>c.style.animation='pop .3s cubic-bezier(.34,1.56,.64,1)');
}
function nextTOD(){curTOD=(curTOD+1)%players.length;updTODBadge();document.getElementById('tod-card').innerHTML='<div class="card-ph">اختر صراحة أو جراءة!</div>';}

// ==================== WHEEL ====================
const WC=['#EC4899','#A855F7','#38BDF8','#22C55E','#F5C518','#F97316','#EF4444','#06B6D4'];
function initWheel(){renderWChips();drawW();}
function addWN(){const i=document.getElementById('winp');const n=i.value.trim();if(!n||wNames.includes(n))return;wNames.push(n);i.value='';renderWChips();drawW();}
function removeWN(i){wNames.splice(i,1);renderWChips();drawW();}
function renderWChips(){document.getElementById('wchips').innerHTML=wNames.map((n,i)=>`<div class="wchip">${n}<button onclick="removeWN(${i})">×</button></div>`).join('');}
function drawW(hi=-1){
  const cv=document.getElementById('wcanv');if(!cv)return;
  const ctx=cv.getContext('2d'),W=cv.width,H=cv.height,cx=W/2,cy=H/2,r=cx-5;
  ctx.clearRect(0,0,W,H);
  if(wNames.length<2){ctx.fillStyle='rgba(255,255,255,0.03)';ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='bold 14px Tajawal';ctx.textAlign='center';ctx.fillText('أضف أسماء',cx,cy);return;}
  const n=wNames.length,sl=(Math.PI*2)/n;
  wNames.forEach((nm,i)=>{
    const s=wAngle+i*sl-Math.PI/2,e=s+sl;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,s,e);ctx.closePath();
    ctx.fillStyle=i===hi?'#F5C518':WC[i%WC.length];ctx.fill();ctx.strokeStyle='#07050F';ctx.lineWidth=2;ctx.stroke();
    ctx.save();ctx.translate(cx,cy);ctx.rotate(s+sl/2);ctx.textAlign='right';ctx.fillStyle=i===hi?'#000':'#fff';
    ctx.font=`bold ${Math.min(13,100/n+7)}px Tajawal`;ctx.fillText(nm.length>7?nm.slice(0,7)+'…':nm,r-10,5);ctx.restore();
  });
  ctx.beginPath();ctx.arc(cx,cy,22,0,Math.PI*2);ctx.fillStyle='#07050F';ctx.fill();ctx.strokeStyle='rgba(245,197,24,0.4)';ctx.lineWidth=2;ctx.stroke();
}
function spinW(){
  if(wSpin||wNames.length<2)return;wSpin=true;
  document.getElementById('wres').style.display='none';
  const spins=(Math.random()*5+5)*Math.PI*2,dur=3800,st=performance.now(),sa=wAngle;
  function tick(now){
    const t=Math.min((now-st)/dur,1),ease=1-Math.pow(1-t,4);
    wAngle=sa+spins*ease;drawW();
    if(t<1)requestAnimationFrame(tick);
    else{
      wSpin=false;const n=wNames.length,sl=(Math.PI*2)/n;
      const na=((-wAngle%(Math.PI*2))+(Math.PI*2))%(Math.PI*2);
      const wi=Math.floor(((na+Math.PI/2)%(Math.PI*2))/sl)%n;
      drawW(wi);
      const res=document.getElementById('wres');res.style.display='block';res.textContent='🎉 '+wNames[wi];
      showOvl('🎡','الفائز!',wNames[wi]+' 🎉');boom();
    }
  }requestAnimationFrame(tick);
}

// ==================== MEMORY ====================
const memEmj=['🌙','⭐','🎊','🌺','🎯','🎡','🏆','💎','🎸','🌈','🦋','🔥','🍀','🎭','🚀','🐉','💫','🎪','🌊','🦁','🍕','🎯','🎲','🦊'];
function initMem(){
  mMatched=0;mMoves=0;mLocked=false;mFlipped=[];mSecs=0;
  if(mTimer){clearInterval(mTimer);mTimer=null;}
  mPScores={};players.forEach(p=>mPScores[p]=0);mCurP=0;
  const pairs=[...memEmj.slice(0,12),...memEmj.slice(0,12)];
  for(let i=pairs.length-1;i>0;i--){const j=~~(Math.random()*(i+1));[pairs[i],pairs[j]]=[pairs[j],pairs[i]];}
  mCards=pairs.map((e,i)=>({id:i,e,f:false,m:false}));
  renderMGrid();renderMScores();updMStats();updMTurn();
  mTimer=setInterval(()=>{mSecs++;updMStats();},1000);
}
function updMStats(){
  document.getElementById('mm-moves').textContent=mMoves;
  document.getElementById('mm-pairs').textContent=`${mMatched}/12`;
  const m=~~(mSecs/60),s=mSecs%60;
  document.getElementById('mm-time').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function updMTurn(){
  const p=players[mCurP];const c=PC[mCurP%PC.length];
  document.getElementById('mem-turn').innerHTML=`<div class="pbadge" style="background:${c.dk};border-color:${c.bg};color:${c.bg}">🃏 دور: ${p}</div>`;
}
function renderMGrid(){
  document.getElementById('mgrid').innerHTML=mCards.map((c,i)=>
    `<div class="mcard${c.f?' mf':''}${c.m?' mm':''}" id="mc${i}" onclick="flipM(${i})"><div class="mback"></div><div class="mfront">${c.e}</div></div>`
  ).join('');
}
function flipM(i){
  if(mLocked||mCards[i].f||mCards[i].m)return;
  mCards[i].f=true;document.getElementById('mc'+i).classList.add('mf');mFlipped.push(i);
  if(mFlipped.length===2){
    mMoves++;mLocked=true;updMStats();
    const[a,b]=mFlipped;
    if(mCards[a].e===mCards[b].e){
      mCards[a].m=mCards[b].m=true;
      ['mc'+a,'mc'+b].forEach(id=>{document.getElementById(id).classList.add('mm');});
      mMatched++;const cp=players[mCurP];
      mPScores[cp]=(mPScores[cp]||0)+1;pScores[cp]=(pScores[cp]||0)+1;
      renderMScores();mFlipped=[];mLocked=false;updMStats();boom(15);
      if(mMatched===12){clearInterval(mTimer);mTimer=null;setTimeout(()=>{const s=[...players].sort((a,b)=>mPScores[b]-mPScores[a]);showOvl('🏆',`فاز ${s[0]}!`,`${mPScores[s[0]]} أزواج • ${mMoves} محاولة`);boom(80);},500);}
    } else {
      setTimeout(()=>{
        const ea=document.getElementById('mc'+a),eb=document.getElementById('mc'+b);
        ea.classList.add('mw');eb.classList.add('mw');
        setTimeout(()=>{ea.classList.remove('mf','mw');eb.classList.remove('mf','mw');mCards[a].f=mCards[b].f=false;mFlipped=[];mLocked=false;mCurP=(mCurP+1)%players.length;updMTurn();},400);
      },900);
    }
  }
}
function renderMScores(){
  document.getElementById('mscrow').innerHTML=[...players].sort((a,b)=>mPScores[b]-mPScores[a]).map((p,i)=>{
    const c=PC[players.indexOf(p)%PC.length];
    return`<div class="mscitem"><div style="width:28px;height:28px;border-radius:50%;background:${c.dk};color:${c.bg};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">${p[0]}</div><div style="flex:1;font-size:13px">${p}</div><div style="font-size:10px">${i===0&&mPScores[p]>0?'🥇':''}</div><div style="font-size:17px;font-weight:700;color:var(--gold)">${mPScores[p]||0}🃏</div></div>`;
  }).join('');
}
function resetMem(){stopAllTimers();initMem();}

// ==================== WHO AM I ====================
const waData={
  '🧑 مشهورون':['رونالدو','ميسي','ايلون ماسك','ستيف جوبز','مايكل جاكسون','محمد علي','بيكاسو','شارلي شابلن'],
  '🐘 حيوانات':['فيل','زرافة','بطريق','كنغر','أخطبوط','طاووس','دولفين','نمر'],
  '🏙 أماكن':['برج إيفل','الكعبة المشرفة','الأهرامات','برج خليفة','تاج محل','سور الصين','ديزني لاند','البتراء'],
  '🍕 أكلات':['برجر','سوشي','بيتزا','شاورما','رامن','كنافة','مندي','تاكو'],
};
const waHintsData={
  'رونالدو':['لاعب كرة قدم','برتغالي','CR7'],'ميسي':['لاعب كرة قدم','أرجنتيني','في الدوري السعودي الآن'],
  'فيل':['أكبر حيوان بري','خرطومه طويل','رمادي'],'زرافة':['أطول حيوان','رقبة طويلة','أفريقي'],
  'برج إيفل':['في فرنسا','حديدي','في باريس'],'الكعبة المشرفة':['في مكة','قبلة المسلمين','مكعب الشكل'],
  'برجر':['خبز ولحم','أمريكي','في ماكدونالدز'],'سوشي':['ياباني','أرز وسمك','يُلف'],
  'بيتزا':['إيطالي','دائري','فيه جبن'],'شاورما':['شرق أوسطي','لحم مشوي','في خبز'],
};
function initWA(){curWA=0;curWAWord=null;curWAHints=[];curWACat=Object.keys(waData)[0];updWABadge();renderWACats();}
function updWABadge(){setBadge('wa-badge','🤔',players[curWA]||'-',PC[curWA%PC.length]);}
function renderWACats(){
  const cols=['#8B5CF6','#EC4899','#38BDF8','#22C55E'];
  document.getElementById('wa-cats').innerHTML=Object.keys(waData).map((cat,i)=>{
    const a=cat===curWACat;
    return`<button class="ccat" style="color:${a?'#000':cols[i%cols.length]};border-color:${cols[i%cols.length]};${a?`background:${cols[i%cols.length]}`:'background:transparent'}" onclick="selWACat('${cat}')">${cat}</button>`;
  }).join('');
}
function selWACat(c){curWACat=c;renderWACats();}
function newWA(){
  const list=waData[curWACat];curWAWord=list[~~(Math.random()*list.length)];curWAHints=[];
  document.getElementById('wa-ico').textContent=curWACat.split(' ')[0];
  document.getElementById('wa-cat').textContent=curWACat;
  document.getElementById('wa-word').textContent=curWAWord;
  document.getElementById('wa-hints').innerHTML='';
}
function addWAHint(){
  if(!curWAWord)return;
  const hints=waHintsData[curWAWord]||['لا توجد تلميحات إضافية'];
  const idx=curWAHints.length%hints.length;
  curWAHints.push(hints[idx]);
  document.getElementById('wa-hints').innerHTML=curWAHints.map(h=>`<div class="hint-item">💡 ${h}</div>`).join('');
}
function waRight(){
  if(!curWAWord)return;
  const p=players[curWA];pScores[p]=(pScores[p]||0)+1;
  showOvl('🎉',`أحسنت ${p}!`,`+1 نقطة على "${curWAWord}"`);boom(30);
  curWAWord=null;document.getElementById('wa-word').textContent='اضغط "كلمة جديدة"';document.getElementById('wa-hints').innerHTML='';
}
function nextWA(){curWA=(curWA+1)%players.length;updWABadge();curWAWord=null;document.getElementById('wa-word').textContent='اضغط "كلمة جديدة"';document.getElementById('wa-hints').innerHTML='';}

// ==================== BOMB ====================
const bombQData={
  '🌍 معلومات':[
    {q:'ما عاصمة فرنسا؟',opts:['لندن','باريس','برلين','روما'],a:1,type:'mc'},
    {q:'كم يوم في السنة؟',ans:'365',type:'write'},
    {q:'ما أكبر كوكب؟',opts:['زحل','الأرض','المشتري','نبتون'],a:2,type:'mc'},
    {q:'ما عاصمة اليابان؟',opts:['بكين','سيول','طوكيو','بانكوك'],a:2,type:'mc'},
    {q:'من أول رائد فضاء؟',ans:'يوري غاغارين',type:'write'},
    {q:'ما أطول نهر في العالم؟',opts:['الأمازون','النيل','الفرات','المسيسيبي'],a:1,type:'mc'},
  ],
  '⚽ رياضة':[
    {q:'كم لاعب في فريق كرة القدم؟',ans:'11',type:'write'},
    {q:'في أي دولة كأس العالم 2022؟',opts:['السعودية','الإمارات','قطر','البحرين'],a:2,type:'mc'},
    {q:'ما لقب ميسي؟',opts:['الملك','الأسطورة','البرغوث','الظاهرة'],a:2,type:'mc'},
    {q:'كم نقطة للفوز في كرة القدم؟',ans:'3',type:'write'},
    {q:'أين مقر الفيفا؟',opts:['لندن','باريس','زيورخ','نيويورك'],a:2,type:'mc'},
  ],
  '🕌 ديني':[
    {q:'كم ركن في الإسلام؟',ans:'5',type:'write'},
    {q:'كم سورة في القرآن؟',ans:'114',type:'write'},
    {q:'ما أول سورة في القرآن؟',opts:['البقرة','الفاتحة','الإخلاص','الناس'],a:1,type:'mc'},
    {q:'كم ركعة في الفجر؟',ans:'2',type:'write'},
    {q:'في أي شهر نزل القرآن؟',opts:['شعبان','رجب','رمضان','محرم'],a:2,type:'mc'},
  ],
  '😂 تسلية':[
    {q:'قول اسمك بالمقلوب!',ans:null,type:'write'},
    {q:'كم 7 × 8؟',ans:'56',type:'write'},
    {q:'اذكر 3 ألوان تبدأ بـ أ',ans:null,type:'write'},
    {q:'ما عكس كلمة "بارد"؟',ans:'حار',type:'write'},
    {q:'كم 15 + 27؟',ans:'42',type:'write'},
  ],
};
function initBomb(){
  curBomb=0;bombSelCat=Object.keys(bombQData)[0];
  updBombBadge();renderBombCats();resetBombDisplay();
}
function updBombBadge(){setBadge('bomb-badge','💣',players[curBomb]||'-',PC[curBomb%PC.length]);}
function renderBombCats(){
  const cols=['#EF4444','#F97316','#EAB308','#22C55E'];
  document.getElementById('bomb-cats').innerHTML=Object.keys(bombQData).map((cat,i)=>{
    const a=cat===bombSelCat;
    return`<button class="ccat" style="color:${a?'#000':cols[i%cols.length]};border-color:${cols[i%cols.length]};${a?`background:${cols[i%cols.length]}`:'background:transparent'}" onclick="selBombCat('${cat}')">${cat}</button>`;
  }).join('');
}
function selBombCat(c){if(!bombRunning){bombSelCat=c;renderBombCats();}}
function resetBombDisplay(){
  bombSecs=15;updBombRing();
  document.getElementById('bomb-card').innerHTML='<div class="card-ph">اضغط "ابدأ السؤال"</div>';
  document.getElementById('bomb-ans-area').style.display='none';
  document.getElementById('bomb-feedback').style.display='none';
  document.getElementById('bomb-startbtn').textContent='💥 ابدأ السؤال';
}
function updBombRing(){
  const pct=bombSecs/15;const circ=377;
  document.getElementById('b-ring').style.strokeDashoffset=circ*(1-pct);
  const col=bombSecs>8?'#22C55E':bombSecs>4?'#F97316':'#EF4444';
  document.getElementById('b-ring').style.stroke=col;
  document.getElementById('b-sec').textContent=bombSecs;
  document.getElementById('b-sec').style.color=col;
  document.getElementById('b-emo').textContent=bombSecs<=3?'💥':bombSecs<=8?'🔥':'💣';
}
function startBomb(){
  if(bombRunning)return;
  const list=bombQData[bombSelCat];
  bombQ=list[~~(Math.random()*list.length)];
  bombRunning=true;bombSecs=15;updBombRing();
  document.getElementById('bomb-startbtn').textContent='⏳ جاري...';
  document.getElementById('bomb-feedback').style.display='none';
  // render question
  if(bombQ.type==='mc'){
    const letters=['أ','ب','ج','د'];
    document.getElementById('bomb-card').innerHTML=`<div class="card-txt" style="font-size:18px">${bombQ.q}</div>`;
    document.getElementById('bomb-ans-area').style.display='block';
    document.getElementById('bomb-ans-area').innerHTML=`<div class="qopts">${bombQ.opts.map((o,i)=>`<button class="qopt" onclick="answerBomb(${i})">${letters[i]} ${o}</button>`).join('')}</div>`;
  } else {
    document.getElementById('bomb-card').innerHTML=`<div class="card-txt" style="font-size:18px">${bombQ.q}</div>`;
    document.getElementById('bomb-ans-area').style.display='block';
    document.getElementById('bomb-ans-area').innerHTML=`<div class="qinp-wrap"><input class="qinp tinp" id="bomb-user-ans" placeholder="اكتب جوابك..." onkeypress="if(event.key==='Enter')submitBombWrite()"><button class="btn bg" onclick="submitBombWrite()">✓</button></div>`;
  }
  bombTimer_=setInterval(()=>{
    bombSecs--;updBombRing();
    if(bombSecs<=0){clearInterval(bombTimer_);bombTimer_=null;bombRunning=false;bombExplode();}
  },1000);
}
function answerBomb(chosen){
  if(!bombRunning)return;
  clearInterval(bombTimer_);bombTimer_=null;bombRunning=false;
  const opts=document.querySelectorAll('#bomb-ans-area .qopt');
  opts.forEach((o,i)=>{o.classList.add('disabled');if(i===bombQ.a)o.classList.add('correct');else if(i===chosen)o.classList.add('wrong');});
  const fb=document.getElementById('bomb-feedback');fb.style.display='block';
  if(chosen===bombQ.a){
    fb.className='qfeedback ok';fb.textContent='✅ إجابة صحيحة! +1 نقطة';
    pScores[players[curBomb]]=(pScores[players[curBomb]]||0)+1;boom(25);
  } else {
    fb.className='qfeedback bad';fb.textContent=`❌ خطأ! الجواب الصحيح: ${bombQ.opts[bombQ.a]}`;
  }
  document.getElementById('bomb-startbtn').textContent='💥 ابدأ السؤال';
}
function submitBombWrite(){
  if(!bombRunning)return;
  const ua=document.getElementById('bomb-user-ans');
  if(!ua)return;
  const ans=ua.value.trim();
  clearInterval(bombTimer_);bombTimer_=null;bombRunning=false;
  const fb=document.getElementById('bomb-feedback');fb.style.display='block';
  if(bombQ.ans===null){
    fb.className='qfeedback ok';fb.textContent=`✅ إجابتك: "${ans}" — يقرر الجماعة!`;
  } else {
    const correct=ans.replace(/\s/g,'')===bombQ.ans.replace(/\s/g,'');
    if(correct){
      fb.className='qfeedback ok';fb.textContent=`✅ صح! الجواب: ${bombQ.ans} +1 نقطة`;
      pScores[players[curBomb]]=(pScores[players[curBomb]]||0)+1;boom(25);
    } else {
      fb.className='qfeedback bad';fb.textContent=`❌ خطأ! الجواب الصحيح: ${bombQ.ans}`;
    }
  }
  document.getElementById('bomb-startbtn').textContent='💥 ابدأ السؤال';
}
function bombExplode(){
  document.getElementById('bomb-emo'||'b-emo').textContent='💥';
  document.getElementById('bomb-ans-area').style.display='none';
  showOvl('💥','انفجرت!',`${players[curBomb]} فاتهم الجواب! 😄`);
}
function nextBomb(){
  clearInterval(bombTimer_);bombTimer_=null;bombRunning=false;
  curBomb=(curBomb+1)%players.length;updBombBadge();resetBombDisplay();
}

// ==================== STORY ====================
const stStarters=[
  'في يوم من الأيام، كان هناك شخص غريب جداً...',
  'كانت الليلة مظلمة عندما سمعنا صوتاً غريباً...',
  'وصلت رسالة غريبة على جواله في منتصف الليل...',
  'كانوا يمشون في الصحراء عندما وجدوا...',
  'فتح الباب وإذا فيه شيء لم يتوقعه أبداً...',
];
function initStory(){stLines=[];stCurP=0;stRunning=false;stSecs=20;renderStStarters();updStBadge();renderStBox();updStInfo();}
function updStBadge(){setBadge('story-badge','📖',players[stCurP]||'-',PC[stCurP%PC.length]);}
function updStInfo(){
  document.getElementById('st-round').textContent=stLines.length+1;
  document.getElementById('st-lines').textContent=stLines.length;
}
function renderStStarters(){
  document.getElementById('st-starters').innerHTML=stStarters.map((s,i)=>
    `<button class="sch" onclick="pickStarter(${i})">${s.slice(0,28)}...</button>`
  ).join('');
}
function pickStarter(i){
  stLines=[{text:stStarters[i],player:'البداية',color:'#F5C518'}];
  renderStBox();updStInfo();startStTimer();
}
function startStTimer(){
  if(stTimer)clearInterval(stTimer);
  stSecs=20;stRunning=true;
  document.getElementById('st-timer').textContent=stSecs;
  document.getElementById('st-timer').style.color='var(--gold)';
  stTimer=setInterval(()=>{
    stSecs--;document.getElementById('st-timer').textContent=stSecs;
    if(stSecs<=5)document.getElementById('st-timer').style.color='var(--red)';
    if(stSecs<=0){
      clearInterval(stTimer);stTimer=null;stRunning=false;
      storyBombExplode();
    }
  },1000);
}
function storyBombExplode(){
  const p=players[stCurP];
  showOvl('💥','انفجرت القنبلة!',`${p} تأخر! خسر دوره 😅`);
  stCurP=(stCurP+1)%players.length;updStBadge();
}
function addStLine(){
  const inp=document.getElementById('st-inp');const txt=inp.value.trim();
  if(!txt||stLines.length===0){if(stLines.length===0)alert('اختر بداية للقصة أولاً!');return;}
  clearInterval(stTimer);stTimer=null;
  const p=players[stCurP];const c=PC[stCurP%PC.length];
  stLines.push({text:txt,player:p,color:c.bg});
  pScores[p]=(pScores[p]||0)+1;
  inp.value='';stCurP=(stCurP+1)%players.length;
  updStBadge();renderStBox();updStInfo();
  const box=document.getElementById('storybox');box.scrollTop=box.scrollHeight;
  startStTimer();boom(8);
}
function renderStBox(){
  const box=document.getElementById('storybox');
  if(!stLines.length){box.innerHTML='<div style="color:var(--sub);text-align:center;font-size:14px">اختر بداية للقصة</div>';return;}
  box.innerHTML=stLines.map(l=>`<div class="sline" style="background:rgba(255,255,255,0.02);border-right-color:${l.color}"><span style="font-size:11px;color:${l.color};font-weight:700">${l.player}: </span>${l.text}</div>`).join('');
}
function newStory(){clearInterval(stTimer);stTimer=null;initStory();}
function readStory(){
  if(!stLines.length)return;
  const full=stLines.map(l=>l.text).join(' ');
  showOvl('📖','القصة الكاملة',full.length>200?full.slice(0,200)+'...':full);
}

// ==================== CHALLENGES ====================
const chalCatCols=['#38BDF8','#EC4899','#F5C518','#22C55E'];
function initChal(){chalCurP=0;selChalCat=Object.keys(chalData)[0];updChalBadge();renderChalCats();}
function updChalBadge(){setBadge('chal-badge','⚡',players[chalCurP]||'-',PC[chalCurP%PC.length]);}
function renderChalCats(){
  document.getElementById('chal-cats').innerHTML=Object.keys(chalData).map((cat,i)=>{
    const a=cat===selChalCat;
    return`<button class="ccat" style="color:${a?'#000':chalCatCols[i%chalCatCols.length]};border-color:${chalCatCols[i%chalCatCols.length]};${a?`background:${chalCatCols[i%chalCatCols.length]}`:'background:transparent'}" onclick="selCC('${cat}')">${cat}</button>`;
  }).join('');
}
function selCC(c){selChalCat=c;renderChalCats();}
function drawChal(){
  if(!selChalCat)return;
  const list=chalData[selChalCat];const txt=list[~~(Math.random()*list.length)];
  const d=document.getElementById('chal-card');
  d.innerHTML=`<div class="card-lbl" style="color:var(--purple)">${selChalCat}</div><div style="font-size:46px;margin:8px 0">${selChalCat.split(' ')[0]}</div><div class="card-txt">${txt}</div>`;
  d.style.animation='none';requestAnimationFrame(()=>d.style.animation='pop .3s cubic-bezier(.34,1.56,.64,1)');
}
function nextChal(){chalCurP=(chalCurP+1)%players.length;updChalBadge();document.getElementById('chal-card').innerHTML='<div class="card-ph">اختر فئة وسحب تحدي!</div>';}

// ==================== QUIZ ====================
function initQZ(){qzIdx=0;qzScore=0;qzStreak=0;qzCurP=0;qzAnswered=false;renderQZ();}
function updQZBadge(){setBadge('qz-badge','🧠',players[qzCurP]||'-',PC[qzCurP%PC.length]);}
function renderQZ(){
  if(qzIdx>=quizData.length){
    document.getElementById('quiz-page').innerHTML=`<div class="pc" style="text-align:center;padding-top:60px">
      <div style="font-size:72px;margin-bottom:16px">${qzScore>=8?'🏆':qzScore>=5?'🎯':'📚'}</div>
      <div style="font-size:28px;font-weight:900;color:var(--gold);margin-bottom:8px">انتهت المسابقة!</div>
      <div style="font-size:16px;color:var(--sub);margin-bottom:28px">${qzScore} من ${quizData.length} إجابة صحيحة</div>
      <button class="btn bg bfull" onclick="initQZ()">🔄 العب مرة ثانية</button>
    </div>`;
    if(qzScore>=8)boom(80);return;
  }
  const q=quizData[qzIdx];const letters=['أ','ب','ج','د'];
  document.getElementById('qz-num').textContent=`${qzIdx+1}/${quizData.length}`;
  document.getElementById('qz-sc').textContent=qzScore;
  document.getElementById('qz-streak').textContent=`${qzStreak}🔥`;
  updQZBadge();
  document.getElementById('qz-qnum').textContent=`السؤال ${qzIdx+1}`;
  document.getElementById('qz-qtxt').textContent=q.q;
  document.getElementById('qz-fb').style.display='none';
  document.getElementById('qz-next').style.display='none';
  qzAnswered=false;
  if(q.type==='mc'){
    document.getElementById('qz-opts').innerHTML=q.opts.map((o,i)=>
      `<button class="qopt" onclick="ansQZ(${i})"><span class="qletter">${letters[i]}</span>${o}</button>`
    ).join('');
  } else {
    document.getElementById('qz-opts').innerHTML=`
      <div class="qinp-wrap"><input class="qinp tinp" id="qz-write-ans" placeholder="اكتب جوابك..."><button class="btn bg" onclick="submitQZWrite()">✓</button></div>
      ${q.hints?`<div style="font-size:12px;color:var(--sub);margin-top:8px">تلميح: ${q.hints[0]}</div>`:''}`;
  }
}
function ansQZ(chosen){
  if(qzAnswered)return;qzAnswered=true;
  const q=quizData[qzIdx];
  document.querySelectorAll('#qz-opts .qopt').forEach((o,i)=>{o.classList.add('disabled');if(i===q.a)o.classList.add('correct');else if(i===chosen)o.classList.add('wrong');});
  const fb=document.getElementById('qz-fb');fb.style.display='block';
  if(chosen===q.a){qzScore++;qzStreak++;fb.className='qfeedback ok';fb.textContent='✅ إجابة صحيحة! +1';pScores[players[qzCurP]]=(pScores[players[qzCurP]]||0)+1;boom(20);}
  else{qzStreak=0;fb.className='qfeedback bad';fb.textContent=`❌ خطأ! الجواب: ${q.opts[q.a]}`;}
  document.getElementById('qz-num').textContent=`${qzIdx+1}/${quizData.length}`;
  document.getElementById('qz-sc').textContent=qzScore;
  document.getElementById('qz-streak').textContent=`${qzStreak}🔥`;
  document.getElementById('qz-next').style.display='flex';
}
function submitQZWrite(){
  if(qzAnswered)return;qzAnswered=true;
  const q=quizData[qzIdx];const ua=document.getElementById('qz-write-ans');
  const ans=(ua?.value||'').trim();
  const fb=document.getElementById('qz-fb');fb.style.display='block';
  const correct=ans.replace(/\s/g,'').toLowerCase()===q.ans.replace(/\s/g,'').toLowerCase();
  if(correct){qzScore++;qzStreak++;fb.className='qfeedback ok';fb.textContent=`✅ صح! الجواب: ${q.ans} +1`;pScores[players[qzCurP]]=(pScores[players[qzCurP]]||0)+1;boom(20);}
  else{qzStreak=0;fb.className='qfeedback bad';fb.textContent=`❌ الجواب الصحيح: ${q.ans}`;}
  document.getElementById('qz-next').style.display='flex';
}
function nextQZ(){qzIdx++;qzCurP=(qzCurP+1)%players.length;renderQZ();}

// ==================== FASTEST FINGER ====================
function initFF(){ffCurQ=null;ffAnswered=false;renderFFPlayers();document.getElementById('ff-q').textContent='اضغط "تحدي جديد" للبدء';}
function renderFFPlayers(){
  document.getElementById('ff-players').innerHTML=players.map((p,i)=>{
    const c=PC[i%PC.length];
    return`<button class="ff-pbtn" style="background:${c.dk};color:${c.bg};border-color:${c.bg};padding:14px 20px;font-size:15px" onclick="ffBuzz('${p}')">${p}</button>`;
  }).join('');
}
function newFF(){
  ffCurQ=ffData[~~(Math.random()*ffData.length)];ffAnswered=false;
  document.getElementById('ff-q').textContent=ffCurQ.q;
  document.getElementById('ff-answer-reveal').style.display='none';
  renderFFPlayers();
}
function ffBuzz(p){
  if(!ffCurQ||ffAnswered)return;ffAnswered=true;
  document.getElementById('ff-answer-reveal').style.display='block';
  document.getElementById('ff-correct-ans').textContent=p + ' — كمّل التحدي! 🏆';
  pScores[p]=(pScores[p]||0)+1;
  showOvl('⚡',p + ' الأسرع!','الجماعة تحكم إذا كمّل التحدي صح 😄');boom(30);
}

// ==================== NUMBERS ====================
function initNums(){
  numsCurP=0;
  numsTarget=~~(Math.random()*15)+1;
  numsRevealed=false;
  updNumsBadge();
  renderNumsGrid();
  // Show hint for target immediately
  const t=numsData.find(x=>x.n===numsTarget);
  document.getElementById('nums-current').style.display='block';
  document.getElementById('nums-hint-txt').innerHTML=`💡 <strong>التلميح:</strong> ${t.hint}`;
}
function updNumsBadge(){setBadge('nums-badge','🔢',players[numsCurP]||'-',PC[numsCurP%PC.length]);}
function renderNumsGrid(){
  document.getElementById('nums-grid').innerHTML=numsData.map(n=>`
    <div class="ncard" id="ncard${n.n}" onclick="pickNum(${n.n})">
      <div class="nnum">${n.emoji}</div>
      <div style="font-size:11px;color:var(--sub);margin-top:2px">${n.n}</div>
      <div class="nhint">${n.hint}</div>
    </div>`).join('');
  document.getElementById('nums-current').style.display='none';
}
function pickNum(n){
  document.querySelectorAll('.ncard').forEach(c=>c.classList.remove('picked'));
  document.getElementById('ncard'+n).classList.add('picked');
}
function revealNum(){
  const t=numsData.find(x=>x.n===numsTarget);
  document.getElementById('ncard'+numsTarget).classList.add('revealed');
  showOvl('🔢',`الرقم هو ${numsTarget}!`,`${t.emoji} ${t.hint}`);
  const guessed=document.querySelector('.ncard.picked');
  const guessNum=guessed?parseInt(guessed.querySelector('div:nth-child(2)').textContent):null;
  if(guessNum===numsTarget){pScores[players[numsCurP]]=(pScores[players[numsCurP]]||0)+1;boom(30);}
}
function nextNums(){numsCurP=(numsCurP+1)%players.length;initNums();}

// ==================== WHO SAID IT ====================
function initWSI(){wsiAnswered=false;newWSI();}
function newWSI(){
  wsiAnswered=false;
  const q=wsiData[~~(Math.random()*wsiData.length)];
  document.getElementById('wsi-card').innerHTML=`<div class="card-txt" style="font-style:italic">"${q.q.replace(/"/g,'')}"</div>`;
  document.getElementById('wsi-fb').style.display='none';
  // shuffle players as choices
  const shuffled=[...players].sort(()=>Math.random()-.5).slice(0,Math.min(4,players.length));
  const winner=shuffled[~~(Math.random()*shuffled.length)];
  document.getElementById('wsi-choices').innerHTML=shuffled.map(p=>{
    const c=PC[players.indexOf(p)%PC.length];
    return`<button class="wsi-btn" onclick="ansWSI('${p}','${winner}',this)"><div style="width:28px;height:28px;border-radius:50%;background:${c.dk};color:${c.bg};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${p[0]}</div>${p}</button>`;
  }).join('');
}
function ansWSI(chosen,correct,btn){
  if(wsiAnswered)return;wsiAnswered=true;
  document.querySelectorAll('.wsi-btn').forEach(b=>{
    b.classList.add('disabled');
    if(b===btn)b.classList.add(chosen===correct?'correct':'wrong');
    if(b.textContent.trim().startsWith(correct))b.classList.add('correct');
  });
  const fb=document.getElementById('wsi-fb');fb.style.display='block';
  if(chosen===correct){fb.className='qfeedback ok';fb.textContent=`✅ صح! ${correct} هو اللي كان ممكن يقولها`;boom(20);}
  else{fb.className='qfeedback bad';fb.textContent=`❌ اللي يشبه يقولها: ${correct}`;}
}

// ==================== OBSERVATION ====================
function initObs(){obsCurP=0;updObsBadge();resetObsDisplay();}
function updObsBadge(){setBadge('obs-badge','👁',players[obsCurP]||'-',PC[obsCurP%PC.length]);}
function resetObsDisplay(){
  document.getElementById('obs-scene').textContent='اضغط "جولة جديدة" للبدء';
  document.getElementById('obs-items').innerHTML='';
  document.getElementById('obs-status').textContent='شاهد الأشياء — ستختفي بعد 10 ثواني!';
  document.getElementById('obs-countdown').textContent='';
}
function startObs(){
  obsScene=obsScenes[~~(Math.random()*obsScenes.length)];
  document.getElementById('obs-answer-area').style.display='none';
  obsHits=0;
  document.getElementById('obs-scene').textContent=obsScene.items.join(' ');
  document.getElementById('obs-items').innerHTML='';
  document.getElementById('obs-status').textContent='شاهدوا جيداً!';
  let secs=10;document.getElementById('obs-countdown').textContent=`تختفي بعد ${secs} ثانية`;
  if(obsTimer)clearInterval(obsTimer);
  obsTimer=setInterval(()=>{
    secs--;document.getElementById('obs-countdown').textContent=`تختفي بعد ${secs} ثانية`;
    if(secs<=0){
      clearInterval(obsTimer);obsTimer=null;
      document.getElementById('obs-scene').textContent='???';
      document.getElementById('obs-countdown').textContent='';
      document.getElementById('obs-status').textContent='إيش الأشياء اللي شفتوها؟ اضغطوا عليها!';
      obsHits=0;
      renderObsItems();
      document.getElementById('obs-answer-area').style.display='block';
    }
  },1000);
}
function renderObsItems(){
  const shuffled=[...obsScene.items].sort(()=>Math.random()-.5);
  const extra=['🎭','🎸','🎩','🎪','🎰','🎳'];
  const all=[...shuffled,...extra.slice(0,2)].sort(()=>Math.random()-.5);
  let hits=0;
  document.getElementById('obs-items').innerHTML=all.map((item,idx)=>{
    const real=obsScene.items.includes(item);
    return`<div class="obs-item" id="obs-item-${idx}">
      <div class="obs-emoji">${item}</div>
      <div class="obs-name">${item}</div>
      <button class="btn bo" style="padding:6px 12px;font-size:12px" id="obs-btn-${idx}" onclick="tapObs(${idx},${real},'obs-btn-${idx}')">شاهدته</button>
    </div>`;
  }).join('');
  document.getElementById('obs-score-live').textContent='0';
}
let obsHits=0;
function tapObs(idx,real,btnId){
  const btn=document.getElementById(btnId);
  if(btn.disabled)return;
  btn.disabled=true;
  if(real){
    obsHits++;
    btn.textContent='✓';btn.style.background='rgba(34,197,94,0.2)';btn.style.color='var(--green)';
    const p=players[obsCurP];pScores[p]=(pScores[p]||0)+1;
    document.getElementById('obs-score-live').textContent=obsHits;
  } else {
    btn.textContent='✗';btn.style.background='rgba(239,68,68,0.15)';btn.style.color='var(--red)';
  }
}
function revealObs(){
  if(!obsScene)return;
  document.getElementById('obs-scene').textContent=obsScene.items.join(' ');
}
function nextObs(){obsCurP=(obsCurP+1)%players.length;updObsBadge();resetObsDisplay();}

// ==================== TEAM: PHOTO ====================
const photoData=[
  {url:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg/400px-Tour_Eiffel_Wikimedia_Commons.jpg',answer:'برج إيفل',cat:'أماكن'},
  {url:'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseo_2020.jpg/440px-Colosseo_2020.jpg',answer:'الكولوسيوم — روما',cat:'أماكن'},
  {url:'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Burj_Khalifa.jpg/400px-Burj_Khalifa.jpg',answer:'برج خليفة',cat:'أماكن'},
  {url:'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/440px-Taj_Mahal_%28Edited%29.jpeg',answer:'تاج محل',cat:'أماكن'},
  {url:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/All_Gizah_Pyramids.jpg/440px-All_Gizah_Pyramids.jpg',answer:'أهرامات الجيزة',cat:'أماكن'},
  {url:'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/The_Great_Wall_of_China_at_Jinshanling-edit.jpg/440px-The_Great_Wall_of_China_at_Jinshanling-edit.jpg',answer:'سور الصين العظيم',cat:'أماكن'},
  {url:'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Machu_Picchu%2C_Peru.jpg/440px-Machu_Picchu%2C_Peru.jpg',answer:'ماتشو بيتشو',cat:'أماكن'},
  {url:'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Big_Ben_2.jpg/400px-Big_Ben_2.jpg',answer:'بيغ بن — لندن',cat:'أماكن'},
  {url:'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Big_bear_with_cub.jpg/440px-Big_bear_with_cub.jpg',answer:'دب وصغيره',cat:'حيوانات'},
  {url:'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/440px-Cat03.jpg',answer:'قطة',cat:'حيوانات'},
  {url:'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Dog_Breeds.jpg/440px-Dog_Breeds.jpg',answer:'كلاب',cat:'حيوانات'},
  {url:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/440px-Camponotus_flavomarginatus_ant.jpg',answer:'نملة',cat:'حيوانات'},
  {url:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Eq_it-na_pizza-margherita_sep2005_sml.jpg/440px-Eq_it-na_pizza-margherita_sep2005_sml.jpg',answer:'بيتزا',cat:'أكل'},
  {url:'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Hapus_Mango.jpg/440px-Hapus_Mango.jpg',answer:'مانجو',cat:'فواكه'},
  {url:'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Red_Apple.jpg/440px-Red_Apple.jpg',answer:'تفاحة',cat:'فواكه'},
  {url:'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/NASA-Apollo8-Dec24-Earthrise.jpg/440px-NASA-Apollo8-Dec24-Earthrise.jpg',answer:'الأرض من الفضاء',cat:'فضاء'},
  {url:'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/402px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',answer:'لوحة الموناليزا',cat:'لوحات'},
  {url:'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Cute_dog.jpg/440px-Cute_dog.jpg',answer:'كلب لطيف',cat:'حيوانات'},
  {url:'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/440px-Good_Food_Display_-_NCI_Visuals_Online.jpg',answer:'طعام صحي',cat:'أكل'},
  {url:'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Igloo.jpg/440px-Igloo.jpg',answer:'إيغلو — بيت الثلج',cat:'أماكن'},
];
let photoCurIdx=0;
function initPhoto(){photoCurTeam=0;photoCurIdx=0;_loadPhotoCard();updPhotoTeam();}
function updPhotoTeam(){
  const t=teams[photoCurTeam%teams.length];
  renderTeamScoreBar('photo-tsbar',photoCurTeam%teams.length);
  setTeamBadge('photo-tbadge','📸',t.name,t.color);
  document.getElementById('photo-fb').style.display='none';
}
function _loadPhotoCard(){
  const d=photoData[photoCurIdx%photoData.length];
  const img=document.getElementById('photo-img');
  document.getElementById('photo-loading').style.display='flex';
  img.style.filter='blur(22px)';
  img.onload=()=>{ document.getElementById('photo-loading').style.display='none'; };
  img.onerror=()=>{ document.getElementById('photo-loading').textContent='❌'; };
  img.src=d.url;
  document.getElementById('photo-cat-label').textContent=`الفئة: ${d.cat}`;
  document.getElementById('photo-hint-label').textContent='';
  document.getElementById('photo-fb').style.display='none';
}
function newPhoto(){photoCurIdx=(photoCurIdx+1)%photoData.length;_loadPhotoCard();}
function revealPhoto(){
  const d=photoData[photoCurIdx%photoData.length];
  document.getElementById('photo-img').style.filter='blur(0)';
  document.getElementById('photo-hint-label').textContent=`✅ الجواب: ${d.answer}`;
}
function photoRight(){
  const t=teams[photoCurTeam%teams.length];tScores[t.id]=(tScores[t.id]||0)+2;
  const d=photoData[photoCurIdx%photoData.length];
  const fb=document.getElementById('photo-fb');fb.style.display='block';
  fb.className='qfeedback ok';fb.textContent=`✅ صح! ${d.answer} — +2 لفريق ${t.name}`;
  boom(30);renderTeamScoreBar('photo-tsbar',photoCurTeam%teams.length);
}
function nextPhotoTeam(){photoCurTeam++;photoCurIdx=(photoCurIdx+1)%photoData.length;_loadPhotoCard();updPhotoTeam();}

// ==================== TEAM: INFO CHALLENGE ====================
const tinfoData=[...quizData];
function initTInfo(){tinfoCurTeam=0;tinfoIdx=0;tinfoAnswered=false;renderTInfo();}
function renderTInfo(){
  renderTeamScoreBar('tinfo-tsbar',tinfoCurTeam%teams.length);
  const t=teams[tinfoCurTeam%teams.length];
  document.getElementById('tinfo-tti').innerHTML=teams.slice(0,2).map((tm,i)=>`
    <div class="tti-item" style="${i===tinfoCurTeam%teams.length?`border-color:${tm.color.bg};background:${tm.color.dk}`:''};border-color:${i===tinfoCurTeam%2?tm.color.bg:'var(--b2)'}">
      <div style="font-size:12px;font-weight:700;color:${tm.color.bg}">${tm.color.emoji} ${tm.name}</div>
    </div>`).join('');
  const q=tinfoData[tinfoIdx%tinfoData.length];const letters=['أ','ب','ج','د'];
  document.getElementById('tinfo-qnum').textContent=`سؤال ${tinfoIdx+1} — دور ${t.name}`;
  document.getElementById('tinfo-qtxt').textContent=q.q;
  document.getElementById('tinfo-fb').style.display='none';
  document.getElementById('tinfo-next').style.display='none';
  tinfoAnswered=false;
  if(q.type==='mc'){
    document.getElementById('tinfo-opts').innerHTML=q.opts.map((o,i)=>`<button class="qopt" onclick="ansTInfo(${i})"><span class="qletter">${letters[i]}</span>${o}</button>`).join('');
  } else {
    document.getElementById('tinfo-opts').innerHTML=`<div class="qinp-wrap"><input class="qinp tinp" id="tinfo-write-ans" placeholder="اكتب الجواب..."><button class="btn bg" onclick="submitTInfoWrite()">✓</button></div>`;
  }
}
function ansTInfo(chosen){
  if(tinfoAnswered)return;tinfoAnswered=true;
  const q=tinfoData[tinfoIdx%tinfoData.length];const t=teams[tinfoCurTeam%teams.length];
  document.querySelectorAll('#tinfo-opts .qopt').forEach((o,i)=>{o.classList.add('disabled');if(i===q.a)o.classList.add('correct');else if(i===chosen)o.classList.add('wrong');});
  const fb=document.getElementById('tinfo-fb');fb.style.display='block';
  if(chosen===q.a){tScores[t.id]=(tScores[t.id]||0)+1;fb.className='qfeedback ok';fb.textContent=`✅ صح! +1 لفريق ${t.name}`;boom(20);}
  else{fb.className='qfeedback bad';fb.textContent=`❌ الجواب: ${q.opts[q.a]}`;}
  document.getElementById('tinfo-next').style.display='flex';
  renderTeamScoreBar('tinfo-tsbar',tinfoCurTeam%teams.length);
}
function submitTInfoWrite(){
  if(tinfoAnswered)return;tinfoAnswered=true;
  const q=tinfoData[tinfoIdx%tinfoData.length];const t=teams[tinfoCurTeam%teams.length];
  const ua=document.getElementById('tinfo-write-ans');const ans=(ua?.value||'').trim();
  const fb=document.getElementById('tinfo-fb');fb.style.display='block';
  const correct=ans.replace(/\s/g,'').toLowerCase()===q.ans.replace(/\s/g,'').toLowerCase();
  if(correct){tScores[t.id]=(tScores[t.id]||0)+1;fb.className='qfeedback ok';fb.textContent=`✅ صح! الجواب: ${q.ans} +1 لفريق ${t.name}`;boom(20);}
  else{fb.className='qfeedback bad';fb.textContent=`❌ الجواب الصحيح: ${q.ans}`;}
  document.getElementById('tinfo-next').style.display='flex';
  renderTeamScoreBar('tinfo-tsbar',tinfoCurTeam%teams.length);
}
function nextTInfo(){tinfoIdx++;tinfoCurTeam++;renderTInfo();}

// ==================== TEAM: WHERE ====================
function initWhere(){whereCurTeam=0;whereIdx=0;whereAnswered=false;renderWhere();}
function renderWhere(){
  renderTeamScoreBar('where-tsbar',whereCurTeam%teams.length);
  const t=teams[whereCurTeam%teams.length];
  setTeamBadge('where-tbadge','🗺️',t.name,t.color);
  const q=whereData[whereIdx%whereData.length];const letters=['أ','ب','ج','د'];
  document.getElementById('where-img').textContent=q.emoji;
  document.getElementById('where-clue').textContent=q.clue;
  document.getElementById('where-fb').style.display='none';
  document.getElementById('where-next').style.display='none';
  whereAnswered=false;
  document.getElementById('where-opts').innerHTML=q.opts.map((o,i)=>`<button class="qopt" onclick="ansWhere(${i})"><span class="qletter">${letters[i]}</span>${o}</button>`).join('');
}
function ansWhere(chosen){
  if(whereAnswered)return;whereAnswered=true;
  const q=whereData[whereIdx%whereData.length];const t=teams[whereCurTeam%teams.length];
  document.querySelectorAll('#where-opts .qopt').forEach((o,i)=>{o.classList.add('disabled');if(i===q.a)o.classList.add('correct');else if(i===chosen)o.classList.add('wrong');});
  const fb=document.getElementById('where-fb');fb.style.display='block';
  if(chosen===q.a){tScores[t.id]=(tScores[t.id]||0)+1;fb.className='qfeedback ok';fb.textContent=`✅ صح! ${q.opts[q.a]} +1 لفريق ${t.name}`;boom(20);}
  else{fb.className='qfeedback bad';fb.textContent=`❌ الجواب: ${q.opts[q.a]}`;}
  document.getElementById('where-next').style.display='flex';
  renderTeamScoreBar('where-tsbar',whereCurTeam%teams.length);
}
function nextWhere(){whereIdx++;whereCurTeam++;renderWhere();}

// ==================== TEAM: AMTHAL (ABU OMAR) ====================
function initRebus(){rebusCurTeam=0;rebusIdx=0;rebusAnswered=false;drawRebus();}
function drawRebus(){
  rebusAnswered=false;
  const r=rebusData[rebusIdx%rebusData.length];
  const t=teams[rebusCurTeam%teams.length];
  renderTeamScoreBar('rebus-tsbar',rebusCurTeam%teams.length);
  setTeamBadge('rebus-tbadge','📜',t.name,t.color);
  document.getElementById('rebus-display').textContent=r.q;
  document.getElementById('rebus-difficulty').textContent='اختاروا المعنى الصحيح 👇';
  document.getElementById('rebus-fb').style.display='none';
  const letters=['أ','ب','ج','د'];
  // Shuffle options while keeping track of correct answer
  const idxs=[0,1,2,3].sort(()=>Math.random()-0.5);
  const correctShuffled=idxs.indexOf(r.a);
  document.getElementById('rebus-opts').innerHTML=idxs.map((oi,i)=>
    `<button class="qopt" onclick="ansRebus(${i},${correctShuffled})"><span class="qletter">${letters[i]}</span>${r.opts[oi]}</button>`
  ).join('');
}
function ansRebus(chosen, correct){
  if(rebusAnswered)return;
  rebusAnswered=true;
  const t=teams[rebusCurTeam%teams.length];
  document.querySelectorAll('#rebus-opts .qopt').forEach((o,i)=>{
    o.classList.add('disabled');
    if(i===correct)o.classList.add('correct');
    else if(i===chosen)o.classList.add('wrong');
  });
  const fb=document.getElementById('rebus-fb');fb.style.display='block';
  if(chosen===correct){
    tScores[t.id]=(tScores[t.id]||0)+1;
    fb.className='qfeedback ok';fb.textContent=`✅ صح! +1 لفريق ${t.name}`;
    boom(25);renderTeamScoreBar('rebus-tsbar',rebusCurTeam%teams.length);
  } else {
    fb.className='qfeedback bad';fb.textContent='❌ خطأ!';
    renderTeamScoreBar('rebus-tsbar',rebusCurTeam%teams.length);
    setTimeout(()=>{rebusCurTeam++;rebusIdx=(rebusIdx+1)%rebusData.length;drawRebus();},2000);
  }
}
function newRebus(){rebusIdx=(rebusIdx+1)%rebusData.length;drawRebus();}
function nextRebusTeam(){rebusCurTeam++;rebusIdx=(rebusIdx+1)%rebusData.length;drawRebus();}

// boot
document.getElementById('stp').classList.add('on');