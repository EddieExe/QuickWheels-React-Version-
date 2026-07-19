// src/context/DateRangeContext.jsx
import { createContext, useContext, useState } from "react";

const DateRangeContext = createContext();

export const PRESETS = [
  { id: "today",   label: "Today",      getDates: () => { const d = new Date(); d.setHours(0,0,0,0); const e = new Date(); e.setHours(23,59,59,999); return [d, e]; } },
  { id: "7d",      label: "Last 7 Days",  getDates: () => { const e = new Date(); const d = new Date(); d.setDate(d.getDate()-6); d.setHours(0,0,0,0); return [d, e]; } },
  { id: "30d",     label: "Last 30 Days", getDates: () => { const e = new Date(); const d = new Date(); d.setDate(d.getDate()-29); d.setHours(0,0,0,0); return [d, e]; } },
  { id: "90d",     label: "Last 90 Days", getDates: () => { const e = new Date(); const d = new Date(); d.setDate(d.getDate()-89); d.setHours(0,0,0,0); return [d, e]; } },
  { id: "year",    label: "This Year",    getDates: () => { const e = new Date(); const d = new Date(e.getFullYear(), 0, 1); return [d, e]; } },
  { id: "custom",  label: "Custom",       getDates: () => [null, null] },
];

export function DateRangeProvider({ children }) {
  const [activePreset, setActivePreset] = useState("30d");
  const [startDate, setStartDate]       = useState(() => PRESETS[2].getDates()[0]);
  const [endDate, setEndDate]           = useState(() => new Date());

  function applyPreset(presetId) {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const [s, e] = preset.getDates();
    setActivePreset(presetId);
    if (s) setStartDate(s);
    if (e) setEndDate(e);
  }

  function applyCustomRange(start, end) {
    setActivePreset("custom");
    setStartDate(start);
    setEndDate(end);
  }

  // Filter an array of objects by their date field within the active range
  function filterByRange(arr, dateField = "createdAt") {
    return arr.filter(item => {
      const raw = item[dateField];
      if (!raw) return false;
      const d = raw?.toDate ? raw.toDate() : new Date(raw);
      return d >= startDate && d <= endDate;
    });
  }

  return (
    <DateRangeContext.Provider value={{
      startDate, endDate,
      activePreset,
      applyPreset,
      applyCustomRange,
      filterByRange,
    }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  return useContext(DateRangeContext);
}