// Paths to CSVs (relative to /dashboard/)
const DATA_MAIN = '../data/processed/ma_scc_latest.csv';
const DATA_KPI  = '../data/processed/ma_scc_kpis_county.csv';

let mainRows = [];
let kpiRows = [];

function parseNumber(s){ if(s===null||s===undefined) return null; const x = (''+s).replace(/,/g,'').trim(); const n = parseFloat(x); return isNaN(n)?null:n; }
function fmtNum(n){ if(n===null||n===undefined) return '—'; return n.toLocaleString('en-US'); }
function fmtDelta(a,b){ if(a==null||b==null) return '—'; const diff=a-b; const pct = b!==0? (diff/b):null; return pct==null? `${diff.toLocaleString('en-US')}` : `${diff.toLocaleString('en-US')} (${(pct*100).toFixed(1)}%)`; }

function toMonthStr(dstr){
  // report_period may be YYYY-MM-DD or full ISO; take first 7 chars
  return (''+dstr).substring(0,7);
}

async function loadCsv(url){
  return new Promise((resolve,reject)=>{
    Papa.parse(url, {download:true, header:true, dynamicTyping:false, skipEmptyLines:true,
      complete: res => resolve(res.data), error: err => reject(err)
    });
  });
}

function uniqueSorted(arr){ return Array.from(new Set(arr.filter(x=>x&&x.trim().length>0))).sort((a,b)=>a.localeCompare(b)); }

function populateFilters(){
  const stateSel = document.getElementById('stateSel');
  const countySel = document.getElementById('countySel');
  const parentSel = document.getElementById('parentSel');

  const states = uniqueSorted(mainRows.map(r=>r.state));
  stateSel.innerHTML = states.map(s=>`<option value="${s}">${s}</option>`).join('');
  // default to Arizona if present
  if(states.includes('Arizona')) stateSel.value='Arizona';

  updateCountyAndParents();

  stateSel.addEventListener('change', updateCountyAndParents);
  countySel.addEventListener('change', updateParentsOnly);
  parentSel.addEventListener('change', updateDashboard);
}

function updateCountyAndParents(){
  const stateSel = document.getElementById('stateSel');
  const countySel = document.getElementById('countySel');
  const selState = stateSel.value;
  const counties = uniqueSorted(mainRows.filter(r=>r.state===selState).map(r=>r.county));
  countySel.innerHTML = counties.map(c=>`<option value="${c}">${c}</option>`).join('');
  if(counties.length>0) countySel.value = counties[0];
  updateParentsOnly();
}

function updateParentsOnly(){
  const stateSel = document.getElementById('stateSel');
  const countySel = document.getElementById('countySel');
  const parentSel = document.getElementById('parentSel');
  const selState = stateSel.value;
  const selCounty = countySel.value;
  const parents = uniqueSorted(mainRows.filter(r=>r.state===selState && r.county===selCounty).map(r=>r.parent_org).filter(Boolean));
  parentSel.innerHTML = parents.map(p=>`<option value="${p}">${p}</option>`).join('');
  // none selected by default
  Array.from(parentSel.options).forEach(o=>o.selected=false);
  updateDashboard();
}

function getSelectedParents(){
  const parentSel = document.getElementById('parentSel');
  return Array.from(parentSel.selectedOptions).map(o=>o.value);
}

function updateDashboard(){
  const selState = document.getElementById('stateSel').value;
  const selCounty = document.getElementById('countySel').value;
  const parents = getSelectedParents();

  let d = mainRows.filter(r=>r.state===selState && r.county===selCounty);
  if(parents.length>0){ d = d.filter(r=>parents.includes(r.parent_org)); }

  // time series totals by month
  const map = new Map();
  for(const r of d){
    const m = toMonthStr(r.report_period);
    const en = parseNumber(r.enrollment) || 0;
    map.set(m, (map.get(m)||0)+en);
  }
  const months = Array.from(map.keys()).sort();
  const totals = months.map(m=>map.get(m));

  // KPIs
  const cur = totals.length? totals[totals.length-1] : null;
  const prev = totals.length>1? totals[totals.length-2] : null;
  const yoy = totals.length>12? totals[totals.length-13] : null;
  document.getElementById('kpiCur').textContent = fmtNum(cur);
  document.getElementById('kpiMoM').textContent = fmtDelta(cur, prev);
  document.getElementById('kpiYoY').textContent = fmtDelta(cur, yoy);

  // Trend chart
  const trendTrace = {x: months, y: totals, type:'scatter', mode:'lines+markers', line:{color:'#7c5cff'}};
  Plotly.newPlot('trend', [trendTrace], {
    title:`Enrollment Trend — ${selState}, ${selCounty}`,
    xaxis:{title:'Month'}, yaxis:{title:'Enrollment', rangemode:'tozero'}, margin:{t:40}
  }, {displaylogo:false, responsive:true});

  // Top Parent Orgs at latest month
  const latestM = months.length? months[months.length-1]: null;
  let byParent = new Map();
  for(const r of d){
    const m = toMonthStr(r.report_period);
    if(m!==latestM) continue;
    const key = r.parent_org || r.org_name || '(Unknown)';
    const en = parseNumber(r.enrollment) || 0;
    byParent.set(key, (byParent.get(key)||0)+en);
  }
  const pairs = Array.from(byParent.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10);
  Plotly.newPlot('topParents', [{
    x: pairs.map(p=>p[1]).reverse(),
    y: pairs.map(p=>p[0]).reverse(),
    type:'bar', orientation:'h', marker:{color:'#4cc3d9'}
  }], {
    title:`Top Parent Organizations — ${selState}, ${selCounty} — ${latestM||''}`,
    xaxis:{title:'Enrollment'}, yaxis:{title:'Parent Org'}, margin:{t:40}
  }, {displaylogo:false, responsive:true});
}

async function boot(){
  try{
    [mainRows, kpiRows] = await Promise.all([loadCsv(DATA_MAIN), loadCsv(DATA_KPI)]);
    populateFilters();
  }catch(e){
    console.error(e);
    alert('Failed to load data. Make sure data/processed CSVs exist and GitHub Pages is enabled.');
  }
}

boot();
