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
                
                <!-- Comfort Rating -->
                <label for="comfort-${benchId}">Comfort:</label>
                <div id="comfort-${benchId}" class="star-rating">
                  <input type="radio" name="comfort-${benchId}" value="1" /> ★
                  <input type="radio" name="comfort-${benchId}" value="2" /> ★★
                  <input type="radio" name="comfort-${benchId}" value="3" /> ★★★
                  <input type="radio" name="comfort-${benchId}" value="4" /> ★★★★
                  <input type="radio" name="comfort-${benchId}" value="5" /> ★★★★★
                </div>
                
                <!-- View Rating -->
                <label for="view-${benchId}">View:</label>
                <div id="view-${benchId}" class="star-rating">
                  <input type="radio" name="view-${benchId}" value="1" /> ★
                  <input type="radio" name="view-${benchId}" value="2" /> ★★
                  <input type="radio" name="view-${benchId}" value="3" /> ★★★
                  <input type="radio" name="view-${benchId}" value="4" /> ★★★★
                  <input type="radio" name="view-${benchId}" value="5" /> ★★★★★
                </div>
                
                <!-- Ambience Rating -->
                <label for="ambience-${benchId}">Ambience:</label>
                <div id="ambience-${benchId}" class="star-rating">
                  <input type="radio" name="ambience-${benchId}" value="1" /> ★
                  <input type="radio" name="ambience-${benchId}" value="2" /> ★★
                  <input type="radio" name="ambience-${benchId}" value="3" /> ★★★
                  <input type="radio" name="ambience-${benchId}" value="4" /> ★★★★
                  <input type="radio" name="ambience-${benchId}" value="5" /> ★★★★★
                </div>

                <div id="thanks-${benchId}" class="fade-message hidden">Thanks for rating!</div>
              </div>
            `;

            marker.bindPopup(popupContent);
            marker.on('popupopen', () => loadRating(benchId));
            return marker;
          }
        });
        markerCluster.addLayer(layer);
      });
  }
}

function submitRating(benchId) {
  const comfortRating = parseInt(document.querySelector(`input[name="comfort-${benchId}"]:checked`)?.value);
  const viewRating = parseInt(document.querySelector(`input[name="view-${benchId}"]:checked`)?.value);
  const ambienceRating = parseInt(document.querySelector(`input[name="ambience-${benchId}"]:checked`)?.value);

  if (!comfortRating || !viewRating || !ambienceRating) return;

  const safeId = sanitizeId(benchId);
  const ref = db.collection("benchRatings").doc(safeId);

  ref.get().then(doc => {
    if (doc.exists) {
      const data = doc.data();
      ref.set({
        comfortTotal: data.comfortTotal + comfortRating,
        comfortCount: data.comfortCount + 1,
        viewTotal: data.viewTotal + viewRating,
        viewCount: data.viewCount + 1,
        ambienceTotal: data.ambienceTotal + ambienceRating,
        ambienceCount: data.ambienceCount + 1
      }, { merge: true });
    } else {
      ref.set({
        comfortTotal: comfortRating,
        comfortCount: 1,
        viewTotal: viewRating,
        viewCount: 1,
        ambienceTotal: ambienceRating,
        ambienceCount: 1
      });
    }

    document.querySelectorAll(`#comfort-${benchId} input, #view-${benchId} input, #ambience-${benchId} input`)
      .forEach(input => input.disabled = true);

    const thanksEl = document.getElementById(`thanks-${benchId}`);
    if (thanksEl) {
      thanksEl.classList.remove('hidden');
      setTimeout(() => thanksEl.classList.add('hidden'), 2500);
    }

    setTimeout(() => loadRating(benchId), 500);
  });
}

function loadRating(benchId) {
  const safeId = sanitizeId(benchId);
  const el = document.getElementById(`rating-${benchId}`);
  if (!el) return;

  el.innerHTML = `<span class="spinner"></span>`;

  if (ratingCache[safeId]) {
    el.innerText = ratingCache[safeId];
    return;
  }

  db.collection("benchRatings").doc(safeId).get()
    .then(doc => {
      if (doc.exists) {
        const data = doc.data();
        
        // Average ratings for comfort, view, and ambience
        const comfortAvg = data.comfortTotal / data.comfortCount;
        const viewAvg = data.viewTotal / data.viewCount;
        const ambienceAvg = data.ambienceTotal / data.ambienceCount;

        // Calculate overall average
        const overallAvg = (comfortAvg + viewAvg + ambienceAvg) / 3;

        const text = `Average Ratings:
                      Comfort: ${comfortAvg.toFixed(1)} (${data.comfortCount} ratings)
                      View: ${viewAvg.toFixed(1)} (${data.viewCount} ratings)
                      Ambience: ${ambienceAvg.toFixed(1)} (${data.ambienceCount} ratings)
                      Overall: ${overallAvg.toFixed(1)}`;

        el.innerText = text;
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

function sanitizeId(benchId) {
  return benchId.replace(/\W+/g, '_');
}

function searchLocation() {
  const query = document.getElementById('searchInput').value;
  if (query) {
    const encodedQuery = encodeURIComponent(query);
    window.open(`https://www.google.com/maps/search/?q=${encodedQuery}`, '_blank');
  }
}
