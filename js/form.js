/* Заявки на /_order.php.
   Поля: tip=phone, name, name2, subject, phone, text, fav=0.
   name2 — honeypot, ВСЕГДА пустой. Реальное поле под этим именем роняет
   заявку молча: страница ответит 200 и «Ваша заявка отправлена»,
   а в CRM не уйдёт ничего. На страницах категорий это сейчас и происходит
   (см. docs/BUG-formy-teryayut-zayavki.md) — здесь не повторяем.

   Цели шлём сами с клиента: ответ _order.php приходит со <script>,
   который в fetch не исполняется. */
(function () {
  'use strict';

  var root = document.querySelector('.tpl-root');
  if (!root) return;

  /* ── маска телефона ──────────────────────────────────────────────
     Backspace должен стирать цифру, а не скобку: иначе курсор упирается
     в разделитель и поле «залипает». Поэтому на вход берём только цифры
     и каждый раз собираем строку заново. */
  function digits(v) { return (v || '').replace(/\D/g, ''); }

  function formatPhone(raw) {
    var d = digits(raw);
    if (!d) return '';
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    var out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ')';
    if (d.length > 4) out += ' ' + d.slice(4, 7);
    if (d.length > 7) out += '-' + d.slice(7, 9);
    if (d.length > 9) out += '-' + d.slice(9, 11);
    return out;
  }

  function bindPhone(input) {
    var erasing = false;
    input.addEventListener('keydown', function (e) {
      erasing = (e.key === 'Backspace' || e.key === 'Delete');
    });
    input.addEventListener('input', function () {
      var d = digits(input.value);
      /* при стирании, если последний символ был разделителем, снимаем ещё цифру */
      if (erasing && /[\s()\-]$/.test(formatPhone(d))) d = d.slice(0, -1);
      input.value = formatPhone(d);
      erasing = false;
    });
    input.addEventListener('focus', function () {
      if (!input.value) input.value = '+7 (';
    });
    input.addEventListener('blur', function () {
      if (digits(input.value).length <= 1) input.value = '';
    });
  }

  function valid(input) {
    return digits(input.value).length === 11;
  }

  /* ── отправка ────────────────────────────────────────────────────── */
  function submit(form) {
    var phone = form.querySelector('[data-f="phone"]');
    var name = form.querySelector('[data-f="name"]');
    var text = form.querySelector('[data-f="text"]');
    var err = form.querySelector('[data-f="error"]');
    /* блок «принято» лежит рядом с формой: внутри его скрыл бы
       тот же hidden, которым прячем саму форму */
    var done = form.querySelector('[data-f="done"]') ||
               (form.parentNode && form.parentNode.querySelector('[data-f="done"]'));
    var btn = form.querySelector('button[type="submit"]');

    if (!valid(phone)) {
      phone.classList.add('tpl-bad');
      if (err) { err.textContent = 'Проверьте номер — нужно 11 цифр'; err.hidden = false; }
      phone.focus();
      return;
    }
    phone.classList.remove('tpl-bad');
    if (err) err.hidden = true;

    var body = new URLSearchParams();
    body.set('tip', 'phone');
    body.set('name', (name && name.value.trim()) || '');
    body.set('name2', '');                       // honeypot, всегда пустой
    body.set('subject', form.dataset.subject || 'Фотозоны: заявка');
    body.set('phone', phone.value);
    /* поля вроде даты и числа гостей уходят строками в text:
       в CRM доезжает только он, отдельных полей там нет */
    var extra = form.querySelectorAll('[data-extra]');
    var lines = [];
    for (var j = 0; j < extra.length; j++) {
      if (extra[j].value) lines.push(extra[j].dataset.extra + ': ' + extra[j].value);
    }
    if (text && text.value) lines.unshift(text.value);
    body.set('text', lines.join('\n'));
    body.set('fav', '0');

    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Отправляем…'; }

    fetch('/_order.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: body.toString()
    }).then(function () {
      form.hidden = true;
      if (done) done.hidden = false;
      if (window.TPL_GOALS) window.TPL_GOALS.lead(form.dataset.form || 'unknown');
      if (window.Comagic && window.Comagic.addOfflineRequest) {
        try {
          window.Comagic.addOfflineRequest({
            name: body.get('name'), phone: body.get('phone'),
            message: body.get('text')
          });
        } catch (e) {}
      }
    }).catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Отправить'; }
      if (err) {
        /* токен в js не разворачивается — берём номер из разметки */
        var tel = root.querySelector('a[href^="tel:"]');
        err.innerHTML = 'Не отправилось. Позвоните — ' +
          '<a href="' + (tel ? tel.getAttribute('href') : '') + '" rel="nofollow">' +
          (tel ? tel.textContent.replace(/^\s*Позвонить\s*/, '').trim() : 'нам') + '</a>';
        err.hidden = false;
      }
    });
  }

  var forms = root.querySelectorAll('form[data-subject]');
  for (var i = 0; i < forms.length; i++) {
    (function (form) {
      var phone = form.querySelector('[data-f="phone"]');
      if (phone) bindPhone(phone);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        submit(form);
      });
    })(forms[i]);
  }
})();
