/* Калькулятор в первом экране: тип × размер × высота × температуры → мощность обогрева,
   пушки из парка, расход дизеля, смены монтажа. Ни одного числа здесь нет — всё в price.js.
   TPL_CALC.compute вынесен наружу для docs/test-calc.js. */
(function () {
  'use strict';

  function compute(P, type, size, h, tOut, tIn) {
    var ab = size.split('×');
    var area = +ab[0] * +ab[1];
    var kw = Math.ceil(area * h * (tIn - tOut) * P.k / 860);
    var big = Math.floor(kw / P.guns.big.kw);
    var rest = kw - big * P.guns.big.kw;
    var small = 0;
    if (rest > P.guns.big.kw / 2) big++;
    else if (rest > 0) small = Math.ceil(rest / P.guns.small.kw);
    var guns = [];
    if (big) guns.push(big + ' × ' + P.guns.big.kw + ' кВт');
    if (small) guns.push(small + ' × ' + P.guns.small.kw + ' кВт');
    var t = P.types[type];
    return {
      type: t.name + ' ' + size + ' м, высота ' + h + ' м',
      area: area,
      kw: kw,
      guns: 'дизель ' + guns.join(' + '),
      diesel: Math.round(kw * P.dieselPerKw * 10) / 10,
      electric: Math.ceil(kw / P.electric.kw),
      shifts: Math.ceil(area / P.m2PerShift),
      snow: t.snow ? Math.round(area * P.snowKgM2 / 1000) : 0
    };
  }

  window.TPL_CALC = { compute: compute };

  var P = window.TPL_PRICE;
  var root = typeof document !== 'undefined' && document.querySelector('.tpl-root');
  if (!P || !root) return;
  var box = root.querySelector('[data-calc="box"]');
  if (!box) return;

  var out = box.querySelector('[data-calc="out"]');
  var textFields = root.querySelectorAll('[data-calc-text]');
  var touched = false;

  function num(n) { return String(n).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  function picked(group) {
    var on = box.querySelector('[data-calc="' + group + '"] .tpl-on');
    return on ? on.dataset.val : '';
  }

  function render() {
    var r = compute(P, picked('type') || 'dvuskat', picked('size'), +picked('h'), +picked('tout'), +picked('tin'));
    var rows = [
      ['Площадь пола', num(r.area) + ' м²'],
      ['Мощность обогрева', num(r.kw) + ' кВт'],
      ['Пушки из парка', r.guns],
      ['Расход дизеля', num(r.diesel) + ' л/ч'],
      ['Или электрических', r.electric + ' × 15 кВт'],
      ['Монтаж', r.shifts + ' ' + (r.shifts === 1 ? 'смена' : r.shifts < 5 ? 'смены' : 'смен')]
    ];
    // на экране — четыре главные цифры, менеджеру уходит всё
    var show = [['Мощность', num(r.kw) + ' кВт'], ['Пушки', r.guns.replace('дизель ', '')],
                ['Дизель', num(r.diesel) + ' л/ч'], ['Монтаж', rows[5][1]]];
    var html = '<dl class="tpl-qc__kpi">';
    for (var j = 0; j < show.length; j++) html += '<div><dt>' + show[j][0] + '</dt><dd>' + show[j][1] + '</dd></div>';
    out.innerHTML = html + '</dl>';

    if (textFields.length) {
      var t = ['Расчёт со страницы: ' + r.type.replace(/^[^ ]+ [^ ]+ /, 'Тепляк '), 'Снаружи ' + picked('tout') + ', внутри +' + picked('tin')];
      for (var k = 0; k < rows.length; k++) t.push(rows[k][0] + ': ' + rows[k][1]);
      for (var m = 0; m < textFields.length; m++) textFields[m].value = t.join('\n');
    }
  }

  box.addEventListener('click', function (e) {
    var chip = e.target.closest('.tpl-chip[data-val]');
    if (!chip || !box.contains(chip)) return;
    var sibs = chip.parentNode.querySelectorAll('.tpl-chip');
    for (var i = 0; i < sibs.length; i++) sibs[i].classList.remove('tpl-on');
    chip.classList.add('tpl-on');
    render();
    if (!touched) { touched = true; if (window.TPL_GOALS) window.TPL_GOALS.calcUse('calc-touch'); }
  });

  render();
})();
