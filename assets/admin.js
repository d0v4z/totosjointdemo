/* Dummy restaurant admin panel. Config: window.ADMIN. Data lives in this browser's localStorage. */
(function () {
  const A = window.ADMIN, K = A.key, $ = s => document.querySelector(s), app = $('#app');
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const get = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { alert('Storage is full. Try a smaller photo.'); } };
  const ST = () => Object.assign({ delivery: A.delivery, rate: A.rate, paused: false, modes: { delivery: true, pickup: true, dinein: true }, hours: A.hours || '' }, get(K + '-settings', {}));
  const OV = () => get(K + '-menu', {});
  const ORD = () => get(K + '-orders', []);
  const saveOrd = o => put(K + '-orders', o);
  const rate = () => +ST().rate || A.rate;
  const usd = v => { v = A.base === 'usd' ? v : v / rate(); v = Math.round(v * 100) / 100; return '$' + (Number.isInteger(v) ? v : v.toFixed(2)); };
  const lbp = v => (A.base === 'lbp' ? v : Math.round(v * rate() / 1000) * 1000).toLocaleString('en-US') + ' LBP';
  const money = v => A.base === 'lbp' ? `${lbp(v)} <small>${usd(v)}</small>` : `${usd(v)} <small>${lbp(v)}</small>`;
  const img = p => !p ? '' : /^(data:|https?:|\.\.\/)/.test(p) ? p : '../' + p;
  const items = () => { const ov = OV(); return A.items.map(it => Object.assign({}, it, ov[it.id] || {}, { orig: it })); };
  const MODE = { delivery: 'Delivery', pickup: 'Pick up', dinein: 'Dine in' };
  const STATUS = { new: 'New', preparing: 'Preparing', ready: 'Ready', out: 'Out for delivery', done: 'Completed', cancelled: 'Cancelled' };
  const branchName = b => b || A.branches[0].n;
  let view = 'login', tab = 'orders', BR = null, sel = null, fStatus = 'active', fMode = 'all', q = '', mCat = 'all', mq = '';

  /* ---------- seed dummy orders once per branch ---------- */
  const NAMES = ['Ali Hamdan', 'Rana Khalil', 'Mohamad Itani', 'Lara Haddad', 'Hussein Fakih', 'Nour Saleh', 'Karim Daher', 'Maya Zein', 'Omar Sinno', 'Rawan Ghandour', 'Ziad Mansour', 'Hadi Shaar', 'Sara Kabbani', 'Bilal Yassine'];
  const NOTES = ['', '', '', 'No onions please', 'Extra sauce', 'Call when outside', 'Ring the bell twice', 'Spicy please'];
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  function seed(b) {
    const flag = K + '-seeded-' + b.n; if (get(flag, false)) return; put(flag, true);
    const all = ORD(), its = items().filter(i => !i.off), now = Date.now();
    const plan = ['new', 'new', 'preparing', 'preparing', 'ready', 'out', 'done', 'done', 'done', 'done', 'done', 'cancelled'];
    plan.forEach((s, i) => {
      const mode = A.modes.length > 1 ? rnd(s === 'out' ? ['delivery'] : A.modes) : A.modes[0];
      const lines = []; const n = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j < n; j++) { const it = rnd(its); const ex = lines.find(l => l.id === it.id); if (ex) ex.q++; else lines.push({ id: it.id, n: it.n, q: 1 + (Math.random() < .25 ? 1 : 0), p: it.p }); }
      const sub = lines.reduce((a, l) => a + l.p * l.q, 0), fee = mode === 'delivery' ? +ST().delivery : 0;
      const AGE = { new: [1, 6], preparing: [7, 18], ready: [18, 28], out: [25, 40], done: [45, 300], cancelled: [60, 200] }[s];
      const t = now - (AGE[0] + Math.random() * (AGE[1] - AGE[0])) * 60000;
      const log = [{ s: 'new', t }]; const order = ['preparing', 'ready', 'out', 'done'];
      if (s !== 'new' && s !== 'cancelled') order.slice(0, order.indexOf(s) + 1).forEach((x, k) => { if (x === 'out' && mode !== 'delivery') return; log.push({ s: x, t: Math.min(now - 30000, t + (k + 1) * 6 * 60000) }); });
      if (s === 'cancelled') log.push({ s: 'cancelled', t: t + 3 * 60000, why: 'Customer cancelled' });
      all.push({ no: String(1000 + Math.floor(Math.random() * 9000)), time: t, branch: b.n, mode, name: rnd(NAMES),
        phone: rnd(['70', '71', '76', '03', '81']) + ' ' + (100 + Math.floor(Math.random() * 900)) + ' ' + (100 + Math.floor(Math.random() * 900)),
        address: mode === 'delivery' ? rnd(b.areas || ['Main street']) + ', bldg ' + (1 + Math.floor(Math.random() * 30)) + ', floor ' + (1 + Math.floor(Math.random() * 8)) : '',
        table: mode === 'dinein' ? String(1 + Math.floor(Math.random() * 14)) : '', notes: rnd(NOTES), pay: Math.random() < .6 ? 'usd' : 'lbp',
        items: lines, sub, fee, total: sub + fee, status: s, log, prep: s === 'new' ? null : 20, driver: (s === 'out' || (s === 'done' && mode === 'delivery')) ? rnd(A.drivers) : '' });
    });
    all.sort((a, b2) => b2.time - a.time); saveOrd(all);
  }

  /* ---------- views ---------- */
  function render() {
    if (view === 'login') return renderLogin();
    if (view === 'branches') return renderBranches();
    renderApp();
  }
  function renderLogin() {
    app.innerHTML = `<div class="center"><form class="card login" id="lf">
      <img class="lg" src="${img(A.logo)}" alt=""><h1>${esc(A.name)}</h1><p class="mute">Admin panel <span class="demo">DEMO</span></p>
      <label>Email<input type="email" value="admin@${esc(A.domain || 'restaurant.lb')}" autocomplete="username"></label>
      <label>Password<input type="password" value="demo1234" autocomplete="current-password"></label>
      <button class="btn pri wide">Sign in</button><p class="mute sm">Demo login: any details work.</p></form></div>`;
    $('#lf').onsubmit = e => { e.preventDefault(); view = A.branches.length > 1 ? 'branches' : 'app'; if (view === 'app') pickBranch(A.branches[0]); render(); };
  }
  function renderBranches() {
    const o = ORD();
    app.innerHTML = `<div class="center"><div class="wrap-s"><div class="top-s"><img class="lg sm" src="${img(A.logo)}" alt=""><div><h1>Choose a branch</h1><p class="mute">Orders, menu and settings open for the branch you pick.</p></div></div>
      <div class="bgrid">${A.branches.map((b, i) => { const act = o.filter(x => branchName(x.branch) === b.n && ['new', 'preparing', 'ready', 'out'].includes(x.status)).length, nw = o.filter(x => branchName(x.branch) === b.n && x.status === 'new').length;
        return `<button class="card bcard" data-b="${i}" ${b.soon ? 'disabled' : ''}><b>${esc(b.n)}</b><span class="mute">${esc(b.area || '')}</span>
          ${b.soon ? '<span class="pill grey">Coming soon</span>' : `<span class="row"><span class="pill ${nw ? 'red' : 'grey'}">${nw} new</span><span class="pill grey">${act} active</span></span>`}</button>`; }).join('')}</div>
      <button class="btn ghost" id="lo">Sign out</button></div></div>`;
    app.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { pickBranch(A.branches[+b.dataset.b]); view = 'app'; render(); });
    $('#lo').onclick = () => { view = 'login'; render(); };
  }
  function pickBranch(b) { BR = b; seed(b); sel = null; }

  function renderApp() {
    const s = ST();
    app.innerHTML = `<header class="bar"><div class="brand"><img src="${img(A.logo)}" alt=""><div><b>${esc(A.name)}</b><span class="mute">${esc(BR.n)}${A.branches.length > 1 ? ' · <a href="#" id="swb">switch branch</a>' : ''}</span></div></div>
      <nav class="tabs">${['orders', 'menu', 'settings'].map(t => `<button data-t="${t}" class="${tab === t ? 'on' : ''}">${{ orders: 'Orders', menu: 'Menu', settings: 'Settings' }[t]}${t === 'orders' ? `<i id="newc"></i>` : ''}</button>`).join('')}</nav>
      <div class="barr"><label class="sw"><input type="checkbox" id="acc" ${s.paused ? '' : 'checked'}><span></span><em>${s.paused ? 'Paused' : 'Accepting orders'}</em></label><a class="btn ghost sm" href="${A.site}" target="_blank" rel="noopener">View site</a><button class="btn ghost sm" id="lo">Sign out</button></div></header>
      <main id="main"></main>`;
    app.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; renderApp(); });
    $('#acc').onchange = e => { const st = ST(); st.paused = !e.target.checked; put(K + '-settings', st); renderApp(); };
    $('#lo').onclick = () => { view = 'login'; render(); };
    if ($('#swb')) $('#swb').onclick = e => { e.preventDefault(); view = 'branches'; render(); };
    ({ orders: renderOrders, menu: renderMenu, settings: renderSettings })[tab]();
    badge();
  }
  function badge() { const n = ORD().filter(o => branchName(o.branch) === BR.n && o.status === 'new').length, c = $('#newc'); if (c) { c.textContent = n || ''; c.style.display = n ? '' : 'none'; } }

  /* ---------- ORDERS ---------- */
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min ago'; };
  const clock = t => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const isToday = t => new Date(t).toDateString() === new Date().toDateString();
  function nextLabel(o) {
    if (o.status === 'preparing') return 'Mark ready';
    if (o.status === 'ready') return o.mode === 'delivery' ? 'Out for delivery' : o.mode === 'dinein' ? 'Served' : 'Picked up';
    if (o.status === 'out') return 'Delivered';
    return '';
  }
  function renderOrders() {
    const mine = ORD().filter(o => branchName(o.branch) === BR.n), today = mine.filter(o => isToday(o.time)), ok = today.filter(o => o.status !== 'cancelled');
    const rev = ok.reduce((a, o) => a + o.total, 0);
    const counts = { active: 0, new: 0, preparing: 0, ready: 0, out: 0, done: 0, cancelled: 0, all: mine.length };
    mine.forEach(o => { counts[o.status]++; if (['new', 'preparing', 'ready', 'out'].includes(o.status)) counts.active++; });
    const top = {}; ok.forEach(o => o.items.forEach(l => top[l.n] = (top[l.n] || 0) + l.q));
    const topItem = Object.entries(top).sort((a, b) => b[1] - a[1])[0];
    let list = mine.filter(o => fStatus === 'all' ? true : fStatus === 'active' ? ['new', 'preparing', 'ready', 'out'].includes(o.status) : o.status === fStatus)
      .filter(o => fMode === 'all' || o.mode === fMode)
      .filter(o => !q || (o.no + ' ' + o.name + ' ' + o.phone).toLowerCase().includes(q.toLowerCase()));
    if (fStatus === 'active') { const rank = { new: 0, ready: 1, preparing: 2, out: 3 }; list.sort((a, b) => rank[a.status] - rank[b.status] || a.time - b.time); }
    const cur = list.find(o => o.no === sel) || null;
    $('#main').innerHTML = `
      <section class="stats"><div class="card"><span class="mute">Orders today</span><b>${today.length}</b></div><div class="card"><span class="mute">Revenue today</span><b>${A.base === 'lbp' ? lbp(rev) : usd(rev)}</b><small class="mute">${A.base === 'lbp' ? usd(rev) : lbp(rev)}</small></div>
        <div class="card"><span class="mute">Average order</span><b>${ok.length ? (A.base === 'lbp' ? usd(rev / ok.length) : usd(rev / ok.length)) : '—'}</b></div><div class="card"><span class="mute">Top item today</span><b class="sm">${topItem ? esc(topItem[0]) + ' ×' + topItem[1] : '—'}</b></div></section>
      <section class="toolbar">
        <div class="seg">${['active', 'new', 'preparing', 'ready', ...(A.modes.includes('delivery') ? ['out'] : []), 'done', 'cancelled', 'all'].map(k => `<button data-s="${k}" class="${fStatus === k ? 'on' : ''}">${k === 'active' ? 'Active' : k === 'all' ? 'All' : STATUS[k]} <i>${counts[k]}</i></button>`).join('')}</div>
        <div class="row"><select id="fm"><option value="all">All types</option>${A.modes.map(m => `<option value="${m}" ${fMode === m ? 'selected' : ''}>${MODE[m]}</option>`).join('')}</select>
        <input id="qs" type="search" placeholder="Search #, name or phone" value="${esc(q)}"><button class="btn ghost sm" id="sim">+ Test order</button></div>
      </section>
      <section class="split ${cur ? 'has-sel' : ''}">
        <div class="olist">${list.length ? list.map(o => `<button class="ocard ${o.no === sel ? 'sel' : ''} st-${o.status}" data-o="${o.no}">
            <div class="r1"><b>#${o.no}</b><span class="pill st-${o.status}">${STATUS[o.status]}</span></div>
            <div class="r2"><span>${esc(o.name)}</span><span class="mute">${MODE[o.mode]}${o.mode === 'dinein' && o.table ? ' · T' + esc(o.table) : ''}</span></div>
            <div class="r3"><span class="mute">${clock(o.time)} · ${ago(o.time)}</span><b>${A.base === 'lbp' ? lbp(o.total) : usd(o.total)}</b></div>
            ${o.fromSite && o.status === 'new' ? '<span class="pill blue">from website</span>' : ''}</button>`).join('') : '<p class="empty mute">No orders here.</p>'}</div>
        <div class="odetail">${cur ? detail(cur) : '<p class="empty mute">Select an order to see the details.</p>'}</div>
      </section>`;
    $('#main').querySelectorAll('[data-s]').forEach(b => b.onclick = () => { fStatus = b.dataset.s; renderOrders(); });
    $('#fm').onchange = e => { fMode = e.target.value; renderOrders(); };
    $('#qs').oninput = e => { q = e.target.value; const p = e.target.selectionStart; renderOrders(); const i = $('#qs'); i.focus(); i.setSelectionRange(p, p); };
    $('#sim').onclick = () => { simulate(); renderOrders(); badge(); };
    $('#main').querySelectorAll('[data-o]').forEach(b => b.onclick = () => { sel = b.dataset.o; renderOrders(); if (innerWidth < 900) scrollTo(0, 0); });
    if (cur) bindDetail(cur);
  }
  function detail(o) {
    const last = o.log[o.log.length - 1];
    return `<div class="dhead"><button class="btn ghost sm back" id="back">← Orders</button><div><h2>Order #${o.no}</h2><span class="mute">${new Date(o.time).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })} · ${ago(o.time)}</span></div><span class="pill big st-${o.status}">${STATUS[o.status]}</span></div>
      <div class="dgrid">
        <div class="card"><h4>${MODE[o.mode]}</h4>
          <p><b>${esc(o.name)}</b></p><p><a href="tel:${esc(o.phone.replace(/\s/g, ''))}">${esc(o.phone)}</a></p>
          ${o.mode === 'delivery' ? `<p>${esc(o.address)}</p>` : ''}${o.mode === 'dinein' ? `<p>Table <b>${esc(o.table || '—')}</b></p>` : ''}
          ${o.notes ? `<p class="note">Note: ${esc(o.notes)}</p>` : ''}
          <p class="mute">Pays cash in ${o.pay === 'usd' ? 'USD' : 'LBP'}${o.prep ? ' · Prep time ' + o.prep + ' min' : ''}${o.driver ? ' · Driver: ' + esc(o.driver) : ''}</p></div>
        <div class="card"><h4>Items</h4><table class="it">${o.items.map(l => `<tr><td class="q">${l.q}×</td><td>${esc(l.n)}</td><td class="r">${A.base === 'lbp' ? lbp(l.p * l.q) : usd(l.p * l.q)}</td></tr>`).join('')}</table>
          <div class="tot"><span>Subtotal</span><span>${money(o.sub)}</span></div><div class="tot"><span>Delivery</span><span>${o.fee ? money(o.fee) : 'Free'}</span></div>
          <div class="tot grand"><span>Total</span><span>${money(o.total)}</span></div></div>
      </div>
      <div class="actions">${actions(o)}</div>
      <div class="card"><h4>Timeline</h4><ol class="tl">${o.log.map(l => `<li><b>${STATUS[l.s]}</b><span class="mute">${clock(l.t)}${l.why ? ' · ' + esc(l.why) : ''}${l.prep ? ' · ' + l.prep + ' min' : ''}${l.driver ? ' · ' + esc(l.driver) : ''}</span></li>`).join('')}</ol></div>
      <div id="ticket" class="ticket">${ticket(o)}</div>`;
  }
  function actions(o) {
    if (o.status === 'new') return `<label>Prep time <select id="prep">${[10, 15, 20, 30, 45].map(m => `<option ${m === 20 ? 'selected' : ''}>${m}</option>`).join('')}</select> min</label>
      <button class="btn pri" data-a="accept">Accept order</button>
      <span class="sep"></span><select id="why"><option>Item out of stock</option><option>Too busy right now</option><option>Outside delivery area</option><option>Customer not reachable</option></select><button class="btn danger" data-a="reject">Reject</button>`;
    const nx = nextLabel(o); let h = '';
    if (o.status === 'ready' && o.mode === 'delivery') h += `<label>Driver <select id="drv">${A.drivers.map(d => `<option ${d === o.driver ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></label>`;
    if (nx) h += `<button class="btn pri" data-a="next">${nx}</button>`;
    h += `<button class="btn ghost" data-a="print">Print ticket</button>`;
    if (['preparing', 'ready'].includes(o.status)) h += `<button class="btn ghost danger-t" data-a="cancel">Cancel order</button>`;
    return h;
  }
  function ticket(o) {
    return `<h3>${esc(A.name)}</h3><p>${esc(BR.n)}</p><p>Order #${o.no} · ${MODE[o.mode]}${o.table ? ' · Table ' + esc(o.table) : ''}</p><p>${new Date(o.time).toLocaleString('en-GB')}</p><hr>
      ${o.items.map(l => `<p>${l.q} x ${esc(l.n)}<span>${A.base === 'lbp' ? lbp(l.p * l.q) : usd(l.p * l.q)}</span></p>`).join('')}<hr>
      <p>Subtotal<span>${A.base === 'lbp' ? lbp(o.sub) : usd(o.sub)}</span></p><p>Delivery<span>${A.base === 'lbp' ? lbp(o.fee) : usd(o.fee)}</span></p><p><b>Total</b><span><b>${usd(o.total)} / ${lbp(o.total)}</b></span></p><hr>
      <p>${esc(o.name)} · ${esc(o.phone)}</p>${o.address ? `<p>${esc(o.address)}</p>` : ''}${o.notes ? `<p>Note: ${esc(o.notes)}</p>` : ''}`;
  }
  function bindDetail(o) {
    const upd = (fn) => { const all = ORD(), x = all.find(y => y.no === o.no && branchName(y.branch) === BR.n); if (!x) return; fn(x); saveOrd(all); renderOrders(); badge(); };
    $('#back').onclick = () => { sel = null; renderOrders(); };
    $('#main').querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'print') return window.print();
      if (a === 'accept') { const p = +$('#prep').value; upd(x => { x.status = 'preparing'; x.prep = p; x.log.push({ s: 'preparing', t: Date.now(), prep: p }); }); }
      if (a === 'reject') { const w = $('#why').value; if (!confirm('Reject order #' + o.no + '?')) return; upd(x => { x.status = 'cancelled'; x.log.push({ s: 'cancelled', t: Date.now(), why: 'Rejected: ' + w }); }); }
      if (a === 'cancel') { if (!confirm('Cancel order #' + o.no + '?')) return; upd(x => { x.status = 'cancelled'; x.log.push({ s: 'cancelled', t: Date.now(), why: 'Cancelled by restaurant' }); }); }
      if (a === 'next') upd(x => {
        const n = x.status === 'preparing' ? 'ready' : x.status === 'ready' ? (x.mode === 'delivery' ? 'out' : 'done') : 'done';
        const e = { s: n, t: Date.now() }; if (n === 'out') { x.driver = $('#drv').value; e.driver = x.driver; }
        x.status = n; x.log.push(e);
      });
    });
  }
  function simulate() {
    const its = items().filter(i => !i.off), mode = rnd(A.modes.filter(m => ST().modes[m] !== false)) || 'pickup', lines = [];
    for (let j = 0; j < 1 + Math.floor(Math.random() * 3); j++) { const it = rnd(its); const ex = lines.find(l => l.id === it.id); if (ex) ex.q++; else lines.push({ id: it.id, n: it.n, q: 1, p: it.p }); }
    const sub = lines.reduce((a, l) => a + l.p * l.q, 0), fee = mode === 'delivery' ? +ST().delivery : 0, all = ORD(), t = Date.now();
    all.unshift({ no: String(1000 + Math.floor(Math.random() * 9000)), time: t, branch: BR.n, mode, name: rnd(NAMES), phone: '70 ' + (100 + Math.floor(Math.random() * 900)) + ' ' + (100 + Math.floor(Math.random() * 900)),
      address: mode === 'delivery' ? rnd(BR.areas || ['Main street']) + ', bldg 4, floor 2' : '', table: mode === 'dinein' ? String(1 + Math.floor(Math.random() * 14)) : '', notes: rnd(NOTES), pay: rnd(['usd', 'lbp']),
      items: lines, sub, fee, total: sub + fee, status: 'new', log: [{ s: 'new', t }] });
    saveOrd(all); fStatus = 'active';
  }

  /* ---------- MENU ---------- */
  function renderMenu() {
    const list = items().filter(i => (mCat === 'all' || i.cat === mCat) && (!mq || i.n.toLowerCase().includes(mq.toLowerCase())));
    const off = items().filter(i => i.off).length;
    $('#main').innerHTML = `<section class="toolbar"><div class="row"><select id="mc"><option value="all">All categories</option>${A.cats.map(c => `<option value="${c.id}" ${mCat === c.id ? 'selected' : ''}>${esc(c.n)}</option>`).join('')}</select>
        <input id="mq" type="search" placeholder="Search items" value="${esc(mq)}"><span class="mute">${A.items.length} items · ${off} sold out</span></div>
        <p class="mute sm">Changes show on the website right away (in this browser). Prices are in ${A.base === 'lbp' ? 'LBP' : 'USD'}.</p></section>
      <div class="card tablewrap"><table class="mt"><thead><tr><th>Photo</th><th>Item</th><th>Category</th><th>Price</th><th>Available</th></tr></thead><tbody>
      ${list.map(i => `<tr class="${i.off ? 'off' : ''}" data-id="${i.id}"><td class="ph"><img src="${img(i.img)}" alt=""><div><label class="link">Change<input type="file" accept="image/*" data-f="${i.id}" hidden></label>${i.img !== i.orig.img ? `<button class="link" data-r="${i.id}">Reset</button>` : ''}</div></td>
        <td><b>${esc(i.n)}</b>${i.d ? `<small class="mute">${esc(i.d)}</small>` : ''}</td><td class="mute">${esc((A.cats.find(c => c.id === i.cat) || {}).n || '')}</td>
        <td><div class="price"><input type="number" min="0" step="${A.base === 'lbp' ? 5000 : .25}" value="${i.p}" data-p="${i.id}"><small class="mute">${A.base === 'lbp' ? usd(i.p) : lbp(i.p)}</small>${i.p !== i.orig.p ? `<small class="chg">was ${A.base === 'lbp' ? lbp(i.orig.p) : usd(i.orig.p)}</small>` : ''}</div></td>
        <td><label class="sw"><input type="checkbox" data-av="${i.id}" ${i.off ? '' : 'checked'}><span></span><em>${i.off ? 'Sold out' : 'In stock'}</em></label></td></tr>`).join('')}</tbody></table></div>`;
    const setOv = (id, patch) => { const ov = OV(); ov[id] = Object.assign(ov[id] || {}, patch); Object.keys(ov[id]).forEach(k => ov[id][k] === undefined && delete ov[id][k]); put(K + '-menu', ov); renderMenu(); };
    $('#mc').onchange = e => { mCat = e.target.value; renderMenu(); };
    $('#mq').oninput = e => { mq = e.target.value; const p = e.target.selectionStart; renderMenu(); const i = $('#mq'); i.focus(); i.setSelectionRange(p, p); };
    $('#main').querySelectorAll('[data-p]').forEach(i => i.onchange = () => { const v = +i.value; if (v >= 0) setOv(i.dataset.p, { p: v }); });
    $('#main').querySelectorAll('[data-av]').forEach(i => i.onchange = () => setOv(i.dataset.av, { off: !i.checked || undefined }));
    $('#main').querySelectorAll('[data-r]').forEach(b => b.onclick = () => setOv(b.dataset.r, { img: undefined }));
    $('#main').querySelectorAll('[data-f]').forEach(f => f.onchange = () => {
      const file = f.files[0]; if (!file) return; const r = new FileReader();
      r.onload = () => { const im = new Image(); im.onload = () => { const s = Math.min(1, 640 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); setOv(f.dataset.f, { img: c.toDataURL('image/jpeg', .8) }); }; im.src = r.result; };
      r.readAsDataURL(file);
    });
  }

  /* ---------- SETTINGS ---------- */
  function renderSettings() {
    const s = ST();
    $('#main').innerHTML = `<div class="sgrid">
      <div class="card"><h4>Ordering</h4>
        <label class="sw"><input type="checkbox" id="s-acc" ${s.paused ? '' : 'checked'}><span></span><em>Accepting online orders</em></label>
        <p class="mute sm">When off, the website shows "Not taking orders right now".</p>
        <h5>Order types</h5>${A.modes.map(m => `<label class="chk"><input type="checkbox" data-m="${m}" ${s.modes[m] !== false ? 'checked' : ''}> ${MODE[m]}</label>`).join('')}</div>
      <div class="card"><h4>Prices</h4>
        <label>Delivery fee (${A.base === 'lbp' ? 'LBP' : 'USD'})<input type="number" id="s-del" min="0" step="${A.base === 'lbp' ? 10000 : .5}" value="${s.delivery}"></label><p class="mute sm">${A.base === 'lbp' ? usd(s.delivery) : lbp(s.delivery)}</p>
        <label>Dollar rate (LBP for $1)<input type="number" id="s-rate" min="1" step="500" value="${s.rate}"></label></div>
      <div class="card"><h4>Branch</h4><p><b>${esc(BR.n)}</b></p><p class="mute">${esc(BR.area || '')}</p>
        <label>Opening hours<input id="s-hours" value="${esc(s.hours)}"></label>
        <label>Phone<input value="${esc(BR.phone || A.phone || '')}" readonly></label></div>
      <div class="card"><h4>Demo data</h4><p class="mute sm">Everything here is saved only in this browser. Reset puts the menu, settings and orders back to the start.</p>
        <button class="btn danger" id="s-reset">Reset demo data</button></div></div>`;
    const save = patch => { put(K + '-settings', Object.assign(ST(), patch)); };
    $('#s-acc').onchange = e => { save({ paused: !e.target.checked }); renderApp(); };
    $('#main').querySelectorAll('[data-m]').forEach(c => c.onchange = () => { const st = ST(); st.modes[c.dataset.m] = c.checked; if (!Object.values(st.modes).some(Boolean)) { c.checked = true; return; } put(K + '-settings', st); });
    $('#s-del').onchange = e => { save({ delivery: +e.target.value }); renderSettings(); };
    $('#s-rate').onchange = e => { save({ rate: +e.target.value }); renderSettings(); };
    $('#s-hours').onchange = e => save({ hours: e.target.value });
    $('#s-reset').onclick = () => { if (!confirm('Reset all demo data?')) return; Object.keys(localStorage).filter(k => k.startsWith(K + '-')).forEach(k => localStorage.removeItem(k)); seed(BR); renderApp(); };
  }

  /* new orders from the website show up live */
  addEventListener('storage', e => { if (view === 'app' && e.key === K + '-orders') { if (tab === 'orders') renderOrders(); badge(); } });
  setInterval(() => { if (view === 'app' && tab === 'orders' && !document.activeElement.matches('input,select')) renderOrders(); badge(); }, 30000);
  render();
})();
