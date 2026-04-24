# 🏘️ נדל"ן פרו — מערכת ניהול נכסים

מערכת ניהול תיק נכסים לאיש תיווך עצמאי.  
עובדת ישירות מהדפדפן, ללא שרת, מוכנה לפרסום ב-GitHub Pages.

---

## ✨ פיצ'רים קיימים

| פיצ'ר | סטטוס |
|--------|--------|
| הוספה / עריכה / מחיקה של נכסים | ✅ |
| שדות: כתובת, גוש, חלקה, תת-חלקה, סוג, מחיר, שטח, סטטוס | ✅ |
| פרטי בעלים: שם + טלפון | ✅ |
| סימון מסמכים: נסח טאבו / שמאי / שיעבוד | ✅ |
| חיפוש וסינון לפי סטטוס וסוג | ✅ |
| מפה אינטראקטיבית — Leaflet + OpenStreetMap | ✅ |
| שכבת לוויין — Esri World Imagery | ✅ |
| Geocoding חינמי — Nominatim | ✅ |
| מרקרים מותאמים לפי סטטוס | ✅ |
| Popup בכל מרקר עם פרטי הנכס | ✅ |
| איתור לפי כתובת → קישורים + הוסף לתיק | ✅ |
| איתור לפי גוש/חלקה → בדיקה בתיק + קישורים | ✅ |
| קישורים מהירים: GovMap | ✅ |
| קישורים מהירים: Mikoom | ✅ |
| קישורים מהירים: Google Earth 3D | ✅ |
| קישורים מהירים: Google Street View | ✅ |
| קישורים מהירים: Waze | ✅ |
| קישורים מהירים: אתר הטאבו (gov.il) | ✅ |
| הדפסת דוח נכס מסודר בעברית | ✅ |
| שמירה ב-localStorage | ✅ |
| ייצוא JSON | ✅ |
| Dark theme מקצועי | ✅ |
| Responsive מלא למובייל | ✅ |
| נתוני דמו (2 נכסים לבדיקה) | ✅ |

---

## 🚀 הפעלה מקומית

```bash
# שיטה 1 — פשוט: פתח את index.html ישירות בדפדפן
# (חלק מהדפדפנים חוסמים fetch מקובץ מקומי)

# שיטה 2 — מומלצת: שרת מקומי קל
npx serve .
# או
python -m http.server 8080
# ואז פתח http://localhost:8080
```

---

## 🌐 פרסום ב-GitHub Pages

1. צור repository חדש ב-GitHub (למשל `nadlan-pro`)
2. דחוף את כל הקבצים:
```bash
git init
git add .
git commit -m "Initial commit - נדל\"ן פרו"
git branch -M main
git remote add origin https://github.com/USERNAME/nadlan-pro.git
git push -u origin main
```
3. ב-Settings → Pages → Source: בחר `main` branch → `/root`
4. האתר יהיה זמין בכתובת: `https://USERNAME.github.io/nadlan-pro`

> **שים לב:** הנתונים נשמרים ב-localStorage של הדפדפן המקומי.  
> לשיתוף נתונים בין מכשירים — נדרש שדרוג ל-Firebase (ראה Roadmap).

---

## 📁 מבנה הפרויקט

```
nadlan-pro/
├── index.html          ← מבנה הדף הראשי
├── css/
│   └── style.css       ← כל העיצוב (dark theme, RTL, Heebo)
├── js/
│   ├── storage.js      ← ניהול נתונים (localStorage, מוכן ל-Firebase)
│   ├── map.js          ← Leaflet, מרקרים, geocoding
│   ├── lookup.js       ← איתור גוש/חלקה, בניית קישורים
│   └── app.js          ← לוגיקה ראשית, UI, CRUD, הדפסה
└── README.md
```

**סדר טעינת סקריפטים (חשוב):**  
`storage.js` → `map.js` → `lookup.js` → `app.js`

---

## 🗺️ Roadmap עתידי

| פיצ'ר | עדיפות |
|--------|---------|
| 📄 ייצוא PDF מסודר (jsPDF) | גבוהה |
| 🖼️ גלריית תמונות לכל נכס | גבוהה |
| 🔥 Firebase Firestore — שמירה בענן | גבוהה |
| 👥 CRM לקוחות מקושרים לנכסים | בינונית |
| 🏛️ API ממשלתי — גוש/חלקה ישיר | בינונית |
| 📊 דשבורד סטטיסטיקות ואנליטיקה | בינונית |
| 📱 PWA — התקנה כאפליקציה | בינונית |
| 🔔 תזכורות ומעקב מועדים | נמוכה |
| 🔐 Google Login (Firebase Auth) | נמוכה |
| 🌍 ייצוא ל-KML / GeoJSON | נמוכה |

---

## 🔮 שדרוג ל-Firebase

כל פונקציות `Storage` מסומנות עם הערות `🔮 Firebase:`.  
השדרוג מחייב:
1. הוסף Firebase SDK ל-`index.html`
2. עדכן `storage.js` — החלף `localStorage` ב-`Firestore`
3. הוסף Authentication לפי הצורך

---

## 📝 רישיון

פרויקט אישי — שימוש חופשי.
