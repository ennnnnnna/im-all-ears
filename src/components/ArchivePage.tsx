import React, { useState } from 'react';
import { Meeting } from '../types';
import { Search, Trash2, FileText, Calendar, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  meetings: Meeting[];
  onLoad: (m: Meeting) => void;
  onDelete: (id: string) => void;
}

export default function ArchivePage({ meetings, onLoad, onDelete }: Props) {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterKeyword, setFilterKeyword] = useState('');

  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [showDeletedSuccessModal, setShowDeletedSuccessModal] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<string | null>(null);

  const allTypes = Array.from(new Set(meetings.map(m => m.type).filter(Boolean)));
  const allKeywords = Array.from(new Set(meetings.flatMap(m => m.keywords).filter(Boolean)));

  const filtered = meetings.filter(m => {
    const q = query.toLowerCase();
    const matchQuery = !q || m.title.toLowerCase().includes(q) || m.originalTranscript.toLowerCase().includes(q);
    const matchType = !filterType || m.type === filterType;
    const matchKw = !filterKeyword || m.keywords.includes(filterKeyword);
    return matchQuery && matchType && matchKw;
  });

  return (
    <div className="max-w-[960px] mx-auto py-10 px-6 space-y-8">
      <div>
        <h2 className="text-2xl font-black text-[--c-ink] tracking-tight">회의록 아카이브</h2>
        <p className="text-body mt-1">저장된 회의록을 검색하고 불러오세요.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-[--c-border] rounded-xl flex-1 min-w-[200px]">
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--c-muted)' }} />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="제목 또는 내용 검색..."
            className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-300" />
        </div>

        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-4 py-2 bg-white border border-[--c-border] rounded-xl text-sm outline-none cursor-pointer"
          style={{ color: filterType ? 'var(--c-ink)' : 'var(--c-muted)' }}>
          <option value="">회의 종류 전체</option>
          {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select value={filterKeyword} onChange={e => setFilterKeyword(e.target.value)}
          className="px-4 py-2 bg-white border border-[--c-border] rounded-xl text-sm outline-none cursor-pointer"
          style={{ color: filterKeyword ? 'var(--c-ink)' : 'var(--c-muted)' }}>
          <option value="">키워드 전체</option>
          {allKeywords.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      <p className="text-caption">{filtered.length}개의 회의록</p>

      {filtered.length === 0 ? (
        <div className="text-center py-24 space-y-3">
          <FileText className="w-12 h-12 mx-auto" style={{ color: '#E2E8F0' }} />
          <p className="text-body font-semibold text-[--c-muted]">저장된 회의록이 없습니다.</p>
          <p className="text-caption">분석 완료 후 저장 버튼을 눌러 아카이브에 추가하세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m, idx) => (
            <motion.div key={m.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
              className="bg-white border border-[--c-border] rounded-2xl p-5 flex items-center gap-5 hover:border-blue-200 transition-all shadow-sm group cursor-pointer"
              onClick={() => onLoad(m)}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--c-blue-soft)' }}>
                <FileText className="w-5 h-5" style={{ color: 'var(--c-blue)' }} />
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="text-base font-black text-[--c-ink] truncate">
                  {m.title || '(제목 없음)'}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1 text-caption">
                    <Calendar className="w-3 h-3" />{m.date}
                  </span>
                  {m.type && <span className="chip chip-blue" style={{ fontSize: '11px', padding: '2px 8px' }}>{m.type}</span>}
                  {m.keywords.slice(0, 3).map(kw => (
                    <span key={kw} className="chip chip-yellow" style={{ fontSize: '11px', padding: '2px 8px' }}>#{kw}</span>
                  ))}
                  {m.keywords.length > 3 && <span className="text-caption">+{m.keywords.length - 3}</span>}
                </div>
                {m.analysis && (
                  <p className="text-caption">
                    토픽 {m.analysis.selectedTopics.length}개 · 액션 {m.analysis.actionItems.length}개
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedDeleteId(m.id);
                    setShowConfirmDeleteModal(true);
                  }}
                  className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 cursor-pointer"
                  style={{ color: '#CBD5E1' }}
                >
                  <Trash2 className="w-4 h-4 hover:text-rose-500 transition-colors" />
                </button>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" style={{ color: 'var(--c-blue)' }} />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showConfirmDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm shadow-2xl" onClick={() => { setShowConfirmDeleteModal(false); setSelectedDeleteId(null); }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full border border-slate-100 space-y-6 text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="mx-auto w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 shadow-inner">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-800">삭제하시겠습니까?</h3>
                <p className="text-xs text-slate-400 font-bold leading-relaxed">삭제된 회의록은 복구하실 수 없습니다.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowConfirmDeleteModal(false);
                    setSelectedDeleteId(null);
                  }}
                  className="px-5 py-3.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-2xl text-xs font-black tracking-wider uppercase transition-all active:scale-[0.98] cursor-pointer"
                >
                  아니요
                </button>
                <button
                  onClick={() => {
                    if (selectedDeleteId) {
                      onDelete(selectedDeleteId);
                      setShowConfirmDeleteModal(false);
                      setShowDeletedSuccessModal(true);
                    }
                  }}
                  className="px-5 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black tracking-wider uppercase shadow-lg shadow-rose-100 transition-all active:scale-[0.98] cursor-pointer"
                >
                  네
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showDeletedSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm shadow-2xl" onClick={() => { setShowDeletedSuccessModal(false); setSelectedDeleteId(null); }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full border border-slate-100 space-y-6 text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="mx-auto w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 shadow-inner">
                <span className="text-xl font-black">✓</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-800">삭제되었습니다.</h3>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setShowDeletedSuccessModal(false);
                    setSelectedDeleteId(null);
                  }}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black tracking-wider uppercase shadow-md transition-all active:scale-[0.98] cursor-pointer font-black"
                >
                  확인
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}