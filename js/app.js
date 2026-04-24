/**
 * app.js — לוגיקה ראשית של האפליקציה
 * ניהול UI, CRUD נכסים, חיפוש וסינון, הדפסה
 */

const App = {

  /** אתחול האפליקציה */
  init() {
    // טען נתוני דמו אם אין נתונים
    Storage.loadDemoIfEmpty();

    // אתחל ממשק
    this.bindEvents();
    this.renderProperties();
    this.switchTab('properties');

    console.log('✅ נדל"ן פרו — מוכן לעבודה');
  },

  // ══════════════════════════════════════════════════
  //  TABS
  // ══════════════════════════════════════════════════

  switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // אתחל מפה בפעם הראשונה שעוברים אליה
    if (tabName === 'map') {
      setTimeout(() => {
        MapManager.init();
        MapManager.refreshMarkers();
      }, 50);
    }
  },

  // ══════════════════════════════════════════════════
  //  RENDER PROPERTIES
  // ══════════════════════════════════════════════════

  renderProperties() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;

    let props = Storage.getAll();

    // סינון
    if (search) {
      props = props.filter(p =>
        (p.address || '').toLowerCase().includes(search) ||
        (p.ownerName || '').toLowerCase().includes(search) ||
        (p.block || '').includes(search) ||
        (p.parcel || '').includes(search) ||
        (p.notes || '').toLowerCase().includes(search)
      );
    }
    if (statusFilter) props = props.filter(p => p.status === statusFilter);
    if (typeFilter) props = props.filter(p => p.type === typeFilter);

    const grid = document.getElementById('propertiesGrid');
    const empty = document.getElementById('emptyState');

    if (props.length === 0) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    grid.innerHTML = props.map(p => this._buildCard(p)).join('');
  },

  /** בנה HTML כרטיס נכס */
  _buildCard(prop) {
    const statusLabel = { active: 'פעיל', handling: 'בטיפול', sold: 'נמכר' }[prop.status];
    const typeLabel = { apartment: 'דירה', house: 'בית', land: 'קרקע', commercial: 'מסחרי' }[prop.type];
    const typeIcon = { apartment: '🏢', house: '🏠', land: '🌿', commercial: '🏪' }[prop.type];
    const price = prop.price ? `₪${Number(prop.price).toLocaleString('he-IL')}` : '—';
    const images = prop.images || [];

    // תגיות מסמכים
    const docs = [];
    if (prop.docs?.tabu) docs.push('<span class="doc-tag">נסח טאבו ✓</span>');
    if (prop.docs?.appraisal) docs.push('<span class="doc-tag">שמאי ✓</span>');
    if (prop.docs?.mortgage) docs.push('<span class="doc-tag doc-mortgage">שיעבוד ⚠️</span>');

    // קישורים מהירים
    const quickLinks = Lookup.buildQuickLinksHTML(prop);

    // תמונה ראשית
    const thumbHtml = images.length > 0 ? `
      <div class="card-thumb-wrap" onclick="App.openLightbox('${prop.id}', 0)">
        <img src="${images[0]}" class="card-thumb" alt="תמונת נכס">
        ${images.length > 1 ? `<span class="card-thumb-count">📷 ${images.length}</span>` : ''}
      </div>` : '';

    return `
      <div class="property-card status-${prop.status}" id="card-${prop.id}">
        ${thumbHtml}
        <div class="card-header">
          <div class="card-type">${typeIcon} ${typeLabel}</div>
          <span class="status-badge status-${prop.status}">${statusLabel}</span>
        </div>

        <h3 class="card-address">${prop.address || '—'}</h3>

        <div class="card-meta">
          ${prop.block ? `<span>גוש ${prop.block}${prop.parcel ? '/' + prop.parcel : ''}${prop.subParcel ? '/' + prop.subParcel : ''}</span>` : ''}
          ${prop.area ? `<span>${prop.area} מ"ר</span>` : ''}
        </div>

        <div class="card-price">${price}</div>

        ${prop.ownerName ? `
          <div class="card-owner">
            <span>👤 ${prop.ownerName}</span>
            ${prop.ownerPhone ? `<a href="tel:${prop.ownerPhone}" class="owner-phone">${prop.ownerPhone}</a>` : ''}
          </div>` : ''}

        ${docs.length ? `<div class="card-docs">${docs.join('')}</div>` : ''}

        ${prop.notes ? `<div class="card-notes">${prop.notes}</div>` : ''}

        <div class="card-quick-links">${quickLinks}</div>

        <div class="card-actions">
          ${images.length > 0 ? `<button class="btn btn-sm btn-outline" onclick="App.openLightbox('${prop.id}', 0)">📷 ${images.length}</button>` : ''}
          <button class="btn btn-sm btn-outline" onclick="App.openEditModal('${prop.id}')">✏️ עריכה</button>
          <button class="btn btn-sm btn-outline" onclick="App.focusOnMap('${prop.id}')">🗺️ מפה</button>
          <button class="btn btn-sm btn-outline" onclick="App.printProperty('${prop.id}')">🖨️ הדפסה</button>
          <button class="btn btn-sm btn-danger" onclick="App.deleteProperty('${prop.id}')">🗑️</button>
        </div>
      </div>
    `;
  },

  // ══════════════════════════════════════════════════
  //  MODAL — הוספה / עריכה
  // ══════════════════════════════════════════════════

  openAddModal() {
    window._editingId = null;
    window._prefillCoords = null;
    window._pendingImages = [];
    document.getElementById('modalTitle').textContent = 'הוספת נכס חדש';
    document.getElementById('propertyForm').reset();
    document.getElementById('fieldId').value = '';
    this._renderImagePreviews();
    this._showModal();
  },

  openEditModal(id) {
    const prop = Storage.getById(id);
    if (!prop) return;

    window._editingId = id;
    window._pendingImages = [...(prop.images || [])];
    document.getElementById('modalTitle').textContent = 'עריכת נכס';
    document.getElementById('fieldId').value = id;

    // מלא שדות
    document.getElementById('fieldAddress').value = prop.address || '';
    document.getElementById('fieldBlock').value = prop.block || '';
    document.getElementById('fieldParcel').value = prop.parcel || '';
    document.getElementById('fieldSubParcel').value = prop.subParcel || '';
    document.getElementById('fieldType').value = prop.type || 'apartment';
    document.getElementById('fieldPrice').value = prop.price || '';
    document.getElementById('fieldArea').value = prop.area || '';
    document.getElementById('fieldStatus').value = prop.status || 'active';
    document.getElementById('fieldOwnerName').value = prop.ownerName || '';
    document.getElementById('fieldOwnerPhone').value = prop.ownerPhone || '';
    document.getElementById('fieldNotes').value = prop.notes || '';
    document.getElementById('docTabu').checked = prop.docs?.tabu || false;
    document.getElementById('docAppraisal').checked = prop.docs?.appraisal || false;
    document.getElementById('docMortgage').checked = prop.docs?.mortgage || false;

    this._renderImagePreviews();
    this._showModal();
  },

  _showModal() {
    document.getElementById('modalOverlay').style.display = 'flex';
  },

  _hideModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    window._editingId = null;
    window._prefillCoords = null;
  },

  /** שמור נכס (הוספה או עדכון) */
  async saveProperty() {
    const address = document.getElementById('fieldAddress').value.trim();
    if (!address) {
      alert('יש להזין כתובת');
      return;
    }

    const prop = {
      address,
      block: document.getElementById('fieldBlock').value.trim(),
      parcel: document.getElementById('fieldParcel').value.trim(),
      subParcel: document.getElementById('fieldSubParcel').value.trim(),
      type: document.getElementById('fieldType').value,
      price: Number(document.getElementById('fieldPrice').value) || 0,
      area: Number(document.getElementById('fieldArea').value) || 0,
      status: document.getElementById('fieldStatus').value,
      ownerName: document.getElementById('fieldOwnerName').value.trim(),
      ownerPhone: document.getElementById('fieldOwnerPhone').value.trim(),
      notes: document.getElementById('fieldNotes').value.trim(),
      docs: {
        tabu: document.getElementById('docTabu').checked,
        appraisal: document.getElementById('docAppraisal').checked,
        mortgage: document.getElementById('docMortgage').checked,
      },
      images: window._pendingImages || [],
    };

    // Geocoding — נסה לקבל קואורדינטות
    const btn = document.getElementById('btnSaveProperty');
    btn.textContent = '⏳ מאתר כתובת...';
    btn.disabled = true;

    try {
      let coords = window._prefillCoords || null;
      if (!coords) {
        coords = await MapManager.geocode(address);
      }
      prop.coords = coords;
    } catch (e) {
      prop.coords = null;
    }

    btn.textContent = '💾 שמור נכס';
    btn.disabled = false;

    // שמור
    const id = window._editingId;
    if (id) {
      Storage.update(id, prop);
    } else {
      Storage.add(prop);
    }

    this._hideModal();
    this.renderProperties();
    MapManager.refreshMarkers();
  },

  /** מחק נכס */
  deleteProperty(id) {
    const prop = Storage.getById(id);
    if (!prop) return;
    if (!confirm(`למחוק את הנכס:\n${prop.address}?`)) return;
    Storage.delete(id);
    this.renderProperties();
    MapManager.refreshMarkers();
  },

  // ══════════════════════════════════════════════════
  //  MAP FOCUS
  // ══════════════════════════════════════════════════

  focusOnMap(id) {
    this.switchTab('map');
    setTimeout(() => MapManager.focusProperty(id), 300);
  },

  // ══════════════════════════════════════════════════
  //  PRINT — הדפסת דוח נכס
  // ══════════════════════════════════════════════════

  printProperty(id) {
    const prop = Storage.getById(id);
    if (!prop) return;

    const statusLabel = { active: 'פעיל', handling: 'בטיפול', sold: 'נמכר' }[prop.status] || '';
    const typeLabel = { apartment: 'דירה', house: 'בית', land: 'קרקע', commercial: 'מסחרי' }[prop.type] || '';
    const price = prop.price ? `₪${Number(prop.price).toLocaleString('he-IL')}` : '—';
    const date = new Date().toLocaleDateString('he-IL');

    const html = `
      <!DOCTYPE html>
      <html lang="he" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>דוח נכס — ${prop.address}</title>
        <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;900&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Heebo, sans-serif; direction: rtl; color: #222; padding: 32px; }
          .header { border-bottom: 3px solid #c9a84c; padding-bottom: 16px; margin-bottom: 24px; }
          .header h1 { font-size: 26px; color: #111; }
          .header .sub { color: #666; font-size: 14px; margin-top: 4px; }
          .section { margin-bottom: 20px; }
          .section h2 { font-size: 16px; color: #c9a84c; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 12px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
          .field label { font-size: 12px; color: #888; display: block; }
          .field span { font-size: 15px; font-weight: 600; }
          .docs { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
          .doc-chip { background: #f0f0f0; border-radius: 20px; padding: 4px 12px; font-size: 13px; }
          .notes-box { background: #f9f9f9; border-right: 3px solid #c9a84c; padding: 12px; border-radius: 4px; font-size: 14px; line-height: 1.6; }
          .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 12px; font-size: 12px; color: #aaa; }
          .status-badge { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 13px; font-weight: 700;
            background: ${ prop.status==='active' ? '#e8f5e9' : prop.status==='handling' ? '#fff8e1' : '#f5f5f5' };
            color: ${ prop.status==='active' ? '#2e7d32' : prop.status==='handling' ? '#f57f17' : '#757575' }; }
          @media print { body { padding: 16px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏘️ דוח נכס — נדל"ן פרו</h1>
          <div class="sub">הופק בתאריך: ${date} | סטטוס: <span class="status-badge">${statusLabel}</span></div>
        </div>

        <div class="section">
          <h2>📍 פרטי מיקום</h2>
          <div class="grid">
            <div class="field"><label>כתובת</label><span>${prop.address || '—'}</span></div>
            <div class="field"><label>סוג נכס</label><span>${typeLabel}</span></div>
            <div class="field"><label>גוש</label><span>${prop.block || '—'}</span></div>
            <div class="field"><label>חלקה</label><span>${prop.parcel || '—'}</span></div>
            <div class="field"><label>תת-חלקה</label><span>${prop.subParcel || '—'}</span></div>
            ${prop.coords ? `<div class="field"><label>קואורדינטות</label><span>${prop.coords.lat.toFixed(5)}, ${prop.coords.lng.toFixed(5)}</span></div>` : ''}
          </div>
        </div>

        <div class="section">
          <h2>💰 פרטי הנכס</h2>
          <div class="grid">
            <div class="field"><label>מחיר</label><span>${price}</span></div>
            <div class="field"><label>שטח</label><span>${prop.area ? prop.area + ' מ"ר' : '—'}</span></div>
          </div>
        </div>

        <div class="section">
          <h2>👤 פרטי בעל הנכס</h2>
          <div class="grid">
            <div class="field"><label>שם</label><span>${prop.ownerName || '—'}</span></div>
            <div class="field"><label>טלפון</label><span>${prop.ownerPhone || '—'}</span></div>
          </div>
        </div>

        <div class="section">
          <h2>📄 מסמכים</h2>
          <div class="docs">
            <div class="doc-chip">${prop.docs?.tabu ? '✅' : '❌'} נסח טאבו</div>
            <div class="doc-chip">${prop.docs?.appraisal ? '✅' : '❌'} הערכת שמאי</div>
            <div class="doc-chip">${prop.docs?.mortgage ? '⚠️' : '✅'} ${prop.docs?.mortgage ? 'יש שיעבוד' : 'ללא שיעבוד'}</div>
          </div>
        </div>

        ${prop.notes ? `
        <div class="section">
          <h2>📝 הערות</h2>
          <div class="notes-box">${prop.notes}</div>
        </div>` : ''}

        ${prop.images?.length ? `
        <div class="section">
          <h2>📷 תמונה</h2>
          <img src="${prop.images[0]}" style="width:100%;height:220px;object-fit:cover;border-radius:8px;border:1px solid #ddd">
        </div>` : ''}

        <div class="footer">
          נדל"ן פרו • מערכת ניהול נכסים • הדפסה מ-localStorage
        </div>

        <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank', 'width=800,height=700');
    win.document.write(html);
    win.document.close();
  },

  // ══════════════════════════════════════════════════
  //  EVENTS
  // ══════════════════════════════════════════════════

  bindEvents() {
    // כפתורי header
    document.getElementById('btnAddProperty').addEventListener('click', () => this.openAddModal());
    document.getElementById('btnExport').addEventListener('click', () => Storage.exportJSON());

    // טאבים
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // מודל
    document.getElementById('modalClose').addEventListener('click', () => this._hideModal());
    document.getElementById('btnCancelModal').addEventListener('click', () => this._hideModal());
    document.getElementById('btnSaveProperty').addEventListener('click', () => this.saveProperty());
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modalOverlay')) this._hideModal();
    });

    // סינון וחיפוש
    document.getElementById('searchInput').addEventListener('input', () => this.renderProperties());
    document.getElementById('statusFilter').addEventListener('change', () => this.renderProperties());
    document.getElementById('typeFilter').addEventListener('change', () => this.renderProperties());

    // מפה — כפתורי שכבה וחיפוש
    document.getElementById('btnStreetView').addEventListener('click', () => {
      MapManager.showStreet();
      document.getElementById('btnStreetView').classList.add('active');
      document.getElementById('btnSatView').classList.remove('active');
    });
    document.getElementById('btnSatView').addEventListener('click', () => {
      MapManager.showSatellite();
      document.getElementById('btnSatView').classList.add('active');
      document.getElementById('btnStreetView').classList.remove('active');
    });
    document.getElementById('btnMapSearch').addEventListener('click', () => {
      const q = document.getElementById('mapSearchInput').value.trim();
      if (q) MapManager.searchAndPan(q);
    });
    document.getElementById('mapSearchInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btnMapSearch').click();
    });

    // Lookup — autocomplete + אירועי חיפוש
    Lookup.initAutocomplete();
    document.getElementById('btnLookupAddress').addEventListener('click', () => {
      const street = document.getElementById('lookupStreet').value.trim();
      const city = document.getElementById('lookupCity').value.trim();
      if (street && city) Lookup.searchByAddress(street, city);
      else alert('יש להזין רחוב ועיר');
    });
    document.getElementById('btnLookupBlock').addEventListener('click', () => {
      const block = document.getElementById('lookupBlock').value.trim();
      const parcel = document.getElementById('lookupParcel').value.trim();
      const sub = document.getElementById('lookupSubParcel').value.trim();
      Lookup.searchByBlock(block, parcel, sub);
    });

    // תמונות — כפתור + קלט קובץ
    document.getElementById('btnAddImages').addEventListener('click', () => {
      document.getElementById('fieldImages').click();
    });
    document.getElementById('fieldImages').addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      const current = window._pendingImages || [];
      const toAdd = files.slice(0, Math.max(0, 10 - current.length));
      for (const file of toAdd) {
        const compressed = await App._compressImage(file);
        window._pendingImages.push(compressed);
      }
      App._renderImagePreviews();
      e.target.value = '';
    });

    // Lightbox — כפתורים
    document.getElementById('btnLightboxClose').addEventListener('click', () => App._closeLightbox());
    document.getElementById('btnLightboxPrev').addEventListener('click', () => App.lightboxPrev());
    document.getElementById('btnLightboxNext').addEventListener('click', () => App.lightboxNext());
    document.getElementById('btnLightboxDelete').addEventListener('click', () => App.lightboxDelete());
    document.getElementById('lightboxOverlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('lightboxOverlay')) App._closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (document.getElementById('lightboxOverlay').style.display === 'none') return;
      if (e.key === 'Escape') App._closeLightbox();
      if (e.key === 'ArrowLeft') App.lightboxNext();
      if (e.key === 'ArrowRight') App.lightboxPrev();
    });
  },

  // ══════════════════════════════════════════════════
  //  IMAGE GALLERY
  // ══════════════════════════════════════════════════

  /** דחוס תמונה לרוחב מקסימלי 1200px ויצא כ-base64 JPEG */
  async _compressImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX = 1200;
          let w = img.width, h = img.height;
          if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
          if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  /** עדכן גריד תצוגה מקדימה בטופס */
  _renderImagePreviews() {
    const grid = document.getElementById('imagePreviewGrid');
    if (!grid) return;
    const imgs = window._pendingImages || [];
    if (imgs.length === 0) { grid.innerHTML = ''; return; }
    grid.innerHTML = imgs.map((src, i) => `
      <div class="img-preview-item">
        <img src="${src}" alt="">
        <button class="img-preview-del" onclick="App._removePreviewImage(${i})" title="מחק">✕</button>
      </div>
    `).join('');
  },

  _removePreviewImage(i) {
    window._pendingImages.splice(i, 1);
    this._renderImagePreviews();
  },

  /** פתח lightbox לנכס */
  openLightbox(id, index) {
    const prop = Storage.getById(id);
    if (!prop || !prop.images || !prop.images.length) return;
    window._lightboxId = id;
    window._lightboxIndex = index;
    this._lightboxShow();
  },

  _lightboxShow() {
    const prop = Storage.getById(window._lightboxId);
    const imgs = prop?.images || [];
    const i = window._lightboxIndex;
    if (!imgs.length) { this._closeLightbox(); return; }
    document.getElementById('lightboxImg').src = imgs[i];
    document.getElementById('lightboxCounter').textContent = `${i + 1} / ${imgs.length}`;
    const hasMult = imgs.length > 1;
    document.getElementById('btnLightboxPrev').style.visibility = hasMult ? 'visible' : 'hidden';
    document.getElementById('btnLightboxNext').style.visibility = hasMult ? 'visible' : 'hidden';
    document.getElementById('lightboxOverlay').style.display = 'flex';
  },

  _closeLightbox() {
    document.getElementById('lightboxOverlay').style.display = 'none';
    document.getElementById('lightboxImg').src = '';
  },

  lightboxNext() {
    const prop = Storage.getById(window._lightboxId);
    const len = prop?.images?.length || 0;
    if (len <= 1) return;
    window._lightboxIndex = (window._lightboxIndex + 1) % len;
    this._lightboxShow();
  },

  lightboxPrev() {
    const prop = Storage.getById(window._lightboxId);
    const len = prop?.images?.length || 0;
    if (len <= 1) return;
    window._lightboxIndex = (window._lightboxIndex - 1 + len) % len;
    this._lightboxShow();
  },

  lightboxDelete() {
    const id = window._lightboxId;
    const prop = Storage.getById(id);
    if (!prop) return;
    const imgs = [...(prop.images || [])];
    imgs.splice(window._lightboxIndex, 1);
    Storage.update(id, { images: imgs });
    this.renderProperties();
    MapManager.refreshMarkers();
    if (imgs.length === 0) { this._closeLightbox(); return; }
    window._lightboxIndex = Math.min(window._lightboxIndex, imgs.length - 1);
    window._lightboxId = id;
    this._lightboxShow();
  },
};

// ── הפעל את האפליקציה כשהדף נטען ──
document.addEventListener('DOMContentLoaded', () => App.init());
