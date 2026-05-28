/* ============================================================
 * Runik — Etkileşim Runtime (statik demo)
 * - Toast bildirim sistemi
 * - Sepet: localStorage + mini drawer
 * - Favoriler: localStorage + kalp toggle
 * - Arama: header input autocomplete
 * - Sıralama: /kitaplar?sort=new|bestseller
 * - "Yukarı çık" sabit butonu
 * Modüler IIFE — backend'e geçişte API çağrılarına eşlenir.
 * ============================================================ */
(function(){
  'use strict';

  /* ============ Yardımcılar ============ */
  function el(tag, attrs, kids){
    var e = document.createElement(tag);
    if(attrs) for(var k in attrs){
      if(k === 'class') e.className = attrs[k];
      else if(k === 'html') e.innerHTML = attrs[k];
      else if(k === 'text') e.textContent = attrs[k];
      else if(k.indexOf('on')===0) e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    if(kids) (Array.isArray(kids)?kids:[kids]).forEach(function(c){
      if(typeof c === 'string') e.appendChild(document.createTextNode(c));
      else if(c) e.appendChild(c);
    });
    return e;
  }
  function $(sel, root){ return (root||document).querySelector(sel); }
  function $$(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function lsGet(k, fb){ try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; }catch(e){ return fb; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  function fmtTL(n){ return new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n) + ' ₺'; }
  function trLower(s){ return (s||'').toLocaleLowerCase('tr'); }

  /* ============ Toast ============ */
  var toastEl, toastTimer;
  function ensureToast(){
    if(toastEl) return toastEl;
    toastEl = el('div', { class: 'runik-toast', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(toastEl);
    return toastEl;
  }
  function notify(msg, type){
    var t = ensureToast();
    t.className = 'runik-toast is-' + (type || 'info');
    t.innerHTML = '<i class="ti ti-' + (type==='error'?'alert-circle':(type==='success'?'circle-check':'info-circle')) + '"></i>' +
                  '<span>' + msg + '</span>';
    requestAnimationFrame(function(){ t.classList.add('show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 2800);
  }
  window.runikNotify = notify;

  /* ============ Statik kitap dizini (arama + ilk sepet için) ============ */
  /* Backend gelene kadar buradan beslenir. Faz 6'da /assets/data/books.json'a taşınır. */
  var BOOK_INDEX = [
    { id:'kurk-mantolu-madonna', title:'Kürk Mantolu Madonna', author:'Sabahattin Ali', category:'Roman', price:65, url:'/kurk-mantolu-madonna', cover:'/assets/kurk-mantolu-madonna-cover.jpg' },
    { id:'kuyucakli-yusuf',      title:'Kuyucaklı Yusuf',      author:'Sabahattin Ali', category:'Roman', price:62, url:'/kitaplar' },
    { id:'icimizdeki-seytan',    title:'İçimizdeki Şeytan',     author:'Sabahattin Ali', category:'Roman', price:70, url:'/kitaplar' },
    { id:'huzur',                title:'Huzur',                  author:'Ahmet Hamdi Tanpınar', category:'Roman', price:95, url:'/kitaplar' },
    { id:'saatleri-ayarlama',    title:'Saatleri Ayarlama Enstitüsü', author:'Ahmet Hamdi Tanpınar', category:'Roman', price:110, url:'/kitaplar' },
    { id:'tutunamayanlar',       title:'Tutunamayanlar',         author:'Oğuz Atay', category:'Roman', price:160, url:'/kitaplar' },
    { id:'kara-kitap',           title:'Kara Kitap',             author:'Orhan Pamuk', category:'Roman', price:135, url:'/kitaplar' },
    { id:'memleketimden-insan',  title:'Memleketimden İnsan Manzaraları', author:'Nazım Hikmet', category:'Şiir', price:88, url:'/kitaplar' },
    { id:'simdi-mahzun',         title:'Şimdi Mahzun Vakitlerdir', author:'Sait Faik Abasıyanık', category:'Öykü', price:55, url:'/kitaplar' },
    { id:'ince-memed',           title:'İnce Memed',             author:'Yaşar Kemal', category:'Roman', price:125, url:'/kitaplar' },
    { id:'kirmizi-defter',       title:'Kırmızı Defter',         author:'Aslı Erdoğan',  category:'Roman', price:78, url:'/book' },
  ];
  window.RUNIK_BOOKS = BOOK_INDEX;

  /* ============ Sepet ============ */
  var Cart = {
    KEY: 'runik-cart',
    data: [],
    init: function(){ this.data = lsGet(this.KEY, []); this.refreshBadge(); },
    save: function(){ lsSet(this.KEY, this.data); this.refreshBadge(); },
    add: function(book, qty){
      qty = qty || 1;
      var found = this.find(book.id);
      if(found){ found.qty += qty; }
      else { this.data.push({ id:book.id, title:book.title, author:book.author||'', price:Number(book.price||0), qty:qty, cover:book.cover||'', url:book.url||'' }); }
      this.save();
      notify('Sepete eklendi: <strong>' + book.title + '</strong>', 'success');
    },
    remove: function(id){
      this.data = this.data.filter(function(i){ return i.id !== id; });
      this.save(); renderCartDrawer();
    },
    update: function(id, qty){
      var f = this.find(id); if(!f) return;
      f.qty = Math.max(1, qty|0); this.save(); renderCartDrawer();
    },
    find: function(id){ for(var i=0;i<this.data.length;i++) if(this.data[i].id===id) return this.data[i]; return null; },
    count: function(){ return this.data.reduce(function(s,i){return s+i.qty;}, 0); },
    total: function(){ return this.data.reduce(function(s,i){return s + i.qty*i.price;}, 0); },
    refreshBadge: function(){
      var c = this.count();
      $$('.h-cart .badge').forEach(function(b){
        b.textContent = c;
        b.style.display = c > 0 ? '' : 'none';
      });
    }
  };
  window.RunikCart = Cart;

  /* ============ Favoriler ============ */
  var Favorites = {
    KEY: 'runik-favs',
    set: new Set(),
    init: function(){ this.set = new Set(lsGet(this.KEY, [])); this.refreshAll(); },
    save: function(){ lsSet(this.KEY, Array.from(this.set)); },
    has: function(id){ return this.set.has(id); },
    toggle: function(id, title){
      if(this.has(id)){
        this.set.delete(id);
        if(title) notify('Favorilerden çıkarıldı', 'info');
      } else {
        this.set.add(id);
        if(title) notify('Favorilere eklendi: <strong>' + title + '</strong>', 'success');
      }
      this.save();
      this.refreshAll();
    },
    refreshAll: function(){
      $$('[data-favorite]').forEach(function(el){
        var id = el.getAttribute('data-favorite');
        var on = Favorites.has(id);
        el.classList.toggle('is-active', on);
        el.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
  };
  window.RunikFavorites = Favorites;

  /* ============ Sepet Drawer ============ */
  var drawerRoot;
  function injectCartDrawer(){
    drawerRoot = el('div', { class: 'runik-drawer', 'aria-hidden': 'true' });
    drawerRoot.innerHTML =
      '<div class="rd-backdrop"></div>' +
      '<aside class="rd-panel" role="dialog" aria-label="Sepetim">' +
        '<header class="rd-head">' +
          '<h3>Sepetim</h3>' +
          '<button class="rd-close" aria-label="Kapat">&times;</button>' +
        '</header>' +
        '<div class="rd-body"></div>' +
        '<footer class="rd-foot"></footer>' +
      '</aside>';
    document.body.appendChild(drawerRoot);
    drawerRoot.querySelector('.rd-backdrop').addEventListener('click', closeDrawer);
    drawerRoot.querySelector('.rd-close').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeDrawer(); });
  }
  function openDrawer(){ if(!drawerRoot) return; renderCartDrawer(); drawerRoot.classList.add('is-open'); drawerRoot.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
  function closeDrawer(){ if(!drawerRoot) return; drawerRoot.classList.remove('is-open'); drawerRoot.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }

  function renderCartDrawer(){
    if(!drawerRoot) return;
    var body = drawerRoot.querySelector('.rd-body');
    var foot = drawerRoot.querySelector('.rd-foot');
    if(Cart.data.length === 0){
      body.innerHTML = '<div class="rd-empty"><i class="ti ti-shopping-bag"></i><p>Sepetiniz boş.</p><a class="rd-cta" href="/kitaplar">Kitaplara Göz At <i class="ti ti-arrow-right"></i></a></div>';
      foot.innerHTML = '';
      return;
    }
    body.innerHTML = '<ul class="rd-list">' + Cart.data.map(function(i){
      return '<li class="rd-item" data-id="'+i.id+'">' +
        '<div class="rd-cover">' + (i.cover ? '<img src="'+i.cover+'" alt="">' : '<i class="ti ti-book"></i>') + '</div>' +
        '<div class="rd-meta">' +
          '<div class="rd-title">'+ (i.url ? '<a href="'+i.url+'">'+i.title+'</a>' : i.title) +'</div>' +
          '<div class="rd-author">'+ (i.author||'') +'</div>' +
          '<div class="rd-qty">' +
            '<button data-act="dec" aria-label="Azalt">−</button>' +
            '<span>'+i.qty+'</span>' +
            '<button data-act="inc" aria-label="Arttır">+</button>' +
          '</div>' +
        '</div>' +
        '<div class="rd-side">' +
          '<button class="rd-rm" data-act="rm" aria-label="Kaldır"><i class="ti ti-trash"></i></button>' +
          '<div class="rd-price">'+ fmtTL(i.qty * i.price) +'</div>' +
        '</div>' +
      '</li>';
    }).join('') + '</ul>';
    foot.innerHTML =
      '<div class="rd-total"><span>Toplam</span><strong>'+ fmtTL(Cart.total()) +'</strong></div>' +
      '<button class="rd-checkout" disabled title="Ödeme yakında devreye girecek">Ödemeye Geç <i class="ti ti-arrow-right"></i></button>' +
      '<p class="rd-note">Demo sepet — ödeme yakında.</p>';

    body.addEventListener('click', function(e){
      var btn = e.target.closest('[data-act]'); if(!btn) return;
      var item = btn.closest('.rd-item'); if(!item) return;
      var id = item.dataset.id, act = btn.dataset.act;
      var f = Cart.find(id); if(!f) return;
      if(act === 'inc') Cart.update(id, f.qty + 1);
      else if(act === 'dec') Cart.update(id, f.qty - 1);
      else if(act === 'rm') Cart.remove(id);
    }, { once: true });
  }

  /* ============ Sepet ikonu click ============ */
  function bindCartIcons(){
    $$('.h-cart').forEach(function(a){
      a.addEventListener('click', function(e){
        e.preventDefault();
        openDrawer();
      });
    });
  }

  /* ============ Sepete Ekle butonları ============ */
  function bindAddToCart(){
    // Kitap detay sayfasındaki ana "Sepete Ekle" butonu (.btn-cart) — sayfa BOOK objesini global olarak tanımlıyor
    $$('.btn-cart').forEach(function(btn){
      btn.addEventListener('click', function(){
        var b = window.BOOK || null;
        if(!b){
          // Yedek: butona yakın bir başlıktan çıkar
          var t = $('.info h1') || $('.bdh-title') || $('h1');
          b = { id: location.pathname.replace(/^\//,'')||'kitap', title: t ? t.textContent.trim() : 'Kitap', price: 0 };
        }
        Cart.add({
          id: b.id || location.pathname.replace(/^\//,''),
          title: b.title || 'Kitap',
          author: b.author || '',
          price: Number(b.price) || 0,
          cover: b.cover || $('.cover img') && $('.cover img').src || '',
          url: location.pathname
        });
        openDrawer();
      });
    });

    // Genel data-attribute ile çalışan butonlar
    $$('[data-add-to-cart]').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        var id = btn.dataset.addToCart;
        var book = BOOK_INDEX.find(function(b){ return b.id === id; });
        if(!book){ notify('Kitap bulunamadı', 'error'); return; }
        Cart.add(book);
      });
    });
  }

  /* ============ Favori bağlama ============ */
  function bindFavorites(){
    // Mevcut .fav-toggle (kitap detayda) — book id'yi BOOK objesinden al
    $$('.fav-toggle').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        e.stopImmediatePropagation();  // sayfadaki inline class-toggle handler'ını engelle
        var b = window.BOOK || {};
        var id = b.id || location.pathname.replace(/^\//,'') || 'item';
        Favorites.toggle(id, b.title);
        btn.classList.toggle('is-active', Favorites.has(id));
      }, { capture: true });
      // İlk durum
      var b0 = window.BOOK || {};
      var id0 = b0.id || location.pathname.replace(/^\//,'') || 'item';
      btn.classList.toggle('is-active', Favorites.has(id0));
    });

    // Genel [data-favorite] selector'ı
    $$('[data-favorite]').forEach(function(el){
      el.addEventListener('click', function(e){
        e.preventDefault();
        var id = el.getAttribute('data-favorite');
        var title = el.getAttribute('data-title') || '';
        Favorites.toggle(id, title);
      });
    });
  }

  /* ============ Arama Autocomplete ============ */
  function bindSearch(){
    var inputs = $$('.h-search input');
    if(!inputs.length) return;
    inputs.forEach(function(input){
      var box = input.closest('.h-search');
      if(!box) return;
      var dropdown = el('div', { class: 'runik-suggest' });
      box.style.position = 'relative';
      box.appendChild(dropdown);

      var debounce;
      input.addEventListener('input', function(){
        clearTimeout(debounce);
        debounce = setTimeout(function(){ render(input.value); }, 160);
      });
      input.addEventListener('focus', function(){ if(input.value) render(input.value); });
      input.addEventListener('keydown', function(e){
        if(e.key === 'Enter'){
          e.preventDefault();
          var q = input.value.trim();
          if(q) location.href = '/kitaplar?q=' + encodeURIComponent(q);
        } else if(e.key === 'Escape'){
          dropdown.classList.remove('show'); input.blur();
        }
      });
      document.addEventListener('click', function(e){
        if(!box.contains(e.target)) dropdown.classList.remove('show');
      });

      // Search butonu (varsa)
      var btn = box.querySelector('button');
      if(btn) btn.addEventListener('click', function(e){
        var q = input.value.trim();
        if(q) { e.preventDefault(); location.href = '/kitaplar?q=' + encodeURIComponent(q); }
      });

      function render(q){
        q = trLower((q||'').trim());
        if(!q){ dropdown.classList.remove('show'); return; }
        var hits = BOOK_INDEX.filter(function(b){
          return trLower(b.title).indexOf(q)>=0 || trLower(b.author).indexOf(q)>=0 || trLower(b.category).indexOf(q)>=0;
        }).slice(0, 6);
        if(!hits.length){
          dropdown.innerHTML = '<div class="rs-empty">Sonuç bulunamadı — yine de <a href="/kitaplar?q='+encodeURIComponent(q)+'">tüm katalogda ara</a>.</div>';
        } else {
          dropdown.innerHTML = hits.map(function(b){
            return '<a class="rs-item" href="'+b.url+'">' +
              '<div class="rs-info"><div class="rs-title">'+b.title+'</div><div class="rs-sub">'+b.author+' · '+b.category+'</div></div>' +
              '<div class="rs-price">'+fmtTL(b.price)+'</div>' +
            '</a>';
          }).join('') + '<a class="rs-all" href="/kitaplar?q='+encodeURIComponent(q)+'">Tüm sonuçları gör <i class="ti ti-arrow-right"></i></a>';
        }
        dropdown.classList.add('show');
      }
    });
  }

  /* ============ Yukarı çık ============ */
  function injectScrollTop(){
    var btn = el('button', { class: 'runik-scrolltop', 'aria-label': 'Sayfa başına dön', title: 'Yukarı' });
    btn.innerHTML = '<i class="ti ti-arrow-up"></i>';
    btn.addEventListener('click', function(){ window.scrollTo({ top: 0, behavior: 'smooth' }); });
    document.body.appendChild(btn);
    var raf;
    window.addEventListener('scroll', function(){
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function(){
        btn.classList.toggle('show', window.scrollY > 600);
      });
    }, { passive: true });
  }

  /* ============ Stil enjeksiyonu ============ */
  function injectStyles(){
    if(document.getElementById('runik-app-styles')) return;
    var css = `
      /* Toast */
      .runik-toast{position:fixed;bottom:90px;left:50%;transform:translate(-50%,16px);background:var(--text,#3B2A1C);color:var(--bg,#F7F4EF);padding:14px 22px;font-family:'Jost',sans-serif;font-size:13.5px;letter-spacing:.3px;box-shadow:0 18px 40px -18px rgba(0,0,0,.35);opacity:0;pointer-events:none;transition:opacity .25s ease,transform .25s ease;z-index:1100;display:inline-flex;align-items:center;gap:10px;max-width:90vw;}
      .runik-toast.show{opacity:1;transform:translate(-50%,0);}
      .runik-toast i{font-size:18px;color:var(--accent,#F2541B);}
      .runik-toast strong{color:var(--bg,#F7F4EF);}
      .runik-toast.is-error i{color:#ff6b6b;}

      /* Sepet drawer */
      .runik-drawer{position:fixed;inset:0;z-index:1200;pointer-events:none;}
      .runik-drawer .rd-backdrop{position:absolute;inset:0;background:rgba(20,12,4,.42);opacity:0;transition:opacity .3s;}
      .runik-drawer.is-open{pointer-events:auto;}
      .runik-drawer.is-open .rd-backdrop{opacity:1;}
      .runik-drawer .rd-panel{position:absolute;right:0;top:0;bottom:0;width:min(420px,95vw);background:var(--bg,#F7F4EF);border-left:1px solid var(--border,#E8E1D2);transform:translateX(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;}
      .runik-drawer.is-open .rd-panel{transform:translateX(0);}
      .runik-drawer .rd-head{padding:22px 26px;border-bottom:1px solid var(--border,#E8E1D2);display:flex;align-items:center;justify-content:space-between;}
      .runik-drawer .rd-head h3{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:var(--text,#3B2A1C);}
      .runik-drawer .rd-close{background:none;border:none;font-size:28px;color:var(--text,#3B2A1C);cursor:pointer;line-height:1;padding:0 8px;}
      .runik-drawer .rd-body{flex:1;overflow-y:auto;padding:14px 22px;}
      .runik-drawer .rd-empty{padding:48px 24px;text-align:center;color:var(--text-soft,#6E5D4B);}
      .runik-drawer .rd-empty i{font-size:48px;color:var(--text-faint,#9B8A75);}
      .runik-drawer .rd-empty p{font-family:'Jost',sans-serif;margin:14px 0 24px;font-weight:300;}
      .runik-drawer .rd-cta{display:inline-flex;align-items:center;gap:8px;font-family:'Jost',sans-serif;font-size:12px;letter-spacing:1.6px;text-transform:uppercase;padding:12px 22px;background:var(--accent,#F2541B);color:#fff;text-decoration:none;font-weight:500;}
      .runik-drawer .rd-list{list-style:none;padding:0;margin:0;}
      .runik-drawer .rd-item{display:grid;grid-template-columns:64px 1fr auto;gap:14px;padding:16px 4px;border-bottom:1px solid var(--border-2,#EDE3D2);align-items:start;}
      .runik-drawer .rd-cover{width:64px;height:88px;background:var(--bg-tint,#F4ECDD);display:flex;align-items:center;justify-content:center;overflow:hidden;}
      .runik-drawer .rd-cover img{width:100%;height:100%;object-fit:cover;}
      .runik-drawer .rd-cover i{font-size:24px;color:var(--text-faint,#9B8A75);}
      .runik-drawer .rd-title a{color:var(--text,#3B2A1C);text-decoration:none;font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;line-height:1.2;}
      .runik-drawer .rd-title a:hover{color:var(--accent,#F2541B);}
      .runik-drawer .rd-author{font-family:'Jost',sans-serif;font-size:12px;color:var(--text-faint,#9B8A75);margin-top:2px;font-weight:300;}
      .runik-drawer .rd-qty{display:inline-flex;align-items:center;gap:0;margin-top:10px;border:1px solid var(--border,#E8E1D2);width:fit-content;}
      .runik-drawer .rd-qty button{background:none;border:none;width:28px;height:26px;cursor:pointer;color:var(--text,#3B2A1C);font-size:16px;line-height:1;}
      .runik-drawer .rd-qty button:hover{background:var(--bg-tint,#F4ECDD);}
      .runik-drawer .rd-qty span{min-width:26px;text-align:center;font-family:'Jost',sans-serif;font-size:13px;font-weight:500;color:var(--text,#3B2A1C);padding:4px 4px;border-left:1px solid var(--border,#E8E1D2);border-right:1px solid var(--border,#E8E1D2);}
      .runik-drawer .rd-side{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;height:88px;}
      .runik-drawer .rd-rm{background:none;border:none;color:var(--text-faint,#9B8A75);cursor:pointer;font-size:16px;padding:0;}
      .runik-drawer .rd-rm:hover{color:#c84d35;}
      .runik-drawer .rd-price{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:var(--accent,#F2541B);}
      .runik-drawer .rd-foot{padding:20px 26px 26px;border-top:1px solid var(--border,#E8E1D2);background:var(--bg-soft,#FAF3E3);}
      .runik-drawer .rd-total{display:flex;justify-content:space-between;align-items:baseline;font-family:'Jost',sans-serif;color:var(--text-soft,#6E5D4B);font-size:13px;letter-spacing:.6px;text-transform:uppercase;font-weight:500;}
      .runik-drawer .rd-total strong{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:var(--text,#3B2A1C);letter-spacing:0;text-transform:none;}
      .runik-drawer .rd-checkout{margin-top:14px;width:100%;background:var(--accent,#F2541B);color:#fff;border:none;padding:14px 20px;font-family:'Jost',sans-serif;font-size:13px;font-weight:500;letter-spacing:1.6px;text-transform:uppercase;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;opacity:.55;cursor:not-allowed;}
      .runik-drawer .rd-note{font-family:'Jost',sans-serif;font-size:11px;color:var(--text-faint,#9B8A75);text-align:center;margin-top:10px;letter-spacing:.4px;}

      /* Arama autocomplete */
      .runik-suggest{position:absolute;top:calc(100% + 6px);left:0;right:0;background:var(--card,#fff);border:1px solid var(--border,#E8E1D2);box-shadow:0 18px 40px -18px rgba(59,42,28,.18);max-height:420px;overflow-y:auto;display:none;z-index:60;}
      .runik-suggest.show{display:block;}
      .runik-suggest .rs-item{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:12px 18px;text-decoration:none;color:var(--text,#3B2A1C);border-bottom:1px solid var(--border-2,#EDE3D2);}
      .runik-suggest .rs-item:hover{background:var(--bg-soft,#FAF3E3);}
      .runik-suggest .rs-title{font-family:'Jost',sans-serif;font-size:14px;font-weight:500;color:var(--text,#3B2A1C);}
      .runik-suggest .rs-sub{font-family:'Jost',sans-serif;font-size:12px;color:var(--text-faint,#9B8A75);margin-top:2px;font-weight:300;}
      .runik-suggest .rs-price{font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;color:var(--accent,#F2541B);white-space:nowrap;}
      .runik-suggest .rs-all{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;font-family:'Jost',sans-serif;font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:var(--accent,#F2541B);text-decoration:none;font-weight:500;border-top:1px solid var(--border,#E8E1D2);background:var(--bg-soft,#FAF3E3);}
      .runik-suggest .rs-empty{padding:18px 22px;font-family:'Jost',sans-serif;font-size:13.5px;color:var(--text-soft,#6E5D4B);font-weight:300;}
      .runik-suggest .rs-empty a{color:var(--accent,#F2541B);font-weight:500;}

      /* Yukarı çık */
      .runik-scrolltop{position:fixed;right:20px;bottom:20px;width:44px;height:44px;border-radius:50%;background:var(--accent,#F2541B);color:#fff;border:none;display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;box-shadow:0 12px 26px -8px rgba(242,84,27,.45);opacity:0;pointer-events:none;transform:translateY(10px);transition:opacity .25s ease,transform .25s ease;z-index:999;}
      .runik-scrolltop.show{opacity:1;pointer-events:auto;transform:translateY(0);}
      .runik-scrolltop:hover{filter:brightness(.95);}

      /* Favori aktif kalp */
      .fav-toggle.is-active i,
      [data-favorite].is-active i{color:#F2541B!important;}
      .fav-toggle.is-active i::before,
      [data-favorite].is-active i::before{content:"\\f4ad";}

      /* h-cart badge */
      .h-cart .badge{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;border-radius:99px;background:var(--accent,#F2541B);color:#fff;font-family:'Jost',sans-serif;font-size:11px;font-weight:500;padding:0 6px;}

      /* Mobil: scroll-top tema toggle ile çakışmasın */
      @media (max-width:560px){
        .runik-toast{bottom:80px;}
      }
    `;
    var style = el('style', { id: 'runik-app-styles' });
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  /* ============ Newsletter (varsa) ============ */
  function bindNewsletter(){
    $$('form[data-newsletter], .newsletter form').forEach(function(f){
      f.addEventListener('submit', function(e){
        e.preventDefault();
        f.reset();
        notify('Teşekkürler! Yakında haberleşeceğiz.', 'success');
      });
    });
  }

  /* ============ Init ============ */
  function init(){
    injectStyles();
    injectCartDrawer();
    injectScrollTop();
    Cart.init();
    Favorites.init();
    bindCartIcons();
    bindAddToCart();
    bindFavorites();
    bindSearch();
    bindNewsletter();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
