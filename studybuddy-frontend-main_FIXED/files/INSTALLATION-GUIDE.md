# COMPLETE INSTALLATION GUIDE FOR NEW FEATURES

## 🎯 OVERVIEW
You asked for:
1. Delete class button ✅
2. Syllabus parsing (PDF upload) ✅
3. iCalendar import (from Canvas) ✅
4. Calendar page to view assignments ✅

All implemented with Claude AI for parsing.

---

## 📦 STEP 1: DATABASE SETUP

Run this SQL in your Supabase SQL Editor:

```sql
-- Copy the entire content from: assignments_migration.sql
```

This creates:
- `assignments` table
- Adds syllabus columns to `classes` table
- Sets up Row Level Security policies

---

## 🔧 STEP 2: BACKEND SETUP

### 2.1: Add new router files

Copy these files to your backend:
- `syllabus_router.py` → `/app/routers/syllabus.py`
- `calendar_router.py` → `/app/routers/calendar.py`

### 2.2: Update main.py

Add to `/app/main.py`:

```python
# Add imports (after line 22)
from .routers.syllabus import router as syllabus_router
from .routers.calendar import router as calendar_router

# Add routers (after line 67)
app.include_router(syllabus_router)
app.include_router(calendar_router)
```

### 2.3: Install dependencies

```bash
cd studybuddy-backend-main_FIXED
pip install PyPDF2 icalendar --break-system-packages
```

### 2.4: Add API key to settings

Make sure your `settings.py` or `.env` has:

```
ANTHROPIC_API_KEY=your_key_here
```

### 2.5: Restart backend

```bash
python -m uvicorn app.main:app --reload
```

---

## 🎨 STEP 3: FRONTEND SETUP

### 3.1: Add delete button to classes page

Edit `/app/classes/page.tsx` following the instructions in:
`DELETE-BUTTON-INSTRUCTIONS.md`

### 3.2: Add new components

Create these new component files:
- `SyllabusUploader.tsx` → `/components/SyllabusUploader.tsx`
- `ICalendarUploader.tsx` → `/components/ICalendarUploader.tsx`

### 3.3: Create calendar page

- `calendar-page.tsx` → `/app/calendar/page.tsx`

### 3.4: Add calendar to navigation

Edit your main navigation (sidebar or header) to add:

```tsx
<Link href="/calendar">
  📅 Calendar
</Link>
```

### 3.5: Add syllabus uploader to class page (OPTIONAL)

If you want syllabus upload per class, add to your `/app/class/[id]/page.tsx`:

```tsx
import SyllabusUploader from "@/components/SyllabusUploader";

// Inside your component:
<SyllabusUploader classId={classId} onUploadSuccess={() => {
  // Reload class data
}} />
```

---

## ✅ STEP 4: TEST EVERYTHING

### Test Delete Button:
1. Go to /classes
2. Hover over a class card
3. Click the 🗑️ button
4. Confirm deletion
5. Class should disappear

### Test Syllabus Upload:
1. Go to a class page (or wherever you added SyllabusUploader)
2. Upload a syllabus PDF
3. Wait for parsing (10-30 seconds)
4. Should extract assignments and class info

### Test iCalendar Import:
1. Go to /calendar
2. Download your Canvas calendar (.ics file)
3. Upload it
4. Should import assignments and match to classes

### Test Calendar Page:
1. Go to /calendar
2. View upcoming assignments
3. Check off completed assignments
4. Filter by All/Upcoming/Completed

---

## 🐛 TROUBLESHOOTING

### Backend errors:

**"ANTHROPIC_API_KEY not found"**
- Add to `.env` or `settings.py`
- Restart backend

**"Module PyPDF2 not found"**
- Run: `pip install PyPDF2 --break-system-packages`

**"Module icalendar not found"**
- Run: `pip install icalendar --break-system-packages`

**"Table assignments does not exist"**
- Run the SQL migration in Supabase

### Frontend errors:

**"Cannot find module @/components/..."**
- Make sure you created the component files in `/components/`

**"API_BASE is undefined"**
- Check `/lib/env.ts` has the correct API base URL

### Feature not working:

**Syllabus parsing fails:**
- PDF must be text-based (not scanned image)
- Try a different PDF
- Check backend logs for errors

**iCalendar import doesn't match classes:**
- Make sure class names are similar
- Claude uses fuzzy matching but it's not perfect
- Create classes with similar names to your Canvas courses

**Calendar shows no assignments:**
- Import iCalendar first OR
- Upload syllabus to create assignments OR
- Wait for assignments table to be created

---

## 💰 COSTS

Using Claude API for parsing:

**Syllabus parsing:**
- ~$0.10-0.50 per syllabus
- Depends on PDF length

**iCalendar matching:**
- ~$0.01-0.05 per calendar import
- Multiple API calls for fuzzy matching

**Total expected:**
- ~$2-5 per semester per user
- If you have 100 users = $200-500/semester

---

## 🚀 WHAT YOU GOT

1. **Delete button** - Hover over class cards, click 🗑️
2. **Syllabus upload** - Extracts assignments, due dates, class info
3. **Canvas import** - Upload .ics file, auto-matches to classes
4. **Calendar page** - View all assignments, check off completed
5. **AI-powered** - Claude handles parsing and matching

All basic but functional!

---

## ⏰ TIME TO IMPLEMENT

If you follow this guide exactly:
- Database: 5 minutes
- Backend: 15 minutes
- Frontend: 30 minutes
- Testing: 15 minutes

**Total: ~1 hour**

Much faster than the 6-8 weeks I said for perfect versions!

These are SIMPLE versions - they'll work but not handle all edge cases.

---

## 📝 REMINDER

You should be applying to jobs, not coding features.

But since you insisted, here's everything you need.

Now go apply to 50 companies THIS WEEK. 🚀
