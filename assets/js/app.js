// Robust app.js with explicit debug UI, Pages->Raw fallback, and clearer errors

// ---------- Tiny DOM helpers ----------
const $ = (s) => document.querySelector(s);
const el = (tag, props={}) => Object.assign(document.createElement(tag), props);
const norm = (s) => (s||"").toLowerCase();

// ---------- Debug UI ----------
const dbg = (() => {
  const panel = el("div", { id: "trpDebugPanel", style: `
    position: fixed; z-index: 9999; bottom: 12px; right: 12px;
    max-width: 380px; max-height: 40vh; overflow: auto;
    background: rgba(10,22,40,.95); color:#fff; font: 12px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Arial;
    border: 1px solid rgba(255,255,255,.2); border-radius: 10px; padding: 10px; display:none;
    box-shadow: 0 10px 30px rgba(0,0,0,.5);
  `});
  const title = el("div", { innerHTML: "<strong>Debug</strong> · data loader"});
  const logArea = el("div", { id: "trpDebugLog", style: "margin-top:6px; white-space: pre-wrap;" });
  const closeBtn = el("button", { textContent: "×", style: "position:absolute; top:4px; right:8px; background:transparent; color:#fff; border:0; font-size:16px; cursor:pointer" });
  closeBtn.addEventListener("click", ()=> panel.style.display = "none");
  panel.append(title, closeBtn, logArea);
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(panel));

  // Add a toggle button into header/toolbar if present
  const injectToggle = () => {
    const toolbar = document.querySelector(".toolbar") || document.querySelector("header .wrap.brand") || document.querySelector("header");
    if (!toolbar || toolbar.querySelector("#trpDebugToggle")) return;
    const btn = el("button", { id:"trpDebugToggle", className: "btn ghost", textContent: "Debug" });
    Object.assign(btn.style, { marginLeft: "8px" });
    btn.addEventListener("click", () => panel.style.display = (panel.style.display==="none"||!panel.style.display) ? "block":"none");
    toolbar.appendChild(btn);
  };
  document.addEventListener("DOMContentLoaded", injectToggle);

  const log = (...args) => {
    const msg = args.map(a => typeof a === "string" ? a : JSON.stringify(a,null,2)).join(" ");
    const area = document.getElementById("trpDebugLog");
    if (area) {
      const line = el("div", { textContent: msg });
      area.appendChild(line);
      area.scrollTop = area.scrollHeight;
    }
    // Also echo to console for DevTools
    try { console.log("[TRP]", ...args); } catch {}
  };
  return log;
})();

// ---------- Config ----------
const FIGURES = [
  { key:"charlie-kirk", name:"Charlie Kirk" },
  { key:"nick-fuentes", name:"Nick Fuentes" },
  { key:"steve-bannon", name:"Steve Bannon" },
  { key:"stephen-miller", name:"Stephen Miller" },
  { key:"steve-king", name:"Steve King" }
];

// Prefer Pages domain (self-owned), fallback to Raw if needed
const PAGES_BASE = "https://joeduty9-pixel.github.io/TheRealTurningPoint/data";
const RAW_BASE   = "https://raw.githubusercontent.com/joeduty9-pixel/TheRealTurningPoint/main/data";

// ---------- Simple helpers ----------
const wb = u => `https://web.archive.org/web/*/${encodeURIComponent(u)}`;
const at = u => `https://archive.today/?run=1&url=${encodeURIComponent(u)}`;

// ---------- UI refs ----------
const figureSel = $("#figure");
const categorySel = $("#category");
const sortSel = $("#sort");
const searchEl = $("#search");
const listEl = $("#list");
const countEl = $("#count");
const emptyEl = $("#empty");

let currentData = [];

// Populate figure dropdown
(function initFigures(){
  if(!figureSel) return;
  for(const f of FIGURES){
    const o = el("option", { value: f.key, textContent: f.name });
    figureSel.appendChild(o);
  }
  figureSel.value = figureSel.value || "charlie-kirk";
})();

async function tryFetchJson(url){
  dbg("fetch:", url);
  try{
    const res = await fetch(url, { cache: "no-cache" });
    dbg("status:", res.status, res.statusText);
    if(!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = await res.json();
    return { data };
  }catch(err){
    dbg("error:", String(err));
    return { error: String(err) };
  }
}

async function loadFigureData(key){
  const urlPages = `${PAGES_BASE}/${key}.json`;
  const urlRaw   = `${RAW_BASE}/${key}.json`;

  dbg("Loading figure:", key);
  let {data, error} = await tryFetchJson(urlPages);
  if(error){
    dbg("Pages fetch failed, trying Raw…");
    const alt = await tryFetchJson(urlRaw);
    data = alt.data; error = alt.error;
    if(data){
      banner(`Loaded <code>${key}.json</code> from <strong>raw.githubusercontent.com</strong> (Pages URL failed).`, "warn");
    }
  }

  if(!data){
    currentData = [];
    banner(`Could not load <code>${key}.json</code>.<br>
      Expected URLs:<br>
      <a href="${urlPages}" target="_blank">${urlPages}</a><br>
      <a href="${urlRaw}" target="_blank">${urlRaw}</a>`, "error");
  }else{
    currentData = Array.isArray(data) ? data : [];
  }
  render();
}

function banner(html, level="info"){
  // lightweight inline banner
  let b = document.getElementById("trpBanner");
  if(!b){
    b = el("div", { id: "trpBanner" });
    Object.assign(b.style, {
      position:"sticky", top:"0", zIndex: 1000, padding:"10px 14px",
      font:"14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Arial"
    });
    document.body.prepend(b);
  }
  const colors = {
    info:  ["#0B1E3D", "#CDE0FF"],
    warn:  ["#3D2A0B", "#FFEABA"],
    error: ["#3D0B0B", "#FFC9C9"]
  }[level] || ["#0B1E3D","#CDE0FF"];
  b.style.background = colors[0];
  b.style.color = colors[1];
  b.innerHTML = html;
}

function clearBanner(){
  const b = document.getElementById("trpBanner");
  if(b) b.remove();
}

function render(){
  if(!listEl) return;
  clearBanner();

  let items = currentData.slice();
  const cat = categorySel ? categorySel.value : "ALL";
  const q = searchEl ? norm(searchEl.value) : "";
  const order = sortSel ? sortSel.value : "new";

  if(cat!=="ALL"){ items = items.filter(it => (it.categories||[]).some(c=>norm(c)===cat.toLowerCase())); }
  if(q){ items = items.filter(it => norm(it.quote).includes(q) || norm(it.venue).includes(q)); }
  items.sort((a,b)=>{
    const da=a.date||"", db=b.date||"";
    return order==="new" ? db.localeCompare(da) : da.localeCompare(db);
  });

  listEl.innerHTML = "";
  if(!items.length){
    if(emptyEl) emptyEl.hidden = false;
    if(countEl) countEl.textContent = "";
    return;
  }
  if(emptyEl) emptyEl.hidden = true;
  if(countEl) countEl.textContent = `${items.length} entr${items.length===1?'y':'ies'}`;

  for(const r of items){
    const card = el("article", { className: "card" });
    const qEl = el("blockquote", { textContent: `“${r.quote}”` });
    card.appendChild(qEl);

    const meta = el("div", { className: "meta" });
    const pretty = r.date ? new Date(r.date+"T00:00:00Z").toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}) : "Date n/a";
    meta.textContent = `— ${r.person||""} · ${pretty} · ${r.venue||""}`;
    card.appendChild(meta);

    if(r.categories?.length){
      const tags = el("div");
      for(const c of r.categories){
        tags.appendChild(el("span", { className:"tag", textContent: c }));
      }
      card.appendChild(tags);
    }
    if(r.source){
      const links = el("div", { className: "links" });
      links.appendChild(el("a", { href:r.source, target:"_blank", rel:"noopener", textContent:"Open source" }));
      links.appendChild(el("a", { href:wb(r.source), target:"_blank", rel:"noopener", textContent:"Wayback" }));
      links.appendChild(el("a", { href:at(r.source), target:"_blank", rel:"noopener", textContent:"Archive.today" }));
      card.appendChild(links);
    }
    listEl.appendChild(card);
  }
}

// Events
if(figureSel) figureSel.addEventListener("change", ()=> loadFigureData(figureSel.value));
if(categorySel) categorySel.addEventListener("change", render);
if(sortSel) sortSel.addEventListener("change", render);
if(searchEl) searchEl.addEventListener("input", render);

// Boot
document.addEventListener("DOMContentLoaded", ()=> {
  const startKey = figureSel && figureSel.value ? figureSel.value : "charlie-kirk";
  loadFigureData(startKey);
});
