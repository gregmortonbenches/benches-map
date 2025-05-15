<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Benches Map</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <!-- Leaflet CSS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
  <!-- MarkerCluster CSS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.Default.css" />
  
  <style>
    html, body {
      height: 100%;
      margin: 0;
    }

    #header {
      position: fixed;
      top: 0;
      width: 100%;
      background: white;
      padding: 0.5em;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 1em;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    #header h1 {
      margin: 0;
      font-size: 1.2em;
    }

    #header input[type="text"] {
      padding: 0.4em;
      font-size: 1em;
      width: 250px;
      max-width: 80vw;
    }

    #map {
      position: absolute;
      top: 60px; /* adjust depending on header height */
      bottom: 0;
      left: 0;
      right: 0;
    }

    .emoji-marker {
      font-size: 20px;
      line-height: 1;
    }

    .leaflet-popup-content {
      font-size: 14px;
    }

    select {
      margin-top: 4px;
    }
  </style>
</head>
<body>

  <div id="header">
    <h1>Benches Map</h1>
    <input type="text" id="searchInput" placeholder="Search for a place..." />
    <button onclick="searchLocation()">Search</button>
  </div>
  <div id="map"></div>

  <!-- Firebase & Firestore -->
  <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js"></script>

  <!-- Leaflet -->
  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>

  <!-- MarkerCluster -->
  <script src="https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js"></script>

  <!-- Your benches map script -->
  <script src="benches.js"></script>

</body>
</html>
