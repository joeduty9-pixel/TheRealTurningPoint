const $ = s => document.querySelector(s);
const wb = u => `https://web.archive.org/web/*/${encodeURIComponent(u)}`;
const at = u => `https://archive.today/?run=1&url=${encodeURIComponent(u)}`;

const FIGURES = [
  { key:"charlie-kirk", name:"Charlie Kirk" },
  { key:"nick-fuentes", name:"Nick Fuentes" },
  { key:"steve-bannon", name:"Steve Bannon" },
  { key:"stephen-miller", name:"Stephen Miller" },
  { key:"steve-king", name:"Steve King" }
];

const PAGES_BASE = "https://joeduty9-pixel.github.io/TheRealTurningPoint/data";

const figureSel = $("#figure");
FIGURES.forEach(f=>{
  const o=document.createElement("option"); o.value=f.key; o.textContent=f.name; figureSel.appendChild(o);
});
figureSel.value = "charlie-kirk";

const categorySel = $("#category");
const sortSel = $("#sort");
const searchEl = $("#search");
const listEl = $("#list");
const countEl = $("#count");
const emptyEl = $("#empty");

const norm = s => (s||"").toLowerCase();
let currentData = [];

async function loadFigureData(key){
  const url = `${PAGES_BASE}/${key}.json`;
  try{
    const res = await fetch(url, {cache:"no-cache"});
    if(!res.ok) throw new Error(res.statusText);
    const arr = await res.json();
    currentData = Array.isArray(arr)?arr:[];
  }catch(e){
    console.error("Failed to load", url, e);
    currentData = [];
  }
  render();
}

function render(){
  let items = currentData.slice();
  const cat = categorySel.value;
  const q = norm(searchEl.value);
  const order = sortSel.value;

  if(cat!=="ALL"){ items = items.filter(it=>(it.categories||[]).some(c=>norm(c)===norm(cat))); }
  if(q){ items = items.filter(it=> norm(it.quote).includes(q) || norm(it.venue).includes(q)); }
  items.sort((a,b)=>{const da=a.date||"",db=b.date||"";return order==="new"?db.localeCompare(da):da.localeCompare(db);});

  listEl.innerHTML="";
  if(!items.length){ emptyEl.hidden=false; countEl.textContent=""; return; }
  emptyEl.hidden=true;
  countEl.textContent=`${items.length} entr${items.length===1?"y":"ies"}`;

  for(const r of items){
    const card=document.createElement("div"); card.className="card";
    const qEl=document.createElement("blockquote"); qEl.textContent=`“${r.quote}”`; card.appendChild(qEl);

    const meta=document.createElement("div"); meta.className="meta";
    const pretty=r.date?new Date(r.date+"T00:00:00Z").toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}):"Date n/a";
    meta.textContent=`— ${r.person||""} · ${pretty} · ${r.venue||""}`;
    card.appendChild(meta);

    listEl.appendChild(card);
  }
}

figureSel.addEventListener("change",()=>loadFigureData(figureSel.value));
categorySel.addEventListener("change",render);
sortSel.addEventListener("change",render);
searchEl.addEventListener("input",render);

loadFigureData(figureSel.value);
