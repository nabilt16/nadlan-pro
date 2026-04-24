/**
 * map.js — ניהול המפה האינטראקטיבית
 * שימוש ב-Leaflet.js + OpenStreetMap + Esri World Imagery (לוויין)
 * Geocoding חינמי דרך Nominatim
 */

const MapManager = {
  map: null,
  markers: {},
  currentLayer: 'street',

  // שכבות מפה
  layers: {
    street: null,
    satellite: null,
  },

  /** אתחול המפה */
  init() {
    if (this.map) return;

    // מרכז ברירת מחדל: מרכז ישראל
    this.map = L.map('map', {
      center: [31.7683, 35.2137],
      zoom: 10,
      zoomControl: true,
    });

    // שכבת רחובות — OpenStreetMap
    this.layers.street = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }
    );

    // שכבת לוויין — Esri World Imagery (חינמי, ללא API key)
    this.layers.satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '© Esri, Maxar, Earthstar Geographics',
        maxZoom: 19,
      }
    );

    // טען שכבת רחובות כברירת מחדל
    this.layers.street.addTo(this.map);

    // טען מרקרים של כל הנכסים
    this.refreshMarkers();

    console.log('🗺️ המפה אותחלה');
  },

  /** עבור לשכבת רחובות */
  showStreet() {
    if (this.currentLayer === 'street') return;
    this.map.removeLayer(this.layers.satellite);
    this.layers.street.addTo(this.map);
    this.currentLayer = 'street';
  },

  /** עבור לשכבת לוויין */
  showSatellite() {
    if (this.currentLayer === 'satellite') return;
    this.map.removeLayer(this.layers.street);
    this.layers.satellite.addTo(this.map);
    this.currentLayer = 'satellite';
  },

  /** רענן את כל המרקרים לפי הנכסים הנוכחיים */
  refreshMarkers() {
    if (!this.map) return;

    // מחק מרקרים ישנים
    Object.values(this.markers).forEach(m => this.map.removeLayer(m));
    this.markers = {};

    const properties = Storage.getAll();
    properties.forEach(prop => {
      if (prop.coords?.lat && prop.coords?.lng) {
        this.addMarker(prop);
      }
    });
  },

  /** הוסף מרקר לנכס */
  addMarker(property) {
    if (!this.map || !property.coords) return;

    // צבע מרקר לפי סטטוס
    const color = {
      active: '#4caf50',
      handling: '#c9a84c',
      sold: '#9e9e9e',
    }[property.status] || '#c9a84c';

    // מרקר מותאם אישית
    const icon = L.divIcon({
      className: '',
      html: `
        <div style="
          background:${color};
          color:#111;
          border:2px solid #fff;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          width:28px;height:28px;
          display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:700;
          box-shadow:0 2px 6px rgba(0,0,0,0.5)
        ">
          <span style="transform:rotate(45deg)">${this._typeIcon(property.type)}</span>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28],
    });

    const marker = L.marker([property.coords.lat, property.coords.lng], { icon });

    // Popup עם פרטי הנכס
    marker.bindPopup(this._buildPopup(property), { maxWidth: 260 });

    marker.addTo(this.map);
    this.markers[property.id] = marker;
  },

  /** בנה תוכן popup לנכס */
  _buildPopup(prop) {
    const statusLabel = { active: 'פעיל', handling: 'בטיפול', sold: 'נמכר' }[prop.status] || '';
    const typeLabel = { apartment: 'דירה', house: 'בית', land: 'קרקע', commercial: 'מסחרי' }[prop.type] || '';
    const price = prop.price ? `₪${Number(prop.price).toLocaleString('he-IL')}` : '—';

    return `
      <div dir="rtl" style="font-family:Heebo,sans-serif;min-width:200px">
        <strong style="font-size:14px">${prop.address}</strong>
        <div style="margin-top:6px;font-size:12px;color:#555">
          ${typeLabel} • ${prop.area ? prop.area + ' מ"ר' : ''} • ${price}
        </div>
        <div style="margin-top:4px">
          <span style="
            background:${prop.status==='active'?'#4caf50':prop.status==='handling'?'#c9a84c':'#9e9e9e'};
            color:#fff;padding:2px 8px;border-radius:10px;font-size:11px
          ">${statusLabel}</span>
        </div>
        ${prop.ownerName ? `<div style="margin-top:6px;font-size:12px">👤 ${prop.ownerName}</div>` : ''}
        <div style="margin-top:8px">
          <button onclick="App.openEditModal('${prop.id}')"
            style="background:#c9a84c;color:#111;border:none;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:Heebo,sans-serif">
            ✏️ עריכה
          </button>
        </div>
      </div>
    `;
  },

  /** ריכוז מפה על נכס */
  focusProperty(id) {
    const marker = this.markers[id];
    if (marker) {
      this.map.setView(marker.getLatLng(), 16);
      marker.openPopup();
    }
  },

  /** Geocoding — כתובת → קואורדינטות (Nominatim) */
  async geocode(address) {
    try {
      const encoded = encodeURIComponent(address + ', Israel');
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1&accept-language=he`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'he', 'User-Agent': 'NadlanPro/1.0' }
      });
      const data = await res.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
      return null;
    } catch (e) {
      console.error('שגיאת Geocoding:', e);
      return null;
    }
  },

  /** חיפוש כתובת על המפה */
  async searchAndPan(address) {
    const coords = await this.geocode(address);
    if (coords) {
      this.map.setView([coords.lat, coords.lng], 17);
      // מרקר זמני לתוצאת החיפוש
      if (this._searchMarker) this.map.removeLayer(this._searchMarker);
      this._searchMarker = L.marker([coords.lat, coords.lng])
        .addTo(this.map)
        .bindPopup(`📍 ${address}`)
        .openPopup();
      return coords;
    } else {
      alert('לא נמצאה כתובת. נסה שוב עם כתובת מפורטת יותר.');
      return null;
    }
  },

  /** אייקון לפי סוג נכס */
  _typeIcon(type) {
    return { apartment: '🏢', house: '🏠', land: '🌿', commercial: '🏪' }[type] || '📍';
  },
};
