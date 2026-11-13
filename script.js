(function () {
  // Lista de vuelos: cambia nombres o rutas aquí si lo necesitas
  var VUELOS = [
    { titulo: 'Vuelo 1', src: 'videos/vuelo1.mp4', img: 'img/vuelo1.jpg' },
    { titulo: 'Vuelo 2', src: 'videos/vuelo2.mp4', img: 'img/vuelo2.jpg' },
    { titulo: 'Vuelo 3', src: 'videos/vuelo3.mp4', img: 'img/vuelo3.jpg' }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var player = $('player'), video = $('video'), list = $('list');
  var progress = $('progress'), played = $('played'), buffer = $('buffer'), knob = $('knob'), tip = $('tip');
  var cur = $('cur'), dur = $('dur'), volume = $('volume');
  var speedMenu = $('speedMenu'), btnSpeed = $('btnSpeed');
  var index = 0, idleTimer = null, dragging = false;

  function fmt(s) {
    if (!isFinite(s)) return '0:00';
    var m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  /* ---------- Lista lateral ---------- */
  VUELOS.forEach(function (v, i) {
    var b = document.createElement('button');
    b.className = 'item';
    b.innerHTML =
      '<div class="thumb"><img src="' + v.img + '" alt=""><span class="len" id="len' + i + '"></span></div>' +
      '<div><h3>' + v.titulo + '</h3><p>Cohete de agua</p><div class="now" id="now' + i + '"></div></div>';
    b.addEventListener('click', function () { cargar(i, true); });
    list.appendChild(b);

    // duración para la miniatura
    var t = document.createElement('video');
    t.preload = 'metadata';
    t.src = v.src;
    t.addEventListener('loadedmetadata', function () { $('len' + i).textContent = fmt(t.duration); });
  });

  function cargar(i, reproducir) {
    index = i;
    var v = VUELOS[i];
    video.src = v.src;
    video.poster = v.img;
    video.playbackRate = parseFloat(speedMenu.querySelector('.on').dataset.s);
    $('title').textContent = v.titulo;
    document.querySelectorAll('.item').forEach(function (el, k) {
      el.classList.toggle('on', k === i);
      $('now' + k).textContent = k === i ? 'Reproduciendo' : '';
    });
    played.style.width = '0'; knob.style.left = '0'; buffer.style.width = '0';
    cur.textContent = '0:00';
    if (reproducir) video.play();
  }

  /* ---------- Reproducción ---------- */
  function toggle() { video.paused ? video.play() : video.pause(); }
  video.addEventListener('click', toggle);
  video.addEventListener('dblclick', fullscreen);
  $('btnPlay').addEventListener('click', toggle);
  $('bigPlay').addEventListener('click', toggle);
  $('btnNext').addEventListener('click', function () { cargar((index + 1) % VUELOS.length, true); });

  video.addEventListener('play', function () { player.classList.add('playing'); wake(); });
  video.addEventListener('pause', function () { player.classList.remove('playing', 'idle'); });
  video.addEventListener('ended', function () { player.classList.remove('playing', 'idle'); });
  video.addEventListener('loadedmetadata', function () { dur.textContent = fmt(video.duration); });
  video.addEventListener('timeupdate', function () {
    if (dragging) return;
    var p = video.duration ? video.currentTime / video.duration * 100 : 0;
    played.style.width = p + '%'; knob.style.left = p + '%';
    cur.textContent = fmt(video.currentTime);
  });
  video.addEventListener('progress', function () {
    if (video.buffered.length && video.duration) {
      buffer.style.width = video.buffered.end(video.buffered.length - 1) / video.duration * 100 + '%';
    }
  });

  /* ---------- Barra de progreso ---------- */
  function seekFrom(e) {
    var r = progress.getBoundingClientRect();
    var x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    return Math.min(Math.max(x / r.width, 0), 1);
  }
  progress.addEventListener('mousemove', function (e) {
    var f = seekFrom(e);
    tip.style.left = f * 100 + '%';
    tip.textContent = fmt(f * video.duration);
  });
  function startDrag(e) { dragging = true; progress.classList.add('drag'); moveDrag(e); }
  function moveDrag(e) {
    if (!dragging) return;
    var f = seekFrom(e);
    played.style.width = f * 100 + '%'; knob.style.left = f * 100 + '%';
    cur.textContent = fmt(f * video.duration);
    video.currentTime = f * video.duration;
  }
  function endDrag() { dragging = false; progress.classList.remove('drag'); }
  progress.addEventListener('mousedown', startDrag);
  progress.addEventListener('touchstart', startDrag, { passive: true });
  window.addEventListener('mousemove', moveDrag);
  window.addEventListener('touchmove', moveDrag, { passive: true });
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('touchend', endDrag);

  /* ---------- Volumen ---------- */
  volume.addEventListener('input', function () {
    video.volume = parseFloat(volume.value);
    video.muted = video.volume === 0;
  });
  function mute() { video.muted = !video.muted; }
  $('btnMute').addEventListener('click', mute);
  video.addEventListener('volumechange', function () {
    player.classList.toggle('muted', video.muted || video.volume === 0);
    volume.value = video.muted ? 0 : video.volume;
  });

  /* ---------- Velocidad ---------- */
  btnSpeed.addEventListener('click', function (e) { e.stopPropagation(); speedMenu.hidden = !speedMenu.hidden; });
  speedMenu.addEventListener('click', function (e) {
    var li = e.target.closest('li'); if (!li) return;
    speedMenu.querySelectorAll('li').forEach(function (x) { x.classList.remove('on'); });
    li.classList.add('on');
    var s = parseFloat(li.dataset.s);
    video.playbackRate = s;
    btnSpeed.textContent = String(s).replace('.', ',') + '×';
    speedMenu.hidden = true;
  });
  document.addEventListener('click', function () { speedMenu.hidden = true; });

  /* ---------- Pantalla completa ---------- */
  function fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (player.requestFullscreen) player.requestFullscreen();
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
  }
  $('btnFs').addEventListener('click', fullscreen);
  document.addEventListener('fullscreenchange', function () {
    player.classList.toggle('full', !!document.fullscreenElement);
  });

  /* ---------- Ocultar controles al estar inactivo ---------- */
  function wake() {
    player.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (!video.paused) player.classList.add('idle');
    }, 2500);
  }
  player.addEventListener('mousemove', wake);
  player.addEventListener('touchstart', wake, { passive: true });

  /* ---------- Teclado (como YouTube) ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT') return;
    var k = e.key.toLowerCase();
    if (k === ' ' || k === 'k') { e.preventDefault(); toggle(); }
    else if (k === 'f') fullscreen();
    else if (k === 'm') mute();
    else if (k === 'arrowright' || k === 'l') video.currentTime += 5;
    else if (k === 'arrowleft' || k === 'j') video.currentTime -= 5;
    else if (k === 'n') $('btnNext').click();
    else if (k >= '1' && k <= '3') cargar(parseInt(k, 10) - 1, true);
    wake();
  });

  cargar(0, false);
})();
