// NASA_API_KEY is loaded from config.js (gitignored)
const BASE_URL = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;
const APOD_START = '1995-06-16';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}


async function fetchAPOD(date) {
  try {
    const url = date ? `${BASE_URL}&date=${date}` : BASE_URL;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    console.log('NASA APOD Raw Response:', data);
    renderAPOD(data);
  } catch (error) {
    console.error('Error fetching APOD data:', error);
    showError();
  }
}


function renderAPOD(data) {
  // Inject media
  const mediaWrapper = document.getElementById('media-wrapper');
  if (data.media_type === 'image') {
    const img = document.createElement('img');
    img.src = data.url;
    img.alt = data.title;
    img.className = 'apod-image';
    img.loading = 'lazy';
    mediaWrapper.appendChild(img);
  } else if (data.media_type === 'video') {
    const iframe = document.createElement('iframe');
    iframe.src = data.url;
    iframe.title = data.title;
    iframe.className = 'apod-iframe';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    mediaWrapper.appendChild(iframe);
  }

  // Inject text content
  document.getElementById('apod-title').textContent = data.title;
  document.getElementById('apod-date').textContent = data.date;
  document.getElementById('apod-explanation').textContent = data.explanation;

  if (data.copyright) {
    document.getElementById('apod-copyright').textContent = data.copyright.replace(/\n/g, ' ');
  }

  // Swap skeleton → content
  document.getElementById('skeleton').classList.add('hidden');
  document.getElementById('apod-content').classList.remove('hidden');
}

function showError() {
  document.getElementById('skeleton').classList.add('hidden');
  document.getElementById('apod-error').classList.remove('hidden');
}

// ── Date navigation ──────────────────────────────────────────────────────────

function resetCard() {
  // Restore skeleton, hide content and error so existing loading logic re-runs
  const mediaWrapper = document.getElementById('media-wrapper');
  mediaWrapper.innerHTML = '';
  document.getElementById('apod-copyright').textContent = '';
  document.getElementById('skeleton').classList.remove('hidden');
  document.getElementById('apod-content').classList.add('hidden');
  document.getElementById('apod-error').classList.add('hidden');
}

function offsetDate(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00'); // noon avoids DST edge cases
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function randomDate(min, max) {
  const start = new Date(min + 'T12:00:00').getTime();
  const end   = new Date(max + 'T12:00:00').getTime();
  const ms = start + Math.random() * (end - start);
  return new Date(ms).toISOString().slice(0, 10);
}

function updateNextBtn(picker) {
  document.getElementById('btn-next').disabled = picker.value >= picker.max;
}

function navigateTo(date) {
  const picker = document.getElementById('date-picker');
  picker.value = date;
  updateNextBtn(picker);
  resetCard();
  fetchAPOD(date);
}

(function initNav() {
  const today  = todayStr();
  const picker = document.getElementById('date-picker');
  picker.min   = APOD_START;
  picker.max   = today;
  picker.value = today;
  updateNextBtn(picker);

  document.getElementById('btn-prev').addEventListener('click', () => {
    const prev = offsetDate(picker.value, -1);
    if (prev >= APOD_START) navigateTo(prev);
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    const next = offsetDate(picker.value, 1);
    if (next <= today) navigateTo(next);
  });

  document.getElementById('btn-random').addEventListener('click', () => {
    navigateTo(randomDate(APOD_START, today));
  });

  picker.addEventListener('change', () => {
    if (picker.value) navigateTo(picker.value);
  });

  // Initial load (today)
  fetchAPOD(today);
}());

// ── Lightbox ──────────────────────────────────────────────────────────────────

(function initLightbox() {
  const lightbox      = document.getElementById('lightbox');
  const lightboxImg   = document.getElementById('lightbox-img');
  const closeBtn      = document.getElementById('lightbox-close');
  const mediaWrapper  = document.getElementById('media-wrapper');

  // Store hdurl alongside the rendered image via event delegation
  // renderAPOD creates the <img>; we intercept clicks at the wrapper level
  let _hdurl = null;

  // Patch: after renderAPOD runs, the image is in #media-wrapper.
  // We piggy-back on MutationObserver so we never modify renderAPOD itself.
  const observer = new MutationObserver(() => {
    const img = mediaWrapper.querySelector('img.apod-image');
    if (img) {
      img.style.cursor = 'zoom-in';
    }
  });
  observer.observe(mediaWrapper, { childList: true });

  // We capture hdurl by wrapping fetchAPOD's data flow via a custom event
  // dispatched from renderAPOD — but since we can't modify renderAPOD,
  // instead we read the data attribute we'll set in the click handler below.
  // Simpler: delegate click on media-wrapper; if target is an image, open lightbox.
  mediaWrapper.addEventListener('click', (e) => {
    if (e.target.tagName !== 'IMG') return;
    // hdurl is stored on the img element by the observer hook below
    const src = e.target.dataset.hdurl || e.target.src;
    lightboxImg.src = src;
    lightboxImg.alt = e.target.alt;
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  });

  // After renderAPOD injects the img, stamp hdurl onto it via MutationObserver
  // We read it from a module-level variable populated by a fetch wrapper.
  // Cleanest approach without touching renderAPOD: override fetch response reading
  // via a second observer that watches for the img and tags it.
  // We store hdurl on window._apodHdurl set just before renderAPOD is called.
  // Patch fetchAPOD's data flow non-invasively:
  const _origFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await _origFetch.apply(this, args);
    if (typeof args[0] === 'string' && args[0].includes('planetary/apod')) {
      const clone = res.clone();
      clone.json().then(data => {
        window._apodHdurl = data.media_type === 'image' ? (data.hdurl || data.url) : null;
      }).catch(() => {});
    }
    return res;
  };

  // Tag the img with hdurl once it appears
  const tagger = new MutationObserver(() => {
    const img = mediaWrapper.querySelector('img.apod-image');
    if (img && window._apodHdurl) {
      img.dataset.hdurl = window._apodHdurl;
    }
  });
  tagger.observe(mediaWrapper, { childList: true });

  // Close actions
  function closeLightbox() {
    lightbox.classList.add('hidden');
    lightboxImg.src = '';
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', closeLightbox);

  // Click outside image = click on backdrop
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lightbox.classList.contains('hidden')) {
      closeLightbox();
    }
  });
}());
