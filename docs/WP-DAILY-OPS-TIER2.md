# WP-DAILY-OPS-TIER2 — 30-Day Revenue Chart + Month/Year History Selector
## Status: READY FOR CLAUDE CODE EXECUTION
## Assigned to: Claude Code (git write access)
## Authored by: Claude.ai (strategy + spec)
## Version: v1.0 · April 4, 2026

---

## CONTEXT

NuAi cannabis ERP — Medi Recreational tenant (b1bad266).
Stack: React (CRA) + Supabase + Vercel.
Repo: github.com/GFive5y/protea-botanicals

This WP upgrades HQTradingDashboard.js from v2.0 → v3.0.
Two features. No new DB tables. No new nav entries. No new imports.
All data is already fetched — this is purely UI work.

---

## CRITICAL RULES (read before touching anything)

- status = 'paid' always (NOT 'completed' — that value does not exist)
- tenant_id on every Supabase query (Rule 0F)
- Never use PowerShell && — separate lines only (LL-183)
- Read file from disk before editing (LL-185)
- Do NOT modify HQDashboard.js, useNavConfig.js, or any other file
- Only ONE file changes: src/components/hq/HQTradingDashboard.js

---

## STEP 0 — PRE-BUILD VERIFICATION (mandatory)

```powershell
Get-Content src\components\hq\HQTradingDashboard.js | Select-Object -First 3
```

Expected output (first line):
```
// src/components/hq/HQTradingDashboard.js — v2.0
```

If first line is different — STOP. Read SESSION-STATE_v175.md and reconcile.

---

## FILE TO EDIT

```
src/components/hq/HQTradingDashboard.js
```

Current version: v2.0 (SHA: 535a14859c226b71faba5cb64b35b419a66a04ed)
Target version: v3.0

---

## FEATURE 1 — 30-Day Revenue Chart

### What it does
Full-width bar chart showing last 30 days of revenue.
Each bar = one day. X-axis = day of week abbreviation (Mon/Tue/Wed/Thu/Fri/Sat/Sun).
Today's bar = accent green (#2D6A4F). Other days = ink300 (#999999).
Tooltip shows full date + revenue on hover.
Placed between the comparison row and the loyalty strip.

### Step 1A — Add new helper function `buildThirtyDayData`

Find this existing function in the file:
```javascript
function buildSparkData(orders30) {
```

BEFORE that function, insert this new function:

```javascript
// ── 30-day chart data — day-of-week labels, today highlighted ────────────────
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function buildThirtyDayData(orders30) {
  const ts = dayStartSAST(0);
  const todayStr = todayStrSAST();
  const map = {};
  orders30.forEach((o) => {
    const day = o.created_at.slice(0, 10);
    map[day] = (map[day] || 0) + (Number(o.total) || 0);
  });
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(ts);
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    const sastDate = new Date(d.getTime() + SAST_OFFSET_MS);
    return {
      dateStr: key,
      dayLabel: DOW[sastDate.getUTCDay()],
      revenue: map[key] || 0,
      isToday: key === todayStr,
    };
  });
}
```

### Step 1B — Add `thirtyDayData` state

Find this existing state declaration:
```javascript
  const [sparkData30, setSparkData30] = useState([]);
```

AFTER it, add:
```javascript
  const [thirtyDayData, setThirtyDayData] = useState([]);
```

### Step 1C — Populate `thirtyDayData` in the load function

Find this existing line in the `load` function:
```javascript
      setSparkData30(buildSparkData(thirty));
```

AFTER it, add:
```javascript
      setThirtyDayData(buildThirtyDayData(thirty));
```

### Step 1D — Add the chart component `ThirtyDayChart`

Find the existing `EmptyState` component:
```javascript
function EmptyState({ msg }) {
```

BEFORE it, insert this new component:

```javascript
// ─────────────────────────────────────────────────────────────────────────────
// 30-DAY REVENUE CHART
// ─────────────────────────────────────────────────────────────────────────────
function ThirtyDayChart({ data }) {
  if (!data || data.length === 0) return null;
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div style={{ ...sSection, marginBottom: 16 }}>
      <div style={{ ...sSectionHead, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Revenue — last 30 days</span>
        <span style={{ fontSize: 10, color: T.ink400, fontWeight: 400, textTransform: "none", letterSpacing: 0, fontFamily: T.font }}>
          today highlighted
        </span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={14}>
          <XAxis
            dataKey="dayLabel"
            tick={{ fontSize: 9, fontFamily: T.font, fill: T.ink400 }}
            axisLine={false}
            tickLine={false}
            interval={2}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              fontFamily: T.font, fontSize: 11, background: T.ink050,
              border: `1px solid ${T.ink150}`, borderRadius: 4, boxShadow: "none",
            }}
            formatter={(v) => [zar(v), "Revenue"]}
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.dateStr
                ? new Date(payload[0].payload.dateStr + "T12:00:00").toLocaleDateString("en-ZA", {
                    weekday: "short", day: "numeric", month: "short",
                  })
                : ""
            }
            labelStyle={{ color: T.ink500, fontSize: 10 }}
          />
          <Bar
            dataKey="revenue"
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isToday ? T.accentMid : entry.revenue > 0 ? T.ink300 : T.ink150}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Step 1E — Re-add Cell to imports

The `Cell` import was removed in commit 50bae6b. Add it back.

Find:
```javascript
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
```

Replace with:
```javascript
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
```

### Step 1F — Render the chart in JSX

Find this comment in the JSX return block:
```jsx
      {/* ── Comparison row ── */}
```

BEFORE it (i.e., between the KPI strip and the comparison row), insert:
```jsx
      {/* ── 30-day revenue chart ── */}
      {thirtyDayData.length > 0 && <ThirtyDayChart data={thirtyDayData} />}
```

---

## FEATURE 2 — Month/Year History Selector

### What it does
Adds a "MONTHS" tab to the history panel alongside existing presets.
When MONTHS is active: shows `< April 2026 >` navigation (prev/next month arrows).
Fetches all orders for the selected month and displays the same KPI strip,
top sellers, and category breakdown that presets already show.
Minimum year: 2025. Maximum: current year. Cannot navigate to future months.

### Step 2A — Add `monthRangeSAST` helper function

Find the existing `monthStartSAST` function:
```javascript
function monthStartSAST() {
```

AFTER the closing `}` of that function, insert:

```javascript
function monthRangeSAST(year, month) {
  // Returns SAST-correct {start, end} UTC dates for a given calendar month
  const utcStart = Date.UTC(year, month, 1, 0, 0, 0, 0);
  const utcEnd   = Date.UTC(year, month + 1, 1, 0, 0, 0, 0);
  return {
    start: new Date(utcStart - SAST_OFFSET_MS),
    end:   new Date(utcEnd   - SAST_OFFSET_MS),
  };
}
```

### Step 2B — Add month names constant

Near the top of the file, find:
```javascript
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
```

AFTER it, add:
```javascript
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
```

### Step 2C — Update the HistoryPanel component

Find the `HistoryPanel` function signature:
```javascript
function HistoryPanel({ tenantId, onClose }) {
  const [preset, setPreset] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [topMode, setTopMode] = useState("qty");
```

Replace those state declarations (keep the function signature) with:
```javascript
function HistoryPanel({ tenantId, onClose }) {
  const now = nowSAST();
  const [viewMode, setViewMode]   = useState("preset"); // 'preset' | 'month'
  const [preset, setPreset]       = useState(1);
  const [selYear, setSelYear]     = useState(now.getUTCFullYear());
  const [selMonth, setSelMonth]   = useState(now.getUTCMonth());
  const [loading, setLoading]     = useState(false);
  const [orders, setOrders]       = useState([]);
  const [items, setItems]         = useState([]);
  const [topMode, setTopMode]     = useState("qty");

  // Navigation guard — cannot go past current month
  const currentYear  = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const isAtMax = selYear === currentYear && selMonth === currentMonth;
  const isAtMin = selYear === 2025 && selMonth === 0;

  function prevMonth() {
    if (isAtMin) return;
    if (selMonth === 0) { setSelYear(y => y - 1); setSelMonth(11); }
    else { setSelMonth(m => m - 1); }
  }
  function nextMonth() {
    if (isAtMax) return;
    if (selMonth === 11) { setSelYear(y => y + 1); setSelMonth(0); }
    else { setSelMonth(m => m + 1); }
  }
```

### Step 2D — Update `fetchHistory` to handle month mode

Find the existing `fetchHistory` useCallback:
```javascript
  const fetchHistory = useCallback(
    async (presetIdx) => {
      if (!tenantId) return;
      setLoading(true);
      const p = HISTORY_PRESETS[presetIdx];
      const ts = p.monthToDate ? monthStartSAST() : dayStartSAST(p.days);
      const te = dayEndSAST(0);
```

Replace those lines (the first 7 lines of fetchHistory body only — keep the rest) with:
```javascript
  const fetchHistory = useCallback(
    async (presetIdx) => {
      if (!tenantId) return;
      setLoading(true);
      let ts, te;
      if (viewMode === "month") {
        const { start, end } = monthRangeSAST(selYear, selMonth);
        ts = start;
        te = end;
      } else {
        const p = HISTORY_PRESETS[presetIdx];
        ts = p.monthToDate ? monthStartSAST() : dayStartSAST(p.days);
        te = dayEndSAST(0);
      }
```

### Step 2E — Update the fetchHistory dependency array

Find:
```javascript
    [tenantId],
  );
```

Replace with:
```javascript
    [tenantId, viewMode, selYear, selMonth], // eslint-disable-line react-hooks/exhaustive-deps
  );
```

### Step 2F — Update the useEffect that triggers fetchHistory

Find:
```javascript
  useEffect(() => {
    fetchHistory(preset);
  }, [preset, fetchHistory]);
```

Replace with:
```javascript
  useEffect(() => {
    fetchHistory(preset);
  }, [preset, fetchHistory, viewMode, selYear, selMonth]); // eslint-disable-line react-hooks/exhaustive-deps
```

### Step 2G — Update the HistoryPanel JSX header section

Find this block inside the HistoryPanel return:
```jsx
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          {HISTORY_PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPreset(i)}
              style={{
                padding: "6px 14px",
                borderRadius: "3px",
                border: `1px solid ${preset === i ? T.accentMid : T.ink150}`,
                background: preset === i ? T.accentMid : "transparent",
                color: preset === i ? "#fff" : T.ink500,
                fontSize: "12px",
                fontWeight: preset === i ? 600 : 400,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
```

Replace the entire block with:
```jsx
        {/* View mode toggle */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {["preset", "month"].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: "4px 14px", borderRadius: "3px", cursor: "pointer",
                fontFamily: T.font, fontSize: "10px", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.08em",
                border: `1px solid ${viewMode === mode ? T.accentMid : T.ink150}`,
                background: viewMode === mode ? T.accentMid : "transparent",
                color: viewMode === mode ? "#fff" : T.ink500,
              }}
            >
              {mode === "preset" ? "Presets" : "By Month"}
            </button>
          ))}
        </div>

        {/* Preset buttons */}
        {viewMode === "preset" && (
          <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
            {HISTORY_PRESETS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => setPreset(i)}
                style={{
                  padding: "6px 14px", borderRadius: "3px", cursor: "pointer",
                  fontFamily: T.font, fontSize: "12px",
                  fontWeight: preset === i ? 600 : 400,
                  border: `1px solid ${preset === i ? T.accentMid : T.ink150}`,
                  background: preset === i ? T.accentMid : "transparent",
                  color: preset === i ? "#fff" : T.ink500,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Month navigation */}
        {viewMode === "month" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <button
              onClick={prevMonth}
              disabled={isAtMin}
              style={{
                background: "none", border: `1px solid ${T.ink150}`, borderRadius: "3px",
                padding: "4px 10px", cursor: isAtMin ? "not-allowed" : "pointer",
                color: isAtMin ? T.ink300 : T.ink700, fontSize: 14, lineHeight: 1,
              }}
            >
              ‹
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, color: T.ink900, fontFamily: T.font, minWidth: 130, textAlign: "center" }}>
              {MONTH_NAMES[selMonth]} {selYear}
            </span>
            <button
              onClick={nextMonth}
              disabled={isAtMax}
              style={{
                background: "none", border: `1px solid ${T.ink150}`, borderRadius: "3px",
                padding: "4px 10px", cursor: isAtMax ? "not-allowed" : "pointer",
                color: isAtMax ? T.ink300 : T.ink700, fontSize: 14, lineHeight: 1,
              }}
            >
              ›
            </button>
            <span style={{ fontSize: 11, color: T.ink400, fontFamily: T.font }}>
              all order data is stored permanently in Supabase
            </span>
          </div>
        )}
```

### Step 2H — Update the period label in top sellers heading

Find inside HistoryPanel JSX:
```jsx
                <span>
                  Top sellers — {HISTORY_PRESETS[preset].label.toLowerCase()}
                </span>
```

Replace with:
```jsx
                <span>
                  Top sellers —{" "}
                  {viewMode === "month"
                    ? `${MONTH_NAMES[selMonth]} ${selYear}`
                    : HISTORY_PRESETS[preset].label.toLowerCase()}
                </span>
```

### Step 2I — Update the category breakdown heading

Find inside HistoryPanel JSX:
```jsx
                <div style={sSectionHead}>
                  Category breakdown —{" "}
                  {HISTORY_PRESETS[preset].label.toLowerCase()}
                </div>
```

Replace with:
```jsx
                <div style={sSectionHead}>
                  Category breakdown —{" "}
                  {viewMode === "month"
                    ? `${MONTH_NAMES[selMonth]} ${selYear}`
                    : HISTORY_PRESETS[preset].label.toLowerCase()}
                </div>
```

---

## STEP 3 — UPDATE FILE HEADER

Find:
```javascript
// src/components/hq/HQTradingDashboard.js — v2.0
// WP-DAILY-OPS Session C — Tier 1 Foundation Fixes
//
// CHANGES v2.0:
```

Replace with:
```javascript
// src/components/hq/HQTradingDashboard.js — v3.0
// WP-DAILY-OPS Session D — Tier 2 History + 30-Day Chart
//
// CHANGES v3.0:
//   6. 30-DAY CHART: Full-width bar chart, day-of-week labels, today highlighted
//   7. MONTH SELECTOR: History panel "By Month" mode with prev/next navigation
//      Navigate to any month from Jan 2025 to present
//
// CHANGES v2.0 (retained):
```

---

## STEP 4 — VERIFY COMPILATION

```powershell
npm start
```

Expected: Compiled successfully (or "Compiled with warnings" — no errors).
If errors: fix before committing. Do not commit a broken build.

---

## STEP 5 — COMMIT AND PUSH

```powershell
git add src\components\hq\HQTradingDashboard.js
```
```powershell
git commit -m "feat(trading): HQTradingDashboard v3.0 — 30-day chart + month/year history selector"
```
```powershell
git push
```

---

## QA CHECKLIST (verify after Vercel deploys)

Navigate to: protea-botanicals.vercel.app/hq?tab=hq-trading

- [ ] File header shows v3.0
- [ ] 30-day chart appears between KPI strip and comparison row
- [ ] 30-day chart X-axis shows Mon/Tue/Wed/Thu/Fri/Sat/Sun labels
- [ ] Today's bar is accent green — all other bars are grey/lighter
- [ ] Hover tooltip on any bar shows date + revenue
- [ ] History panel (click 📅 History): shows "Presets" and "By Month" toggle buttons
- [ ] "Presets" mode: Yesterday/Last 7 days/Last 30 days/This month buttons work as before
- [ ] "By Month" mode: shows `< April 2026 >` navigation
- [ ] Clicking ‹ navigates to March 2026 — clicking again to February 2026
- [ ] March 2026 shows R303,983 sandbox data (if sandbox still present on Medi Rec)
- [ ] Cannot navigate past current month (› button disabled when at current month)
- [ ] Cannot navigate before January 2025 (‹ button disabled at Jan 2025)
- [ ] Category breakdown and top sellers update with the selected month
- [ ] npm start: 0 errors (Cell import should now be used — no unused-vars warning)

---

## NOTES FOR CLAUDE CODE

- Do NOT touch HQDashboard.js, useNavConfig.js, or any other file
- Do NOT create new Supabase tables — no DB changes needed
- The `thirtyDayData` state uses the same `orders30` data already fetched in `load()`
- `Cell` from recharts was previously removed — it must be re-added for the bar colouring
- The `SAST_OFFSET_MS` constant is already defined in the file — use it
- The `nowSAST()` function is already defined — use it in HistoryPanel
- Month navigation min: Jan 2025 (hardcoded — platform launched ~Jan 2025)
- Month navigation max: current SAST month (computed from nowSAST())
- All Supabase queries already use `status = 'paid'` — keep this rule
- `resolveCategories(its)` is already called in fetchHistory — keep it

---

*WP-DAILY-OPS-TIER2 v1.0 · NuAi · April 4, 2026*
*Authored by Claude.ai · Executed by Claude Code*
