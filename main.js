/* ═══════════════════════════════════════════════
   EMAAR KITCHEN — main.js
   Preloader · Header · Reveal · Parallax · Nav
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Preloader → orchestrated hero entrance ── */
  const preloader = document.getElementById('preloader');

  function finishLoading() {
    document.body.classList.add('is-loaded');
    if (preloader) {
      preloader.classList.add('is-done');
      setTimeout(() => preloader.remove(), 900);
    }
  }

  if (reduceMotion) {
    finishLoading();
  } else {
    // let the logo + gold sweep play, then lift the curtain
    window.addEventListener('load', () => setTimeout(finishLoading, 1600));
    // safety: never trap the user behind the preloader
    setTimeout(finishLoading, 4000);
  }

  /* ── Header: solid on scroll, hide on scroll-down ── */
  const header = document.getElementById('header');
  const hero = document.getElementById('hero');
  let lastY = window.scrollY;

  // cached: reading offsetHeight inside the scroll handler forces a layout
  // recalculation on every single scroll tick
  let heroH = hero ? hero.offsetHeight : 600;
  window.addEventListener('resize', () => {
    heroH = hero ? hero.offsetHeight : 600;
  }, { passive: true });

  let ticking = false;
  function onScroll() {
    if (ticking) return;          // coalesce bursts of scroll events into one frame
    ticking = true;
    requestAnimationFrame(update);
  }

  function update() {
    ticking = false;
    const y = window.scrollY;

    header.classList.toggle('is-solid', y > heroH * 0.55);

    // hide header while scrolling down deep in the page, show on scroll up
    if (y > heroH && y > lastY + 4 && !header.classList.contains('is-open')) {
      header.classList.add('is-hidden');
    } else if (y < lastY - 4) {
      header.classList.remove('is-hidden');
    }
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  update();

  /* ── Mobile navigation ── */
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');

  if (burger && nav) {
    burger.addEventListener('click', () => {
      const open = header.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
      document.body.style.overflow = open ? 'hidden' : '';
    });

    nav.querySelectorAll('a').forEach((link) =>
      link.addEventListener('click', () => {
        header.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      })
    );
  }

  /* ── Reveal on scroll ── */
  const revealEls = document.querySelectorAll('[data-reveal]');

  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -6% 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ── Hero video: parallax + autoplay safety ── */
  const heroVideo = document.getElementById('heroVideo');

  if (heroVideo) {
    let heroInView = true;

    // some mobile browsers pause autoplay videos until a nudge
    const tryPlay = () => {
      if (!heroInView || reduceMotion) return;
      const r = heroVideo.play();
      if (r && typeof r.catch === 'function') r.catch(() => {});
    };
    window.addEventListener('load', tryPlay);
    document.addEventListener('touchstart', tryPlay, { once: true, passive: true });

    // a looping video keeps decoding every frame forever, even far down the
    // page — that is pure CPU/GPU burn and the main source of scroll stutter
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          heroInView = e.isIntersecting;
          if (heroInView) tryPlay();
          else heroVideo.pause();
        });
      }, { threshold: 0.05 }).observe(heroVideo);
    }

    if (reduceMotion) {           // respect the OS "reduce motion" setting
      heroVideo.removeAttribute('autoplay');
      heroVideo.pause();
    }

    if (!reduceMotion) {
      let ticking = false;
      window.addEventListener(
        'scroll',
        () => {
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(() => {
            const y = window.scrollY;
            if (y < window.innerHeight * 1.2) {
              heroVideo.style.transform = `scale(1.02) translateY(${y * 0.08}px)`;
            }
            ticking = false;
          });
        },
        { passive: true }
      );
    }
  }


  /* ── Projects: category filter + batched loading ── */
  const filterBar = document.getElementById('filters');
  const gallery = document.getElementById('gallery');
  const loadMoreBtn = document.getElementById('loadMore');
  const emptyMsg = document.getElementById('galleryEmpty');

  if (filterBar && gallery) {
    const BATCH = 9; // photos shown per click — keeps big galleries fast
    const items = Array.from(gallery.querySelectorAll('.project'));
    let activeCat = filterBar.querySelector('.filter.is-active').dataset.cat;
    let shown = BATCH;

    function render() {
      const matches = items.filter((el) => el.dataset.cat === activeCat);

      items.forEach((el) => { el.hidden = true; });
      matches.slice(0, shown).forEach((el, i) => {
        el.hidden = false;
        el.style.animationDelay = (i % BATCH) * 0.05 + 's';
      });

      if (loadMoreBtn) loadMoreBtn.hidden = matches.length <= shown;
      if (emptyMsg) emptyMsg.hidden = matches.length !== 0;
    }

    filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter');
      if (!btn || btn.dataset.cat === activeCat) return;

      filterBar.querySelectorAll('.filter').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });

      activeCat = btn.dataset.cat;
      shown = BATCH;
      render();
    });

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        shown += BATCH;
        render();
      });
    }

    render();
  }

  /* ── Multi-photo project sliders ── */
  document.querySelectorAll('[data-slider]').forEach((slider) => {
    const track = slider.querySelector('.slider__track');
    const slides = Array.from(track.children);
    const dotsWrap = slider.querySelector('.slider__dots');
    const prevBtn = slider.querySelector('.slider__nav--prev');
    const nextBtn = slider.querySelector('.slider__nav--next');
    if (slides.length < 2) {
      if (prevBtn) prevBtn.hidden = true;
      if (nextBtn) nextBtn.hidden = true;
      return;
    }

    let index = 0;
    const isRTL = document.documentElement.dir === 'rtl';

    const dots = slides.map((_, i) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'slider__dot' + (i === 0 ? ' is-active' : '');
      d.setAttribute('aria-label', 'صورة ' + (i + 1));
      d.addEventListener('click', () => go(i));
      dotsWrap.appendChild(d);
      return d;
    });

    let slideTimer = null;
    function go(i) {
      index = (i + slides.length) % slides.length;
      // in RTL the flex row runs right-to-left, so slides move the other way
      const offset = index * 100 * (isRTL ? 1 : -1);
      track.classList.add('is-sliding');         // GPU layer, only while moving
      track.style.transform = `translateX(${offset}%)`;
      dots.forEach((d, n) => d.classList.toggle('is-active', n === index));
      clearTimeout(slideTimer);
      slideTimer = setTimeout(() => track.classList.remove('is-sliding'), 850);
    }

    if (prevBtn) prevBtn.addEventListener('click', () => go(index - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => go(index + 1));

    // touch swipe
    let startX = null;
    slider.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    slider.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) go(index + (dx > 0 ? -1 : 1) * (isRTL ? -1 : 1));
      startX = null;
    }, { passive: true });
  });

  /* ── Lightbox: full-size viewer for gallery photos ── */
  const lb = document.getElementById('lightbox');

  if (lb && gallery) {
    const lbImage = document.getElementById('lbImage');
    const lbTitle = document.getElementById('lbTitle');
    const lbCount = document.getElementById('lbCount');
    const lbPrev  = document.getElementById('lbPrev');
    const lbNext  = document.getElementById('lbNext');
    const lbClose = document.getElementById('lbClose');
    const isRTLDoc = document.documentElement.dir === 'rtl';

    let group = [];
    let gi = 0;
    let lastFocus = null;

    function show(i) {
      gi = (i + group.length) % group.length;
      const it = group[gi];

      lbImage.classList.remove('is-in');
      lbImage.src = it.src;
      lbImage.alt = it.alt;
      lbTitle.textContent = it.title;
      lbCount.textContent = group.length > 1 ? gi + 1 + ' / ' + group.length : '';

      const solo = group.length < 2;
      lbPrev.hidden = solo;
      lbNext.hidden = solo;

      void lbImage.offsetWidth; // restart the fade
      lbImage.classList.add('is-in');

      // warm up the neighbours so stepping through feels instant
      [gi + 1, gi - 1].forEach((n) => {
        const g = group[(n + group.length) % group.length];
        if (g && g.src !== it.src) { const pre = new Image(); pre.src = g.src; }
      });
    }

    function openLightbox(figure, idx) {
      const imgs = Array.from(figure.querySelectorAll('img'));
      if (!imgs.length) return;
      const heading = figure.querySelector('.project__meta h3');
      const title = heading ? heading.textContent.trim() : '';

      group = imgs.map((im) => ({ src: im.currentSrc || im.src, alt: im.alt || '', title: title }));
      lastFocus = document.activeElement;

      lb.hidden = false;
      document.body.style.overflow = 'hidden';
      show(idx < 0 ? 0 : idx);
      requestAnimationFrame(() => lb.classList.add('is-open'));
      lbClose.focus();
    }

    function closeLightbox() {
      lb.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(() => { lb.hidden = true; lbImage.removeAttribute('src'); }, 340);
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    }

    // open on photo click — but never swallow a slider swipe or a nav/dot tap
    let downX = 0, downY = 0;
    gallery.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; });

    gallery.addEventListener('click', (e) => {
      if (e.target.closest('.slider__nav, .slider__dot')) return;
      if (Math.abs(e.clientX - downX) > 12 || Math.abs(e.clientY - downY) > 12) return; // it was a drag
      const img = e.target.closest('.project__media img, .slider__track img');
      if (!img) return;
      const figure = img.closest('.project');
      if (!figure) return;
      openLightbox(figure, Array.from(figure.querySelectorAll('img')).indexOf(img));
    });

    lbPrev.addEventListener('click', () => show(gi - 1));
    lbNext.addEventListener('click', () => show(gi + 1));
    lbClose.addEventListener('click', closeLightbox);

    // backdrop click closes; clicking the photo itself does not
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });

    document.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') { closeLightbox(); return; }
      if (group.length < 2) return;
      // RTL: the right arrow walks back toward the start
      if (e.key === 'ArrowRight') show(gi + (isRTLDoc ? -1 : 1));
      if (e.key === 'ArrowLeft')  show(gi + (isRTLDoc ? 1 : -1));
    });

    // swipe inside the lightbox
    let lbStartX = null;
    lb.addEventListener('touchstart', (e) => { lbStartX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (lbStartX === null || group.length < 2) { lbStartX = null; return; }
      const dx = e.changedTouches[0].clientX - lbStartX;
      if (Math.abs(dx) > 45) show(gi + (dx > 0 ? -1 : 1) * (isRTLDoc ? -1 : 1));
      lbStartX = null;
    }, { passive: true });
  }

  /* ── Video tours: one plays at a time, none plays off-screen ── */
  const tours = Array.from(document.querySelectorAll('.tour'));

  if (tours.length) {
    const players = tours.map((t) => t.querySelector('.tour__video'));

    function stopOthers(except) {
      players.forEach((v) => { if (v !== except && !v.paused) v.pause(); });
    }

    tours.forEach((tour) => {
      const video = tour.querySelector('.tour__video');
      const play = tour.querySelector('.tour__play');

      play.addEventListener('click', () => {
        stopOthers(video);
        video.setAttribute('controls', '');   // native controls only once playing
        // play() rejects harmlessly if another tour interrupts it — don't let it surface
        const req = video.play();
        if (req && typeof req.catch === 'function') req.catch(() => {});
      });

      video.addEventListener('play', () => {
        stopOthers(video);
        tour.classList.add('is-playing');
      });
      video.addEventListener('pause', () => tour.classList.remove('is-playing'));
      video.addEventListener('ended', () => {
        tour.classList.remove('is-playing');
        video.removeAttribute('controls');
        video.load();                          // bring the poster back
      });
    });

    // audio should never keep running once the tour is scrolled away
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          const v = e.target.querySelector('.tour__video');
          if (!e.isIntersecting && v && !v.paused) v.pause();
        });
      }, { threshold: 0.25 });
      tours.forEach((t) => io.observe(t));
    }
  }

  /* ── Footer year ── */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
