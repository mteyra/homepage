import { profile, completedProjects, publicArchive } from './content.js';
import { setupTerminal } from './terminal.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let paused = motionQuery.matches;
try { const saved = sessionStorage.getItem('marc.motion'); if (saved !== null) paused = saved === 'paused'; } catch {}
let sharedNavigation = false;
let world = null, activeView = 'home', selectedProject = 'aloha', selectedExperience = null, sceneGeneration = 0;
const ALOHA = 'https://clschulzer.github.io/Aloha-Robotics-HH2.0/';
const projects = {
  aloha: {
    title: 'Aloha Robotics', kind: 'TEAM HACKATHON / 2026',
    summary: 'C-ARMAGOTCHI: a playful interface for medical-device maintenance. A team prototype with simulated clinical workflows.',
    role: 'My contributions: phone app, interactive presentation, arcade & website.',
    source: 'https://github.com/clschulzer/Aloha-Robotics-HH2.0',
    experiences: [
      { id:'pitch', label:'Pitch · click to advance', url:ALOHA+'Presentation/hackathon/?s=3', title:'Aloha Robotics interactive hackathon presentation' },
      { id:'website', label:'Website', url:ALOHA+'Website/', title:'Aloha Robotics project website' },
      { id:'care', label:'Companion', url:ALOHA+'Care-Companion/', title:'C-ARMAGOTCHI care companion simulation' },
      { id:'phone', label:'Phone', url:ALOHA+'Care-Companion/phone/', title:'Aloha Robotics phone companion demo' },
      { id:'arcade', label:'Arcade', url:ALOHA+'C-Arcade/', title:'Aloha Robotics C-Arcade games' },
    ],
    report:'https://github.com/clschulzer/Aloha-Robotics-HH2.0/blob/0252cc55b27ff7e4f4be42e6c6b8ef458e3f5bf1/Documentation/architecture-options/sim/results/RESULTS.md',
  },
  nixcare: {
    title:'Nixcare', kind:'OPEN SOURCE / RELEASED',
    summary:'A maintenance and diagnostics tool I built for NixOS. Explore the actual project website, commands and documentation.',
    role:'Creator & maintainer. Python / Nix.',
    source:'https://github.com/mteyra/nixcare',
    experiences:[{ id:'website', label:'Project website', url:'https://mteyra.github.io/nixcare/', title:'Nixcare project website and documentation' }],
  },
  nixos: {
    title:'My NixOS configuration', kind:'PUBLIC REPOSITORY / PERSONAL SYSTEM',
    summary:'The configuration behind my ThinkPad: NixOS, Hyprland and Noctalia. A living repository for the system I use every day.',
    role:'Personal configuration. Nix / Python / Shell.',
    source:'https://github.com/mteyra/nixos-config',
    experiences:[{ id:'source', label:'flake.nix / source excerpt', url:'https://github.com/mteyra/nixos-config/blob/master/flake.nix#L38-L58', title:'Source from my NixOS configuration', source:true }],
  },
};

function node(tag, text, className) { const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(className)n.className=className; return n; }
function external(label,url,className) { const a=node('a',label,className);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a; }
function announce(message){ $('#announcer').textContent=message; }
function navigate(path){ if(location.hash.slice(1)===path)route();else location.hash=path; }
function route(){
  let hash='';try{hash=decodeURIComponent(location.hash.slice(1));}catch{}
  const [wanted,projectId]=hash.split('/');
  const view=['home','work','about','travel'].includes(wanted)?wanted:'home';
  const changed=view!==activeView;
  if(!sharedNavigation)document.body.classList.remove('shared-arrived');
  activeView=view;document.body.dataset.view=view;
  $$('[data-panel]').forEach(p=>{p.hidden=p.dataset.panel!==view;});
  $$('[data-nav]').forEach(a=>{if(a.dataset.nav===view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  $('#view-label').textContent={home:'00 / HOME',work:'01 / WORK',about:'02 / ABOUT',travel:'03 / ELSEWHERE'}[view];
  world?.focus(view);
  if(view==='work'){const id=Object.hasOwn(projects,projectId)?projectId:selectedProject;selectProject(id,changed||id!==selectedProject);}
  else if(changed){$('#browser-screen').replaceChildren();selectedExperience=null;sceneGeneration++;}
  if(view==='travel')renderRoutes();
  if(changed){window.scrollTo({top:0,behavior:'instant'});$('#main').focus({preventScroll:true});announce({home:'Marc Teyra. Home.',work:'Selected projects. Choose a project to explore.',about:'About Marc. Work, study and CV.',travel:'Elsewhere. Travel journal.'}[view]);}
}
function selectProject(id,force=false){
  selectedProject=id;const p=projects[id];
  $$('[data-project]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.project===id)));
  $('#project-name').textContent=p.title;$('#project-kind').textContent=p.kind;$('#project-summary').textContent=p.summary;$('#project-role').textContent=p.role;$('#project-source').href=p.source;
  if(!force&&selectedExperience)return;
  const tabs=$('#window-tabs');tabs.replaceChildren();
  for(const experience of p.experiences){const b=node('button',experience.label);b.dataset.experience=experience.id;b.addEventListener('click',()=>showExperience(experience));tabs.append(b);}
  if(p.report)tabs.append(external('Team report ↗',p.report));
  showExperience(p.experiences[0]);
  if(!paused&&!motionQuery.matches){$('#browser-window').animate([{opacity:.3,transform:'rotateY(-8deg) translateY(18px) scale(.97)'},{opacity:1,transform:'none'}],{duration:750,easing:'cubic-bezier(.22,1,.36,1)'});$('.project-caption').animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:600});}
}
async function showExperience(experience){
  const generation=++sceneGeneration;selectedExperience=experience.id;
  $$('[data-experience]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.experience===experience.id)));
  const screen=$('#browser-screen');screen.replaceChildren();
  $('#window-address').textContent=experience.source?'mteyra / nixos-config / flake.nix':new URL(experience.url).hostname+new URL(experience.url).pathname.replace(/\/$/,'');
  $('#window-external').href=experience.url;
  if(experience.source){
    const surface=node('div',undefined,'source-surface');surface.append(node('p','NIXOS-CONFIG / FLAKE.NIX · LINES 38–58','eyebrow'),node('h4','The system, in source.'));
    const pre=node('pre','Loading source…');surface.append(pre,external('Continue in the repository ↗',experience.url));screen.append(surface);
    try{const res=await fetch('assets/nixos-source.txt');if(!res.ok)throw Error();const text=await res.text();if(generation===sceneGeneration)pre.textContent=text;}catch{if(generation===sceneGeneration)pre.textContent='The source is available in the repository below.';}
    return;
  }
  const poster=document.createElement('img');poster.className='window-poster';poster.alt='';poster.src='assets/previews/'+(selectedProject==='nixcare'?'nixcare':{pitch:'aloha-pitch',website:'aloha-website',care:'aloha-care',phone:'aloha-phone',arcade:'aloha-arcade'}[experience.id])+'.webp';screen.append(poster);
  const loading=node('div',undefined,'window-loading');loading.append(node('span',undefined,'loader-ring'),node('span','Opening '+projects[selectedProject].title+'…'));screen.append(loading);
  const frame=document.createElement('iframe');frame.title=experience.title;frame.src=experience.url;frame.referrerPolicy='no-referrer';frame.allow='fullscreen';frame.setAttribute('allowfullscreen','');
  // These allowlisted public sites are loaded as separate origins. No credentials,
  // coordinates or local files are sent to them by the homepage.
  frame.addEventListener('load',()=>{if(generation!==sceneGeneration)return;loading.remove();poster.remove();if(!paused&&!motionQuery.matches)frame.animate([{opacity:0},{opacity:1}],{duration:500});},{once:true});
  if(generation===sceneGeneration)screen.append(frame);
}

// State-preserving moves keep live demos running in browsers that support moveBefore.
const projectDialog=node('dialog',undefined,'project-dialog');projectDialog.setAttribute('aria-label','Expanded project');document.body.append(projectDialog);
const windowHome=$('.work-stage');
function closeProjectFocus(){if(projectDialog.open)projectDialog.close();}
$('#expand-window').addEventListener('click',()=>{
  if(projectDialog.open){closeProjectFocus();return;}
  const win=$('#browser-window');if(projectDialog.moveBefore)projectDialog.moveBefore(win,null);else projectDialog.append(win);win.classList.add('expanded');$('#expand-window').textContent='×';$('#expand-window').setAttribute('aria-label','Close expanded project');document.body.classList.add('has-expanded');projectDialog.showModal();
});
projectDialog.addEventListener('close',()=>{const win=$('#browser-window');win.classList.remove('expanded');if(windowHome.moveBefore)windowHome.moveBefore(win,windowHome.firstChild);else windowHome.prepend(win);$('#expand-window').textContent='⛶';$('#expand-window').setAttribute('aria-label','Expand project window');document.body.classList.remove('has-expanded');$('#expand-window').focus({preventScroll:true});});
window.addEventListener('hashchange',()=>{closeProjectFocus();route();});
async function openProject(id, card) {
  if(activeView!=='home'||paused||motionQuery.matches||!document.startViewTransition||!card){navigate('work/'+id);return;}
  if(sharedNavigation)return;
  sharedNavigation=true;
  card.style.viewTransitionName='project-surface';
  let updated=false;
  const transition=document.startViewTransition(()=>{
    updated=true;
    card.style.viewTransitionName='';
    document.body.classList.add('shared-arrived');
    history.pushState({},'',location.pathname+location.search+'#work/'+id);
    route();
    $('#browser-window').style.viewTransitionName='project-surface';
  });
  const captureDeadline=setTimeout(()=>{if(!updated)transition.skipTransition();},450);
  try{await transition.finished;}catch{}finally{
    clearTimeout(captureDeadline);
    card.style.viewTransitionName='';
    $('#browser-window').style.viewTransitionName='';
    sharedNavigation=false;
  }
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-project]');
  if(b){openProject(b.dataset.project,b.closest('.orbit-window'));return;}
  if(e.target.closest('.enter-work')&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey){e.preventDefault();openProject('aloha',$('.orbit-front'));}
});

const catalog=$('#catalog');let catalogOpener=null;
function openCatalog(){catalogOpener=document.activeElement;catalog.showModal();}
$('#open-catalog').addEventListener('click',openCatalog);$('.close-dialog',catalog).addEventListener('click',()=>catalog.close());catalog.addEventListener('close',()=>{if(catalogOpener?.isConnected&&!catalogOpener.closest('[hidden]'))catalogOpener.focus({preventScroll:true});});
const catalogItems=[
  {title:'Hack-A-Bot',type:'Team hackathon · 2026 · Second place',text:'Led the team, built the gesture interface and led the final pitch for a humanoid robot concept in the cath lab.',url:profile.cvPdf,label:'In my CV ↗'},
  ...completedProjects,
  ...publicArchive.filter(p=>!p.type.includes('in progress')),
];
for(const item of catalogItems){const row=node('article',undefined,'catalog-item');const title=node('div');title.append(node('h3',item.title),node('small',item.type));const detail=node('div');detail.append(node('p',item.text));if(item.url)detail.append(external(item.label||'Open repository ↗',item.url));row.append(title,detail);$('#catalog-list').append(row);}
for(const item of profile.experience){const div=node('div',undefined,'fold-item');div.append(node('strong',item.title),node('small',item.type),node('p',item.text));$('#experience-list').append(div);}
for(const item of profile.credentials){const div=node('div',undefined,'fold-item');div.append(external(item.title+' ↗',item.url),node('small',item.institution));$('#credential-list').append(div);}
setupTerminal({navigate,openCatalog});

function updateMotion(){document.body.classList.toggle('motion-paused',paused);$('#motion-toggle').setAttribute('aria-pressed',String(paused));$('#motion-label').textContent=paused?'PLAY MOTION':'PAUSE MOTION';$('.motion-icon').textContent=paused?'▷':'Ⅱ';world?.setPaused(paused);}
$('#motion-toggle').addEventListener('click',()=>{paused=!paused;try{sessionStorage.setItem('marc.motion',paused?'paused':'playing');}catch{}updateMotion();});
motionQuery.addEventListener('change',e=>{paused=e.matches;updateMotion();});
let pointerFrame=0,pointerX=0,pointerY=0;
window.addEventListener('pointermove',e=>{if(paused||activeView!=='home'||e.pointerType==='touch')return;pointerX=(e.clientX/innerWidth-.5)*2;pointerY=(e.clientY/innerHeight-.5)*2;if(!pointerFrame)pointerFrame=requestAnimationFrame(()=>{$('.project-orbit').style.setProperty('--px',pointerX.toFixed(3));$('.project-orbit').style.setProperty('--py',pointerY.toFixed(3));pointerFrame=0;});},{passive:true});
document.addEventListener('visibilitychange',()=>world?.setActive(!document.hidden));

function readRoutes(){
  if(new URLSearchParams(location.search).get('atlas')!=='preview')return null;
  try{const raw=sessionStorage.getItem('nomad.previewRoutes');if(!raw||raw.length>5*1024*1024)return null;const fc=JSON.parse(raw);if(fc.type!=='FeatureCollection'||!Array.isArray(fc.features)||!fc.features.length||fc.features.length>3000)return null;let total=0;return fc.features.map(f=>{const a=f.geometry?.coordinates;if(f.geometry?.type!=='LineString'||!Array.isArray(a)||a.length<2)throw Error();total+=a.length;if(total>60000||!a.every(p=>Array.isArray(p)&&p.length>=2&&p.slice(0,2).every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90))throw Error();return a.map(p=>p.slice(0,2));});}catch{return null;}
}
function renderRoutes(){
  const routes=readRoutes();$('#route-preview').hidden=!routes;if(!routes)return;
  const svg=$('#route-map');svg.replaceChildren();let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  const projected=routes.map(route=>route.map(([lon,lat])=>{const x=lon;const y=-Math.log(Math.tan(Math.PI/4+Math.min(85,Math.max(-85,lat))*Math.PI/360))*180/Math.PI;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);return[x,y];}));
  const scale=Math.min(550/Math.max(.001,maxX-minX),300/Math.max(.001,maxY-minY));const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
  for(const line of projected){const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',line.map(([x,y],i)=>(i?'L':'M')+(300+(x-cx)*scale).toFixed(2)+','+(175+(y-cy)*scale).toFixed(2)).join(' '));svg.append(path);}
  $('#route-caption').textContent=routes.length+' route segment'+(routes.length===1?'':'s')+' · This browser tab only. Nothing published.';
}
$('#clear-routes').addEventListener('click',()=>{try{sessionStorage.removeItem('nomad.previewRoutes');}catch{}const url=new URL(location.href);url.searchParams.delete('atlas');history.replaceState({},'',url.pathname+url.search+'#travel');renderRoutes();announce('Local route preview cleared.');});

$('.header-tools kbd').textContent=/Mac|iPhone|iPad/.test(navigator.platform)?'⌘ K':'Ctrl K';
updateMotion();route();
// Navigation and content remain usable even when WebGL cannot start.
import('./signal-world.js').then(({createSignalWorld})=>{world=createSignalWorld($('#signal'),{onReady:()=>document.body.classList.add('world-ready'),onUnavailable:()=>document.body.classList.add('world-unavailable')});world.focus(activeView);world.setPaused(paused);world.setActive(!document.hidden);}).catch(()=>document.body.classList.add('world-unavailable'));
