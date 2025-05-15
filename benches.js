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

// Cluster group
const benchCluster = L.markerClusterGroup();
map.addLayer(benchCluster);

// UK bounds grid
const latMin = 49.0, latMax = 61.0;
const lonMin = -9.0, lonMax = 2.0;
const rows = 10, cols = 10;
const latStep = (latMax - latMin) / rows;
const lonStep = (lonMax - lonMin) / cols;
const loadedTiles = new Set();

function getTileIndices(bounds) {
  const tilesToLoad = [];
  const minLat = Math.max(bounds.getSouth(), latMin);
  const maxLat = Math.min(bounds.getNorth(), latMax);
  const minLon = Math.max(bounds.getWest(), lonMin);
  const maxLon = Math.min(bounds.getEast(), lonMax);

  const rowStart = Math.floor((minLat - latMin) / latStep);
  const rowEnd   = Math.floor((maxLat - latMin) / latStep);
  const colStart = Math.floor((minLon - lonMin) / lonStep);
  const colEnd   = Math.floor((maxLon - lonMin) / lonStep);

  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = colStart; col <= colEnd; col++) {
      if (row >= 0 && row < rows && col >= 0 && col < cols) {
        tilesToLoad.push([row, col]);
      }
    }
  }
  return tilesToLoad;
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
      const geojson = L.geoJSON(data, {
        pointToLayer: (feature, latlng) =>
          L.marker(latlng, { icon: benchIcon }),
        onEachFeature: (feature, layer) => {
          if (feature.properties?.name) {
            layer.bindPopup(`<b>${feature.properties.name}</b>`);
          }
        }
      });
      benchCluster.addLayer(geojson);
      loadedTiles.add(tileId);
    })
    .catch(err => console.warn(`Tile ${tileId} failed to load:`, err));
}

function loadVisibleTiles() {
  const visibleBounds = map.getBounds();
  const neededTiles = getTileIndices(visibleBounds);
  neededTiles.forEach(([row, col]) => loadTile(row, col));
}

map.on('moveend', loadVisibleTiles);
loadVisibleTiles();
