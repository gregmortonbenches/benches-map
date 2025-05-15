// Initialize map, restricted to UK bounds
const map = L.map('map', {
  maxBounds: [
    [48.5, -11], // SW
    [61.5, 3]    // NE
  ],
  maxBoundsViscosity: 1.0
}).setView([54.5, -3], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
}).addTo(map);

// Emoji bench icon
const benchIcon = L.divIcon({
  className: 'emoji-marker',
  html: '🪑',
  iconSize: [24, 24],
  iconAnchor: [12, 24]
});

// Marker cluster group
const markerCluster = L.markerClusterGroup();
map.addLayer(markerCluster);

// Load and add all chunks
const loadChunk = (i) => {
  const url = `data/chunk_${i}.geojson`;
  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`Chunk ${i} not found`);
      return res.json();
    })
    .then(data => {
      const geojson = L.geoJSON(data, {
        pointToLayer: (feature, latlng) =>
          L.marker(latlng, { icon: benchIcon }),
        onEachFeature: (feature, layer) => {
          if (feature.properties?.name) {
            layer.bindPopup(`<b>${feature.properties.name}</b>`);
          }
        }
      });
      markerCluster.addLayer(geojson);
    })
    .catch(err => console.warn(`Skipped ${url}: ${err.message}`));
};

// Load chunks 1–30
for (let i = 1; i <= 30; i++) {
  loadChunk(i);
}

// Add geocoder
const geocoder = L.Control.geocoder({
  defaultMarkGeocode: false
})
  .on('markgeocode', function (e) {
    const { center } = e.geocode;
    map.setView(center, 14);

    // Find nearest bench
    let nearest = null;
    let minDist = Infinity;

    markerCluster.eachLayer(marker => {
      const dist = center.distanceTo(marker.getLatLng());
      if (dist < minDist) {
        minDist = dist;
        nearest = marker;
      }
    });

    if (nearest) {
      nearest.openPopup();
      map.panTo(nearest.getLatLng());
    }
  })
  .addTo(map);
