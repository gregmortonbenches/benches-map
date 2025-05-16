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

// Load geojson tile chunks
for (let row = 0; row < 10; row++) {
  for (let col = 0; col < 10; col++) {
    const url = `data/tile_${row}_${col}.geojson`;
    fetch(url)
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => {
        const layer = L.geoJSON(data, {
          pointToLayer: (feature, latlng) => {
            const props = feature.properties || {};
            const benchId = props['@id'] || `${latlng.lat.toFixed(5)}_${latlng.lng.toFixed(5)}`;
            const name = props.name || "Unnamed Bench";

            const extraDetails = ['backrest', 'seats', 'material', 'colour']
              .filter(key => props[key])
              .map(key => `<div><strong>${key[0].toUpperCase() + key.slice(1)}:</strong> ${props[key]}</div>`)
              .join('');

            const popupHtml = `
              <div class="popup-content">
                <strong>${name}</strong>
                <div id="rating-${benchId}">Loading rating... <span class="rating-spinner"></span></div>
                ${extraDetails}
                <div style="margin-top:6px;">
                  <label for="rate-${benchId}">Rate:</label>
                  <select id="rate-${benchId}" onchange="submitRating('${benchId}', this.value)">
                    <option value="">--</option>
                    ${[...Array(10)].map((_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}
                  </select>
                  <div id="thanks-${benchId}" class="thanks-message" style="display:none;">✅ Thanks for rating!</div>
                </div>
              </div>
            `;

            const marker = L.marker(latlng, { icon: benchIcon });
            marker.bindPopup(popupHtml);
            marker.on('popupopen', () => loadRating(benchId));
            return marker;
          }
        });
        markerCluster.addLayer(layer);
      })
      .catch(err => console.warn(`Failed to load ${url}:`, err));
  }
}

// Load rating from Firestore
function loadRating(benchId) {
  const el = document.getElementById(`rating-${benchId}`);
  if (!el) return;

  el.innerHTML = `Loading rating... <span class="rating-spinner"></span>`;

  if (ratingCache[benchId]) {
    el.innerText = ratingCache[benchId];
    return;
  }

  db.collection("benchRatings").doc(benchId).get().then(doc => {
    if (doc.exists) {
      const data = doc.data();
      const avg = data.total / data.count;
      const text = `Average: ${avg.toFixed(1)} (${data.count} ratings)`;
      el.innerText = text;
      ratingCache[benchId] = text;
    } else {
      el.innerText = "No ratings yet.";
      ratingCache[benchId] = "No ratings yet.";
    }
  }).catch(() => {
    el.innerText = "Rating failed to load.";
  });
}

// Handle rating submission
function submitRating(benchId, value) {
  const rating = parseInt(value);
  if (!rating || rating < 1 || rating > 10) return;

  const ref = db.collection("benchRatings").doc(benchId);
  const select = document.getElementById(`rate-${benchId}`);
  const thanks = document.getElementById(`thanks-${benchId}`);
  const ratingEl = document.getElementById(`rating-${benchId}`);

  select.disabled = true;

  ref.get().then(doc => {
    let newTotal = rating;
    let newCount = 1;

    if (doc.exists) {
      const data = doc.data();
      newTotal += data.total;
      newCount += data.count;
    }

    return ref.set({ total: newTotal, count: newCount }, { merge: true });
  }).then(() => {
    // Show feedback
    if (thanks) {
      thanks.style.display = "block";
    }

    // Update local cache and display
    const newAvg = ratingCache[benchId]
      ? (() => {
          const match = ratingCache[benchId].match(/Average: ([\d.]+) \((\d+)/);
          if (match) {
            const [_, avgStr, countStr] = match;
            const oldTotal = parseFloat(avgStr) * parseInt(countStr);
            const oldCount = parseInt(countStr);
            const newTotal = oldTotal + rating;
            const newCount = oldCount + 1;
            return `Average: ${(newTotal / newCount).toFixed(1)} (${newCount} ratings)`;
          }
          return null;
        })()
      : `Average: ${rating.toFixed(1)} (1 rating)`;

    if (newAvg && ratingEl) {
      ratingEl.innerText = newAvg;
      ratingCache[benchId] = newAvg;
    }

    // Optional: refresh after a second
    setTimeout(() => {
      if (thanks) thanks.style.display = "none";
    }, 3000);
  }).catch(() => {
    alert("Failed to submit rating. Try again later.");
    select.disabled = false;
  });
}

// Search using Nominatim
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
