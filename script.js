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
  // Les statistiques et filtres ne portent que sur les supports reconnus, jamais sur des noms de coffrets ou des personnes.
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
  const filtered = activeSupport ? films.filter(f => supportsFor(f).includes(activeSupport)) : films;
  // Le catalogue est trié par titre français, sans modifier l'ordre des données d'origine.
  return [...filtered].sort((a, b) => clean(a.title).localeCompare(clean(b.title), 'fr', { sensitivity: 'base', numeric: true }));
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
  const box=$(id);box.replaceChildren();
  const text=clean(value);
  if(!text){box.textContent='—';return;}
  // Pour les scénaristes, ne rendre cliquables que les noms, pas les mots de liaison.
  if(type==='screenwriter') {
    const parts=text.split(/(\s+et\s+|,\s*d['’]après\s+une\s+histoire\s+de\s+)/i);
    parts.forEach(part=>{
      if(!part) return;
      if(/^\s+et\s+$/i.test(part) || /^,\s*d['’]après\s+une\s+histoire\s+de\s+$/i.test(part)) {
        box.append(document.createTextNode(part));
      } else {
        const a=document.createElement('a');a.href='#';a.textContent=part.trim();a.addEventListener('click',e=>{e.preventDefault();runSearch(part.trim(),type);});box.append(a);
      }
    });
    return;
  }
  const parts=text.split(/\s*[,;]\s*|\n+/).map(s=>s.trim()).filter(Boolean);
  parts.forEach((part,index)=>{const a=document.createElement('a');a.href='#';a.textContent=part;a.addEventListener('click',e=>{e.preventDefault();runSearch(part, type);});box.append(a);if(index<parts.length-1)box.append(document.createTextNode(', '));});
}
function filmUrlKey(film) {
  // Clé stable fondée sur les informations du film, indépendante de sa position dans le JSON.
  return JSON.stringify([clean(film.title), clean(film.original), clean(film.year_original), clean(film.release_fr_date)]);
}
function setFilmHash(film) {
  const hash = '#film=' + encodeURIComponent(filmUrlKey(film));
  if (window.location.hash !== hash) window.location.hash = hash;
}
function restoreFilmFromHash() {
  const match = /^#film=(.*)$/.exec(window.location.hash);
  if (!match || !films.length) return false;
  try {
    const key = decodeURIComponent(match[1]);
    const film = films.find(item => filmUrlKey(item) === key);
    if (film) { showFilm(film, false); return true; }
  } catch (error) {
    console.warn('Identifiant de fiche invalide dans l’adresse.', error);
  }
  return false;
}
function showFilm(film, updateAddress = true) {
  currentFilm=film;
  if (updateAddress) setFilmHash(film);
  showView('home');$('results').classList.add('hidden');$('filmTitle').textContent=film.title||'Titre inconnu';$('filmOriginal').textContent=film.original||'';
  const details=[film.type, film.year_original ? `Année originale / production : ${film.year_original}` : '', film.release_fr_date ? `Sortie française : ${displayFrenchDate(film.release_fr_date)}` : '', film.duration ? `${film.duration} min` : ''].filter(Boolean);
  $('filmTypeYear').textContent=details.join(' · ')||'—';
  const supports=$('filmSupports');supports.replaceChildren();const supportNames=supportsFor(film);
  supportNames.forEach(name=>{const b=document.createElement('button');b.type='button';b.className='support-badge';b.textContent=name;b.title=`Afficher les titres en ${name}`;b.addEventListener('click',()=>{activeSupport=name;visibleCount=PAGE_SIZE;renderStats();renderCatalog();showView('catalog');});supports.append(b);});
  addClickableNames('filmDirector',film.director,'director');addClickableNames('filmScreenwriter',film.screenwriter,'screenwriter');addClickableNames('filmGenre',film.genre,'genre');addClickableNames('filmCast',film.cast,'cast');addClickableNames('filmMusic',film.music,'music');$('filmSynopsis').textContent=film.synopsis||'—';$('filmBonus').textContent=film.bonus||'—';
  const poster=$('poster');poster.replaceChildren();if(film.image){const img=document.createElement('img');const imageValue=clean(film.image);img.src=/^(?:https?:)?\/\//i.test(imageValue)||imageValue.startsWith('/')?imageValue:(imageValue.startsWith('images/')?imageValue:`images/${imageValue}`);img.alt=`Affiche de ${film.title||'ce titre'}`;img.loading='lazy';img.onerror=()=>{poster.replaceChildren();poster.textContent='Affiche indisponible';};poster.append(img);}else{poster.textContent='Affiche à ajouter';}
  setStatus('Fiche affichée depuis le catalogue local.');window.scrollTo({top:0,behavior:'smooth'});
}
function renderResults(label, list) {
  const box=$('results');box.replaceChildren();box.classList.remove('hidden');const head=document.createElement('div');head.className='results-head';head.textContent=`${label} — ${list.length} résultat${list.length===1?'':'s'}`;box.append(head);
  if(!list.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='Aucun résultat.';box.append(empty);return;}
  list.slice(0,200).forEach(f=>{const item=document.createElement('div');item.className='result-item';item.tabIndex=0;item.setAttribute('role','button');const title=document.createElement('div');title.className='result-title';title.textContent=f.title||'Titre inconnu';const sub=document.createElement('div');sub.className='result-sub';sub.textContent=[f.original,f.year_original,f.duration?`${f.duration} min`:'',f.format].filter(Boolean).join(' · ');item.append(title,sub);const open=()=>showFilm(f);item.addEventListener('click',open);item.addEventListener('keydown',e=>{if(e.key==='Enter'){open();}});box.append(item);});
}
function parseDurationQuery(query) {
  const q=normalizeText(query).replace(/\s+/g,'');
  if (/^\d{2,3}$/.test(q)) return Number(q);
  const hoursMinutes=/^(\d{1,2})h(\d{1,2})$/.exec(q);
  if(hoursMinutes && Number(hoursMinutes[2])<60) return Number(hoursMinutes[1])*60+Number(hoursMinutes[2]);
  const minutes=/^(\d{2,3})(?:mn|min|minutes?)$/.exec(q);
  if(minutes) return Number(minutes[1]);
  return null;
}
function runSearch(query, type=null) {
  const q=clean(query);if(!q){$('results').classList.add('hidden');return;}
  const selectedType = type || $('searchCriterion').value || 'all';
  const normalized=normalizeText(q);
  const durationTarget=selectedType==='duration'?parseDurationQuery(q):null;
  const fields={title:f=>f.title,original:f=>f.original,year:f=>String(f.year_original??''),director:f=>f.director,screenwriter:f=>f.screenwriter,cast:f=>f.cast,music:f=>f.music,support:f=>f.format,synopsis:f=>f.synopsis,bonus:f=>f.bonus,genre:f=>f.genre};
  const found=films.filter(f=>{
    if(selectedType==='duration') {
      const duration=Number(f.duration);
      if(durationTarget===null) return false;
      return Number.isFinite(duration) && duration>0 && duration>=durationTarget-5 && duration<=durationTarget+5;
    }
    if(selectedType==='all') return searchable(f).includes(normalized);
    if(selectedType==='support') return supportsFor(f).some(s=>normalizeText(s).includes(normalized)) || normalizeText(f.format).includes(normalized);
    return normalizeText(fields[selectedType]?.(f) || '').includes(normalized);
  });
  const labels={all:'Tous les champs',title:'Titre du film',original:'Titre original',year:'Année de production',duration:'Durée',director:'Réalisateur',screenwriter:'Scénariste',cast:'Acteurs / casting',music:'Musique',support:'Support',synopsis:'Synopsis',bonus:'Bonus',genre:'Genre'};
  const label=selectedType==='duration'&&durationTarget!==null?`Durée (${durationTarget-5} à ${durationTarget+5} min)`:labels[selectedType]||'Recherche';
  renderResults(`${label} : « ${q} »`,found);setStatus(`${found.length} résultat(s) trouvé(s).`);
}
function updateSearchPlaceholder() {
  const type=$('searchCriterion').value;
  const placeholders={title:'Ex. La Rivière de nos amours',original:'Ex. The Indian Fighter',year:'Ex. 1955',duration:'Ex. 88, 1h28 ou 88 min',director:'Nom du réalisateur',screenwriter:'Nom du scénariste',cast:'Nom d’un acteur',genre:'Ex. Western',music:'Nom du compositeur',support:'Ex. Blu-ray, DVD, 4K UHD',synopsis:'Mot ou expression du synopsis',bonus:'Mot ou expression des bonus',all:'Recherche dans tous les champs'};
  $('searchInput').placeholder=placeholders[type]||'Saisir un terme…';
}

async function init() {
  try {
    const response=await fetch('data/films.json');if(!response.ok)throw new Error(`Erreur HTTP ${response.status}`);
    const data=await response.json();if(!Array.isArray(data))throw new Error('Le fichier JSON doit contenir une liste de titres.');
    films=data.map((f,i)=>({...f,_internalId:`title-${i}`}));
    renderStats();renderCatalog();setStatus(`${films.length} titres chargés depuis le fichier de test Excel.`);
    restoreFilmFromHash();
  } catch(error) {
    console.error(error);setStatus('Impossible de charger data/films.json. Vérifiez que les fichiers ont bien été ajoutés au dépôt GitHub.');$('catalogList').textContent='Le catalogue ne peut pas être chargé. Vérifiez le fichier data/films.json.';
  }
}
$('catalogButton').addEventListener('click',()=>{
  if (window.location.hash.startsWith('#film=')) history.replaceState(null, '', window.location.pathname + window.location.search);
  showView('catalog');
});
window.addEventListener('hashchange', () => {
  if (!window.location.hash.startsWith('#film=')) {
    currentFilm = null;
    showView('catalog');
    return;
  }
  restoreFilmFromHash();
});
$('homeButton').addEventListener('click',()=>showView('home'));
$('searchButton').addEventListener('click',()=>runSearch($('searchInput').value));
$('searchInput').addEventListener('keydown',e=>{if(e.key==='Enter')runSearch($('searchInput').value);});
$('searchCriterion').addEventListener('change',updateSearchPlaceholder);
updateSearchPlaceholder();
$('loadMoreButton').addEventListener('click',()=>{visibleCount+=PAGE_SIZE;renderCatalog();});
$('clearFilterButton').addEventListener('click',()=>{activeSupport='';visibleCount=PAGE_SIZE;renderStats();renderCatalog();});
init();
