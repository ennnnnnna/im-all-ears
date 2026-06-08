import React, { useState, useRef, useEffect } from 'react';
import { RefinedTranscriptLine } from '../types';
import { Clock, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  lines: RefinedTranscriptLine[];
  onUpdate: (lines: RefinedTranscriptLine[]) => void;
  onAddToGlossary: (term: string) => void;
  speakerMap: Record<string, string>;
  highlightedLineId?: string | null;
  onClearHighlight?: () => void;
}

export default function TranscriptEditor({
  lines,
  onUpdate,
  onAddToGlossary,
  speakerMap,
  highlightedLineId,
  onClearHighlight,
}: Props) {
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightedLineId) {
      setTimeout(() => {
        const el = document.getElementById(`transcript-line-${highlightedLineId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);

      const timer = setTimeout(() => {
        if (onClearHighlight) onClearHighlight();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [highlightedLineId, onClearHighlight]);

  const handleLineChange = (id: string, text: string) =>
    onUpdate(lines.map(l => l.id === id ? { ...l, text } : l));

  const handleSelection = () => {
    const sel = window.getSelection();
    if (!sel || !sel.toString().trim()) { setSelection(null); return; }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setSelection({ text: sel.toString().trim(), x: rect.left + rect.width / 2, y: rect.top + window.scrollY - 10 });
  };

  const groups = lines.reduce((acc: RefinedTranscriptLine[][], line, idx) => {
    if (idx === 0) return [[line]];
    const last = acc[acc.length - 1];
    if (last[0].speakerId === line.speakerId) { last.push(line); } else { acc.push([line]); }
    return acc;
  }, []);

  return (
    <div className="relative h-full flex flex-col px-6 pb-6" ref={ref}>
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col flex-1">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-black text-slate-700">
            <Clock className="w-4 h-4 text-purple-600 animate-pulse" />
            회의록 전문 에디터
          </span>
          <span className="text-[11px] font-black text-purple-500 bg-purple-50/65 px-2.5 py-1.5 rounded-xl border border-purple-100/20 hidden sm:block">
            ✨ 드래그하여 용어 사전에 등록 가능
          </span>
        </div>

        <div className="p-8 space-y-10 overflow-y-auto flex-1 custom-scrollbar" onMouseUp={handleSelection}>
          {groups.map((group, gi) => (
            <div key={gi} className="flex gap-6 group">
              <div className="flex flex-col items-center pt-1 w-28 shrink-0">
                <div className="px-3 py-1.5 rounded-xl text-xs font-black text-center w-full truncate bg-purple-50 text-purple-600 border border-purple-100/20"
                  title={speakerMap[group[0].speakerId] || group[0].speakerName}>
                  {speakerMap[group[0].speakerId] || group[0].speakerName}
                </div>
                <div className="flex-1 w-0.5 mt-3 group-last:hidden rounded-full bg-slate-100" />
              </div>
              <div className="flex-1 space-y-3">
                {group.map(line => {
                  const isHighlighted = highlightedLineId === line.id;
                  return (
                    <div
                      key={line.id}
                      id={`transcript-line-${line.id}`}
                      className={`p-2 rounded-xl transition-all duration-700 ${
                        isHighlighted
                          ? 'bg-purple-100/70 border border-purple-200/50 shadow-[0_2px_10px_rgba(124,58,237,0.1)] scale-[1.005]'
                          : 'bg-transparent border border-transparent'
                      }`}
                    >
                      <textarea
                        value={line.text}
                        onChange={(e) => handleLineChange(line.id, e.target.value)}
                        rows={Math.max(1, Math.ceil(line.text.length / 80))}
                        className="w-full text-body-lg bg-transparent border-none focus:ring-0 focus:outline-none resize-none p-0 selection:bg-purple-100 hover:text-[--c-ink] transition-colors"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 p-4 bg-purple-50/30 border border-purple-100/20 rounded-2xl flex items-center gap-3 shadow-[sm_inset_0_1px_1px_rgba(255,255,255,0.6)]">
        <BookOpen className="w-4 h-4 shrink-0 text-purple-500" />
        <p className="text-xs font-semibold text-slate-600 leading-normal">
          회의록 전문 내의 사내 특정 용어 및 단어를 드래그하여 선택하면 <strong className="text-purple-600 font-extrabold">용어 사전</strong>에 실시간 등록할 수 있습니다.
        </p>
      </div>

      <AnimatePresence>
        {selection && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="fixed z-50 px-3 py-2 rounded-xl shadow-2xl flex items-center gap-2"
            style={{ background: 'var(--c-ink)', left: selection.x, top: selection.y, transform: 'translate(-50%, -100%)' }}
          >
            <span className="text-xs font-semibold max-w-[120px] truncate" style={{ color: 'var(--c-blue)' }}>
              선택됨
            </span>
            <button
              onClick={() => { onAddToGlossary(selection.text); setSelection(null); }}
              className="flex items-center gap-1.5 text-xs font-bold text-white hover:opacity-80 transition-opacity"
            >
              <BookOpen className="w-3 h-3" />용어 사전에 추가
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}