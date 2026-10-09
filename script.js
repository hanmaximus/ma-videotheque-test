'use strict';
const PAGE_SIZE = 20;
let films = [];
let activeSupport = '';
let visibleCount = PAGE_SIZE;
let currentFilm = null;
const $ = id => document.getElementById(id);
const clean = value => String(value ?? '').trim();
const normalizeText = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function supportList(value) {
  const text = clean(value), found = [];
  const tests = [
    ['4K UHD', /\b4\s*K(?:\s*UHD)?\b/i], ['Blu-ray', /blu[\s-]?ray/i], ['3D', /\b3D\b/i],
    ['DVD', /\bDVD\b/i], ['HD DVD', /\bHD[\s-]?DVD\b/i], ['Digital', /\bdigital\b|\bdematerialise\b|\bdématérialisé\b/i],
    ['VHS', /\bVHS\b/i], ['LaserDisc', /laser[\s-]?disc/i], ['VCD', /\bVCD\b/i], ['Betamax', /\bBetamax\b/i]
  ];
  tests.forEach(([label, regex]) => { if (regex.test(text) && !found.includes(label)) found.push(label); });
  if (!found.length && text) found.push(text);
  return found;
}
function supportsFor(film) { return supportList(film.format); }
function searchable(film) { return normalizeText([film.title, film.original, film.type, film.director, film.screenwriter, film.cast, film.music, film.format, film.synopsis, film.bonus, film.year_original, film.release_fr_date, film.country, film.saga, film.publisher, film.genre].join(' ')); }
function displayFrenchDate(value) {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}
function setStatus(message) { $('siteStatus').textContent = message; }
function showView(which) {
  const catalog = which === 'catalog';
  $('catalogView').classList.toggle('view-hidden', !catalog);
  $('homeView').classList.toggle('view-hidden', catalog);
  $('catalogButton').classList.toggle('active', catalog);
  $('homeButton').classList.toggle('active', !catalog);
}
function getFilteredFilms() {
  return activeSupport ? films.filter(f => supportsFor(f).includes(activeSupport)) : films;
}
function renderStats() {
  const box = $('stats'); box.replaceChildren();
  const counts = new Map();
  films.forEach(f => supportsFor(f).forEach(s => counts.set(s, (counts.get(s) || 0) + 1)));
  const items = [{name:'Tous les titres', count:films.length}, ...[...counts.entries()].sort((a,b)=>a[0].localeCompare(b[0],'fr')).map(([name,count])=>({name,count}))];
  items.forEach(item => {
    const button = document.createElement('button'); button.type='button'; button.className='stat-card' + ((item.name === 'Tous les titres' ? !activeSupport : activeSupport === item.name) ? ' active' : '');
    const number = document.createElement('span'); number.className='stat-number'; number.textContent=item.count;
    const label = document.createElement('span'); label.className='stat-label'; label.textContent=item.name;
    button.append(number,label); button.addEventListener('click',()=>{activeSupport=item.name==='Tous les titres'?'':item.name;visibleCount=PAGE_SIZE;renderCatalog();renderStats();}); box.append(button);
  });
}
function renderCatalog() {
  const list = getFilteredFilms(); const visible = list.slice(0, visibleCount); const box=$('catalogList'); box.replaceChildren();
  $('catalogFilter').textContent = activeSupport ? `Support : ${activeSupport}` : 'Tous les titres';
  if (!visible.length) { const empty=document.createElement('div');empty.className='empty';empty.textContent='Aucun titre pour ce filtre.';box.append(empty); }
  visible.forEach(film => {
    const item=document.createElement('article'); item.className='catalog-item'; item.tabIndex=0; item.setAttribute('role','button');
    const titleWrap=document.createElement('div'); const title=document.createElement('div');title.className='catalog-title';title.textContent=film.title||'Titre inconnu';titleWrap.append(title);
    if(film.original){const original=document.createElement('div');original.className='catalog-original';original.textContent=film.original;titleWrap.append(original);}
    const format=document.createElement('div');format.className='catalog-format';format.textContent=supportsFor(film).join(' · ')||'—';item.append(titleWrap,format);
    const open=()=>showFilm(film);item.addEventListener('click',open);item.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});box.append(item);
  });
  $('pageInfo').textContent=`${visible.length} titre${visible.length===1?'':'s'} affiché${visible.length===1?'':'s'} sur ${list.length}`;
  $('loadMoreButton').disabled=visibleCount>=list.length;
  $('loadMoreButton').textContent=visibleCount>=list.length?'Fin du catalogue':'Charger les titres suivants';
}
function addClickableNames(id, value, type) {
  const box=$(id);box.replaceChildren();const parts=clean(value).split(/\s*[,;]\s*|\n+/).map(s=>s.trim()).filter(Boolean);
  if(!parts.length){box.textContent='—';return;}
  parts.forEach((part,index)=>{const a=document.createElement('a');a.href='#';a.textContent=part;a.addEventListener('click',e=>{e.preventDefault();runSearch(part, type);});box.append(a);if(index<parts.length-1)box.append(document.createTextNode(', '));});
}
function showFilm(film) {
  currentFilm=film;showView('home');$('results').classList.add('hidden');$('filmTitle').textContent=film.title||'Titre inconnu';$('filmOriginal').textContent=film.original||'';
  const details=[film.type, film.year_original ? `Année originale / production : ${film.year_original}` : '', film.release_fr_date ? `Sortie française : ${displayFrenchDate(film.release_fr_date)}` : '', film.duration ? `${film.duration} min` : ''].filter(Boolean);
  $('filmTypeYear').textContent=details.join(' · ')||'—';
  const supports=$('filmSupports');supports.replaceChildren();const supportNames=supportsFor(film);
  supportNames.forEach(name=>{const b=document.createElement('button');b.type='button';b.className='support-badge';b.textContent=name;b.title=`Afficher les titres en ${name}`;b.addEventListener('click',()=>{activeSupport=name;visibleCount=PAGE_SIZE;renderStats();renderCatalog();showView('catalog');});supports.append(b);});
  addClickableNames('filmDirector',film.director,'director');addClickableNames('filmCast',film.cast,'cast');addClickableNames('filmMusic',film.music,'music');$('filmSynopsis').textContent=film.synopsis||'—';$('filmBonus').textContent=film.bonus||'—';
  const poster=$('poster');poster.replaceChildren();if(film.image){const img=document.createElement('img');img.src=film.image;img.alt=`Affiche de ${film.title||'ce titre'}`;img.loading='lazy';img.onerror=()=>{poster.replaceChildren();poster.textContent='Affiche indisponible';};poster.append(img);}else{poster.textContent='Affiche à ajouter';}
  setStatus('Fiche affichée depuis le catalogue local.');window.scrollTo({top:0,behavior:'smooth'});
}
function renderResults(label, list) {
  const box=$('results');box.replaceChildren();box.classList.remove('hidden');const head=document.createElement('div');head.className='results-head';head.textContent=`${label} — ${list.length} résultat${list.length===1?'':'s'}`;box.append(head);
  if(!list.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='Aucun résultat.';box.append(empty);return;}
  list.slice(0,200).forEach(f=>{const item=document.createElement('div');item.className='result-item';item.tabIndex=0;item.setAttribute('role','button');const title=document.createElement('div');title.className='result-title';title.textContent=f.title||'Titre inconnu';const sub=document.createElement('div');sub.className='result-sub';sub.textContent=[f.original,f.year_original,f.format].filter(Boolean).join(' · ');item.append(title,sub);const open=()=>showFilm(f);item.addEventListener('click',open);item.addEventListener('keydown',e=>{if(e.key==='Enter'){open();}});box.append(item);});
}
function runSearch(query, type='all') {
  const q=clean(query);if(!q){$('results').classList.add('hidden');return;}
  const normalized=normalizeText(q);const found=films.filter(f=>{
    const fields={director:f.director,cast:f.cast,music:f.music,support:f.format};
    if(type==='all') return searchable(f).includes(normalized);
    if(type==='support') return supportsFor(f).some(s=>normalizeText(s).includes(normalized)) || normalizeText(f.format).includes(normalized);
    return normalizeText(fields[type]||'').includes(normalized);
  });
  renderResults((type==='all'?'Recherche':type==='director'?'Réalisateur':type==='cast'?'Acteur':type==='music'?'Musique':'Support')+` : « ${q} »`,found);setStatus(`${found.length} résultat(s) trouvé(s).`);
}
async function init() {
  try {
    const response=await fetch('data/films.json');if(!response.ok)throw new Error(`Erreur HTTP ${response.status}`);
    const data=await response.json();if(!Array.isArray(data))throw new Error('Le fichier JSON doit contenir une liste de titres.');
    films=data.map((f,i)=>({...f,_internalId:`title-${i}`}));
    renderStats();renderCatalog();setStatus(`${films.length} titres chargés depuis le fichier de test Excel.`);
  } catch(error) {
    console.error(error);setStatus('Impossible de charger data/films.json. Vérifiez que les fichiers ont bien été ajoutés au dépôt GitHub.');$('catalogList').textContent='Le catalogue ne peut pas être chargé. Vérifiez le fichier data/films.json.';
  }
}
$('catalogButton').addEventListener('click',()=>showView('catalog'));
$('homeButton').addEventListener('click',()=>showView('home'));
$('searchButton').addEventListener('click',()=>runSearch($('searchInput').value));
$('searchInput').addEventListener('keydown',e=>{if(e.key==='Enter')runSearch($('searchInput').value);});
$('loadMoreButton').addEventListener('click',()=>{visibleCount+=PAGE_SIZE;renderCatalog();});
$('clearFilterButton').addEventListener('click',()=>{activeSupport='';visibleCount=PAGE_SIZE;renderStats();renderCatalog();});
init();
