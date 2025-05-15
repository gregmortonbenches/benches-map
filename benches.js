// Initialize Firebase (replace with your config)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

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

// Load all tile chunks
for (let row = 0; row < 10; row++) {
  for (let col = 0; col < 10; col++) {
    const url = `data/tile_${row}_${col}.geojson`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(data => {
        L.geoJSON(data, {
          pointToLayer: (feature, latlng) => {
            const marker = L.marker(latlng, { icon: benchIcon });
            const id = feature.properties.id || `${latlng.lat.toFixed(5)}_${latlng.lng.toFixed(5)}`;

            marker.bindPopup(createPopupHtml(id, feature));
            return marker;
          }
        }).eachLayer(layer => markerCluster.addLayer(layer));
      })
      .catch(err => console.warn(`Failed to load ${url}:`, err));
  }
}

// Generate rating popup content
function createPopupHtml(benchId, feature) {
  const name = feature.properties?.name || "Unnamed Bench";
  const ratingDivId = `rating-${benchId}`;
  const html = `
    <div><strong>${name}</strong></div>
    <div class="rating">
      <label for="rate-${benchId}">Rate this bench:</label>
      <select id="rate-${benchId}" onchange="submitRating('${benchId}', this.value)">
        <option value="">--</option>
        ${[...Array(10)].map((_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}
      </select>
    </div>
    <div id="${ratingDivId}">Loading average rating...</div>
  `;

  // Load existing average rating
  db.collection("benchRatings").doc(benchId).get().then(doc => {
    if (doc.exists) {
      const data = doc.data();
      const avg = data.total / data.count;
      document.getElementById(ratingDivId).innerText = `Average: ${avg.toFixed(1)} (${data.count} ratings)`;
    } else {
      document.getElementById(ratingDivId).innerText = "No ratings yet.";
    }
  });

  return html;
}

// Submit user rating
function submitRating(benchId, value) {
  const ref = db.collection("benchRatings").doc(benchId);
  const rating = parseInt(value);

  ref.get().then(doc => {
    if (doc.exists) {
      const data = doc.data();
      ref.set({
        total: data.total + rating,
        count: data.count + 1
      });
    } else {
      ref.set({ total: rating, count: 1 });
    }
  });
}

// Search with Nominatim
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
