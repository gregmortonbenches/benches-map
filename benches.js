const map = L.map('map').setView([54.5, -3], 6); // Center on UK

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

const benchIcon = L.divIcon({
  className: 'emoji-marker',
  html: '🪑',
  iconSize: [24, 24],
  iconAnchor: [12, 24]
});

const markers = L.markerClusterGroup(); // Create cluster group

const loadChunk = (i) => {
  const url = `data/chunk_${i}.geojson`;

  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`Chunk ${i} not found`);
      return response.json();
    })
    .then(data => {
      const layer = L.geoJSON(data, {
        pointToLayer: function(feature, latlng) {
          return L.marker(latlng, { icon: benchIcon });
        },
        onEachFeature: function(feature, layer) {
          if (feature.properties && feature.properties.name) {
            layer.bindPopup(`<b>${feature.properties.name}</b>`);
          }
        }
      });
      markers.addLayer(layer); // Add markers to the cluster group
    })
    .catch(err => {
      console.warn(`Skipped ${url}: ${err.message}`);
    });
};

// Try loading chunks 1 through 30
for (let i = 1; i <= 30; i++) {
  loadChunk(i);
}

// Add clusters to map
map.addLayer(markers);
