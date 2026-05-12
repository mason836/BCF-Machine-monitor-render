// ─── SHIFT TIME OPTIONS ───────────────────────────────────────────────
const TIME_OPTIONS = [];
for(let h=4;h<=22;h++){
  for(let m=0;m<60;m+=15){
    const ampm = h<12?'AM':'PM';
    const h12 = h===0?12:h>12?h-12:h;
    const label = `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
    TIME_OPTIONS.push(label);
  }
}
TIME_OPTIONS.push('10:00 PM'); // cap

function populateShiftSelects(){
  const start = document.getElementById('set-shift-start');
  const end   = document.getElementById('set-shift-end');
  TIME_OPTIONS.forEach(t=>{
    let o1=document.createElement('option'); o1.textContent=t; start.appendChild(o1);
    let o2=document.createElement('option'); o2.textContent=t; end.appendChild(o2);
  });
  start.value='7:45 AM';
  end.value='4:00 PM';
}
populateShiftSelects();

// ─── LABELS & OEE ────────────────────────────────────────────────────
function updateLabels(){
  const site = document.getElementById('set-site').value;
  const line = document.getElementById('set-line').value;
  document.getElementById('hdr-site').textContent = site||'BCF Machine Monitor';
  document.getElementById('hdr-line').textContent = (line||'Line') + ' — Production Dashboard';
}
function updateOEETarget(){
  const v = document.getElementById('set-oee').value;
  document.getElementById('today-oee-target').textContent = v;
  document.getElementById('detail-target').textContent = v;
}
function updateShiftDisplay(){
  const s = document.getElementById('set-shift-start').value;
  const e = document.getElementById('set-shift-end').value;
  document.getElementById('today-shift-info').innerHTML = 'Wednesday May 7, 2026 &nbsp;·&nbsp; '+s+' – '+e;
}

// ─── TABS ─────────────────────────────────────────────────────────────
function tab(id,el){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('panel-'+id).classList.add('active');
  el.classList.add('active');
  if(id==='history') closeDayDetail();
}

// ─── CHIP MANAGER ─────────────────────────────────────────────────────
function addChip(containerId,inputId){
  const inp=document.getElementById(inputId);
  const name=inp.value.trim();if(!name)return;
  const chip=document.createElement('span');chip.className='chip';
  chip.innerHTML=name+' <span class="chip-x" onclick="this.parentElement.remove()">×</span>';
  document.getElementById(containerId).appendChild(chip);inp.value='';
  rebuildOperatorDropdown();
}
document.getElementById('inp-op').addEventListener('keydown',e=>{if(e.key==='Enter')addChip('op-chips','inp-op');});
document.getElementById('inp-reason').addEventListener('keydown',e=>{if(e.key==='Enter')addChip('reason-chips','inp-reason');});

function getOperators(){
  return [...document.querySelectorAll('#op-chips .chip')].map(c=>c.textContent.replace('×','').trim());
}
function rebuildOperatorDropdown(){
  const sel=document.getElementById('modal-op-select');
  const cur=sel.value;
  sel.innerHTML='';
  getOperators().forEach(op=>{
    const o=document.createElement('option');o.textContent=op;sel.appendChild(o);
  });
  sel.value=cur||getOperators()[0]||'';
}

// ─── MODAL HELPERS ────────────────────────────────────────────────────
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-overlay').forEach(m=>{
  m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');});
});

// ─── CHANGE OPERATOR ──────────────────────────────────────────────────
let operatorContext = 'today'; // 'today' or 'detail'
function openChangeOperator(ctx){
  operatorContext = ctx;
  rebuildOperatorDropdown();
  const cur = ctx==='today'
    ? document.getElementById('today-op-name').textContent
    : document.getElementById('detail-op-name').textContent;
  document.getElementById('modal-op-select').value = cur;
  openModal('modal-operator');
}
function applyOperatorChange(){
  const op = document.getElementById('modal-op-select').value;
  if(operatorContext==='today'){
    document.getElementById('today-op-name').textContent = op;
  } else {
    document.getElementById('detail-op-name').textContent = op;
    // also update history list badge
    if(currentDetailIdx !== null){
      const el = document.getElementById('hist-op-'+currentDetailIdx);
      if(el) el.textContent = op;
    }
  }
  closeModal('modal-operator');
}

// ─── CONFIRM DELETE LOG ───────────────────────────────────────────────
function confirmDeleteLog(){ openModal('modal-delete-log'); }
function executeDeleteLog(){
  const day = document.getElementById('modal-del-select').value;
  closeModal('modal-delete-log');
  // In a real app, remove from data store. Here just give feedback.
  alert('Log for "'+day+'" has been deleted.');
}

// ─── CONFIRM CLEAR ALL ────────────────────────────────────────────────
function confirmClearAll(){
  document.getElementById('modal-clear-confirm-input').value='';
  document.getElementById('btn-clear-confirm').style.opacity='0.4';
  document.getElementById('btn-clear-confirm').style.pointerEvents='none';
  openModal('modal-clear-all');
}
function checkClearConfirm(){
  const v=document.getElementById('modal-clear-confirm-input').value;
  const btn=document.getElementById('btn-clear-confirm');
  if(v==='DELETE'){btn.style.opacity='1';btn.style.pointerEvents='auto';}
  else{btn.style.opacity='0.4';btn.style.pointerEvents='none';}
}
function executeClearAll(){
  closeModal('modal-clear-all');
  document.getElementById('modal-clear-confirm-input').value='';
  alert('All historical data has been cleared.');
}

// ─── HISTORY DETAIL VIEW ──────────────────────────────────────────────
const historyData = [
  {date:'Wednesday, May 7, 2026', op:'Anahi', shift:'7:45 AM – 4:04 PM', runtime:'5h 20m', downtime:'2h 16m', planned:'64m', oee:'69.4%', stops:32},
  {date:'Tuesday, May 6, 2026',   op:'Carlos',shift:'7:45 AM – 4:00 PM', runtime:'6h 02m', downtime:'1h 38m', planned:'40m', oee:'78.6%', stops:21},
  {date:'Monday, May 5, 2026',    op:'Maria', shift:'7:45 AM – 4:00 PM', runtime:'5h 48m', downtime:'1h 52m', planned:'40m', oee:'75.2%', stops:28},
];
let currentDetailIdx = null;

function openDayDetail(idx){
  currentDetailIdx = idx;
  const d = historyData[idx];
  document.getElementById('history-list-view').style.display='none';
  document.getElementById('history-detail-view').style.display='block';
  document.getElementById('detail-date').textContent = d.date;
  document.getElementById('detail-op-name').textContent = d.op;
  document.getElementById('detail-shift-info').textContent = d.date+' · '+d.shift;
  document.getElementById('detail-runtime').textContent = d.runtime;
  document.getElementById('detail-downtime').textContent = d.downtime;
  document.getElementById('detail-planned').textContent = d.planned;
  document.getElementById('detail-oee').textContent = d.oee;
  document.getElementById('detail-stops-sub').textContent = d.stops+' stop events';
  document.getElementById('detail-table-title').textContent = 'Event log — '+d.date;
  buildDetailTable(idx);
}
function closeDayDetail(){
  currentDetailIdx=null;
  document.getElementById('history-list-view').style.display='block';
  document.getElementById('history-detail-view').style.display='none';
}

// Build the detail table with sample data (same events as today for demo)
function buildDetailTable(idx){
  const tbody = document.getElementById('detail-tbody');
  tbody.innerHTML='';
  const reasons=['','Material jam','Changeover','Maintenance','Quality check','No material','Operator break'];
  segs.slice(0,20).forEach(s=>{
    const bc=s.state==='RUNNING'?'b-run':s.state==='STOPPED'?'b-stop':'b-plan';
    const lbl=s.state==='PLANNED STOP'?'Planned stop':s.state==='RUNNING'?'Running':'Stopped';
    const isStop=s.state!=='RUNNING';
    const typeOpts=`<option${s.state==='STOPPED'?' selected':''}>Unplanned</option><option${s.state==='PLANNED STOP'?' selected':''}>Planned</option>`;
    const reasonOpts=reasons.map(r=>`<option>${r}</option>`).join('');
    tbody.innerHTML+=`<tr>
      <td style="font-family:var(--font-mono);font-size:11px;">${s.time}</td>
      <td><span class="badge ${bc}">${lbl}</span></td>
      <td style="font-family:var(--font-mono);font-size:11px;">${fmtD(s.dur)}</td>
      <td>${isStop?`<select class="inl">${typeOpts}</select>`:'<span style="color:var(--sub)">—</span>'}</td>
      <td>${isStop?`<select class="inl">${reasonOpts}</select>`:'<span style="color:var(--sub)">—</span>'}</td>
      <td><button class="btn-sm" style="padding:3px 8px;">Edit</button></td>
    </tr>`;
  });
}

// ─── EVENT LOG (TODAY) ────────────────────────────────────────────────
const raw=[
  ['07:45:04','RUNNING'],['07:45:46','STOPPED'],['07:46:14','RUNNING'],
  ['08:35:26','STOPPED'],['08:36:45','RUNNING'],['08:44:11','STOPPED'],
  ['08:49:10','RUNNING'],['08:49:32','STOPPED'],['08:56:37','RUNNING'],
  ['08:57:17','PLANNED STOP'],['09:25:22','RUNNING'],['09:26:31','STOPPED'],
  ['09:27:30','RUNNING'],['09:35:51','STOPPED'],['09:37:05','RUNNING'],
  ['09:42:43','STOPPED'],['09:44:29','RUNNING'],['10:10:43','STOPPED'],
  ['10:17:06','RUNNING'],['10:17:32','STOPPED'],['10:17:52','RUNNING'],
  ['11:28:53','STOPPED'],['11:32:07','RUNNING'],['11:32:30','STOPPED'],
  ['11:32:57','RUNNING'],['11:49:55','STOPPED'],['11:53:51','RUNNING'],
  ['12:30:12','PLANNED STOP'],['13:02:33','RUNNING'],['13:02:58','STOPPED'],
  ['13:03:20','RUNNING'],['13:03:55','STOPPED'],['13:04:46','RUNNING'],
  ['13:24:46','STOPPED'],['13:26:15','RUNNING'],['13:30:30','STOPPED'],
  ['13:41:26','RUNNING'],['13:41:56','STOPPED'],['13:42:25','RUNNING'],
  ['13:42:50','STOPPED'],['13:44:03','RUNNING'],['13:44:48','STOPPED'],
  ['13:46:29','RUNNING'],['13:50:42','STOPPED'],['14:00:30','RUNNING'],
  ['14:01:16','STOPPED'],['14:01:25','RUNNING'],['14:04:06','STOPPED'],
  ['14:11:14','RUNNING'],['14:11:50','STOPPED'],['14:13:40','RUNNING'],
  ['14:24:14','STOPPED'],['14:26:12','RUNNING'],['14:59:59','STOPPED'],
  ['15:25:18','RUNNING'],['15:35:01','STOPPED'],['15:42:58','RUNNING'],
  ['15:43:43','STOPPED'],['15:50:14','RUNNING'],['15:50:34','STOPPED'],
  ['15:51:29','RUNNING'],['15:51:53','STOPPED'],['15:56:26','RUNNING'],
  ['15:57:04','STOPPED'],['15:59:46','RUNNING'],['16:03:32','STOPPED'],
  ['16:03:57','RUNNING'],['16:04:38','STOPPED']
];
function toSec(t){const[h,m,s]=t.split(':').map(Number);return h*3600+m*60+s;}
function fmtD(s){if(s<60)return s+'s';const m=Math.floor(s/60);if(m<60)return m+'m '+Math.round(s%60)+'s';return Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m';}
const segs=[];
for(let i=0;i<raw.length-1;i++) segs.push({state:raw[i][1],time:raw[i][0],dur:toSec(raw[i+1][0])-toSec(raw[i][0])});

const reasons=['','Material jam','Changeover','Maintenance','Quality check','No material','Operator break'];
const tbody=document.getElementById('tbody');
segs.forEach(s=>{
  const bc=s.state==='RUNNING'?'b-run':s.state==='STOPPED'?'b-stop':'b-plan';
  const lbl=s.state==='PLANNED STOP'?'Planned stop':s.state==='RUNNING'?'Running':'Stopped';
  const isStop=s.state!=='RUNNING';
  const typeOpts=`<option${s.state==='STOPPED'?' selected':''}>Unplanned</option><option${s.state==='PLANNED STOP'?' selected':''}>Planned</option>`;
  const reasonOpts=reasons.map(r=>`<option>${r}</option>`).join('');
  tbody.innerHTML+=`<tr>
    <td style="font-family:var(--font-mono);font-size:11px;">${s.time}</td>
    <td><span class="badge ${bc}">${lbl}</span></td>
    <td style="font-family:var(--font-mono);font-size:11px;">${fmtD(s.dur)}</td>
    <td>${isStop?`<select class="inl">${typeOpts}</select>`:'<span style="color:var(--sub)">—</span>'}</td>
    <td>${isStop?`<select class="inl">${reasonOpts}</select>`:'<span style="color:var(--sub)">—</span>'}</td>
    <td><button class="btn-sm" style="padding:3px 8px;">Edit</button></td>
  </tr>`;
});