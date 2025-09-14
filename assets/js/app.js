// ---------- Helpers ----------
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const el = (t, props={}) => Object.assign(document.createElement(t), props);
const norm = s => (s||"").toLowerCase();
const wb = u => `https://web.archive.org/web/*/${encodeURIComponent(u)}`;
const at = u => `https://archive.today/?run=1&url=${encodeURIComponent(u)}`;

// ---------- Config ----------
const FIGURES_CANONICAL = [
  { key:"charlie-kirk", name:"Charlie Kirk" },
  { key:"nick-fuentes", name:"Nick Fuentes" },
  { key:"steve-bannon", name:"Steve Bannon" },
  { key:"stephen-miller", name:"Stephen Miller" },
  { key:"steve-king", name:"Steve King" },
  { key:"tucker-carlson", name:"Tucker Carlson" },
  { key:"lauren-boebert", name:"Lauren Boebert" },
  { key:"donald-trump", name:"Donald Trump" },
  { key:"mike-pence", name:"Mike Pence" },
  { key:"betsy-devos", name:"Betsy DeVos" },
  { key:"jeff-sessions", name:"Jeff Sessions" },
  { key:"sean-hannity", name:"Sean Hannity" },
  { key:"rush-limbaugh", name:"Rush Limbaugh" }
];



// Order: Charlie, ALL, then the rest
const FIGURES = (()=>{
  const first = FIGURES_CANONICAL[0];
  const rest = FIGURES_CANONICAL.slice(1);
  return [first, {key:"ALL", name:"All Figures"}, ...rest];
})();

const PAGES_BASE = "https://joeduty9-pixel.github.io/TheRealTurningPoint/data";
const RAW_BASE   = "https://raw.githubusercontent.com/joeduty9-pixel/TheRealTurningPoint/main/data";

// ---------- Debug UI ----------
const dbg = (() => {
  const panel = el("div", { id: "trpDebugPanel", style: `
    position: fixed; z-index: 9999; bottom: 14px; right: 14px;
    max-width: 420px; max-height: 50vh; overflow:auto;
    background: rgba(22, 22, 30, .95); color:#e6eefb; font: 12px/1.45 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
    border: 1px solid rgba(255,255,255,.12); border-radius: 12px; padding: 10px; display:none;
    box-shadow: 0 20px 50px rgba(0,0,0,.55);
  `});
  const head = el("div", { style:"display:flex;align-items:center;gap:8px;margin-bottom:6px;" });
  head.append(
    el("strong", { textContent:"Debug • Loader" }),
    el("span", { textContent:"(toggle stays for dev)", style:"opacity:.7" }),
    el("div", { style:"flex:1" }),
    el("button", { textContent:"×", style:"background:transparent;border:0;color:#e6eefb;font-size:18px;cursor:pointer;" , onclick:()=>panel.style.display="none"})
  );
  const log = el("div", { id:"trpLog", style:"white-space:pre-wrap" });
  panel.append(head, log);
  document.addEventListener("DOMContentLoaded", ()=> document.body.append(panel));
  const toggleInject = () => {
    const spot = document.querySelector(".toolbar") || document.querySelector("header .wrap.brand") || document.querySelector("header");
    if(!spot || spot.querySelector("#trpDebugToggle")) return;
    const btn = el("button", { id:"trpDebugToggle", className:"btn ghost", textContent:"Debug" });
    btn.style.marginLeft = "8px";
    btn.onclick = ()=> panel.style.display = (panel.style.display==="none"||!panel.style.display) ? "block" : "none";
    spot.appendChild(btn);
    // Preflight
    if(!spot.querySelector("#trpPreflight")){
      const pf = el("button", { id:"trpPreflight", className:"btn", textContent:"Preflight Datasets" });
      pf.style.marginLeft = "8px";
      pf.onclick = preflightDatasets;
      spot.appendChild(pf);
    }
  };
  document.addEventListener("DOMContentLoaded", toggleInject);
  const write = (...a)=>{
    const msg = a.map(x=> typeof x==="string" ? x : JSON.stringify(x,null,2)).join(" ");
    const line = el("div", { textContent: msg });
    log.appendChild(line); log.scrollTop = log.scrollHeight;
    try { console.log("[TRP]", ...a); } catch {}
  };
  return write;
})();

function banner(html, level="info"){
  let b = document.getElementById("trpBanner");
  if(!b){
    b = el("div", { id:"trpBanner" });
    Object.assign(b.style, { position:"sticky", top:"0", zIndex:1000, padding:"10px 14px" });
    document.body.prepend(b);
  }
  const map = { info:["#10213d","#cfe0ff"], warn:["#3b2a0f","#ffe7ba"], error:["#3b0f0f","#ffcaca"] };
  const [bg, fg] = map[level] || map.info;
  b.style.background = bg; b.style.color = fg; b.innerHTML = html;
}
function clearBanner(){ const b = $("#trpBanner"); if(b) b.remove(); }

// ---------- DOM Refs ----------
const figureSel = $("#figure");
const categorySel = $("#category");
const sortSel = $("#sort");
const searchEl = $("#search");
const listEl = $("#list");
const countEl = $("#count");
const emptyEl = $("#empty");

// ---------- Populate Figure Dropdown ----------
(function initFigures(){
  if(!figureSel) return;
  FIGURES.forEach(f=>{
    const o = el("option", { value: f.key, textContent: f.name });
    figureSel.appendChild(o);
  });
  figureSel.value = "charlie-kirk"; // keep Charlie as default
})();

// ---------- Data Loading ----------
async function tryFetchJson(url){
  dbg("GET", url);
  try{
    const res = await fetch(url, { cache:"no-cache" });
    dbg("→", res.status, res.statusText);
    if(!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return { data: await res.json() };
  }catch(e){
    dbg("ERR", String(e));
    return { error: String(e) };
  }
}

async function loadOneFigure(key){
  const pages = `${PAGES_BASE}/${key}.json`;
  const raw   = `${RAW_BASE}/${key}.json`;
  let {data, error} = await tryFetchJson(pages);
  if(!data){
    dbg("Falling back to RAW for", key);
    ({data, error} = await tryFetchJson(raw));
  }
  return { key, data: Array.isArray(data)?data:[], error };
}

async function preflightDatasets(){
  const keys = FIGURES_CANONICAL.map(f=>f.key);
  let ok = [], missing = [];
  for (const k of keys){
    const pages = `${PAGES_BASE}/${k}.json`;
    const raw   = `${RAW_BASE}/${k}.json`;
    let {data} = await tryFetchJson(pages);
    if(!data){
      ({data} = await tryFetchJson(raw));
    }
    if(Array.isArray(data) && data.length) ok.push(k); else missing.push(k);
  }
  banner(`Datasets OK: <strong>${ok.join(", ")||"none"}</strong><br>Missing/empty: <strong>${missing.join(", ")||"none"}</strong>`, missing.length ? "warn" : "info");
}

let currentData = [];

async function loadSelection(){
  clearBanner();
  const val = figureSel ? figureSel.value : "charlie-kirk";
  if(val === "ALL"){
    // Load all in parallel, merge
    const keys = FIGURES_CANONICAL.map(f=>f.key);
    const results = await Promise.all(keys.map(loadOneFigure));
    const merged = [];
    const missing = [];
    results.forEach(r=>{
      if(r.data?.length){
        // ensure person label set
        const name = (FIGURES_CANONICAL.find(f=>f.key===r.key)||{}).name || r.key;
        r.data.forEach(item=>{
          if(!item.person) item.person = name;
          merged.push(item);
        });
      }else{
        missing.push(r.key);
      }
    });
    currentData = merged;
    if(missing.length){
      banner(`Loaded <strong>${merged.length}</strong> quotes · Missing datasets: <strong>${missing.join(", ")}</strong>`, "warn");
    }else{
      banner(`Loaded <strong>${merged.length}</strong> quotes from all figures.`, "info");
    }
  }else{
    // Single figure
    const { data, error } = await loadOneFigure(val);
    currentData = data;
    if(error && (!data || !data.length)){
      banner(`Could not load dataset for <strong>${val}</strong>.`, "error");
    }
  }
  render();
}

// ---------- Render ----------
function render(){
  if(!listEl) return;
  let items = currentData.slice();

  const cat = categorySel ? categorySel.value : "ALL";
  const q = searchEl ? norm(searchEl.value) : "";
  const order = sortSel ? sortSel.value : "new";

  if(cat!=="ALL"){ items = items.filter(it => (it.categories||[]).some(c=>norm(c)===norm(cat))); }
  if(q){ items = items.filter(it => norm(it.quote).includes(q) || norm(it.venue).includes(q) || norm(it.person).includes(q)); }

  items.sort((a,b)=>{
    const da=a.date||"", db=b.date||"";
    return order==="new" ? db.localeCompare(da) : da.localeCompare(db);
  });

  listEl.innerHTML = "";
  if(!items.length){
    if(emptyEl) emptyEl.hidden=false;
    if(countEl) countEl.textContent="";
    return;
  }
  if(emptyEl) emptyEl.hidden=true;
  if(countEl) countEl.textContent = `${items.length} entr${items.length===1?'y':'ies'}`;

  for(const r of items){
    const card = el("article", { className:"card" });
    card.appendChild(el("blockquote", { textContent:`“${r.quote}”` }));

    // Meta
    const pretty = r.date ? new Date(r.date+"T00:00:00Z").toLocaleDateString(undefined,
      { year:'numeric', month:'short', day:'numeric' }) : "Date n/a";
    const meta = el("div", { className:"meta", textContent:`— ${r.person||""} · ${pretty} · ${r.venue||""}` });
    card.appendChild(meta);

    // Tags (comma separated)
    if (Array.isArray(r.categories) && r.categories.length){
      const tags = el("div", { className:"tags", textContent: r.categories.join(", ") });
      card.appendChild(tags);
    }

    // Links
    if(r.source){
      const links = el("div", { className:"links" });
      links.append(
        el("a", { href:r.source, target:"_blank", rel:"noopener", textContent:"Open source" }),
        el("a", { href:wb(r.source), target:"_blank", rel:"noopener", textContent:"Wayback" }),
        el("a", { href:at(r.source), target:"_blank", rel:"noopener", textContent:"Archive.today" }),
      );
      card.appendChild(links);
    }

    listEl.appendChild(card);
  }
}

// ---------- Events ----------
if (figureSel) figureSel.addEventListener("change", loadSelection);
if (categorySel) categorySel.addEventListener("change", render);
if (sortSel) sortSel.addEventListener("change", render);
if (searchEl) searchEl.addEventListener("input", render);

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", ()=> loadSelection());
