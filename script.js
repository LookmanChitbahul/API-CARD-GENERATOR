// script.js — single-call fun-facts + title extraction + robust logging

// Endpoints (keep as HTTPS)
const MOT_BASE = 'https://62859b3f-a13c-4f4f-bb69-66ab5bf6ee06-00-28rysu4yb3bg.spock.replit.dev:3000/api/motivation';
const DAD_BASE = 'https://913387d7-0eb3-4599-96f0-772a3e360312-00-3vtig4shz731w.riker.replit.dev/api/dadjokes';
const FUN_BASE = 'https://fun-fact-generator-backend-new.onrender.com/funfact';

// Dev proxy fallback - replace for production
const PROXY = 'https://api.allorigins.win/raw?url=';

// fetch with fallback (direct then proxy)
async function fetchWithFallback(url) {
  if (!url) return { ok: false, error: 'empty url' };
  try {
    console.log('[fetch] direct ->', url);
    const r = await fetch(url);
    if (!r.ok) throw new Error('network ' + r.status);
    const text = await r.text();
    try { return { ok: true, via: 'direct', data: JSON.parse(text) }; }
    catch (e) { return { ok: true, via: 'direct', data: text }; }
  } catch (err) {
    console.warn('[fetch] direct failed, trying proxy ->', err.message);
    try {
      const proxyUrl = PROXY + encodeURIComponent(url);
      console.log('[fetch] proxy ->', proxyUrl);
      const r2 = await fetch(proxyUrl);
      if (!r2.ok) throw new Error('proxy ' + r2.status);
      const text2 = await r2.text();
      try { return { ok: true, via: 'proxy', data: JSON.parse(text2) }; }
      catch (e) { return { ok: true, via: 'proxy', data: text2 }; }
    } catch (err2) {
      console.error('[fetch] proxy failed ->', err2.message);
      return { ok: false, error: err2.message };
    }
  }
}

function pretty(obj) {
  if (obj === null || obj === undefined) return String(obj);
  if (typeof obj === 'string') return obj;
  try { return JSON.stringify(obj, null, 2); } catch (e) { return String(obj); }
}

const MOT_CATEGORY_MAP = {
  'work&career': 'Work & Career',
  'health&fitness': 'Health & Fitness',
  'lifeandgrowth': 'Life and Growth',
  'success&achievement': 'Success & Achievement'
};

function $(id) { return document.getElementById(id); }

function extractTitleFromFact(fact) {
  if (!fact) return '';
  if (typeof fact !== 'string') return pretty(fact);
  // 1) Markdown bold
  const mdMatch = fact.match(/\*\*(.+?)\*\*/);
  if (mdMatch && mdMatch[1]) return mdMatch[1].trim();
  // 2) HTML <strong> or <b>
  const htmlMatch = fact.match(/<\s*(?:strong|b)[^>]*>(.*?)<\/\s*(?:strong|b)\s*>/i);
  if (htmlMatch && htmlMatch[1]) return htmlMatch[1].trim();
  // 3) first non-empty line
  const lines = fact.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if (lines.length) {
    const line = lines[0];
    const sentEnd = line.search(/[\.!?]/);
    if (sentEnd > 1) return line.slice(0, sentEnd).trim();
    return line.length <= 120 ? line : line.slice(0, 120).trim() + '…';
  }
  return fact.slice(0, 120).trim() + '…';
}

// MOTIVATION
async function handleGenerateMotivation() {
  const out = $('out-motivation'); if (!out) return console.error('Missing out-motivation');
  const sel = $('mot-category'); if (!sel) return out.textContent = 'Missing category selector';
  out.textContent = 'Loading...';

  const cat = MOT_CATEGORY_MAP[sel.value] || sel.value || '';
  const url = `${MOT_BASE}?category=${encodeURIComponent(cat)}`;
  const res = await fetchWithFallback(url);
  if (!res.ok) { out.textContent = 'Error: ' + res.error; console.error(res.error); return; }

  const data = res.data;
  let display = null;
  if (data && typeof data === 'object') display = data.quote || data.motivation || data.text || data.message || data.content || data;
  else display = data;

  out.innerHTML = '';
  const meta = document.createElement('div'); meta.style.color = '#9aa4b2'; meta.style.fontSize = '12px'; meta.textContent = 'fetched via: ' + res.via;
  const pre = document.createElement('pre'); pre.textContent = pretty(display);
  out.appendChild(meta);
  out.appendChild(pre);
}

// DAD JOKE
async function handleGenerateDadJoke() {
  const out = $('out-dadjoke'); if (!out) return console.error('Missing out-dadjoke');
  out.textContent = 'Loading...';

  const res = await fetchWithFallback(DAD_BASE);
  if (!res.ok) { out.textContent = 'Error: ' + res.error; console.error(res.error); return; }
  const data = res.data;

  let title = null, body = null;
  if (!data) { out.textContent = 'No data returned'; return; }

  if (typeof data === 'string') title = data;
  else if (Array.isArray(data) && data.length > 0) {
    const item = data[0];
    title = item.title || item.joke || item.setup || item.id || pretty(item);
    body = item.punchline || item.body || item.content || item.answer || null;
  } else if (typeof data === 'object') {
    title = data.title || data.setup || data.joke || data.message || null;
    body = data.punchline || data.body || data.content || data.answer || null;
    if (!title && typeof data.data === 'string') title = data.data;
  } else title = String(data);

  out.innerHTML = '';
  const meta = document.createElement('div'); meta.style.color = '#9aa4b2'; meta.style.fontSize = '12px'; meta.textContent = 'fetched via: ' + res.via;
  out.appendChild(meta);
  if (title) {
    const t = document.createElement('div'); t.style.fontWeight = '700'; t.style.marginTop = '8px'; t.textContent = title; out.appendChild(t);
  }
  if (body) {
    const b = document.createElement('div'); b.style.marginTop = '6px'; b.textContent = body; out.appendChild(b);
  }
}

// FUN FACTS (single call)
async function handleGenerateFunFacts() {
  const out = $('out-funfact');
  const listEl = $('out-funfact-list');
  const metaLine = $('funfact-meta');
  const sel = $('fun-category');
  if (!out || !listEl) return console.error('Missing funfact elements');
  if (!sel) return out.textContent = 'Missing fun fact category selector';

  out.querySelectorAll('li').forEach(n => n.remove());
  metaLine.textContent = 'Loading…';

  const url = `${FUN_BASE}?theme=${encodeURIComponent(sel.value || 'random')}`;
  const res = await fetchWithFallback(url);
  if (!res.ok) { metaLine.textContent = 'Error: ' + res.error; console.error(res.error); return; }

  // Parse facts from the response
  let facts = [];
  if (res.data && typeof res.data === 'object') {
    if (Array.isArray(res.data.facts)) facts = res.data.facts;
    else if (Array.isArray(res.data)) facts = res.data;
    else if (typeof res.data.facts === 'string') facts = [res.data.facts];
  } else if (typeof res.data === 'string') {
    // sometimes the server returns stringified JSON
    try {
      const parsed = JSON.parse(res.data);
      if (parsed && Array.isArray(parsed.facts)) facts = parsed.facts;
      else if (Array.isArray(parsed)) facts = parsed;
      else facts = [parsed || res.data];
    } catch (e) {
      // fallback: treat the string as a single fact
      facts = [res.data];
    }
  } else {
    facts = [String(res.data)];
  }

  // Build bullet list of titles (only)
  listEl.innerHTML = '';
  for (const f of facts) {
    const title = extractTitleFromFact(f);
    const li = document.createElement('li');
    li.textContent = title || '(untitled fact)';
    listEl.appendChild(li);
  }

  metaLine.textContent = 'fetched via: ' + (res.via || 'unknown');
}

// COPY handler
async function handleCopy(targetId, btn) {
  const el = $(targetId);
  if (!el) return;
  try {
    if (targetId === 'out-funfact') {
      const list = $('out-funfact-list');
      if (list) {
        const texts = Array.from(list.children).map(li => li.textContent.trim());
        await navigator.clipboard.writeText(texts.join('\n'));
        btn.textContent = 'Copied!'; setTimeout(()=>btn.textContent='Copy', 1200);
        return;
      }
    }
    await navigator.clipboard.writeText(el.innerText);
    btn.textContent = 'Copied!'; setTimeout(()=>btn.textContent='Copy', 1200);
  } catch (e) {
    console.error('copy failed', e);
    btn.textContent = 'Failed'; setTimeout(()=>btn.textContent='Copy', 1200);
  }
}

// attach listeners
function attachListeners() {
  const genMot = $('gen-mot'); if (genMot) genMot.addEventListener('click', () => handleGenerateMotivation().catch(e=>console.error(e)));
  const genDad = $('gen-dadjoke'); if (genDad) genDad.addEventListener('click', () => handleGenerateDadJoke().catch(e=>console.error(e)));
  const genFun = $('gen-funfact'); if (genFun) genFun.addEventListener('click', () => handleGenerateFunFacts().catch(e=>console.error(e)));

  document.querySelectorAll('.copy').forEach(btn => {
    btn.addEventListener('click', () => handleCopy(btn.dataset.target, btn));
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attachListeners); else attachListeners();