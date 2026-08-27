// NASA_API_KEY is loaded from config.js (gitignored)
const BASE_URL = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;
const APOD_START = '1995-06-16';

// ── Theme Toggle ───────────────────────────────────────────────────────────────
(function initTheme() {
  const html   = document.documentElement;
  const btn    = document.getElementById('theme-toggle');
  const DARK   = 'dark';
  const LIGHT  = 'light';
  const KEY    = 'apod-theme';

  function applyTheme(theme) {
    const isLight = theme === LIGHT;
    html.classList.toggle('light-theme', isLight);
    btn.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
    localStorage.setItem(KEY, theme);
  }

  btn.addEventListener('click', () => {
    const current = html.classList.contains('light-theme') ? LIGHT : DARK;
    applyTheme(current === LIGHT ? DARK : LIGHT);
  });

  // Sync button label with persisted state (class already applied before paint by inline script)
  const saved = localStorage.getItem(KEY);
  btn.setAttribute('aria-label',
    saved === LIGHT ? 'Switch to dark theme' : 'Switch to light theme'
  );
}());



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

let currentDateStr = todayStr();

function updateNextBtn(dateStr) {
  document.getElementById('btn-next').disabled = dateStr >= todayStr();
}

function navigateTo(dateStr) {
  currentDateStr = dateStr;
  document.getElementById('date-picker-label').textContent = dateStr;
  updateNextBtn(dateStr);
  resetCard();
  fetchAPOD(dateStr);
}

(function initNavAndCalendar() {
  const today = todayStr();
  let currentViewDate = new Date(today + 'T12:00:00');
  let currentPickerView = 'days'; // 'days' | 'years' | 'months'
  let selectedPickerYear = currentViewDate.getFullYear();
  
  const startLimit = new Date(APOD_START + 'T12:00:00');
  const endLimit = new Date(today + 'T12:00:00');
  const startYear = startLimit.getFullYear();
  const startMonth = startLimit.getMonth(); // 5 (June)
  const endYear = endLimit.getFullYear();
  const endMonth = endLimit.getMonth();

  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnRandom = document.getElementById('btn-random');
  
  const datePickerBtn = document.getElementById('date-picker-btn');
  const datePickerLabel = document.getElementById('date-picker-label');
  const calendarDropdown = document.getElementById('calendar-dropdown');
  const calPrevMonth = document.getElementById('cal-prev-month');
  const calNextMonth = document.getElementById('cal-next-month');
  const calMonthYear = document.getElementById('cal-month-year');
  const calDays = document.getElementById('cal-days');
  const calViewDays = document.getElementById('cal-view-days');
  const calViewYears = document.getElementById('cal-view-years');
  const calViewMonths = document.getElementById('cal-view-months');
  const calYearsList = document.getElementById('cal-years-list');
  const calMonthsGrid = document.getElementById('cal-months-grid');

  datePickerLabel.textContent = today;
  updateNextBtn(today);

  // -- Global Nav Buttons --
  btnPrev.addEventListener('click', () => {
    const prev = offsetDate(currentDateStr, -1);
    if (prev >= APOD_START) navigateTo(prev);
  });

  btnNext.addEventListener('click', () => {
    const next = offsetDate(currentDateStr, 1);
    if (next <= today) navigateTo(next);
  });

  btnRandom.addEventListener('click', () => {
    navigateTo(randomDate(APOD_START, today));
  });

  // -- Calendar Logic --
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthAbbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function setPickerView(view) {
    currentPickerView = view;
    calViewDays.classList.toggle('hidden', view !== 'days');
    calViewYears.classList.toggle('hidden', view !== 'years');
    calViewMonths.classList.toggle('hidden', view !== 'months');

    if (view === 'days') {
      calPrevMonth.classList.remove('hidden');
      calNextMonth.classList.remove('hidden');
      calMonthYear.classList.remove('active');
      calMonthYear.textContent = `${monthNames[currentViewDate.getMonth()]} ${currentViewDate.getFullYear()}`;
      calMonthYear.setAttribute('aria-label', 'Switch to year and month selection');

      calPrevMonth.disabled = (currentViewDate.getFullYear() === startYear && currentViewDate.getMonth() <= startMonth);
      calNextMonth.disabled = (currentViewDate.getFullYear() === endYear && currentViewDate.getMonth() >= endMonth);
    } else if (view === 'years') {
      calPrevMonth.classList.add('hidden');
      calNextMonth.classList.add('hidden');
      calMonthYear.classList.add('active');
      calMonthYear.textContent = 'Select Year';
      calMonthYear.setAttribute('aria-label', 'Return to calendar days');
      renderYears();
    } else if (view === 'months') {
      calPrevMonth.classList.add('hidden');
      calNextMonth.classList.add('hidden');
      calMonthYear.classList.add('active');
      calMonthYear.textContent = `${selectedPickerYear}`;
      calMonthYear.setAttribute('aria-label', 'Return to year selection');
      renderMonths(selectedPickerYear);
    }
  }

  function renderCalendar() {
    calDays.innerHTML = '';
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Empty slots before 1st of month
    for (let i = 0; i < firstDay; i++) {
      const emptyDiv = document.createElement('div');
      calDays.appendChild(emptyDiv);
    }

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(year, month, i, 12, 0, 0);
      const dayStr = dayDate.toISOString().slice(0, 10);
      
      const dayEl = document.createElement('button');
      dayEl.className = 'cal-day';
      dayEl.textContent = i;
      dayEl.type = 'button';

      if (dayDate < startLimit || dayDate > endLimit) {
        dayEl.classList.add('disabled');
        dayEl.disabled = true;
      } else {
        if (dayStr === today) {
          dayEl.classList.add('today');
        }
        if (dayStr === currentDateStr) {
          dayEl.classList.add('selected');
        }
        dayEl.addEventListener('click', () => {
          navigateTo(dayStr);
          closeCalendar();
        });
      }
      calDays.appendChild(dayEl);
    }

    setPickerView('days');
  }

  function renderYears() {
    calYearsList.innerHTML = '';
    let selectedYearEl = null;

    for (let y = startYear; y <= endYear; y++) {
      const yearBtn = document.createElement('button');
      yearBtn.type = 'button';
      yearBtn.className = 'cal-year-btn';
      yearBtn.textContent = y;

      if (y === endYear) {
        yearBtn.classList.add('today');
      }
      if (y === currentViewDate.getFullYear()) {
        yearBtn.classList.add('selected');
        selectedYearEl = yearBtn;
      }

      yearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedPickerYear = y;
        setPickerView('months');
      });

      calYearsList.appendChild(yearBtn);
    }

    if (selectedYearEl) {
      setTimeout(() => {
        selectedYearEl.scrollIntoView({ block: 'center', behavior: 'instant' });
      }, 0);
    }
  }

  function renderMonths(year) {
    calMonthsGrid.innerHTML = '';

    for (let m = 0; m < 12; m++) {
      const monthBtn = document.createElement('button');
      monthBtn.type = 'button';
      monthBtn.className = 'cal-month-btn';
      monthBtn.textContent = monthAbbr[m];

      const isBeforeStart = (year === startYear && m < startMonth);
      const isAfterEnd = (year === endYear && m > endMonth);

      if (isBeforeStart || isAfterEnd) {
        monthBtn.classList.add('disabled');
        monthBtn.disabled = true;
      } else {
        if (year === endYear && m === endMonth) {
          monthBtn.classList.add('today');
        }
        if (year === currentViewDate.getFullYear() && m === currentViewDate.getMonth()) {
          monthBtn.classList.add('selected');
        }
        monthBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          currentViewDate = new Date(year, m, 1, 12, 0, 0);
          renderCalendar();
        });
      }

      calMonthsGrid.appendChild(monthBtn);
    }
  }

  function openCalendar() {
    currentViewDate = new Date(currentDateStr + 'T12:00:00');
    selectedPickerYear = currentViewDate.getFullYear();
    renderCalendar();
    calendarDropdown.classList.remove('hidden');
    datePickerBtn.setAttribute('aria-expanded', 'true');
  }

  function closeCalendar() {
    calendarDropdown.classList.add('hidden');
    datePickerBtn.setAttribute('aria-expanded', 'false');
    setPickerView('days');
  }

  datePickerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (calendarDropdown.classList.contains('hidden')) {
      openCalendar();
    } else {
      closeCalendar();
    }
  });

  calMonthYear.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentPickerView === 'days') {
      selectedPickerYear = currentViewDate.getFullYear();
      setPickerView('years');
    } else if (currentPickerView === 'years') {
      setPickerView('days');
    } else if (currentPickerView === 'months') {
      setPickerView('years');
    }
  });

  calPrevMonth.addEventListener('click', (e) => {
    e.stopPropagation();
    currentViewDate.setDate(1);
    currentViewDate.setMonth(currentViewDate.getMonth() - 1);
    renderCalendar();
  });

  calNextMonth.addEventListener('click', (e) => {
    e.stopPropagation();
    currentViewDate.setDate(1);
    currentViewDate.setMonth(currentViewDate.getMonth() + 1);
    renderCalendar();
  });

  document.addEventListener('click', (e) => {
    if (!calendarDropdown.classList.contains('hidden') && 
        !calendarDropdown.contains(e.target) && 
        !datePickerBtn.contains(e.target)) {
      closeCalendar();
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !calendarDropdown.classList.contains('hidden')) {
      if (currentPickerView === 'months') {
        setPickerView('years');
      } else if (currentPickerView === 'years') {
        setPickerView('days');
      } else {
        closeCalendar();
        datePickerBtn.focus();
      }
    }
  });

  // Initial load
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
