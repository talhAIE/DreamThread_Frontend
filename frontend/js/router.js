const supported = new Set(['welcome','home','journal','dream','capture','constellation','detective','storyline']);
export function getRoute() {
  const [path, search = ''] = location.hash.slice(1).split('?');
  const [raw, id] = path.replace(/^\//,'').split('/');
  const name = raw || 'welcome';
  return { name: supported.has(name) ? name : 'not-found', id, params: new URLSearchParams(search) };
}
export function navigate(path) { location.hash = path; }
export function listen(onRoute) { window.addEventListener('hashchange', onRoute); }
