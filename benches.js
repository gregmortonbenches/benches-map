// Initialize map
const map = L.map('map').setView([54.5, -3], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

// Limit view to UK
map.setMaxBounds([
  [48.5, -11], // Southwest corner
  [61.5, 3]    // Northeast corner
]);

const benchIcon = L.divIcon({
  className: 'emoji-marker',
  html: '🪑',
  iconSize: [24, 24],
  iconAnchor: [12, 24]
});

// Marker cluster group
const clusterGroup = L.markerClusterGroup();
map.addLayer(clusterGroup);

// UK grid tile system
const latMin = 49.0, latMax = 61.0;
const lonMin = -9.0, lonMax = 2.0;
const rows = 10, cols = 10;
const latStep = (latMax - latMin) / rows;
const lonStep = (lonMax - lonMin) / cols;

const loadedTiles = new Set();

function getTileIndices(bounds) {
  const tiles = [];
  const minLat = Math.max(bounds.getSouth(), latMin);
  const maxLat = Math.min(bounds.getNorth(), latMax);
  const minLon = Math.max(bounds.getWest(), lonMin);
  const maxLon = Math.min(bounds.getEast(), lonMax);

  const rowStart = Math.floor((minLat - latMin) / latStep);
  const rowEnd = Math.floor((maxLat - latMin) / latStep);
  const colStart = Math.floor((minLon - lonMin) / lonStep);
  const colEnd = Math.floor((maxLon - lonMin) / lonStep);

  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = colStart; col <= colEnd; col++) {
      if (row >= 0 && row < rows && col >= 0 && col < cols) {
        tiles.push([row, col]);
      }
    }
  }

  return tiles;
}

function loadTile(row, col) {
  const tileId = `${row}_${col}`;
  if (loadedTiles.has(tileId)) return;

  const url = `data/tile_${tileId}.geojson`;
  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      const layer = L.geoJSON(data, {
        pointToLayer: (feature, latlng) => {
          const marker = L.marker(latlng, { icon: benchIcon });
          const name = feature.properties?.name || 'Unnamed Bench';
          const benchId = feature.properties?.id || `${latlng.lat},${latlng.lng}`;

          marker.bindPopup(`
            <b>${name}</b><br>
            <div id="rating-${benchId.replace(/[^a-zA-Z0-9]/g, '')}">
              <em>Loading rating...</em>
            </div>
          `);
          marker.on('popupopen', () => showRating(benchId));
          return marker;
        }
      });

      clusterGroup.addLayer(layer);
      loadedTiles.add(tileId);
    })
    .catch(err => console.warn(`Tile ${tileId} failed:`, err));
}

function loadVisibleTiles() {
  const bounds = map.getBounds();
  const tiles = getTileIndices(bounds);
  tiles.forEach(([row, col]) => loadTile(row, col));
}

map.on('moveend', loadVisibleTiles);
loadVisibleTiles();

// Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Show and update ratings
function showRating(benchId) {
  const divId = `rating-${benchId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const ratingDiv = document.getElementById(divId);
  if (!ratingDiv) return;

  const docRef = db.collection("benchRatings").doc(benchId);

  docRef.get().then(doc => {
    let current = doc.exists ? doc.data().rating : 0;
    ratingDiv.innerHTML = `
      Rating: ${current.toFixed(1)} / 10<br>
      <input type="range" min="0" max="10" value="${current}" step="1" 
        oninput="this.nextElementSibling.innerText = this.value" 
        onchange="submitRating('${benchId}', this.value)" />
      <span>${current}</span>
    `;
  });
}

function submitRating(benchId, value) {
  db.collection("benchRatings").doc(benchId).set({ rating: parseFloat(value) });
}

// Search bar function
function searchLocation() {
  const query = document.getElementById('searchInput').value;
  if (!query) return;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
  fetch(url)
    .then(res => res.json())
    .then(results => {
      if (results.length > 0) {
        const { lat, lon } = results[0];
        map.setView([parseFloat(lat), parseFloat(lon)], 14);
      } else {
        alert('Location not found.');
      }
    });
}
