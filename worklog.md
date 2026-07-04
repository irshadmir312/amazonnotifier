# Amazon Jobs & Shifts Monitor - Worklog

## Project Overview
Chrome extension (v2) that monitors Amazon UK **jobs page** AND **shift/schedule pages**. Notifies with loud multi-beep BIP BIP sounds, desktop notifications, tab flashing, and more. Includes a Next.js landing page.

---

## v2.0 Upgrade — What's New

### 🔊 Sound System (MAJOR UPGRADE)
- **Loud multi-beep BIP BIP**: Uses square wave oscillator at 1200-1600Hz — much louder and more piercing than v1
- **Separate sounds**: Jobs = urgent high-pitched beeps, Shifts = deeper triangle wave beeps
- **Configurable volume**: 10%–100% slider
- **Configurable beep count**: 3, 5, 8, 10, or 15 beeps
- **Configurable speed**: Fast (150ms), Normal (200ms), Slow (350ms)
- **Repeat alerts**: Sound repeats every 15s/30s/60s up to N times

### 🟢 Shift/Schedule Monitoring (NEW)
- Monitors `jobsatamazon.co.uk/selfservice/schedule/current-schedule/*` URLs
- Detects shift cards, schedule entries, time slots
- Separate refresh interval (default 60s, independent from jobs)
- Separate toggle in popup

### 🔔 More Alert Features (NEW)
- **Tab title flashing**: Browser tab title alternates between "🟠 2 NEW JOBS" and normal for 60s
- **Persistent red badge**: Shows undismissed count on extension icon
- **Repeat sound**: Keeps beeping until you dismiss
- **Mute button**: One-click dismiss all alerts

### 📋 Popup v2 Redesign
- **Tab filtering**: All / Jobs / Shifts tabs
- **Color-coded cards**: Orange border for jobs, green for shifts
- **Monitor toggles**: Enable/disable jobs and shifts independently
- **Test sound buttons**: Test job alert 🔊 and shift alert 🔔
- **Quick links**: Direct links to Jobs page and Shifts page

### 🔍 Keyword Filtering (NEW)
- Include mode: Only alert for jobs matching keywords
- Exclude mode: Ignore jobs containing keywords
- Comma-separated keyword list

### 🖥 Page Overlay (NEW)
- Dark status bar overlay on Amazon pages showing "Monitoring Active"
- New item count badge (orange for jobs, green for shifts)
- Slide-in alert panel showing detected items
- Auto-dismisses after 30 seconds

### ⚙️ More Settings
- Volume control (slider)
- Beep count (3/5/8/10/15)
- Beep speed (fast/normal/slow)
- Repeat alerts toggle + interval + max repeats
- Separate refresh intervals for jobs and shifts
- Tab flashing toggle
- Auto-open tab toggle
- Page overlay toggle
- Keyword filter input + mode selector

---

## Files (10 files in chrome-extension/)

| File | Size | Purpose |
|------|------|---------|
| manifest.json | 972B | Manifest V3 — added `scripting` permission, `overlay.css` content style |
| background.js | 14.7KB | Service worker — dual alarm system, tab flashing, repeat alerts, keyword filter, shift monitoring |
| content.js | 13.7KB | DOM scraper — jobs + shifts, square wave BIP BIP engine, page overlay |
| overlay.css | 3.3KB | Page overlay styles — status bar, alert panel, animations |
| popup.html | 9.8KB | Redesigned popup — tabs, toggles, full settings panel |
| popup.css | 8.7KB | Dark header, monitor toggles, item cards, settings sections |
| popup.js | 8KB | Tab filtering, settings management, live updates |
| icons/icon16.png | 549B | Extension icon |
| icons/icon48.png | 1.6KB | Extension icon |
| icons/icon128.png | 4.2KB | Extension icon |

## Verification
- `bun run lint` — ✅ 0 errors
- ZIP extraction — ✅ All 10 files, manifest.json valid JSON
- manifest.json — ✅ Valid Manifest V3, all permissions present