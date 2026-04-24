/**
 * lookup.js — איתור גוש/חלקה וכתובת
 * מחזיר קישורים ל-GovMap, Mikoom, Google Earth, Street View, Waze, אתר הטאבו
 */

const Lookup = {

  /**
   * בניית קישורים לנכס לפי קואורדינטות
   * @param {number} lat
   * @param {number} lng
   * @param {object} prop - אובייקט נכס (אופציונלי)
   */
  buildLinks(lat, lng, prop = {}) {
    const block = prop.block || '';
    const parcel = prop.parcel || '';
    const address = prop.address || '';

    return {
      govmap: this.govmapUrl(lat, lng, block, parcel),
      mikoom: this.mikoomUrl(block, parcel),
      googleEarth: this.googleEarthUrl(lat, lng),
      streetView: this.streetViewUrl(lat, lng),
      waze: this.wazeUrl(lat, lng),
      tabu: this.tabuUrl(block, parcel),
    };
  },

  /** קישור ל-GovMap (מפה ממשלתית) */
  govmapUrl(lat, lng, block = '', parcel = '') {
    // GovMap תומך בקואורדינטות WGS84 ובגוש/חלקה
    if (block && parcel) {
      return `https://www.govmap.gov.il/?q=${block}/${parcel}&zoom=7&lay=KADASTRAL`;
    }
    return `https://www.govmap.gov.il/?c=${lng},${lat}&zoom=7&lay=KADASTRAL`;
  },

  /** קישור ל-Mikoom (בדיקת בעלות) */
  mikoomUrl(block = '', parcel = '') {
    if (block && parcel) {
      return `https://www.mikoom.co.il/search?block=${block}&parcel=${parcel}`;
    }
    return 'https://www.mikoom.co.il';
  },

  /** קישור ל-Google Earth */
  googleEarthUrl(lat, lng) {
    return `https://earth.google.com/web/search/${lat},${lng}/@${lat},${lng},100a,800d,35y,0h,0t,0r`;
  },

  /** קישור ל-Google Street View */
  streetViewUrl(lat, lng) {
    return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
  },

  /** קישור ל-Waze */
  wazeUrl(lat, lng) {
    return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  },

  /** קישור לאתר הטאבו הרשמי */
  tabuUrl(block = '', parcel = '') {
    return 'https://mekarkein-online.justice.gov.il/';
  },

  /** חיפוש לפי כתובת — Geocoding + בניית קישורים */
  async searchByAddress(street, city) {
    const address = `${street}, ${city}, ישראל`;
    const resultEl = document.getElementById('lookupAddressResult');
    resultEl.innerHTML = '<div class="lookup-loading">⏳ מחפש...</div>';

    const coords = await MapManager.geocode(address);

    if (!coords) {
      resultEl.innerHTML = `
        <div class="lookup-error">
          ❌ לא נמצאו תוצאות עבור: ${address}<br>
          <small>נסה כתובת מפורטת יותר</small>
        </div>`;
      return;
    }

    const links = this.buildLinks(coords.lat, coords.lng);
    resultEl.innerHTML = this._renderAddressResult(address, coords, links);
  },

  /** חיפוש לפי גוש/חלקה — בדיקה בתיק + קישורים */
  searchByBlock(block, parcel, subParcel) {
    const resultEl = document.getElementById('lookupBlockResult');

    if (!block || !parcel) {
      resultEl.innerHTML = '<div class="lookup-error">⚠️ יש להזין לפחות גוש וחלקה</div>';
      return;
    }

    // בדוק אם קיים בתיק
    const all = Storage.getAll();
    const existing = all.find(p =>
      p.block === String(block) &&
      p.parcel === String(parcel) &&
      (!subParcel || p.subParcel === String(subParcel))
    );

    // גוש/חלקה — קישורים (ללא geocoding, אין coords)
    const links = {
      govmap: this.govmapUrl(0, 0, block, parcel),
      mikoom: this.mikoomUrl(block, parcel),
      tabu: this.tabuUrl(block, parcel),
    };

    resultEl.innerHTML = this._renderBlockResult(block, parcel, subParcel, existing, links);
  },

  /** רנדר תוצאת חיפוש כתובת */
  _renderAddressResult(address, coords, links) {
    return `
      <div class="lookup-success">
        <div class="lookup-coords">
          📍 <strong>${address}</strong><br>
          <small>קואורדינטות: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}</small>
        </div>

        <div class="quick-links">
          <a href="${links.govmap}" target="_blank" class="qlink qlink-gov">🏛️ GovMap</a>
          <a href="${links.mikoom}" target="_blank" class="qlink qlink-mik">🔍 Mikoom</a>
          <a href="${links.googleEarth}" target="_blank" class="qlink qlink-earth">🌍 Google Earth</a>
          <a href="${links.streetView}" target="_blank" class="qlink qlink-sv">📸 Street View</a>
          <a href="${links.waze}" target="_blank" class="qlink qlink-waze">🚗 Waze</a>
          <a href="${links.tabu}" target="_blank" class="qlink qlink-tabu">📋 טאבו</a>
        </div>

        <button class="btn btn-gold btn-sm" onclick="Lookup.prefillForm(null, null, '${address.replace(/'/,"\\'")}', ${coords.lat}, ${coords.lng})">
          ➕ הוסף כנכס חדש
        </button>
      </div>
    `;
  },

  /** רנדר תוצאת חיפוש גוש/חלקה */
  _renderBlockResult(block, parcel, subParcel, existing, links) {
    const subStr = subParcel ? `/${subParcel}` : '';
    const existingHtml = existing
      ? `<div class="lookup-found">✅ קיים בתיק: <strong>${existing.address}</strong> — <a href="#" onclick="App.openEditModal('${existing.id}');return false">פתח נכס</a></div>`
      : `<div class="lookup-not-found">🆕 לא קיים בתיק</div>`;

    return `
      <div class="lookup-success">
        <div class="lookup-coords">
          📐 <strong>גוש ${block} / חלקה ${parcel}${subStr}</strong>
        </div>
        ${existingHtml}
        <div class="quick-links">
          <a href="${links.govmap}" target="_blank" class="qlink qlink-gov">🏛️ GovMap</a>
          <a href="${links.mikoom}" target="_blank" class="qlink qlink-mik">🔍 Mikoom</a>
          <a href="${links.tabu}" target="_blank" class="qlink qlink-tabu">📋 טאבו</a>
        </div>
        ${!existing ? `
          <button class="btn btn-gold btn-sm" onclick="Lookup.prefillForm('${block}', '${parcel}', '', null, null)">
            ➕ הוסף כנכס חדש
          </button>` : ''}
      </div>
    `;
  },

  /** מלא טופס הוספת נכס מתוצאת חיפוש */
  prefillForm(block, parcel, address, lat, lng) {
    // פתח את המודל
    App.openAddModal();

    // מלא שדות
    if (address) document.getElementById('fieldAddress').value = address;
    if (block) document.getElementById('fieldBlock').value = block;
    if (parcel) document.getElementById('fieldParcel').value = parcel;

    // שמור coords זמניים
    if (lat && lng) {
      window._prefillCoords = { lat, lng };
    }
  },

  /** בניית HTML קישורים מהירים לכרטיס נכס */
  buildQuickLinksHTML(prop) {
    if (!prop.coords) {
      // ללא קואורדינטות — קישורים לפי גוש/חלקה בלבד
      const gov = this.govmapUrl(0, 0, prop.block, prop.parcel);
      const mik = this.mikoomUrl(prop.block, prop.parcel);
      const tabu = this.tabuUrl(prop.block, prop.parcel);
      return `
        <a href="${gov}" target="_blank" class="qlink qlink-gov" title="GovMap">🏛️</a>
        <a href="${mik}" target="_blank" class="qlink qlink-mik" title="Mikoom">🔍</a>
        <a href="${tabu}" target="_blank" class="qlink qlink-tabu" title="טאבו">📋</a>
      `;
    }

    const { lat, lng } = prop.coords;
    const links = this.buildLinks(lat, lng, prop);
    return `
      <a href="${links.govmap}" target="_blank" class="qlink qlink-gov" title="GovMap">🏛️</a>
      <a href="${links.mikoom}" target="_blank" class="qlink qlink-mik" title="Mikoom">🔍</a>
      <a href="${links.googleEarth}" target="_blank" class="qlink qlink-earth" title="Google Earth">🌍</a>
      <a href="${links.streetView}" target="_blank" class="qlink qlink-sv" title="Street View">📸</a>
      <a href="${links.waze}" target="_blank" class="qlink qlink-waze" title="Waze">🚗</a>
      <a href="${links.tabu}" target="_blank" class="qlink qlink-tabu" title="טאבו">📋</a>
    `;
  },

  /** השלמה אוטומטית לשדה רחוב */
  initAutocomplete() {
    const streetInput = document.getElementById('lookupStreet');
    const cityInput   = document.getElementById('lookupCity');
    const dropdown    = document.getElementById('streetSuggestions');
    if (!streetInput || !dropdown) return;

    let timer = null;
    let selectedIndex = -1;

    const showItems = (items) => {
      if (!items.length) { dropdown.hidden = true; return; }
      dropdown.innerHTML = items.map(s =>
        `<div class="autocomplete-item">${s}</div>`
      ).join('');
      dropdown.hidden = false;
      selectedIndex = -1;
    };

    const applySelection = (text) => {
      streetInput.value = text;
      dropdown.hidden = true;
      selectedIndex = -1;
    };

    dropdown.addEventListener('mousedown', (e) => {
      const item = e.target.closest('.autocomplete-item');
      if (item) applySelection(item.textContent);
    });

    streetInput.addEventListener('keydown', (e) => {
      const items = dropdown.querySelectorAll('.autocomplete-item');
      if (!items.length || dropdown.hidden) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[selectedIndex]?.classList.remove('active');
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        items[selectedIndex]?.classList.add('active');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[selectedIndex]?.classList.remove('active');
        selectedIndex = Math.max(selectedIndex - 1, 0);
        items[selectedIndex]?.classList.add('active');
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        applySelection(items[selectedIndex].textContent);
      } else if (e.key === 'Escape') {
        dropdown.hidden = true;
      }
    });

    streetInput.addEventListener('blur', () => {
      setTimeout(() => { dropdown.hidden = true; }, 200);
    });

    streetInput.addEventListener('input', () => {
      clearTimeout(timer);
      const val = streetInput.value.trim();
      if (val.length < 2) { dropdown.hidden = true; return; }

      timer = setTimeout(async () => {
        const city = cityInput.value.trim() || 'ישראל';
        const q = encodeURIComponent(`${val}, ${city}`);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=7&countrycodes=il&addressdetails=1&accept-language=he`;
        try {
          const res  = await fetch(url, { headers: { 'Accept-Language': 'he' } });
          const data = await res.json();
          const seen = new Set();
          const suggestions = [];
          for (const r of data) {
            const road = r.address?.road;
            if (!road) continue;
            const label = r.address?.house_number ? `${road} ${r.address.house_number}` : road;
            if (!seen.has(label)) { seen.add(label); suggestions.push(label); }
            if (suggestions.length >= 5) break;
          }
          showItems(suggestions);
        } catch {
          dropdown.hidden = true;
        }
      }, 400);
    });
  },
};
