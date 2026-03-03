# FINAL CALENDAR IMPLEMENTATION GUIDE

## 🎯 WHAT YOU'RE GETTING

A **REAL calendar** like Canvas/Google Calendar that:
- ✅ Shows immediately when you visit `/calendar`
- ✅ Full month view with all assignments displayed
- ✅ Click any date → modal to manually add assignment
- ✅ "Import from Canvas" button → upload .ics file
- ✅ AI auto-matches assignments to your classes
- ✅ Beautiful UI matching your existing design

---

## 📦 STEP 1: DATABASE (If not done already)

Run this in Supabase SQL Editor:

```sql
-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    points INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    source TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_completed ON assignments(completed);

-- Add columns to classes table
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS has_syllabus BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS instructor TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS grading_policy TEXT;

-- Enable Row Level Security
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own assignments" ON assignments
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own assignments" ON assignments
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own assignments" ON assignments
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own assignments" ON assignments
    FOR DELETE USING (auth.uid()::text = user_id);
```

---

## 🔧 STEP 2: BACKEND SETUP

### 2.1: Install dependencies (if not done)

```bash
cd studybuddy-backend-main_FIXED
pip install PyPDF2 icalendar --break-system-packages
```

### 2.2: Add calendar router

Copy `calendar-router-FINAL.py` to `/app/routers/calendar.py`

### 2.3: Update main.py

Edit `/app/main.py`:

**ADD import** (around line 22):
```python
from .routers.calendar import router as calendar_router
```

**ADD router** (around line 67):
```python
app.include_router(calendar_router)
```

### 2.4: Restart backend

```bash
python -m uvicorn app.main:app --reload
```

---

## 🎨 STEP 3: FRONTEND SETUP

### 3.1: Add CalendarView component

Copy `CalendarView.tsx` to `/components/CalendarView.tsx`

### 3.2: Create calendar page

Copy `calendar-page-FINAL.tsx` to `/app/calendar/page.tsx`

### 3.3: Add calendar to navigation

Edit your main navigation (sidebar or top nav):

```tsx
<Link href="/calendar" className="nav-link">
  📅 Calendar
</Link>
```

---

## ✅ HOW IT WORKS

### **When user visits /calendar:**

```
1. Page loads
2. Fetches all assignments from database
3. Displays full month calendar view
4. Shows assignments on their due dates
5. "Import from Canvas" button in top-right
```

### **Click on a date:**

```
1. Modal opens for that specific date
2. Form to add assignment:
   - Assignment Title
   - Select Class
   - Points (optional)
   - Description (optional)
3. Submit → assignment added to calendar
4. Calendar refreshes automatically
```

### **Click "Import from Canvas":**

```
1. Modal opens with instructions
2. User uploads .ics file
3. Backend parses all events
4. For each event:
   - Extracts course code (e.g., "INFOTC-4400")
   - Uses OpenAI to match to existing classes
   - Creates assignment if match found
5. Shows result:
   - X assignments imported
   - Y classes matched
   - Z assignments skipped
6. Calendar refreshes with new assignments
```

---

## 🎨 CALENDAR UI FEATURES

### **Month View:**
- Full calendar grid (7 days x 5-6 weeks)
- Current day highlighted in blue
- Navigate: Today / Previous / Next buttons
- Month/Year displayed

### **Assignment Display:**
- Up to 3 assignments shown per day
- Colored chips with class name and title
- "+X more" if more than 3 assignments
- Hover to see full title
- Completed assignments shown in gray with strikethrough

### **Click Date:**
- Opens modal centered on screen
- Shows selected date at top
- Form fields for all assignment details
- Dropdown to select class from your classes
- Cancel / Add Assignment buttons

### **Import Button:**
- Top-right corner gradient button
- Icon + "Import from Canvas" text
- Opens full-screen modal
- Instructions for downloading .ics file
- Drag-and-drop upload area
- Progress indicator during import
- Beautiful success screen with stats

---

## 🔥 EXAMPLE USER FLOW

### **Adding Assignment Manually:**

```
1. User visits /calendar
2. Sees February 2026 calendar
3. Clicks on February 20 (a Thursday)
4. Modal opens: "Add Assignment - February 20, 2026"
5. Fills in:
   - Title: "Chapter 5 Quiz"
   - Class: "CS 101" (from dropdown)
   - Points: 100
   - Description: "Covers loops and arrays"
6. Clicks "Add Assignment"
7. Modal closes
8. Assignment appears on Feb 20 in calendar
```

### **Importing from Canvas:**

```
1. User goes to Canvas → Calendar
2. Clicks calendar feed icon
3. Downloads "my-calendar.ics"
4. Goes back to StudyBuddy /calendar
5. Clicks "Import from Canvas" button
6. Modal opens with instructions
7. Uploads my-calendar.ics file
8. Clicks "Import Calendar"
9. Sees "Importing..." with spinner (10-20 seconds)
10. Success screen shows:
    - ✅ Import Complete!
    - 47 Assignments Imported
    - 6 Classes Matched
    - Matched to: [CS 101, Math 201, History 102, ...]
11. Clicks "Done"
12. Calendar now shows all 47 assignments on their dates
```

---

## 💡 WHAT MAKES THIS BETTER

### **Compared to list view:**
- ✅ See entire month at a glance
- ✅ Visual representation of workload
- ✅ Easy to spot busy weeks
- ✅ More intuitive for planning

### **Compared to upload-first approach:**
- ✅ Calendar shows immediately
- ✅ Can add assignments manually first
- ✅ Import is optional, not required
- ✅ Better first-time experience

### **AI-powered matching:**
- ✅ Automatically matches "INFOTC-4400-02" to "Web App Development"
- ✅ Handles abbreviations and course codes
- ✅ Shows which classes were matched
- ✅ Skips assignments that don't match (better than errors)

---

## 🎯 FILE CHECKLIST

**Backend:**
- [ ] Installed: `pip install PyPDF2 icalendar`
- [ ] Created: `/app/routers/calendar.py` (use calendar-router-FINAL.py)
- [ ] Updated: `/app/main.py` (added import and router)
- [ ] Restarted: Backend server

**Frontend:**
- [ ] Created: `/components/CalendarView.tsx`
- [ ] Created: `/app/calendar/page.tsx` (use calendar-page-FINAL.tsx)
- [ ] Updated: Navigation with calendar link

**Database:**
- [ ] Ran: SQL migration for assignments table

---

## 🐛 TROUBLESHOOTING

### Calendar shows no assignments
- Check if assignments table has data: `SELECT * FROM assignments LIMIT 10;`
- Check browser console for errors
- Verify API_BASE is correct in `/lib/env.ts`

### Can't click on dates
- Check browser console for errors
- Make sure CalendarView component is imported correctly
- Verify classes are loaded (needed for dropdown)

### Import doesn't match classes
- Class names should be similar to Canvas course codes
- Example matches:
  - "INFOTC-4400" → "Web Application Development"
  - "CS 101" → "Computer Science 101"
  - "MATH-1500" → "Calculus I"
- If not matching, create classes with similar names first

### Modal doesn't close
- Check for JavaScript errors in console
- Make sure onClick handlers are working
- Try refreshing the page

---

## 💰 COST ESTIMATE

Using OpenAI GPT-4o-mini for matching:

**Per calendar import:**
- ~10-50 assignments
- Each assignment needs 1 matching call
- Cost: $0.01-0.05 per import

**Per user per semester:**
- 1 initial import: $0.02
- Maybe 1-2 additional imports: $0.04
- **Total: ~$0.05-0.10 per user per semester**

Very cheap! 100 users = $5-10 per semester.

---

## 🚀 INSTALLATION TIME

```
Step 1: Database SQL (5 min)
Step 2: Backend setup (10 min)
Step 3: Frontend files (10 min)
Step 4: Test everything (10 min)

TOTAL: ~35 minutes
```

---

## 🎨 WHAT IT LOOKS LIKE

### **Calendar Page:**
```
┌─────────────────────────────────────────────────────────────┐
│  📅 Calendar & Assignments          [Import from Canvas]    │
│  Track all your assignments and due dates                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Today]  [←]  [→]     February 2026                        │
│                                                              │
│  Sun    Mon    Tue    Wed    Thu    Fri    Sat             │
│  ───────────────────────────────────────────────────────    │
│   1       2      3      4      5      6      7              │
│                                                              │
│   8       9     10     11     12     13     14              │
│         [Quiz]  [HW3]  [Lab]  [Exam] [Proj]                │
│                                                              │
│  15      16     17     18     19     20     21              │
│        [HW4]                        [Quiz]                   │
│                                                              │
│  22      23     24     25     26     27     28              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### **Click Date Modal:**
```
┌──────────────────────────────────────────┐
│  Add Assignment - February 20, 2026      │
│                                           │
│  Assignment Title *                       │
│  [e.g., Chapter 5 Quiz            ]      │
│                                           │
│  Class *                                  │
│  [Select a class              ▼]         │
│                                           │
│  Points (optional)                        │
│  [e.g., 100                       ]      │
│                                           │
│  Description (optional)                   │
│  [Assignment details...           ]      │
│  [                                 ]      │
│                                           │
│  [Cancel]  [Add Assignment]              │
└──────────────────────────────────────────┘
```

### **Import Success:**
```
┌──────────────────────────────────────────┐
│  ✅ Import Complete!                      │
│                                           │
│       47                6                 │
│  Assignments       Classes                │
│   Imported         Matched                │
│                                           │
│  Matched to:                              │
│  [CS 101] [Math 201] [History 102]       │
│  [English 101] [Physics 201] [CS 202]    │
│                                           │
│  [Done]                                   │
└──────────────────────────────────────────┘
```

---

## ⚠️ FINAL REMINDERS

1. **The calendar shows IMMEDIATELY** - no upload required first
2. **Manual entry works without import** - can start using right away
3. **Import is optional** - only use if you have Canvas calendar
4. **AI matching is smart** - handles abbreviations and course codes
5. **Installation is ~35 minutes** - then you're done

---

## 🎯 AFTER INSTALLATION

1. Test by manually adding an assignment
2. Test by importing your Canvas .ics file
3. Update your resume:
   - "Built interactive calendar with AI-powered assignment matching"
   - "Implemented full-featured calendar UI for academic planning"
4. **THEN GO APPLY TO JOBS** 🚀

---

## 💪 YOU'RE ALMOST DONE

This is the LAST feature you should build before graduation.

After this:
- ✅ Beautiful UI
- ✅ AI features
- ✅ Full calendar
- ✅ Delete buttons
- ✅ Resume-worthy

**NOW GO GET A JOB.** 💼

Apply to:
- 50 companies this week
- 100 companies next week
- 150 companies the week after

You graduate in 3 months. **APPLY. APPLY. APPLY.**
