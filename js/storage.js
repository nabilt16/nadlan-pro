/**
 * storage.js — ניהול אחסון נתונים
 * כרגע: localStorage
 * מוכן לשדרוג עתידי ל-Firebase / Supabase (ראה הערות בקוד)
 */

const STORAGE_KEY = 'nadlan_pro_v2';

// ── מבנה נכס לדוגמה ──────────────────────────────────────────
// {
//   id: string (uuid),
//   address: string,
//   block: string,
//   parcel: string,
//   subParcel: string,
//   type: 'apartment' | 'house' | 'land' | 'commercial',
//   price: number,
//   area: number,
//   status: 'active' | 'handling' | 'sold',
//   ownerName: string,
//   ownerPhone: string,
//   notes: string,
//   docs: { tabu: boolean, appraisal: boolean, mortgage: boolean },
//   images: string[],  // base64 JPEG data URLs
//   coords: { lat: number, lng: number } | null,
//   createdAt: string (ISO),
//   updatedAt: string (ISO)
// }

const Storage = {

  /** החזר את כל הנכסים */
  getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('שגיאה בטעינת נתונים:', e);
      return [];
    }
    // 🔮 שדרוג עתידי ל-Firebase:
    // return db.collection('properties').orderBy('createdAt', 'desc').get()
  },

  /** קבל נכס לפי מזהה */
  getById(id) {
    return this.getAll().find(p => p.id === id) || null;
    // 🔮 Firebase: return db.collection('properties').doc(id).get()
  },

  /** הוסף נכס חדש */
  add(property) {
    const all = this.getAll();
    const newProp = {
      ...property,
      id: this._generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    all.push(newProp);
    this._save(all);
    return newProp;
    // 🔮 Firebase: return db.collection('properties').add(newProp)
  },

  /** עדכן נכס קיים */
  update(id, updates) {
    const all = this.getAll();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    this._save(all);
    return all[idx];
    // 🔮 Firebase: return db.collection('properties').doc(id).update(updates)
  },

  /** מחק נכס */
  delete(id) {
    const all = this.getAll().filter(p => p.id !== id);
    this._save(all);
    // 🔮 Firebase: return db.collection('properties').doc(id).delete()
  },

  /** ייצוא כל הנתונים ל-JSON */
  exportJSON() {
    const data = this.getAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nadlan-pro-export-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /** ייבוא נתונים מ-JSON (לשדרוג עתידי) */
  importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!Array.isArray(data)) throw new Error('פורמט לא תקין');
      this._save(data);
      return { success: true, count: data.length };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /** שמור מערך מלא */
  _save(all) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },

  /** צור מזהה ייחודי */
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  /** טען נתוני דמו אם אין נתונים קיימים */
  loadDemoIfEmpty() {
    if (this.getAll().length > 0) return;

    const img1 = this._placeholderImg('#c9a84c', 'הרצל 25 — תל אביב');
    const img2 = this._placeholderImg('#64b5f6', 'ביאליק 8 — רמת גן');
    const img3 = this._placeholderImg('#81c784', 'ביאליק 8 — חצר');

    const demo = [
      {
        id: 'demo_1',
        address: 'הרצל 25, תל אביב',
        block: '6636',
        parcel: '170',
        subParcel: '12',
        type: 'apartment',
        price: 2500000,
        area: 85,
        status: 'active',
        ownerName: 'ישראל כהן',
        ownerPhone: '050-1234567',
        notes: 'דירת 4 חדרים, קומה 3, מרפסת שמש, חנייה צמודה. נוף לים מהסלון.',
        docs: { tabu: true, appraisal: false, mortgage: true },
        images: [img1],
        coords: { lat: 32.0667, lng: 34.7833 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'demo_2',
        address: 'ביאליק 8, רמת גן',
        block: '6102',
        parcel: '55',
        subParcel: '',
        type: 'house',
        price: 4800000,
        area: 220,
        status: 'handling',
        ownerName: 'רחל לוי',
        ownerPhone: '052-9876543',
        notes: 'קוטג\' 6 חדרים, גינה פרטית 120 מ"ר, חנייה לשני כלי רכב.',
        docs: { tabu: true, appraisal: true, mortgage: false },
        images: [img2, img3],
        coords: { lat: 32.0823, lng: 34.8123 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'demo_3',
        address: 'דיזנגוף 100, תל אביב',
        block: '7021',
        parcel: '88',
        subParcel: '',
        type: 'commercial',
        price: 8500000,
        area: 350,
        status: 'active',
        ownerName: 'משה גולדברג',
        ownerPhone: '054-3344556',
        notes: 'חנות קרקע + מרתף, חזית לרחוב ראשי, מתאים לעסק פעיל.',
        docs: { tabu: false, appraisal: true, mortgage: false },
        images: [],
        coords: { lat: 32.0780, lng: 34.7740 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    this._save(demo);
    console.log('✅ נטענו נתוני דמו (3 נכסים)');
  },

  /** צור תמונת placeholder כ-SVG data URL */
  _placeholderImg(accentColor, label) {
    const c = accentColor || '#c9a84c';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380">' +
      '<rect width="600" height="380" fill="#1a1d25"/>' +
      '<rect x="175" y="170" width="250" height="170" fill="#22262f"/>' +
      '<polygon points="155,178 300,65 445,178" fill="#22262f"/>' +
      '<line x1="155" y1="178" x2="300" y2="65" stroke="' + c + '" stroke-width="2.5"/>' +
      '<line x1="445" y1="178" x2="300" y2="65" stroke="' + c + '" stroke-width="2.5"/>' +
      '<rect x="175" y="170" width="250" height="170" fill="none" stroke="' + c + '" stroke-width="2"/>' +
      '<rect x="252" y="238" width="96" height="102" fill="none" stroke="' + c + '" stroke-width="2"/>' +
      '<rect x="196" y="208" width="72" height="56" fill="none" stroke="' + c + '" stroke-width="1.5" opacity="0.7"/>' +
      '<rect x="332" y="208" width="72" height="56" fill="none" stroke="' + c + '" stroke-width="1.5" opacity="0.7"/>' +
      '<circle cx="296" cy="290" r="4" fill="' + c + '"/>' +
      '<text x="300" y="362" font-family="Arial,sans-serif" font-size="13" fill="#555e70" text-anchor="middle">' +
      label.replace(/</g, '&lt;').replace(/>/g, '&gt;') +
      '</text>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  },
};
