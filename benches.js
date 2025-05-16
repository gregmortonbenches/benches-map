// Initialize Firebase
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

// Load geojson tiles
for (let row = 0; row < 10; row++) {
  for (let col = 0; col < 10; col++) {
    const url = `data/tile_${row}_${col}.geojson`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(data => {
        const layer = L.geoJSON(data, {
          pointToLayer: (feature, latlng) => {
            const props = feature.properties || {};
            const benchId = props["@id"] || `${latlng.lat.toFixed(5)}_${latlng.lng.toFixed(5)}_${Math.floor(Math.random() * 1000)}`;
            const name = props.name || "Unnamed Bench";

            const marker = L.marker(latlng, { icon: benchIcon });

            const extras = ["material", "colour", "backrest", "seats"]
              .filter(k => props[k])
              .map(k => `<div><strong>${k}:</strong> ${props[k]}</div>`)
              .join('');

            const popupHTML = `
              <div class="popup-content">
                <strong>${name}</strong>
                ${extras}
                <div id="rating-${benchId}" class="rating-block">
                  <div class="spinner"></div> Loading rating...
                </div>
                <label for="rate-${benchId}">Rate:</label>
                <select id="rate-${benchId}" onchange="submitRating('${benchId}', this.value)">
                  <option value="">--</option>
                  ${[...Array(10)].map((_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}
                </select>
                <div id="thanks-${benchId}" class="thanks-message" style="display:none;">Thanks for rating!</div>
              </div>
            `;

            marker.bindPopup(popupHTML);
            marker.on('popupopen', () => loadRating(benchId));
            return marker;
          }
        });
        markerCluster.addLayer(layer);
      })
      .catch(err => console.warn(`Failed to load ${url}:`, err));
  }
}

function loadRating(benchId) {
  const el = document.getElementById(`rating-${benchId}`);
  if (!el) return;

  if (ratingCache[benchId]) {
    el.innerHTML = ratingCache[benchId];
    return;
  }

  db.collection("benchRatings").doc(benchId).get().then(doc => {
    if (doc.exists) {
      const data = doc.data();
      const avg = data.total / data.count;
      const html = `<strong>Average:</strong> ${avg.toFixed(1)} (${data.count} ratings)`;
      el.innerHTML = html;
      ratingCache[benchId] = html;
    } else {
      el.innerHTML = "No ratings yet.";
      ratingCache[benchId] = "No ratings yet.";
    }
  }).catch(() => {
    el.innerHTML = "Rating failed to load.";
  });
}

function submitRating(benchId, value) {
  const rating = parseInt(value);
  if (!rating || rating < 1 || rating > 10) return;

  const ref = db.collection("benchRatings").doc(benchId);
  ref.get().then(doc => {
    if (doc.exists) {
      const data = doc.data();
      ref.set({
        total: data.total + rating,
        count: data.count + 1
      }, { merge: true });
    } else {
      ref.set({ total: rating, count: 1 });
    }

    const select = document.getElementById(`rate-${benchId}`);
    const thanks = document.getElementById(`thanks-${benchId}`);

    if (select) select.disabled = true;
    if (thanks) {
      thanks.style.display = 'block';
      setTimeout(() => (thanks.style.display = 'none'), 2500);
    }

    setTimeout(() => loadRating(benchId), 600);
  });
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
      map.setView([parseFloat(lat), parseFloat(lon)], 15);
    })
    .catch(err => console.error('Geocoding error:', err));
}
