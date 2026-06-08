// ─────────────────────────────────────────────
// LocalStorage adapter — v2: replace with Firebase
// ─────────────────────────────────────────────
import { Meeting } from './types';

const KEY = 'sml_meetings_v2';

export const storage = {
  getAll(): Meeting[] {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      return JSON.parse(raw) as Meeting[];
    } catch {
      return [];
    }
  },

  save(meeting: Meeting): void {
    const all = this.getAll();
    const idx = all.findIndex(m => m.id === meeting.id);
    if (idx >= 0) {
      all[idx] = meeting;
    } else {
      all.unshift(meeting);
    }
    localStorage.setItem(KEY, JSON.stringify(all));
  },

  remove(id: string): void {
    const next = this.getAll().filter(m => m.id !== id);
    localStorage.setItem(KEY, JSON.stringify(next));
  },
};