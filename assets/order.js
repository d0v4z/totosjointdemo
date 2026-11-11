/* Dummy ordering engine: cart, +/- steppers, delivery, USD + LBP, checkout, confirmation.
   Usage: Order.init(cfg); Order.register(items); put <div class="o-step" data-oid="ID"></div> anywhere. */
(function () {
  const O = {};
  let C, items = {}, cart = {}, mode = 'delivery', pay = 'usd', step = 'cart';
  const $ = (s, r = document) => r.querySelector(s);
  const T = k => { const d = C.t[C.lang()] || C.t.en; return d[k] != null ? d[k] : (C.t.en[k] != null ? C.t.en[k] : k); };
  const save = () => { try { localStorage.setItem(C.key, JSON.stringify(cart)); } catch (e) {} };
  const load = () => { try { cart = JSON.parse(localStorage.getItem(C.key) || '{}') || {}; } catch (e) { cart = {}; } };

  /* money: prices are stored in C.base ('usd' or 'lbp') */
  const toUsd = v => C.base === 'usd' ? v : v / C.rate;
  const toLbp = v => C.base === 'lbp' ? v : Math.round(v * C.rate / 1000) * 1000;
  const fUsd = v => { v = Math.round(toUsd(v) * 100) / 100; return '$' + (Number.isInteger(v) ? v : v.toFixed(2)); };
  const fLbp = v => toLbp(v).toLocaleString('en-US') + ' ' + T('lbp');
  O.fmt = (v, which) => which === 'lbp' ? fLbp(v) : fUsd(v);
  O.price = v => `<b class="o-usd">${fUsd(v)}</b><small class="o-lbp">${fLbp(v)}</small>`;

  const count = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const sub = () => Object.entries(cart).reduce((a, [id, q]) => a + (items[id] ? items[id].p * q : 0), 0);
  const fee = () => (mode === 'delivery' && count()) ? C.delivery : 0;

  O.register = list => { list.forEach(it => items[it.id] = it); Object.keys(cart).forEach(id => { if (!items[id]) delete cart[id]; }); refresh(); };
  O.qty = id => cart[id] || 0;
  O.items = () => items;
  O.cart = () => cart;

  O.set = (id, q, src) => {
    const prev = cart[id] || 0; q = Math.max(0, Math.min(99, q));
    if (q) cart[id] = q; else delete cart[id];
    save(); refresh();
    if (q > prev) { fly(src, items[id]); C.onAdd && C.onAdd(items[id], src, q); bump(); }
    else if (C.onRemove) C.onRemove(items[id], q);
  };

  /* ---------- steppers ---------- */
  function stepperHTML(id) {
    const q = O.qty(id);
    if (!q) return `<button class="o-add" data-o="+" aria-label="${T('add')}"><span>${T('add')}</span><i>+</i></button>`;
    return `<button class="o-m" data-o="-" aria-label="−">−</button><b class="o-q">${q}</b><button class="o-p" data-o="+" aria-label="+">+</button>`;
  }
  function paintSteppers() {
    document.querySelectorAll('.o-step[data-oid]').forEach(el => {
      const q = O.qty(el.dataset.oid), want = q ? 'on' : 'off';
      if (el.dataset.st === want && want === 'on') { const b = el.querySelector('.o-q'); if (b && b.textContent != q) { b.textContent = q; b.classList.remove('o-pop'); void b.offsetWidth; b.classList.add('o-pop'); } return; }
      if (el.dataset.st === want) return;
      el.dataset.st = want; el.classList.toggle('on', !!q); el.innerHTML = stepperHTML(el.dataset.oid);
    });
  }
  O.paint = paintSteppers;
  document.addEventListener('click', e => {
    const b = e.target.closest('.o-step [data-o]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const id = b.closest('.o-step').dataset.oid, src = b.closest('[data-oimg]') || b.closest('.o-step');
    O.set(id, O.qty(id) + (b.dataset.o === '+' ? 1 : -1), src);
  });

  /* ---------- fly to cart ---------- */
  function fly(src, it) {
    if (!src || !it || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    const fab = $('#oFab'); if (!fab || fab.offsetParent === null) return;
    const a = src.getBoundingClientRect(), b = fab.getBoundingClientRect();
    const img = src.matches && src.matches('[data-oimg]') ? src.querySelector('img') : null;
    const g = document.createElement('div'); g.className = 'o-fly';
    if (it.fly) { const i = new Image(); i.src = it.fly; g.classList.add('o-fly-pk'); g.appendChild(i); }
    else if (img) { const i = img.cloneNode(); i.removeAttribute('loading'); g.appendChild(i); } else g.textContent = it.emo || '🍔';
    document.body.appendChild(g);
    const sx = a.left + a.width / 2 - 30, sy = a.top + a.height / 2 - 30, ex = b.left + b.width / 2 - 30, ey = b.top + b.height / 2 - 30;
    const mx = (sx + ex) / 2, my = Math.min(sy, ey) - 140;
    const an = g.animate([
      { transform: `translate(${sx}px,${sy}px) scale(1) rotate(0)`, opacity: 1 },
      { transform: `translate(${mx}px,${my}px) scale(.9) rotate(-160deg)`, opacity: 1, offset: .5 },
      { transform: `translate(${ex}px,${ey}px) scale(.25) rotate(-340deg)`, opacity: .4 }
    ], { duration: 720, easing: 'cubic-bezier(.45,.05,.55,.95)' });
    an.onfinish = () => g.remove();
  }
  function bump() { const f = $('#oFab'); if (!f) return; f.classList.remove('o-bump'); void f.offsetWidth; f.classList.add('o-bump'); }

  /* ---------- UI shell ---------- */
  function shell() {
    const w = document.createElement('div'); w.id = 'oRoot';
    w.innerHTML = `
      <button class="o-fab" id="oFab" aria-label="cart">${C.fabIcon || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>'}
        <span class="o-fl"><span id="oFabLbl"></span><b id="oFabTot"></b></span><i id="oFabN">0</i></button>
      <div class="o-veil" id="oVeil"></div>
      <aside class="o-sheet" id="oSheet" role="dialog" aria-modal="true" aria-labelledby="oTitle">
        <div class="o-hd"><h3 id="oTitle"></h3><span class="o-demo" id="oDemo"></span><button class="o-x" id="oX" aria-label="close">✕</button></div>
        <div class="o-body" id="oBody"></div>
        <div class="o-ft" id="oFt"></div>
      </aside>
      <div class="o-toast" id="oToast"></div>`;
    document.body.appendChild(w);
    $('#oFab').onclick = () => O.open();
    $('#oVeil').onclick = $('#oX').onclick = () => O.close();
    addEventListener('keydown', e => { if (e.key === 'Escape') O.close(); });
  }
  O.open = (s) => { step = s || 'cart'; draw(); document.documentElement.classList.add('o-open'); $('#oSheet').scrollTop = 0; };
  O.close = () => { document.documentElement.classList.remove('o-open'); if (step === 'done') step = 'cart'; };
  O.toast = (msg) => { const t = $('#oToast'); t.textContent = msg; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); };

  function refresh() {
    if (!C) return;
    paintSteppers();
    const n = count(), f = $('#oFab'); if (!f) return;
    $('#oFabN').textContent = n; $('#oFabLbl').textContent = n ? T('viewOrder') : T('yourOrder'); $('#oFabTot').textContent = n ? fUsd(sub()) : '';
    f.classList.toggle('has', n > 0);
    document.documentElement.classList.toggle('o-has', n > 0);
    C.onChange && C.onChange(cart, items);
    if (document.documentElement.classList.contains('o-open') && step !== 'done') draw();
  }
  O.refresh = refresh;

  function totalsHTML() {
    const s = sub(), d = fee(), t = s + d;
    return `<div class="o-tot">
      <div><span>${T('subtotal')}</span><span>${fUsd(s)} <small>${fLbp(s)}</small></span></div>
      <div><span>${mode === 'delivery' ? T('deliveryFee') : T('pickup')}</span><span>${d ? fUsd(d) + ' <small>' + fLbp(d) + '</small>' : T('free')}</span></div>
      <div class="o-grand"><span>${T('total')}</span><span><b>${fUsd(t)}</b><small>${fLbp(t)}</small></span></div>
    </div>`;
  }

  function draw() {
    $('#oDemo').textContent = T('demo');
    const body = $('#oBody'), ft = $('#oFt'), n = count();
    if (step === 'done') return;
    if (step === 'cart') {
      $('#oTitle').textContent = T('yourOrder');
      if (!n) { body.innerHTML = `<div class="o-empty">${C.emptyArt || '<div class="o-emo">🛍️</div>'}<b>${T('empty')}</b><p>${T('emptySub')}</p></div>`; ft.innerHTML = `<button class="o-cta" data-go="menu">${T('browse')}</button>`; ft.querySelector('[data-go]').onclick = () => { O.close(); C.onBrowse && C.onBrowse(); }; return; }
      const rows = Object.entries(cart).map(([id, q]) => { const it = items[id]; if (!it) return ''; const nm = (C.lang() === 'ar' && it.ar) ? it.ar : it.n;
        return `<div class="o-row"><div class="o-th">${it.img ? `<img src="${it.img}" alt="">` : `<span>${it.emo || '🍔'}</span>`}</div>
        <div class="o-ri"><b>${nm}</b><small>${fUsd(it.p)} · ${fLbp(it.p)}</small></div>
        <div class="o-step on" data-oid="${id}" data-st="on">${stepperHTML(id)}</div></div>`; }).join('');
      body.innerHTML = (C.cartTop ? C.cartTop(cart, items) : '') + `<div class="o-rows">${rows}</div>
        <div class="o-mode" role="tablist"><button data-m="delivery" class="${mode === 'delivery' ? 'on' : ''}">🛵 ${T('delivery')}</button><button data-m="pickup" class="${mode === 'pickup' ? 'on' : ''}">🏃 ${T('pickup')}</button></div>
        ${mode === 'delivery' ? `<p class="o-note">${T('deliveryNote')}</p>` : (C.branches && C.branches.length > 1 ? `<label class="o-lbl">${T('branch')}</label><select class="o-in" id="oBr">${C.branches.map(b => `<option>${b}</option>`).join('')}</select>` : `<p class="o-note">${T('pickupNote')}</p>`)}
        ${totalsHTML()}`;
      body.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; draw(); });
      ft.innerHTML = `<button class="o-cta" id="oNext"><span>${T('checkout')}</span><b>${fUsd(sub() + fee())}</b></button>`;
      $('#oNext').onclick = () => { step = 'form'; draw(); $('#oSheet').scrollTop = 0; };
      return;
    }
    if (step === 'form') {
      $('#oTitle').textContent = T('checkout');
      const v = O._f || {};
      body.innerHTML = `<button class="o-back" id="oBack">← ${T('back')}</button>
        <label class="o-lbl" for="oN">${T('name')}</label><input class="o-in" id="oN" autocomplete="name" value="${(v.n || '').replace(/"/g, '&quot;')}">
        <label class="o-lbl" for="oP">${T('phone')}</label><input class="o-in" id="oP" type="tel" inputmode="tel" autocomplete="tel" placeholder="70 123 456" value="${(v.p || '').replace(/"/g, '&quot;')}">
        ${mode === 'delivery' ? `<label class="o-lbl" for="oA">${T('address')}</label><textarea class="o-in" id="oA" rows="2" placeholder="${T('addressPh')}">${(v.a || '').replace(/</g, '&lt;')}</textarea>` : ''}
        <label class="o-lbl">${T('payWith')}</label>
        <div class="o-mode"><button data-p="usd" class="${pay === 'usd' ? 'on' : ''}">💵 ${T('cashUsd')}</button><button data-p="lbp" class="${pay === 'lbp' ? 'on' : ''}">💴 ${T('cashLbp')}</button></div>
        <label class="o-lbl" for="oNt">${T('notes')}</label><input class="o-in" id="oNt" placeholder="${T('notesPh')}" value="${(v.nt || '').replace(/"/g, '&quot;')}">
        ${totalsHTML()}
        <div class="o-pay">${T('youPay')} <b>${pay === 'usd' ? fUsd(sub() + fee()) : fLbp(sub() + fee())}</b></div>
        <p class="o-err" id="oErr"></p>`;
      const keep = () => { O._f = { n: $('#oN').value, p: $('#oP').value, a: $('#oA') ? $('#oA').value : '', nt: $('#oNt').value }; };
      body.querySelectorAll('input,textarea').forEach(i => i.oninput = keep);
      body.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { keep(); pay = b.dataset.p; draw(); });
      $('#oBack').onclick = () => { keep(); step = 'cart'; draw(); };
      ft.innerHTML = `<button class="o-cta" id="oPlace"><span>${T('place')}</span><b>${pay === 'usd' ? fUsd(sub() + fee()) : fLbp(sub() + fee())}</b></button>`;
      $('#oPlace').onclick = () => {
        keep(); const f = O._f, ph = (f.p || '').replace(/\D/g, '');
        let err = '';
        if (!f.n.trim()) err = T('errName'); else if (ph.length < 7) err = T('errPhone'); else if (mode === 'delivery' && !f.a.trim()) err = T('errAddr');
        if (err) { $('#oErr').textContent = err; return; }
        done();
      };
    }
  }

  function done() {
    step = 'done';
    const no = String(Math.floor(1000 + Math.random() * 9000)), tot = sub() + fee(), n = count();
    const lines = Object.entries(cart).map(([id, q]) => `${q}× ${items[id].n}`);
    C.onPlace && C.onPlace(cart, items);
    $('#oTitle').textContent = T('placed');
    const stages = mode === 'delivery' ? [T('s1'), T('s2'), T('s3d'), T('s4d')] : [T('s1'), T('s2'), T('s3p')];
    $('#oBody').innerHTML = `<div class="o-done">${C.doneArt ? C.doneArt(cart, items) : '<div class="o-emo o-pop">✅</div>'}
      <h4>${T('thanks')}${O._f && O._f.n ? ', ' + O._f.n.replace(/</g, '') : ''}!</h4>
      <p class="o-no">${T('orderNo')} <b>#${no}</b></p>
      <ol class="o-track">${stages.map((s, i) => `<li data-i="${i}"><i></i><span>${s}</span></li>`).join('')}</ol>
      <div class="o-sum"><span>${n} ${T('itemsWord')}</span><b>${pay === 'usd' ? fUsd(tot) : fLbp(tot)}</b></div>
      <p class="o-demo-n">${T('demoNote')}</p></div>`;
    $('#oFt').innerHTML = `<button class="o-cta" id="oOk">${T('backMenu')}</button>`;
    $('#oOk').onclick = () => { O.close(); };
    const li = [...document.querySelectorAll('.o-track li')]; let k = 0;
    const tick = () => { if (step !== 'done') return; li.forEach((l, i) => { l.classList.toggle('ok', i < k); l.classList.toggle('now', i === k); }); if (k < li.length) { k++; setTimeout(tick, k === 1 ? 700 : 2200); } };
    tick();
    cart = {}; save(); paintSteppers();
    const nfab = count(); $('#oFabN').textContent = nfab; $('#oFab').classList.remove('has'); document.documentElement.classList.remove('o-has'); C.onChange && C.onChange(cart, items);
    O._last = lines;
  }

  const DEF = {
    en: { add: 'Add', lbp: 'LBP', viewOrder: 'View order', yourOrder: 'Your order', subtotal: 'Subtotal', deliveryFee: 'Delivery', pickup: 'Pick up', free: 'Free', total: 'Total',
      demo: 'DEMO', empty: 'Your order is empty', emptySub: 'Add something tasty from the menu.', browse: 'Browse the menu', delivery: 'Delivery',
      deliveryNote: 'Delivered hot to your door.', pickupNote: 'Ready for you at the shop.', branch: 'Pick up from', checkout: 'Checkout', back: 'Back',
      name: 'Name', phone: 'Phone', address: 'Address', addressPh: 'Area, street, building, floor', payWith: 'Pay with', cashUsd: 'Cash $', cashLbp: 'Cash LBP',
      notes: 'Notes', notesPh: 'No onions, extra sauce…', youPay: 'You pay', place: 'Place order', errName: 'Write your name.', errPhone: 'Write a valid phone number.',
      errAddr: 'Write your address.', placed: 'Order placed!', thanks: 'Thank you', orderNo: 'Order', s1: 'Order received', s2: 'Preparing',
      s3d: 'On the way', s4d: 'Delivered', s3p: 'Ready for pick up', itemsWord: 'items', demoNote: 'This is a demo: no real order was sent.', backMenu: 'Back to the menu' },
    ar: { add: 'زيد', lbp: 'ل.ل', viewOrder: 'شوف طلبك', yourOrder: 'طلبك', subtotal: 'المجموع', deliveryFee: 'الديليفري', pickup: 'استلام من المحل', free: 'مجاناً', total: 'المجموع الكلي',
      demo: 'تجريبي', empty: 'طلبك فاضي', emptySub: 'زيد شي طيّب من المنيو.', browse: 'شوف المنيو', delivery: 'ديليفري',
      deliveryNote: 'بيوصلك سخن لعند بابك.', pickupNote: 'بيكون جاهز إلك بالمحل.', branch: 'استلام من', checkout: 'كمّل الطلب', back: 'رجوع',
      name: 'الاسم', phone: 'رقم التلفون', address: 'العنوان', addressPh: 'المنطقة، الشارع، البناية، الطابق', payWith: 'الدفع', cashUsd: 'كاش $', cashLbp: 'كاش ل.ل',
      notes: 'ملاحظات', notesPh: 'بلا بصل، زيادة صوص…', youPay: 'بتدفع', place: 'أكّد الطلب', errName: 'اكتب اسمك.', errPhone: 'اكتب رقم تلفون صحيح.',
      errAddr: 'اكتب عنوانك.', placed: 'وصل طلبك!', thanks: 'شكراً', orderNo: 'طلب رقم', s1: 'وصل الطلب', s2: 'عم نحضّرو',
      s3d: 'عالطريق', s4d: 'وصل', s3p: 'جاهز للاستلام', itemsWord: 'أغراض', demoNote: 'هيدا تجريبي: ما انبعت أي طلب حقيقي.', backMenu: 'رجوع عالمنيو' }
  };
  O.init = cfg => { C = cfg; const t = cfg.t || {}; C.t = { en: Object.assign({}, DEF.en, t.en), ar: Object.assign({}, DEF.ar, t.ar) }; load(); shell(); refresh(); };
  O.relabel = () => { document.querySelectorAll('.o-step[data-oid]').forEach(e => e.dataset.st = ''); refresh(); };
  window.Order = O;
})();
