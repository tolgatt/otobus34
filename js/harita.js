const map = L.map('map').setView([41.0161, 28.9944], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors | Uicons by <a href="https://www.flaticon.com/uicons">Flaticon</a>'
}).addTo(map);

let markers = L.markerClusterGroup();
let allMarkers = [];
let updateIntervalID;
let lastUpdateTime = 0;
let routeLayer;

function getCustomIcon(garage) {
  let iconUrl;
  if (!garage || garage === "null") {
    iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png';
    colorClass = 'red';
  } else if (["Hasanpaşa", "Edirnekapı"].includes(garage.trim())) {
    iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png';
    colorClass = 'blue';
  } else if (["ADALAR"].includes(garage.trim())) {
    iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png';
    colorClass = 'green';
  } else {
    iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png';
    colorClass = 'black';
  }
  return L.icon({
    iconUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  });
}

function getPopupHTML(vehicle, lineCode = '—') {
  const containerClass = !vehicle.garageName ? 'red' : ["Hasanpaşa", "Edirnekapı"].includes(vehicle.garageName) ? 'blue' : ["ADALAR"].includes(vehicle.garageName) ? 'green' : 'black';
  
  const lastDateTimeString = `${vehicle.lastLocationDate} ${vehicle.lastLocationTime}`;
  const parsed = dayjs(lastDateTimeString, "DD-MM-YYYY HH:mm:ss");
  const relative = parsed.isValid() ? parsed.fromNow() : '-';

  return `
    <div class="popup-container ${containerClass}">
      <div class="popup-header">
        <div class="door-code">${vehicle.vehicleDoorCode}</div>
        <div class="plate">${vehicle.numberPlate}</div>
      </div>
      <div class="popup-section">
        <strong><i class="fa-sharp fa-solid fa-route"></i> Hat:</strong> ${lineCode}<br>
        <strong><i class="fa-sharp fa-solid fa-garage"></i> Garaj:</strong> ${vehicle.garageName || '—'}<br>
        <strong><i class="fa-sharp fa-solid fa-briefcase-blank"></i> Şirket:</strong> ${vehicle.operatorType}<br>
      </div>
      <div class="popup-section">
        <strong><i class="fa-sharp fa-solid fa-bus-simple"></i> Model:</strong> ${vehicle.modelYear} ${vehicle.brandName}<br>
        <strong><i class="fa-sharp fa-solid fa-van-shuttle"></i> Tür:</strong> ${vehicle.vehicleType || '-'}<br>
        <strong><i class="fa-sharp fa-solid fa-person-seat"></i> Kapasite:</strong> ${vehicle.seatingCapacity || '-'} / ${vehicle.fullCapacity}
      </div>
      <div class="popup-section">
        <strong><i class="fa-sharp fa-solid fa-calendar-clock"></i> Son veri:</strong> ${vehicle.lastLocationDate} ${vehicle.lastLocationTime}<br>
        <strong></strong> (${relative})<br>
        <strong><i class="fa-sharp fa-solid fa-gauge-high"></i> Hız:</strong> ${vehicle.speed} km/h
      </div>
      <div class="popup-icons">
        <div class="icon-badge ${vehicle.hasUsbCharger ? '' : 'disabled'}"><i class="fa-sharp fa-solid fa-battery-bolt"></i> USB şarj</div>
        <div class="icon-badge ${vehicle.hasWifi ? '' : 'disabled'}"><i class="fa-sharp fa-solid fa-wifi"></i> İBB Wi-Fi</div>
        <div class="icon-badge ${vehicle.hasBicycleRack ? '' : 'disabled'}"><i class="fa-sharp fa-solid fa-bicycle"></i> Bisiklet aparatı</div>
        <div class="icon-badge ${vehicle.accessibility ? '' : 'disabled'}"><i class="fa-sharp fa-solid fa-wheelchair"></i> Engelli erişimi</div>
      </div>
      <a class="popup-link" href="gorev.html?arac=${vehicle.vehicleDoorCode}&utm_source=harita" target="_blank"><i class="fa-sharp fa-solid fa-link"></i> Detaylı görev bilgisi</a>
      <a class="popup-link" href="https://arac.iett.gov.tr/${vehicle.vehicleDoorCode}" target="_blank"><i class="fa-sharp fa-solid fa-link"></i> Araç İETT</a>
    </div>
  `;
}

function updateGeoJSON() {
  const now = Date.now();
  if (now - lastUpdateTime < 60000) {
    alert('1 dakikada birden fazla güncelleme yapılamaz.');
    return;
  }
  document.getElementById('loading').style.display = 'block';
  fetch('https://arac.iett.gov.tr/api/task/bus-fleet/buses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
  .then(res => res.json())
  .then(data => {
    markers.clearLayers();
    allMarkers = [];
    data.forEach(vehicle => {
      const lat = vehicle.latitude;
      const lon = vehicle.longitude;
      if (!lat || !lon) return;
      const marker = L.marker([lat, lon], {
        icon: getCustomIcon(vehicle.garageName),
        opacity: 1
      });
      marker.feature = { properties: vehicle };
      marker.colorClass = colorClass;
      marker.bindPopup(getPopupHTML(vehicle));
      marker.on('click', () => {
        fetch(`https://arac.iett.gov.tr/api/task/getCarTasks/${vehicle.vehicleDoorCode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        .then(res => res.json())
        .then(taskData => {
          const lineCode = taskData && taskData.length ? taskData[0].lineCode || '—' : 'Görev yok';
          marker.bindPopup(getPopupHTML(vehicle, lineCode)).openPopup();
        })
        .catch(() => {
          marker.bindPopup(getPopupHTML(vehicle, 'Hata')).openPopup();
        });
      });
      markers.addLayer(marker);
      allMarkers.push(marker);
    });

    allMarkers.forEach(marker => markers.addLayer(marker));
    map.addLayer(markers);

    document.getElementById('loading').style.display = 'none';
    lastUpdateTime = Date.now();
  })
  .catch(err => {
    console.error(err);
    document.getElementById('loading').innerHTML = 'Otobüs verisi alınamadı <i class="fa-sharp fa-solid fa-face-sad-tear"></i>';
  });
}

function addRouteMarkers(hatKodu) {
  fetch('https://canlisefer.deno.dev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hat: hatKodu })
  })
  .then(res => res.json())
  .then(data => {
    const matchedMarkers = [];

    markers.clearLayers();

    data.forEach(item => {
      const kapino = item.kapino;
      const matchedMarker = allMarkers.find(marker => {
        const vehicle = marker.feature.properties;
        return vehicle.vehicleDoorCode === kapino;
      });

      if (matchedMarker) {
        const vehicle = matchedMarker.feature.properties;

        const popupHTML = `
          <div class="popup-container">
            <div class="popup-header">
              <div class="door-code">${vehicle.vehicleDoorCode}</div>
              <div class="plate">${vehicle.numberPlate}</div>
            </div>
            <div class="popup-section">
              <strong><i class="fa-sharp fa-solid fa-route"></i> Canlı hat:</strong> ${item.hatkodu}<br>
              <strong><i class="fa-sharp fa-solid fa-arrow-right"></i> Yön:</strong> ${item.yon}<br>
              <strong><i class="fa-sharp fa-solid fa-garage"></i> Garaj:</strong> ${vehicle.garageName || '—'}<br>
              <strong><i class="fa-sharp fa-solid fa-briefcase-blank"></i> Şirket:</strong> ${vehicle.operatorType}<br>
            </div>
            <div class="popup-section">
              <strong><i class="fa-sharp fa-solid fa-bus-simple"></i> Model:</strong> ${vehicle.modelYear} ${vehicle.brandName}<br>
              <strong><i class="fa-sharp fa-solid fa-van-shuttle"></i> Tür:</strong> ${vehicle.vehicleType || '-'}<br>
              <strong><i class="fa-sharp fa-solid fa-person-seat"></i> Kapasite:</strong> ${vehicle.seatingCapacity || '-'} / ${vehicle.fullCapacity}
            </div>
            <div class="popup-section">
              <strong><i class="fa-sharp fa-solid fa-calendar-clock"></i> Son veri:</strong> ${vehicle.lastLocationDate} ${vehicle.lastLocationTime}<br>
              <strong><i class="fa-sharp fa-solid fa-gauge-high"></i> Hız:</strong> ${vehicle.speed} km/h
            </div>
            <div class="popup-icons">
              <div class="icon-badge ${vehicle.hasUsbCharger ? '' : 'disabled'}"><i class="fa-sharp fa-solid fa-battery-bolt"></i> USB şarj</div>
              <div class="icon-badge ${vehicle.hasWifi ? '' : 'disabled'}"><i class="fa-sharp fa-solid fa-wifi"></i> İBB Wi-Fi</div>
              <div class="icon-badge ${vehicle.hasBicycleRack ? '' : 'disabled'}"><i class="fa-sharp fa-solid fa-bicycle"></i> Bisiklet aparatı</div>
              <div class="icon-badge ${vehicle.accessibility ? '' : 'disabled'}"><i class="fa-sharp fa-solid fa-wheelchair"></i> Engelli erişimi</div>
            </div>
            <a class="popup-link" href="gorev.html?arac=${vehicle.vehicleDoorCode}&utm_source=harita" target="_blank"><i class="fa-sharp fa-solid fa-link"></i> Detaylı görev bilgisi</a>
            <a class="popup-link" href="https://arac.iett.gov.tr/${vehicle.vehicleDoorCode}" target="_blank"><i class="fa-sharp fa-solid fa-link"></i> Araç İETT</a>
          </div>
        `;

        matchedMarker.closePopup();
        matchedMarker.unbindPopup();
        matchedMarker.bindPopup(popupHTML).openPopup();

        matchedMarkers.push(matchedMarker);
      } else {
        console.log(`Kapı no eşleşmedi: ${kapino}`);
      }
    });

    matchedMarkers.forEach(marker => {
      markers.addLayer(marker);
    });

    map.addLayer(markers);

    if (matchedMarkers.length) {
      const group = L.featureGroup(matchedMarkers);
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  })
  .catch(err => {
    console.error('Backend hatası:', err);
  });
}

function filterMarkers() {
  const value = document.getElementById('search').value.toLowerCase();
  const colorFilter = document.getElementById('color-filter').value;
  markers.clearLayers();
  let matchedMarkers = [];
  allMarkers.forEach(marker => {
    const p = marker.feature.properties;
    const matchesSearch = (value.startsWith("34") && p.numberPlate.toLowerCase().includes(value)) ||
                          (!value.startsWith("34") && p.vehicleDoorCode.toLowerCase().includes(value));
    const matchesColor = !colorFilter || marker.colorClass === colorFilter;
    if (matchesSearch && matchesColor) {
      markers.addLayer(marker);
      matchedMarkers.push(marker);
    }
  });
    
  if (matchedMarkers.length === 1) {
    map.flyTo(matchedMarkers[0].getLatLng(), 16, { duration: 1.5 });
  } else if (matchedMarkers.length > 1) {
    const group = L.featureGroup(matchedMarkers);
    map.fitBounds(group.getBounds(), { padding: [50, 50] });
  }
}

function setUpdateInterval() {
  const minutes = parseInt(document.getElementById('update-interval').value) || 5;
  clearInterval(updateIntervalID);
  updateIntervalID = setInterval(updateGeoJSON, minutes * 60000);
}

document.getElementById('update-button').addEventListener('click', updateGeoJSON);
document.getElementById('search').addEventListener('input', filterMarkers);
document.getElementById('color-filter').addEventListener('input', filterMarkers);
document.getElementById('update-interval').addEventListener('input', setUpdateInterval);
document.getElementById('legend').addEventListener('click', () => {
  const content = document.getElementById('legend-content');
  content.style.display = content.style.display === 'block' ? 'none' : 'block';
});
document.getElementById('toggle-btn').addEventListener('click', () => {
  const control = document.getElementById('control-container');
  control.style.display = control.style.display === 'block' ? 'none' : 'block';
});
document.getElementById('hat-kodu-filtrele-btn').addEventListener('click', () => {
  const hatKodu = document.getElementById('hat-kodu-input').value.trim();
  if (hatKodu) {
    addRouteMarkers(hatKodu);
  } else {
    alert('Lütfen geçerli bir hat kodu girin.');
  }
});
document.getElementById('filtreyi-kaldir-btn').addEventListener('click', () => {
  document.getElementById('hat-kodu-input').value = '';
  markers.clearLayers();
  map.removeLayer(markers);
  updateGeoJSON();
});
updateGeoJSON();
updateIntervalID = setInterval(updateGeoJSON, 300000);
