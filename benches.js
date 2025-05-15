const map = L.map('map').setView([54.5, -3], 6); // Center on UK

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

const benches = [
  { lat: 51.5074, lon: -0.1278, name: "Bench in London" },
  { lat: 53.4808, lon: -2.2426, name: "Bench in Manchester" },
  { lat: 55.9533, lon: -3.1883, name: "Bench in Edinburgh" },
];

benches.forEach(bench => {
  L.marker([bench.lat, bench.lon]).addTo(map)
    .bindPopup(`<b>${bench.name}</b>`);
});
