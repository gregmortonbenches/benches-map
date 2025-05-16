const firebaseConfig = {
  apiKey: "AIzaSyAg-VG3laAp8kvel5mC9Q_kWhLv6xvFTPY",
  authDomain: "bench-rating.firebaseapp.com",
  projectId: "bench-rating",
  storageBucket: "bench-rating.firebasestorage.app",
  messagingSenderId: "601862513386",
  appId: "1:601862513386:web:485fa761244ea436a4ad93"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const ratingCache = {};

const map = L.map('map', {
  maxBounds: [[48.5, -11], [61.5, 4]],
  maxBoundsViscosity: 1.0
}).setView([54.5, -3], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const benchIcon = L.divIcon({
  className: 'emoji-marker',
  html: '🪑',
  iconSize: [24, 24],
  iconAnchor: [12, 24]
});

const markerCluster = L.markerClusterGroup();
map.addLayer(markerCluster);

for (let row = 0; row < 10; row++) {
  for (let col = 0; col < 10; col++) {
    const url = `data/tile_${row}_${col}.geojson`;
    fetch(url)
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => {
        const layer = L.geoJSON(data, {
          pointToLayer: (feature, latlng) => {
            const props = feature.properties || {};
            const benchId = props["@id"] || `${latlng.lat.toFixed(5)}_${latlng.lng.toFixed(5)}_${Math.floor(Math.random() * 1000)}`;
            const name = props.name || "Unnamed Bench";

            const marker = L.marker(latlng, { icon: benchIcon });

            const extras = ['material', 'colour', 'seats', 'backrest']
              .filter(key => props[key])
              .map(key => `<div><strong>${key}:</strong> ${props[key]}</div>`)
              .join('');

            const popupContent = `
              <div class="popup">
                <strong>${name}</strong>
                ${extras}
                <div id="rating-${benchId}"><span class="spinner"></span></div>
                <label for="rate-${benchId}-comfort">Rate Comfort:</label>
                <select id="rate-${benchId}-comfort" onchange="submitRating('${benchId}', 'comfort', this.value)">
                  <option value="">--</option>
                  ${[...Array(5)].map((_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}
                </select>
                <label for="rate-${benchId}-view">Rate View:</label>
                <select id="rate-${benchId}-view" onchange="submitRating('${benchId}', 'view', this.value)">
                  <option value="">--</option>
                  ${[...Array(5)].map((_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}
                </select>
                <label for="rate-${benchId}-ambience">Rate Ambience:</label>
                <select id="rate-${benchId}-ambience" onchange="submitRating('${benchId}', 'ambience', this.value)">
                  <option value="">--</option>
                  ${[...Array(5)].map((_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}
                </select>
                <div id="thanks-${benchId}" class="fade-message hidden">Thanks for rating!</div>
              </div>
            `;

            marker.bindPopup(popupContent);
            marker.on('popupopen', () => loadRating(benchId));
            return marker;
          }
        });
        markerCluster.addLayer(layer);
      })
      .catch(err => console.warn(`Failed to load ${url}:`, err));
  }
}

function sanitizeId(id) {
  return id.replace(/\//g, '_');
}

function loadRating(benchId) {
  const safeId = sanitizeId(benchId);
  const el = document.getElementById(`rating-${benchId}`);
  if (!el) return;

  el.innerHTML = `<span class="spinner"></span>`;
  console.log("Loading rating for:", benchId);

  if (ratingCache[safeId]) {
    el.innerText = ratingCache[safeId];
    return;
  }

  db.collection("benchRatings").doc(safeId).get()
    .then(doc => {
      if (doc.exists) {
        const data = doc.data();

        // Get the individual metric averages
        const comfortAvg = (data.comfortTotal || 0) / (data.comfortCount || 1);
        const viewAvg = (data.viewTotal || 0) / (data.viewCount || 1);
        const ambienceAvg = (data.ambienceTotal || 0) / (data.ambienceCount || 1);

        // Calculate overall average
        const overallAvg = (data.comfortTotal || 0) + (data.viewTotal || 0) + (data.ambienceTotal || 0);
        const overallCount = (data.comfortCount || 0) + (data.viewCount || 0) + (data.ambienceCount || 0);
        const overallRating = overallAvg / (overallCount || 1);

        const text = `
          <strong>Comfort:</strong> ${comfortAvg.toFixed(1)} stars<br>
          <strong>View:</strong> ${viewAvg.toFixed(1)} stars<br>
          <strong>Ambience:</strong> ${ambienceAvg.toFixed(1)} stars<br>
          <strong>Overall:</strong> ${overallRating.toFixed(1)} stars
        `;

        el.innerHTML = text;
        ratingCache[safeId] = text;
      } else {
        el.innerText = "No ratings yet.";
        ratingCache[safeId] = "No ratings yet.";
      }
    })
    .catch(err => {
      el.innerText = "Rating failed to load.";
      console.error("Error loading rating:", err);
    });
}

function submitRating(benchId, metric, value) {
  const safeId = sanitizeId(benchId);
  const rating = parseInt(value);
  if (!rating || rating < 1 || rating > 5) return;

  const ref = db.collection("benchRatings").doc(safeId);
  console.log("Submitting rating:", benchId, metric, rating);

  ref.get().then(doc => {
    if (doc.exists) {
      const data = doc.data();
      // Update the specific metric total and count
      const newMetricTotal = (data[`${metric}Total`] || 0) + rating;
      const newMetricCount = (data[`${metric}Count`] || 0) + 1;

      ref.set({
        [`${metric}Total`]: newMetricTotal,
        [`${metric}Count`]: newMetricCount
      }, { merge: true }).then(() => {
        // Calculate overall average (comfort + view + ambience) / 3
        const overallTotal = (data.comfortTotal || 0) + (data.viewTotal || 0) + (data.ambienceTotal || 0);
        const overallCount = (data.comfortCount || 0) + (data.viewCount || 0) + (data.ambienceCount || 0);
        const overallAvg = overallTotal / (overallCount || 1);

        // Update Firestore with overall average
        ref.set({ overallAvg: overallAvg }, { merge: true });

        // Update the UI after submission
        updatePopup(safeId);
      });
    } else {
      // First time rating, set initial values
      const initialData = {
        [`${metric}Total`]: rating,
        [`${metric}Count`]: 1,
        overallAvg: rating
      };
      ref.set(initialData).then(() => {
        updatePopup(safeId);
      });
    }
  });

  // Disable the select and show thanks message
  const select = document.getElementById(`rate-${benchId}-${metric}`);
  if (select) select.disabled = true;

  const thanksEl = document.getElementById(`thanks-${benchId}`);
  if (thanksEl) {
    thanksEl.classList.remove('hidden');
    setTimeout(() => thanksEl.classList.add('hidden'), 2500);
  }
}

function updatePopup(safeId) {
  setTimeout(() => loadRating(safeId), 500);
}

function searchLocation() {
  const query = document.getElementById('searchInput').value;
  if (!query) return;

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=gb`)
    .then(res => res.json())
    .then(data => {
      if (data.length === 0) {
        alert("Place not found.");
        return;
      }
      const { lat, lon } = data[0];
      map.setView([parseFloat(lat), parseFloat
