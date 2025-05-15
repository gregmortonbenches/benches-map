const map = L.map('map').setView([54.5, -3], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

const benchIcon = L.divIcon({
  className: 'emoji-marker',
  html: '🪑',
  iconSize: [24, 24],
  iconAnchor: [12, 24]
});

const totalChunks = 28;

for (let i = 1; i <= totalChunks; i++) {
  const chunkPath = `data/chunk_${i}.geojson`;
  console.log(`Fetching: ${chunkPath}`);
  fetch(chunkPath)
    .then(response => {
      if (!response.ok) throw new Error(`Failed to load ${chunkPath}`);
      return response.json();
    })
    .then(data => {
      console.log(`Successfully loaded ${chunkPath}`);
      L.geoJSON(data, {
        pointToLayer: (feature, latlng) =>
          L.marker(latlng, { icon: benchIcon }),
        onEachFeature: (feature, layer) => {
          if (feature.properties?.name) {
            layer.bindPopup(`<b>${feature.properties.name}</b>`);
          }
        }
      }).addTo(map);
    })
    .catch(err => console.error(err));
}
