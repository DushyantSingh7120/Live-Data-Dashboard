// NASA_API_KEY is loaded from config.js (gitignored)
const APOD_URL = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;

async function fetchAPOD() {
  try {
    const response = await fetch(APOD_URL);
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

fetchAPOD();
