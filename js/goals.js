/* Цели Яндекс.Метрики, счётчик 24366505.
   Четыре цели на все лендинги сразу, ловят по хвосту события:
   _lead, _contact, _cta, _calc_use. Префикс страницы — tpl_.
   Разрез — параметрами визита: lp, place, channel, form.
   Имена параметров держим такими же, как на кейтеринге и фуршете,
   иначе сводный отчёт разъезжается. */
(function () {
  'use strict';

  var COUNTER = 24366505;
  var LP = 'teplyak';

  function send(name, params) {
    if (!window.ym) return;
    var p = { lp: LP };
    for (var k in params) if (params.hasOwnProperty(k)) p[k] = params[k];
    try { window.ym(COUNTER, 'reachGoal', name, p); } catch (e) {}
  }

  window.TPL_GOALS = {
    /* заявка ушла на /_order.php */
    lead: function (form) { send('tpl_lead', { form: form }); },

    /* клик по телефону, мессенджеру, почте */
    contact: function (channel, place) {
      send('tpl_contact', { channel: channel, place: place });
    },

    /* клик по кнопке-призыву, фильтру, раскрытию */
    cta: function (place) { send('tpl_cta', { place: place }); },

    /* работа с калькулятором: calc-touch — тронул, calc-result — досчитал.
       Воронку держим в параметре place, чтобы не заводить пятую цель:
       токен Метрики только на чтение, POST /goals отдаёт 403. */
    calcUse: function (place) { send('tpl_calc_use', { place: place }); }
  };

  /* Делегирование: всё, что помечено data-g, шлёт событие само.
     Слушатель на корне лендинга, не на document — сайт грузит свой jQuery
     позже и мог бы перехватить. */
  var root = document.querySelector('.tpl-root');
  if (!root) return;

  root.addEventListener('click', function (e) {
    var el = e.target.closest('[data-g]');
    if (!el || !root.contains(el)) return;
    var kind = el.dataset.g;
    var place = el.dataset.gp || '';
    if (kind === 'contact') {
      window.TPL_GOALS.contact(el.dataset.gc || 'phone', place);
    } else if (kind === 'cta') {
      window.TPL_GOALS.cta(place);
    }
  });
})();
