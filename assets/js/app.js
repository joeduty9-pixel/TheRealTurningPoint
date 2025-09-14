// Utils
const $ = s => document.querySelector(s);
const wb = u => `https://web.archive.org/web/*/${encodeURIComponent(u)}`;
const at = u => `https://archive.today/?run=1&url=${encodeURIComponent(u)}`;
const dl = (name, text, type="text/plain")=>{
  const blob = new Blob([text],{type}); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url);
};

// About editor
const aboutKey="aboutTextHTML";const aboutTxt=$("#aboutText");
try{const saved=localStorage.getItem(aboutKey); if(saved) aboutTxt.innerHTML=saved;}catch{}
$("#editAboutBtn").addEventListener("click",()=>{aboutTxt.setAttribute("contenteditable","true");aboutTxt.focus();$("#saveAboutBtn").hidden=false;$("#editAboutBtn").hidden=true;});
$("#saveAboutBtn").addEventListener("click",()=>{aboutTxt.removeAttribute("contenteditable");try{localStorage.setItem(aboutKey,aboutTxt.innerHTML);}catch{};$("#saveAboutBtn").hidden=true;$("#editAboutBtn").hidden=false;});

// Data registry
const FIGURES = [
  { key:"charlie-kirk", name:"Charlie Kirk" },
  { key:"nick-fuentes", name:"Nick Fuentes" },
  { key:"steve-bannon", name:"Steve Bannon" },
  { key:"stephen-miller", name:"Stephen Miller" },
  { key:"steve-king", name:"Steve King" }
];

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

let currentData = []; // loaded entries for active figure

async function loadFigureData(key){
  const url = `data/${key}.json`;
  try{
    const res = await fetch(url, {cache:"no-cache"});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const arr = await res.json();
    if(!Array.isArray(arr)) throw new Error("Dataset must be an array");
    currentData = arr;
  }catch(err){
    console.warn("Failed to load dataset", key, err);
    currentData = [];
  }
}

function render(){
  const whoKey = figureSel.value;
  const whoName = (FIGURES.find(f=>f.key===whoKey)||{}).name || whoKey;
  const cat = categorySel.value;
  const q = norm(searchEl.value);
  const order = sortSel.value;

  let items = currentData.slice();

  if(cat !== "ALL"){
    items = items.filter(it => (it.categories||[]).some(c=>norm(c)===norm(cat)));
  }
  if(q){
    items = items.filter(it => norm(it.quote).includes(q) || norm(it.venue).includes(q));
  }
  items.sort((a,b)=>{
    const da=a.date||"", db=b.date||"";
    return order==="new" ? db.localeCompare(da) : da.localeCompare(db);
  });

  listEl.innerHTML = "";
  if(!items.length){
    emptyEl.hidden = false;
    countEl.textContent = "";
    return;
  }
  emptyEl.hidden = true;
  countEl.textContent = `${items.length} entr${items.length===1?'y':'ies'} · ${whoName}`;

  for(const r of items){
    const card = document.createElement("article");
    card.className = "card";
    const qEl = document.createElement("blockquote");
    qEl.textContent = `“${r.quote}”`;
    card.appendChild(qEl);

    const meta = document.createElement("div");
    meta.className = "meta";
    const pretty = r.date ? new Date(r.date+"T00:00:00Z").toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}) : "Date n/a";
    meta.innerHTML = `<span>— <strong>${r.person||whoName}</strong></span> · <span>${pretty}</span> · <span>${r.venue||""}</span>`;
    card.appendChild(meta);

    if(r.categories?.length){
      const tags = document.createElement("div");
      (r.categories||[]).forEach(c=>{
        const t=document.createElement("span"); t.className="tag"; t.textContent=c; tags.appendChild(t);
      });
      card.appendChild(tags);
    }

    const links = document.createElement("div");
    links.className = "links";
    if(r.source){
      links.append(
        Object.assign(document.createElement("a"),{href:r.source,target:"_blank",rel:"noopener",className:"linkbtn",textContent:"Open source"}),
        Object.assign(document.createElement("a"),{href:wb(r.source),target:"_blank",rel:"noopener",className:"linkbtn",textContent:"Wayback"}),
        Object.assign(document.createElement("a"),{href:at(r.source),target:"_blank",rel:"noopener",className:"linkbtn",textContent:"Archive.today"})
      );
    }
    const copy = Object.assign(document.createElement("a"),{href:"#",className:"linkbtn ghost",textContent:"Copy quote"});
    copy.addEventListener("click", e=>{
      e.preventDefault();
      navigator.clipboard.writeText(`"${r.quote}" — ${r.person||whoName}${r.date?`, ${r.date}`:''}${r.venue?`, ${r.venue}`:''}`);
      copy.textContent = "Copied!"; setTimeout(()=>copy.textContent="Copy quote",900);
    });
    links.append(copy);
    card.appendChild(links);

    listEl.appendChild(card);
  }
}

async function boot(){
  await loadFigureData(figureSel.value);
  render();
}
figureSel.addEventListener("change", async ()=>{ await loadFigureData(figureSel.value); render(); });
[categorySel,sortSel].forEach(el=>el.addEventListener("change",render));
searchEl.addEventListener("input",render);

// Export / Import
document.getElementById("exportJson").addEventListener("click",()=>{
  const whoKey = figureSel.value;
  const whoName = (FIGURES.find(f=>f.key===whoKey)||{}).name || whoKey;
  const out = JSON.stringify({[whoName]: currentData}, null, 2);
  dl(`${whoName.replace(/\s+/g,'_').toLowerCase()}_quotes.json`, out, "application/json");
});
document.getElementById("exportCsv").addEventListener("click",()=>{
  const whoKey = figureSel.value;
  const whoName = (FIGURES.find(f=>f.key===whoKey)||{}).name || whoKey;
  const header = ["person","quote","date","venue","categories","source_url"];
  const csv = [header.join(",")].concat(
    currentData.map(r => `"${(r.person||whoName).replace(/"/g,'""')}","${(r.quote||"").replace(/"/g,'""')}","${r.date||""}","${(r.venue||"").replace(/"/g,'""')}","${(r.categories||[]).join("|").replace(/"/g,'""')}","${(r.source||"").replace(/"/g,'""')}"`)
  ).join("\n");
  dl(`${whoName.replace(/\s+/g,'_').toLowerCase()}_quotes.csv`, csv, "text/csv");
});
document.getElementById("downloadHTML").addEventListener("click",()=>{
  const html = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
  dl(`convergence-of-conservative-thought.html`, html, "text/html");
});
document.getElementById("importBtn").addEventListener("click", ()=> document.getElementById("importFile").click());
document.getElementById("importFile").addEventListener("change", async (e)=>{
  const f = e.target.files[0]; if(!f) return;
  try{
    const text = await f.text(); const obj = JSON.parse(text);
    const who = Object.keys(obj)[0]; const arr = obj[who];
    if(!who || !Array.isArray(arr)) throw new Error('Expecting {"Name":[...] }');
    currentData = arr;
    render();
    alert(`Loaded ${arr.length} entries for ${who}. (Not persisted to /data — for demo/import only)`);
  }catch(err){
    alert("Import failed: " + err.message);
  }finally{ e.target.value=""; }
});

boot();
