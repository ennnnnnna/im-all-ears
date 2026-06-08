import React, { useState } from 'react';
import { Meeting } from '../types';
import { BarChart2, CheckSquare, TrendingUp, AlertTriangle, Sparkles, Filter, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CrossResult {
  actionItemTracking: { who: string; what: string; when: string; source: string; status: string }[];
  topicTimeline: { topic: string; evolution: string }[];
  unresolvedIssues: { issue: string; appearedIn: string[]; summary: string }[];
}

interface Props { meetings: Meeting[]; }

export default function InsightsPage({ meetings }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState('');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<CrossResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzedMeetings = meetings.filter(m => m.analysis);
  const allTypes = Array.from(new Set(analyzedMeetings.map(m => m.type).filter(Boolean)));
  const allKeywords = Array.from(new Set(analyzedMeetings.flatMap(m => m.keywords).filter(Boolean)));
  const allYears = Array.from(new Set(analyzedMeetings.map(m => m.date.split('.')[0]).filter(Boolean))).sort().reverse();

  const filtered = analyzedMeetings.filter(m => {
    const matchType = !filterType || m.type === filterType;
    const matchKw = !filterKeyword || m.keywords.includes(filterKeyword);
    const matchYear = !filterYear || m.date.startsWith(filterYear);
    return matchType && matchKw && matchYear;
  });

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filtered.map(m => m.id)));
  const clearAll = () => setSelectedIds(new Set());

  const runAnalysis = async () => {
    const targets = meetings.filter(m => selectedIds.has(m.id));
    if (targets.length < 2) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/cross-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetings: targets.map(m => ({
          title: m.title, date: m.date, type: m.type, keywords: m.keywords, analysis: m.analysis
        })) })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (analyzedMeetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-32 space-y-4">
        <BarChart2 className="w-14 h-14" style={{ color: '#E2E8F0' }} />
        <p className="text-base font-bold text-[--c-muted]">분석된 회의록이 없습니다.</p>
        <p className="text-caption text-center max-w-sm">회의록을 분석하고 저장하면<br/>여기서 여러 회의록을 한번에 분석할 수 있어요.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto py-10 px-6 space-y-8">
      <div>
        <h2 className="text-2xl font-black text-[--c-ink] tracking-tight">Cross-회의록 인사이트</h2>
        <p className="text-body mt-1">여러 회의록을 선택해 시계열 변화, 액션아이템 추적, 미해결 이슈를 분석합니다.</p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-slate-300/50">
        <div className="flex items-center gap-2 pb-1">
          <Filter className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-black tracking-widest text-slate-500 uppercase">인사이트 분석 필터</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
              className="appearance-none w-full pl-4 pr-10 py-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 hover:border-purple-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 rounded-xl text-sm font-semibold text-slate-700 outline-none transition-all cursor-pointer">
              <option value="">연도 전체</option>
              {allYears.map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="appearance-none w-full pl-4 pr-10 py-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 hover:border-purple-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 rounded-xl text-sm font-semibold text-slate-700 outline-none transition-all cursor-pointer">
              <option value="">회의 종류 전체</option>
              {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select value={filterKeyword} onChange={e => setFilterKeyword(e.target.value)}
              className="appearance-none w-full pl-4 pr-10 py-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 hover:border-purple-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 rounded-xl text-sm font-semibold text-slate-700 outline-none transition-all cursor-pointer">
              <option value="">키워드 전체</option>
              {allKeywords.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-caption">{filtered.length}개 회의록 · {selectedIds.size}개 선택됨</span>
            <div className="flex gap-3">
              <button onClick={selectAll} className="text-sm font-semibold" style={{ color: 'var(--c-blue)' }}>전체 선택</button>
              <button onClick={clearAll} className="text-sm font-semibold" style={{ color: 'var(--c-muted)' }}>선택 해제</button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto custom-scrollbar">
            {filtered.map(m => {
              const sel = selectedIds.has(m.id);
              return (
                <button key={m.id} onClick={() => toggle(m.id)}
                  className="flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all"
                  style={{ borderColor: sel ? 'var(--c-blue)' : 'var(--c-border)', background: sel ? 'var(--c-blue-soft)' : '#fff' }}>
                  <span className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0"
                    style={{ background: sel ? 'var(--c-blue)' : '#fff', borderColor: sel ? 'var(--c-blue)' : '#CBD5E1' }}>
                    {sel && <span className="w-2 h-2 bg-white rounded-sm block" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[--c-ink] truncate">{m.title || '(제목 없음)'}</p>
                    <p className="text-caption">{m.date} · {m.type}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={runAnalysis} disabled={isAnalyzing || selectedIds.size < 2}
          className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wide text-white transition-all flex items-center justify-center gap-2"
          style={{
            background: (isAnalyzing || selectedIds.size < 2) ? '#E2E8F0' : 'var(--c-purple)',
            color: (isAnalyzing || selectedIds.size < 2) ? '#94A3B8' : '#fff',
            cursor: (isAnalyzing || selectedIds.size < 2) ? 'not-allowed' : 'pointer',
          }}>
          <Sparkles className="w-4 h-4" />
          {isAnalyzing ? '분석 중...' : `선택한 ${selectedIds.size}개 회의록 Cross-분석 시작`}
        </button>
        {selectedIds.size < 2 && <p className="text-caption text-center">2개 이상 선택해주세요.</p>}
      </div>

      {error && (
        <div className="p-4 rounded-xl text-sm font-semibold" style={{ background: '#FEF2F2', color: 'var(--c-red)', border: '1px solid #FCA5A5' }}>
          {error}
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <ResultSection icon={<CheckSquare className="w-5 h-5" style={{ color: 'var(--c-orange)' }} />} title="액션아이템 추적">
              <div className="space-y-2">
                {result.actionItemTracking.map((a, i) => (
                  <div key={i} className="p-4 bg-white border border-[--c-border] rounded-xl flex items-start gap-3 hover:border-orange-200 transition-all">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0 mt-0.5"
                      style={{ background: 'var(--c-orange)' }}>{i + 1}</span>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-semibold text-[--c-ink]">{a.what}</p>
                      <div className="flex flex-wrap gap-3 text-caption">
                        <span>담당: {a.who}</span>
                        <span>기한: {a.when}</span>
                        <span>출처: {a.source}</span>
                      </div>
                    </div>
                    <span className="chip chip-orange text-xs shrink-0">{a.status}</span>
                  </div>
                ))}
              </div>
            </ResultSection>

            <ResultSection icon={<TrendingUp className="w-5 h-5" style={{ color: 'var(--c-blue)' }} />} title="주제 시계열 변화">
              <div className="space-y-3">
                {result.topicTimeline.map((t, i) => (
                  <div key={i} className="p-4 bg-white border border-[--c-border] rounded-xl hover:border-blue-200 transition-all">
                    <p className="text-sm font-black text-[--c-ink] mb-2">{t.topic}</p>
                    <p className="text-body">{t.evolution}</p>
                  </div>
                ))}
              </div>
            </ResultSection>

            <ResultSection icon={<AlertTriangle className="w-5 h-5" style={{ color: 'var(--c-red)' }} />} title="미해결 이슈">
              <div className="space-y-3">
                {result.unresolvedIssues.map((u, i) => (
                  <div key={i} className="p-4 bg-white border border-[--c-border] rounded-xl hover:border-red-200 transition-all space-y-2">
                    <p className="text-sm font-black text-[--c-ink]">{u.issue}</p>
                    <p className="text-body">{u.summary}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {u.appearedIn.map(src => (
                        <span key={src} className="chip chip-slate" style={{ fontSize: '11px' }}>{src}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ResultSection>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 border border-[--c-border] rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-base font-black text-[--c-ink]">{title}</h3>
      </div>
      {children}
    </div>
  );
}