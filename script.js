/* ============================================================
   PROFIT-UP - скрипт страницы.
   Плиты и сборка кадра из ячеек · HUD героя · меню · ленты ·
   появление блоков · форма в WhatsApp с антибот-проверкой. Библиотек нет.
   ============================================================ */
(function(){
"use strict";
var WA = "7XXXXXXXXXX";                 /* WhatsApp Profit-Up: заменить одной правкой */
var RED = matchMedia("(prefers-reduced-motion: reduce)").matches;
var HAS_IO = typeof IntersectionObserver === "function";
var root = document.documentElement;
root.classList.add("js");

function clamp(v){ return v < 0 ? 0 : (v > 1 ? 1 : v); }
function easeOut(t){ return 1 - Math.pow(1 - t, 2.6); }
function easeOpen(t){ return 1 - Math.pow(1 - t, 1.8); }
function pad3(n){ n = Math.round(n); return (n < 10 ? "00" : n < 100 ? "0" : "") + n + "%"; }

/* ---------------- WHATSAPP-ССЫЛКИ ----------------
   Текст лежит в data-wa, номер - в константе выше. */
document.querySelectorAll("a.wa").forEach(function(a){
  var t = a.getAttribute("data-wa") || "Здравствуйте! Пишу с сайта Profit-Up.";
  a.href = "https://wa.me/" + WA + "?text=" + encodeURIComponent(t);
  a.target = "_blank"; a.rel = "noopener";
});

/* ---------------- ЯЧЕЙКИ СЕТКИ ----------------
   Каждому контейнеру [data-cells] строим cols*rows ячеек.
   --d: нормированный диагональный индекс (волна идёт из левого верхнего угла),
   --v: псевдослучайная плотность блока. Число ячеек берём из CSS (--cols/--rows). */
function rnd(seed){ var x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
function buildCells(box){
  var cs = getComputedStyle(box);
  var cols = parseInt(cs.getPropertyValue("--cols")) || 8;
  var rows = parseInt(cs.getPropertyValue("--rows")) || 6;
  var key = cols + "x" + rows;
  if (box.getAttribute("data-built") === key) return;
  box.setAttribute("data-built", key);
  var frag = document.createDocumentFragment();
  for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
    var d = (c / Math.max(1, cols - 1) + r / Math.max(1, rows - 1)) / 2;
    d = clamp(d + (rnd(r * 31 + c * 7) - .5) * .14);
    var el = document.createElement("i");
    el.className = "cell";
    el.style.setProperty("--d", d.toFixed(3));
    el.style.setProperty("--v", rnd(r * 17 + c * 3 + 5).toFixed(3));
    frag.appendChild(el);
  }
  box.textContent = "";
  box.appendChild(frag);
}
var cellBoxes = [].slice.call(document.querySelectorAll("[data-cells]"));
function buildAll(){ cellBoxes.forEach(buildCells); }
buildAll();

/* ---------------- МЕНЮ ---------------- */
var burger = document.getElementById("burger");
var mnav = document.getElementById("mnav");
function closeMenu(){
  document.body.classList.remove("menu-open");
  if (burger) burger.setAttribute("aria-expanded", "false");
}
if (burger) burger.addEventListener("click", function(){
  var open = document.body.classList.toggle("menu-open");
  burger.setAttribute("aria-expanded", open ? "true" : "false");
});
if (mnav) mnav.addEventListener("click", function(e){ if (e.target.closest("a")) closeMenu(); });
addEventListener("keydown", function(e){ if (e.key === "Escape") closeMenu(); });

/* ---------------- ЯКОРЯ ---------------- */
var HH = function(){ return parseFloat(getComputedStyle(root).getPropertyValue("--hh")) || 64; };
document.addEventListener("click", function(e){
  var a = e.target.closest('a[href^="#"]'); if (!a) return;
  var id = a.getAttribute("href").slice(1); if (!id) return;
  var t = document.getElementById(id); if (!t) return;
  e.preventDefault();
  closeMenu();
  var top = t.getBoundingClientRect().top + scrollY - (t.classList.contains("pw") ? 0 : HH() + 12);
  scrollTo({ top: Math.max(0, top), behavior: RED ? "auto" : "smooth" });
  try { history.pushState(null, "", "#" + id); } catch(err){}
});

/* ---------------- ПЛИТЫ И СБОРКА КАДРА ----------------
   Один слушатель scroll через rAF. На каждую обёртку .pw пишем
   --enter / --exit / --stay / --open, герою ещё --intro. Дальше всё делает CSS. */
var pws = [].slice.call(document.querySelectorAll(".pw"));
var heroPw = document.getElementById("top");
var hero = document.getElementById("hero");
var bar = document.getElementById("bar");
var kont = document.getElementById("kontakty");
var pctHero = document.getElementById("pct");
var steps = document.getElementById("steps");
var stepEls = steps ? [].slice.call(steps.querySelectorAll(".step")) : [];
var introK = 1, introDone = true;
function update(){
  var H = innerHeight || root.clientHeight;
  pws.forEach(function(pw){
    var r = pw.getBoundingClientRect();
    if (r.bottom < -H || r.top > H * 2) { pw.classList.toggle("gone", r.bottom < 0); return; }
    var enter = clamp(1 - r.top / H);
    var exit  = clamp(1 - r.bottom / H);
    var stay  = r.height > H + 1 ? clamp(-r.top / (r.height - H)) : enter;
    var open  = easeOpen(clamp((enter - 0.28) / 0.72));
    pw.style.setProperty("--enter", enter.toFixed(3));
    pw.style.setProperty("--exit",  exit.toFixed(3));
    pw.style.setProperty("--stay",  stay.toFixed(3));
    pw.style.setProperty("--open",  open.toFixed(3));
    pw.classList.toggle("gone", exit >= 1);
    pw.classList.toggle("on", enter > 0.6);
    var st = pw.querySelector("[data-pct]");
    if (st) st.textContent = pad3(clamp(open / .92) * 100);
    if (pw === heroPw) pw.style.setProperty("--intro", easeOut(introK).toFixed(3));
  });
  /* липкая панель: после 55 % первого экрана, прячется на контактах */
  if (bar) {
    var onKont = kont && kont.getBoundingClientRect().top < H * 0.6;
    bar.classList.toggle("show", scrollY > H * 0.55 && !onKont);
  }
  /* полный цикл: линия заполняется по мере прокрутки шагов */
  if (stepEls.length) {
    var done = 0;
    stepEls.forEach(function(s, i){
      var on = s.getBoundingClientRect().top < H * 0.72;
      s.classList.toggle("in", on);
      if (on) done = i + 1;
    });
    steps.style.setProperty("--fill", (done / stepEls.length).toFixed(3));
  }
}
if (RED) {
  root.classList.add("no-plate");
  root.classList.add("no-intro");
  if (hero) { hero.classList.add("on"); hero.classList.add("lock"); }
  if (pctHero) pctHero.textContent = "100%";
  addEventListener("scroll", function(){ update(); }, {passive:true});
  update();
} else {
  var tick = false;
  addEventListener("scroll", function(){
    if (tick) return; tick = true;
    requestAnimationFrame(function(){ tick = false; update(); });
  }, {passive:true});
  addEventListener("resize", function(){ buildAll(); update(); });
  addEventListener("load", update);
  /* интро: кадр собирается из ячеек 1400 мс, рамка наводится на камеру.
     Пропускаем при хэше или уже прокрученной странице. */
  var skip = location.hash || scrollY > 80;
  if (skip) {
    root.classList.add("no-intro");
    if (hero) { hero.classList.add("on"); hero.classList.add("lock"); }
    if (pctHero) pctHero.textContent = "100%";
    update();
  } else {
    introK = 0; introDone = false; update();
    var t0 = null;
    var step = function(ts){
      if (introDone) return;
      if (t0 === null) t0 = ts;
      var p = clamp((ts - t0) / 1400);
      introK = p;
      if (pctHero) pctHero.textContent = pad3(p * 100);
      update();
      if (p < 1) requestAnimationFrame(step);
      else { introDone = true; if (hero) hero.classList.add("lock"); }
    };
    requestAnimationFrame(step);
    setTimeout(function(){ if (hero) hero.classList.add("on"); }, 500);
  }
}
window.plateSync = function(){ introDone = true; introK = 1; if (hero) { hero.classList.add("on"); hero.classList.add("lock"); } if (pctHero) pctHero.textContent = "100%"; update(); };
addEventListener("hashchange", function(){ root.classList.add("no-intro"); });

/* ---------------- FITTEXT ----------------
   Дисплейные строки .fit не переносятся: уменьшаем кегль шагом 5 %,
   пока строка шире контейнера. */
function fitText(){
  document.querySelectorAll(".fit").forEach(function(el){
    el.style.fontSize = "";
    var box = el.parentElement.clientWidth; if (!box) return;
    var fs = parseFloat(getComputedStyle(el).fontSize), n = 0;
    while (el.scrollWidth > box + 1 && n < 30) { fs *= .95; el.style.fontSize = fs.toFixed(1) + "px"; n++; }
  });
}
fitText();
addEventListener("resize", fitText);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitText);

/* ---------------- БЕГУЩИЕ ЛЕНТЫ ----------------
   Шаг цикла = ровно одна копия списка; копий ceil(W / копия) + 1;
   длительность из шага (px/с), пересборка по fonts.ready и resize. */
function fillTicker(tk){
  var items = (tk.getAttribute("data-items") || "").split("|").filter(Boolean);
  if (!items.length) return;
  var speed = parseFloat(tk.getAttribute("data-speed")) || 55;
  tk.style.animation = "none";
  tk.textContent = "";
  var one = function(){ items.forEach(function(t){ var s = document.createElement("span"); s.textContent = t; tk.appendChild(s); }); };
  one();
  var w = tk.scrollWidth; if (!w) return;
  var copies = Math.ceil(innerWidth / w) + 1;
  for (var i = 0; i < copies; i++) one();
  var stepPx = tk.children[items.length].offsetLeft - tk.children[0].offsetLeft;
  tk.style.setProperty("--marq", stepPx + "px");
  tk.style.setProperty("--dur", (stepPx / speed).toFixed(1) + "s");
  tk.style.animation = "";
}
var tks = [].slice.call(document.querySelectorAll(".tk"));
function fillAll(){ tks.forEach(fillTicker); }
fillAll();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fillAll);
var rt; addEventListener("resize", function(){ clearTimeout(rt); rt = setTimeout(fillAll, 200); });

/* ---------------- ПОЯВЛЕНИЕ ---------------- */
if (HAS_IO && !RED) {
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } });
  }, {threshold:.12, rootMargin:"0px 0px -6% 0px"});
  document.querySelectorAll(".rv").forEach(function(el){ io.observe(el); });
  setTimeout(function(){ document.querySelectorAll(".rv:not(.in)").forEach(function(el){
    if (el.getBoundingClientRect().top < innerHeight) el.classList.add("in");
  }); }, 1500);
} else {
  document.querySelectorAll(".rv").forEach(function(el){ el.classList.add("in"); });
}

/* ---------------- АКТИВНЫЙ РАЗДЕЛ В ШАПКЕ ----------------
   Подсвечиваем пункт меню того раздела, который сейчас на экране:
   человек всегда видит, где он находится на странице. */
var navLinks = [].slice.call(document.querySelectorAll('.nav a[href^="#"]'));
var spy = navLinks.map(function(a){
  return { a: a, t: document.getElementById(a.getAttribute("href").slice(1)) };
}).filter(function(x){ return x.t; });
var dropBox = document.querySelector(".nav .drop");
var dirsSec = document.getElementById("napravleniya");
if (spy.length) {
  var spyTick = false;
  var runSpy = function(){
    var line = (innerHeight || 800) * 0.35, best = null;
    spy.forEach(function(x){
      var r = x.t.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) best = x;
    });
    spy.forEach(function(x){ x.a.classList.toggle("act", x === best); });
    if (dropBox && dirsSec) {
      var r = dirsSec.getBoundingClientRect();
      dropBox.classList.toggle("act", r.top <= line && r.bottom > line);
    }
  };
  addEventListener("scroll", function(){
    if (spyTick) return; spyTick = true;
    requestAnimationFrame(function(){ spyTick = false; runSpy(); });
  }, {passive:true});
  runSpy();
}

/* ---------------- ФОРМА → WhatsApp ----------------
   Антибот: honeypot (поле «Компания»), время заполнения от 3 с,
   обязательное согласие. Чистый обработчик submit - под gtag-конверсии. */
var form = document.getElementById("zayavka");
var T0 = Date.now();
var t0f = document.getElementById("f-t0"); if (t0f) t0f.value = String(T0);
if (form) form.addEventListener("submit", function(e){
  e.preventDefault();
  var ok = document.getElementById("fm-ok"), err = document.getElementById("fm-err");
  if (form.company && form.company.value) { ok.hidden = false; return; }          /* honeypot: тихо */
  if (Date.now() - T0 < 3000) { err.hidden = false; ok.hidden = true; return; }    /* слишком быстро */
  var name = form.name.value.trim(), phone = form.phone.value.trim();
  var sys = form.sys.value, msg = form.msg.value.trim(), agree = form.agree.checked;
  if (!name || phone.replace(/\D/g, "").length < 10 || !agree) { err.hidden = false; ok.hidden = true; return; }
  err.hidden = true;
  var t = "Здравствуйте! Заявка с сайта Profit-Up.\nИмя: " + name + "\nТелефон: " + phone +
    (sys ? "\nНаправление: " + sys : "") + (msg ? "\nОбъект и задача: " + msg : "");
  ok.hidden = false;
  window.open("https://wa.me/" + WA + "?text=" + encodeURIComponent(t), "_blank", "noopener");
});
})();
