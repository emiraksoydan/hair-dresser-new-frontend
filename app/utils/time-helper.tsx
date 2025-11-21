import { DAYS_TR } from "../constants";

export const timeHHmm = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const fmtHHmm = (d: Date) => {
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
};
export const fromHHmm = (s?: string, fallback = "09:00") => {
    const d = new Date();
    const [hh, mm] = (s || fallback).split(":").map((x) => parseInt(x || "0", 10));
    d.setHours(hh || 0, mm || 0, 0, 0);
    return d;
};

export const toHHmm = (time: string | null | undefined) => {
    if (!time) return "09:00";
    return time.slice(0, 5); // "09:00:00" -> "09:00"
};

export const toMinutes = (hhmm?: string) => {
    if (!hhmm) return NaN;             // <— guard
    const [h, m] = hhmm.split(':');
    const hh = Number(h), mm = Number(m);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return NaN;
    return hh * 60 + mm;
};


export const HOLIDAY_OPTIONS = DAYS_TR.map(d => ({ label: d.full, value: String(d.day) }));
