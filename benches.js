const map = L.map('map').setView([54.5, -3], 6); // UK center

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

const benchIcon = L.divIcon({
  className: 'emoji-marker',
  html: '🪑',
  iconSize: [24, 24],
  iconAnchor: [12, 24]
});

const markerCluster = L.markerClusterGroup();
const searchableLayer = L.layerGroup(); // stores only searchable (named) markers
map.addLayer(markerCluster);

// Add search box for bench names
const searchControl = new L.Control.Search({
  layer: searchableLayer,
  propertyName: 'name',
  marker: false,
  moveToLocation: (latlng, title, map) => {
    map.setView(latlng, 16);
  }
});
map.addControl(searchControl);

// Add geocoder for place/postcode search
L.Control.geocoder({
  defaultMarkGeocode: false
})
.on('markgeocode', function(e) {
  const center = e.geocode.center;
  map.setView(center, 14);

  const nearest = findNearestBench(center);
  if (nearest) {
    nearest.openPopup();
    map.panTo(nearest.getLatLng());
  } else {
    alert('No benches found nearby.');
  }
})
.addTo(map);

// UK bounds tiling system
const latMin = 49.0, latMax = 61.0;
const lonMin = -9.0, lonMax = 2.0;
const rows = 10, cols = 10;
const latStep = (latMax - latMin) / rows;
const lonStep = (lonMax - lonMin) / cols;

const loadedTiles = new Set();

// Calculate which tiles intersect current view
function getTileIndices(bounds) {
  const tiles = [];
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
        tiles.push([row, col]);
      }
    }
  }

  return tiles;
}

// Load a specific tile
function loadTile(row, col) {
  const tileId = `${row}_${col}`;
  if (loadedTiles.has(tileId)) return;

  const url = `data/tile_${row}_${col}.geojson`;
  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      const geojsonLayer = L.geoJSON(data, {
        pointToLayer: (feature, latlng) => {
          const marker = L.marker(latlng, { icon: benchIcon });
          if (feature.properties?.name) {
            marker.bindPopup(`<b>${feature.properties.name}</b>`);
            marker.feature = { properties: { name: feature.properties.name } };
            searchableLayer.addLayer(marker);
          }
          return marker;
        }
      });

      markerCluster.addLayer(geojsonLayer);
      loadedTiles.add(tileId);
    })
    .catch(err => {
      console.warn(`Tile ${tileId} failed to load:`, err);
    });
}

// Load tiles for visible bounds
function loadVisibleTiles() {
  const bounds = map.getBounds();
  const tiles = getTileIndices(bounds);
  tiles.forEach(([row, col]) => loadTile(row, col));
}

map.on('moveend', loadVisibleTiles);
loadVisibleTiles();

// Find nearest marker from geocode result
function findNearestBench(latlng) {
  let nearest = null;
  let minDist = Infinity;

  searchableLayer.eachLayer(marker => {
    const dist = map.distance(latlng, marker.getLatLng());
    if (dist < minDist) {
      minDist = dist;
      nearest = marker;
    }
  });

  return nearest;
}
