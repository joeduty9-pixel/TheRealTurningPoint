const $ = s => document.querySelector(s);
const FIGURES = [{key:"charlie-kirk",name:"Charlie Kirk"}];
const PAGES_BASE = "https://joeduty9-pixel.github.io/TheRealTurningPoint/data";

const figureSel=$("#figure");
FIGURES.forEach(f=>{const o=document.createElement("option");o.value=f.key;o.textContent=f.name;figureSel.appendChild(o);});
figureSel.value="charlie-kirk";

let currentData=[];

async function loadFigureData(key){
  const url=`${PAGES_BASE}/${key}.json`;
  try{
    const res=await fetch(url,{cache:"no-cache"});
    if(!res.ok) throw new Error(res.statusText);
    currentData=await res.json();
  }catch(e){console.error("Failed to load",url,e);currentData=[];}
  render();
}

function render(){
  const list=$("#list");list.innerHTML="";
  if(!currentData.length){$("#empty").hidden=false;$("#count").textContent="";return;}
  $("#empty").hidden=true;$("#count").textContent=currentData.length+" entries";
  for(const r of currentData){
    const card=document.createElement("div");card.className="card";
    card.innerHTML=`<blockquote>"${r.quote}"</blockquote><div>${r.person||""} · ${r.date||""} · ${r.venue||""}</div>`;
    list.appendChild(card);
  }
}

figureSel.addEventListener("change",()=>loadFigureData(figureSel.value));
loadFigureData(figureSel.value);
