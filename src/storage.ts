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
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch (e: any) {
      console.error("LocalStorage save failed:", e);
      if (e.name === 'QuotaExhaustedError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014) {
        throw new Error("로컬 스토리지 저장 용량이 초과되었습니다. 오래되고 불필요한 과거 회의록 자료를 삭제한 후 다시 시도해 주세요.");
      }
      throw e;
    }
  },

  remove(id: string): void {
    const next = this.getAll().filter(m => m.id !== id);
    localStorage.setItem(KEY, JSON.stringify(next));
  },
};