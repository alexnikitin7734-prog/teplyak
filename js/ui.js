/* Интерфейс: лента кадров, попап, фильтр каталога, плавная прокрутка.
   Нативный JS, без библиотек — jQuery сайта может подгрузиться позже.
   Слушатели внутри корня лендинга, не на document.body. */
(function () {
  'use strict';

  var root = document.querySelector('.tpl-root');
  if (!root) return;

  /* ── 2а. Лента кадров: тянем мышью, открываем попапом ────────
     Тянуть левой кнопкой привычнее, чем искать полосу прокрутки, но после
     протяжки браузер всё равно шлёт click — иначе попап открывался бы
     на каждом перетаскивании. Отсюда флаг moved. */
  var strip = root.querySelector('[data-ui="strip"]');
  var lb = root.querySelector('[data-ui="lightbox"]');

  if (strip) {
    var shots = strip.querySelectorAll('img');
    var down = false, moved = false, startX = 0, startLeft = 0, sent = false;

    /* Захват указателя (setPointerCapture) тут не годится: пока он держится,
       браузер переадресует и click — он приходил на саму ленту, а не на
       картинку, и попап не открывался. Движение и отпускание слушаем
       на документе, захват не трогаем. */
    strip.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      down = true; moved = false;
      startX = e.clientX;
      startLeft = strip.scrollLeft;
      strip.classList.add('tpl-drag');
    });

    document.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      strip.scrollLeft = startLeft - dx;
    });

    function release() {
      if (!down) return;
      down = false;
      strip.classList.remove('tpl-drag');
    }
    document.addEventListener('pointerup', release);
    document.addEventListener('pointercancel', release);

    strip.addEventListener('scroll', function () {
      if (sent || strip.scrollLeft < 40) return;
      sent = true;
      if (window.TPL_GOALS) window.TPL_GOALS.cta('gallery');
    }, { passive: true });

    /* ── попап ── */
    if (lb) {
      var big = lb.querySelector('[data-lb="img"]');
      var at = 0;
      var scrollLock = '';
      /* листаем тот набор, из которого открыли: ленту или кадры сервировки */
      var set = shots;

      function show(i) {
        at = (i + set.length) % set.length;
        big.src = set[at].dataset.full || set[at].src;
        big.alt = set[at].alt;
      }

      function open(i, from) {
        set = from || shots;
        show(i);
        lb.hidden = false;
        scrollLock = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        if (window.TPL_GOALS) window.TPL_GOALS.cta('gallery-photo');
      }

      function close() {
        lb.hidden = true;
        document.body.style.overflow = scrollLock;
      }

      strip.addEventListener('click', function (e) {
        if (moved) return;
        var img = e.target && e.target.closest ? e.target.closest('.tpl-strip img') : null;
        if (!img) {
          /* запасной путь: ищем кадр под курсором — вдруг событие
             пришло не от самой картинки */
          var under = document.elementFromPoint(e.clientX, e.clientY);
          img = under && under.closest ? under.closest('.tpl-strip img') : null;
        }
        if (!img) return;
        for (var i = 0; i < shots.length; i++) if (shots[i] === img) open(i);
      });

      /* у каждого блока с фото свой набор: проект листается внутри себя */
      Array.prototype.forEach.call(root.querySelectorAll('[data-ui="zoom"]'), function (box) {
        var set = box.querySelectorAll('img');
        Array.prototype.forEach.call(set, function (img, i) {
          img.addEventListener('click', function () { open(i, set); });
        });
        var card = box.closest('.tpl-proj__item');
        var btn = card && card.querySelector('.tpl-proj__open');
        if (btn) btn.addEventListener('click', function () { open(0, set); });
      });

      lb.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-lb]');
        var what = btn && btn.dataset.lb;
        if (what === 'prev') show(at - 1);
        else if (what === 'next') show(at + 1);
        else if (what !== 'img') close();     // клик по фону тоже закрывает
      });

      document.addEventListener('keydown', function (e) {
        if (lb.hidden) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') show(at - 1);
        else if (e.key === 'ArrowRight') show(at + 1);
      });
    }
  }

  /* ── 2. Цель на раскрытие вопроса ───────────────────────
     FAQ собран на <details>, механика раскрытия браузерная. Событие
     toggle не всплывает — слушаем в фазе перехвата. */
  root.addEventListener('toggle', function (e) {
    var d = e.target;
    if (!d.classList || !d.classList.contains('tpl-faq__item')) return;
    if (d.open && window.TPL_GOALS) window.TPL_GOALS.cta('faq');
  }, true);

  /* ── 3. Плавная прокрутка к якорям ────────────────────────────────
     В <head> сайта стоит <base href="/">, поэтому голый #tpl-calc уводит
     на главную — в разметке якоря пишем с полным путём страницы, а здесь
     ловим по вхождению, а не по началу строки.
     Плюс компенсация фиксированной шапки: scroll-padding-top на сайте
     не задан нигде, и без отступа якорь уезжает под шапку. */
  function headerOffset() {
    var h = document.querySelector('.hdr26, header');
    return (h ? h.getBoundingClientRect().height : 0) + 12;
  }

  root.addEventListener('click', function (e) {
    var a = e.target.closest('a[href*="#tpl-"]');
    if (!a || !root.contains(a)) return;
    var id = a.getAttribute('href').split('#')[1];
    var target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    var y = target.getBoundingClientRect().top + window.pageYOffset - headerOffset();
    window.scrollTo({ top: y, behavior: 'smooth' });
    /* smooth на части страниц не отрабатывает (ловили на фуршете) — добираем мгновенной прокруткой */
    setTimeout(function () { if (Math.abs(window.pageYOffset - y) > 40) window.scrollTo(0, y); }, 400);
    var first = target.querySelector('[data-val], input, button');
    if (first) setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (err) {} }, 420);
  });

  /* ── 3а. Ролики: играют без звука, пока видны; звук — кнопкой ─────
     Автоплей со звуком браузеры режут, поэтому стартуем muted. Звук включается
     только у одного ролика: остальные при этом глушатся. */
  var reels = root.querySelector('[data-ui="reels"]');
  if (reels) {
    var vids = reels.querySelectorAll('video');
    var soundSent = false;

    function setSound(v, on) {
      v.muted = !on;
      var b = v.parentNode.querySelector('[data-reel="sound"]');
      b.classList.toggle('tpl-on', on);
      b.setAttribute('aria-label', on ? 'Выключить звук' : 'Включить звук');
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (list) {
        list.forEach(function (en) {
          var v = en.target;
          if (en.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
          else { v.pause(); if (!v.muted) setSound(v, false); }
        });
      }, { threshold: 0.4 });
      Array.prototype.forEach.call(vids, function (v) { io.observe(v); });
    }

    reels.addEventListener('click', function (e) {
      var b = e.target.closest('[data-reel="sound"]');
      if (!b) return;
      var v = b.parentNode.querySelector('video');
      var on = v.muted;
      Array.prototype.forEach.call(vids, function (o) { if (o !== v && !o.muted) setSound(o, false); });
      setSound(v, on);
      if (on) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      if (on && !soundSent && window.TPL_GOALS) { soundSent = true; window.TPL_GOALS.cta('video-sound'); }
    });
  }

  /* ── 4. Каталог: фильтр ранжирует, а не скрывает ───────────────────
     Показ 12 карточек, остальные в том же DOM под ограничением высоты —
     перелинковка не должна зависеть от JS. */
  var cat = root.querySelector('[data-ui="catalog"]');
  if (cat) {
    var grid = cat.querySelector('[data-ui="cat-grid"]');
    var more = cat.querySelector('[data-ui="cat-more"]');

    /* На телефоне каталог открывается порциями: три карточки, дальше по пять
       за нажатие. На десктопе как было — кнопка разворачивает весь список. */
    var narrow = window.matchMedia('(max-width:768px)');
    var STEP = 5;
    var shown = 3;

    function portion() {
      var seen = 0, left = 0;
      var arr = grid.querySelectorAll('[data-card]');
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].hidden) continue;
        seen++;
        var over = seen > shown;
        arr[i].classList.toggle('tpl-hide', over);
        if (over) left++;
      }
      if (more) {
        more.textContent = 'Загрузить ещё';
        more.style.display = left ? '' : 'none';
      }
    }

    if (more && grid) {
      more.addEventListener('click', function () {
        if (narrow.matches) {
          shown += STEP;
          portion();
          if (window.TPL_GOALS) window.TPL_GOALS.cta('catalog-showall');
          return;
        }
        var opened = grid.classList.toggle('tpl-full');
        more.textContent = opened ? 'Скрыть' : 'Показать все';
        if (opened) {
          if (window.TPL_GOALS) window.TPL_GOALS.cta('catalog-showall');
        } else {
          // свернули — иначе экран остаётся посреди пустоты ниже каталога
          cat.scrollIntoView({ block: 'start' });
        }
        rank(); // свернули при выбранном направлении — кнопке, может, уже нечего открывать
      });
    }

    cat.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-filter]');
      if (!chip || !cat.contains(chip)) return;
      var group = chip.dataset.filter;
      var val = chip.dataset.val;
      var sibs = cat.querySelectorAll('[data-filter="' + group + '"]');
      for (var i = 0; i < sibs.length; i++) sibs[i].classList.remove('tpl-on');
      chip.classList.add('tpl-on');
      shown = 3;   // сменили направление — счёт порций с начала
      rank();
      if (window.TPL_GOALS) window.TPL_GOALS.cta('catalog-filter');
    });

    function active(group) {
      var on = cat.querySelector('[data-filter="' + group + '"].tpl-on');
      return on ? on.dataset.val : '';
    }

    /* Отбор переставляет карточки в самом DOM, а не через `order`: сколько их видно,
       решает CSS по `:nth-child`, а он считает порядок в разметке. С `order` выбранное
       направление уезжало вниз и на экране оставались 12 бледных чужих карточек — на
       «технологиях» (она в каталоге одна) секция выглядела сломанной. */
    function rank() {
      var dir = active('napravlenie');
      var arr = Array.prototype.slice.call(grid.querySelectorAll('[data-card]'));
      arr.forEach(function (c, i) {
        var fits = !dir || (' ' + c.dataset.dir + ' ').indexOf(' ' + dir + ' ') !== -1;
        // порядок: сначала подходящие, внутри них — хиты, дальше как было в разметке
        c._rank = (fits ? 0 : 1000) + (c.dataset.korp === '1' ? 0 : 100) + i / 1000;
        c.hidden = !fits; // чужие убираем совсем, а не гасим
      });
      arr.sort(function (a, b) { return a._rank - b._rank; });
      arr.forEach(function (c) { grid.appendChild(c); });
      // «Показать все» прячем, когда показывать больше нечего: в «технологиях» карточка
      // одна, и кнопка под ней ничего не открывала. Сколько влезает, решает CSS —
      // поэтому считаем по факту, а не повторяем его брейкпоинты в скрипте.
      if (narrow.matches) {
        portion();
        return;
      }
      arr.forEach(function (c) { c.classList.remove('tpl-hide'); });
      if (more) {
        var fitCount = 0, shownCount = 0;
        arr.forEach(function (c) {
          if (c.hidden) return;
          fitCount++;
          if (c.offsetParent !== null) shownCount++;
        });
        // style, а не атрибут hidden: у кнопки свой display в стилях, и он его перебивает
        more.style.display = !grid.classList.contains('tpl-full') && shownCount >= fitCount ? 'none' : '';
        more.textContent = grid.classList.contains('tpl-full') ? 'Скрыть' : 'Показать все';
      }
    }

    /* Первый показ: на телефоне карточки режет скрипт, поэтому порцию надо
       выставить сразу. Порядок карточек при этом не трогаем — на десктопе
       он задан разметкой, а rank() переставил бы их ещё до фильтра. */
    if (narrow.matches) portion();
    narrow.addEventListener('change', function () {
      if (narrow.matches) {
        shown = 3;
        portion();
        return;
      }
      var arr = grid.querySelectorAll('[data-card]');
      for (var i = 0; i < arr.length; i++) arr[i].classList.remove('tpl-hide');
      if (more) {
        more.style.display = '';
        more.textContent = grid.classList.contains('tpl-full') ? 'Скрыть' : 'Показать все';
      }
    });
  }
})();
