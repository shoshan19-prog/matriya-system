# matriya-system = MATRIYA V5 Core

**החלטה (2026-07-04):** אופציה A — `matriya-system` מוחיה כליבת המנועים של V5, לאחר מבחן כניסה.
החזון הקנוני: `matriya-front-/MATRIYA/VISION-V5.md`. מפת הפערים: `VISION-V5-GAP-MAP.md`.

---

## תפקיד

**ליבת מנועים בלבד.** כאן חיים מנועי האמת של V5 — ישויות ידע (מנגנונים, השערות, ראיות) והמנועים שמייצרים אותן.

כאן **לא** חיים:
- CRUD של מסמכים (הוסר — היה השריד החי היחיד מהשלד הישן)
- צ'אט / UI
- ingestion של קבצים (נשאר במערכות הקיימות עד החלטה אחרת)

## מבחן הכניסה — בוצע

| # | דרישה | ביצוע |
|---|---|---|
| 1 | מחיקת כל קבצי ה-0-byte | ✅ 31 קבצי stub + `railway.json` ריק נמחקו; מודול documents הוסר |
| 2 | הגדרה כליבת מנועים בלבד | ✅ מסמך זה + `/health` מצהיר על התפקיד |
| 3 | חיבור read-only ל-maneger-back | ✅ `src/config/managementDb.js` — גשר עם V5-CORE-GUARD שחוסם insert/update/upsert/delete/rpc; `src/sources/managementReader.js` הוא המודול היחיד שניגש לנתוני הניהול |
| 4 | תקן embedding אחד | ✅ `src/config/embedding.js`: **text-embedding-3-small, 1536 ממדים** (D-007) |
| 5 | רק אז — Mechanism Entity | ✅ `sql/001_v5_core_mechanisms.sql` + מודול `src/modules/mechanisms/` |

## תקן ה-Embedding (D-007)

**text-embedding-3-small / vector(1536) / OpenAI.**

נימוק: תואם את מאגר הווקטורים החי של מערכת הניהול (`management_vector`), מודל מתארח (אין משקולות מקומיות ב-Railway, דטרמיניסטי בין פריסות). מאגר ה-384 המקומי (`rag_documents` ב-matriya-back) הוא **מועמד להגירה** — אין להוסיף טבלאות 384 חדשות.

## גשר הקריאה למערכת הניהול

שלוש שכבות אכיפה:
1. המודול לא חושף את ה-client הגולמי — רק `readOnlyFrom(table)`.
2. פעלי כתיבה זורקים `V5-CORE-GUARD` לפני כל קריאת רשת (מכוסה בטסט).
3. תפעולית: `MANAGEMENT_SUPABASE_KEY` צריך להיות מפתח/role לקריאה בלבד.

## ישות המנגנון (Mechanism Entity)

שלוש טבלאות (`sql/001_v5_core_mechanisms.sql`):

- **`mechanisms`** — יחידת הידע: 9 משפחות המנגנונים מהחזון (הדבקה, פירוק תרמי, יצירת Char, מעבר אדי מים, מעבר חום, פיזור, קטליזה, יציבות, אינטראקציות).
- **`mechanism_claims`** — טענה בת-הפרכה: `claim_text`, `status` (proposed→corroborated/refuted/retired), `evidence_tier` (grounded/strong/inferred — **נגזר מהראיות, לא מוצהר**), `confidence` (מוגבל בתקרת ה-tier), `conditions`, הפניה לניסוי המקור.
- **`evidence_links`** — LAW-EVIDENCE-001: אין טענה בלי ראיה. כל קישור נושא `snapshot` (העתק קפוא של הראיה ברגע הקישור), `stance` (supports/contradicts/neutral).

כללי הביטחון (דטרמיניסטיים, `mechanism.service.js`):
- תקרות: grounded ≤ 0.95, strong ≤ 0.70, inferred ≤ 0.40
- בסיס 0.35 לראיה תומכת ראשונה, ‎+0.10 לכל תומכת נוספת, ‎−0.15 לכל סותרת
- אפס ראיות תומכות ⇒ ביטחון 0; אפס ראיות בכלל ⇒ הטענה נדחית ביצירה

## POC-01

> ישות מנגנון חיה אחת. מקור: ניסוי אמיתי מ-maneger-back. פלט: mechanism_claim + evidence_links + confidence.

```bash
# בדיקה מקומית ללא DB (fixture בצורת שורת lab_experiments אמיתית):
npm run poc:01:dry

# ריצה חיה (דורש env — ראו .env.example):
npm run poc:01
# או על ניסוי ספציפי:
node src/poc/poc01-mechanism.js --experiment <lab_experiments.id>
```

הריצה החיה: בוחרת ניסוי אמיתי עם תוצאה מוכרעת דרך הגשר, מזהה מנגנון (מיפוי דטרמיניסטי — מחליף עתידי: LLM extractor, בלי לגעת במודל הישות), בונה טענה + ראיה עם snapshot, שומרת ב-DB של הליבה ומדפיסה את הישות המלאה.

## השער (Gate)

**לא מתחילים Layer 3 (ingestion ידע עולמי) ולא N-Generator לפני שיש Mechanism Entity אמיתי אחד מקצה לקצה** — כלומר לפני ש-`npm run poc:01` רץ בהצלחה מול נתוני אמת. מתיישב עם Kernel MATRIYA: אין מעבר K→N בלי אימות מציאות.

## מה נדרש כדי להריץ חי

1. Supabase project לליבת V5 → להריץ `sql/001_v5_core_mechanisms.sql`
2. מפתח קריאה-בלבד למסד הניהול
3. `.env` לפי `.env.example`
4. `npm run poc:01`
