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

const totalChunks = 28; // Update if you split into more or fewer chunks

for (let i = 1; i <= totalChunks; i++) {
  const chunkPath = `data/chunk_${i}.geojson`;

  fetch(chunkPath)
    .then(response => {
      if (!response.ok) throw new Error(`Failed to load ${chunkPath}`);
      return response.json();
    })
    .then(data => {
      L.geoJSON(data, {
        pointToLayer: function(feature, latlng) {
          return L.marker(latlng, { icon: benchIcon });
        },
        onEachFeature: function(feature, layer) {
          if (feature.properties && feature.properties.name) {
            layer.bindPopup(`<b>${feature.properties.name}</b>`);
          }
        }
      }).addTo(map);
    })
    .catch(err => console.error(err));
}
