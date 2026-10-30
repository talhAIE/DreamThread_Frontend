import { assets } from '../assets.js';
import { art } from '../data/fixtures.js';

export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
export const icon = filename => `<img src="assets/figma/${filename}.svg" alt="" class="icon">`;
export const dateText = (iso, year = true) => new Intl.DateTimeFormat('en-US',{ month:'short',day:'numeric',...(year ? {year:'numeric'} : {}),timeZone:'UTC' }).format(new Date(iso + 'T00:00:00Z'));
export function tag(label) {
  const color = ['Forest','Freedom','Calm'].includes(label) ? 'teal' : ['Ocean','Mystery','Doors','Curious','Uneasy'].includes(label) ? 'blue' : ['Fear','Being watched'].includes(label) ? 'rose' : '';
  return `<span class="tag ${color}">${escapeHTML(label)}</span>`;
}
export const tags = labels => `<div class="tags">${labels.map(tag).join('')}</div>`;
export const brand = () => `<a class="brand" href="#/home" aria-label="DreamThread home">${icon('ef6b9')}<span>DreamThread</span></a>`;

export function shell(active, title, subtitle, content, { query = '', mainClass = '' } = {}) {
  const nav = [['home','Home','ff95f','95453'],['journal','Journal','6a614','db413'],['constellation','Constellation','95736','78729'],['detective','Dream Detective','566a0','08569']];
  return `<div class="app-frame">
    <aside class="sidebar" aria-label="Main navigation">${brand()}<nav>${nav.map(([route,label,normal,selected]) => `<a href="#/${route}" class="nav-link ${active===route?'active':''}" ${active===route?'aria-current="page"':''} title="${label}">${icon(active===route?selected:normal)}<span>${label}</span></a>`).join('')}</nav>
      <a class="nav-link" href="#/insights">Insights</a><a class="nav-link" href="#/memory">Personal memory</a><a class="nav-link settings-link" href="#/settings" title="Settings">${icon('e9aa0')}<span>Settings</span></a>
    </aside>
    <main class="main ${mainClass}" id="main-content">
      <header class="topbar"><div><div class="page-title"><button class="mobile-menu" data-action="menu" aria-label="Toggle navigation" aria-expanded="false">☰</button><h1 tabindex="-1">${escapeHTML(title)}</h1></div>${subtitle ? `<p class="subtitle">${escapeHTML(subtitle)}</p>`:''}</div>
        <div class="top-actions"><form class="search" role="search" id="search-form">${icon('4a9db')}<label class="sr-only" for="global-search">Search dreams</label><input id="global-search" name="query" type="search" placeholder="Search dreams…" value="${escapeHTML(query)}" autocomplete="off"></form><a class="avatar" href="#/settings" aria-label="Account settings" title="Account settings">D</a></div>
      </header>${content}
    </main></div>`;
}

export function dreamCard(d, saved = false) {
  return `<article class="dream-card panel" data-dream="${d.id}">
    <a href="#/dream/${d.id}" class="card-image" aria-label="Read ${escapeHTML(d.title)}"><img src="${art[d.art]}" data-art="${d.art}" alt="" loading="eager"></a>
    <details class="entry-menu"><summary class="card-menu" aria-label="Actions for ${escapeHTML(d.title)}">···</summary><div class="entry-options"><a href="#/dream/${d.id}">Read dream</a><button data-save="${d.id}">${saved?'Remove from':'Save to'} personal memory</button></div></details>
    <div class="card-copy"><h3><a href="#/dream/${d.id}">${escapeHTML(d.title)}</a></h3><p class="card-meta">${dateText(d.date)} · ${d.type}</p><p class="card-excerpt">${escapeHTML(d.excerpt)}</p>${tags(d.tags)}</div>
  </article>`;
}

export function sourceRow({ id, title, date, image, quote = false }) {
  return `<a class="source" href="#/dream/${id}"><img class="source-thumb" src="${art[image]}" alt=""><span class="source-copy"><time>${escapeHTML(date)}</time><span class="source-title">${quote?'“':''}${escapeHTML(title)}${quote?'”':''}</span></span></a>`;
}

export function emptyResults(memory = false) {
  return `<div class="panel empty-results"><h2>${memory?'Your personal memory':'No matching dreams'}</h2><p>${memory?'Save a dream from its ··· menu to collect it here. This collection is stored on this device.':'Try another search or clear the filters to see your journal.'}</p>${memory?'':'<button class="button compact" data-action="clear-filters" style="margin-top:18px">Clear filters</button>'}</div>`;
}

// Retain the exact generated screen-to-asset binding for audit and future phases.
export { assets };
