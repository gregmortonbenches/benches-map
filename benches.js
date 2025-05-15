// --- Firebase config ---
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

// --- Map setup ---
const map = L.map('map').setView([54.5, -3], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

const benchIcon = L.divIcon({
  className: 'emoji-marker',
  html: '🪑',
  iconSize: [24, 24],
  iconAnchor: [12, 24]
});

// --- Rating helpers ---
function submitRating(benchId, value) {
  db.collection("ratings").add({
    benchId: benchId,
    rating: value,
    timestamp: Date.now()
  }).then(() => {
    alert("Thanks for your rating!");
  });
}

function getAverageRating(benchId, callback) {
  db.collection("ratings").where("benchId", "==", benchId).get()
    .then(snapshot => {
      const ratings = snapshot.docs.map(doc => doc.data().rating);
      const avg = ratings.length
        ? (ratings.reduce((a, b) => a + b) / ratings.length).toFixed(1)
        : "No ratings yet";
      callback(avg);
    });
}

// --- Grid-based chunk loading ---
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

  const url = `data/tile_${row}_${col}.geojson`;

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return res.json();
    })
    .then(data => {
      L.geoJSON(data, {
        pointToLayer: (feature, latlng) => L.marker(latlng, { icon: benchIcon }),
        onEachFeature: (feature, layer) => {
          const benchId = feature.properties?.id || `${latlng.lat.toFixed(5)}_${latlng.lng.toFixed(5)}`;
          const name = feature.properties?.name || "Unnamed Bench";

          getAverageRating(benchId, avg => {
            const popup = `
              <b>${name}</b><br>
              Average rating: ${avg}<br>
              <input type="number" id="rate_${benchId}" min="1" max="10" value="5" style="width:50px">
              <button onclick="submitRating('${benchId}', parseInt(document.getElementById('rate_${benchId}').value))">Rate</button>
            `;
            layer.bindPopup(popup);
          });
        }
      }).addTo(map);
      loadedTiles.add(tileId);
    })
    .catch(err => console.warn(`Tile ${tileId} failed to load:`, err));
}

function loadVisibleTiles() {
  const bounds = map.getBounds();
  const needed = getTileIndices(bounds);
  needed.forEach(([r, c]) => loadTile(r, c));
}

map.on('moveend', loadVisibleTiles);
loadVisibleTiles();
