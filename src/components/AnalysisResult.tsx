import React, { useState } from 'react';
import { Meeting, MeetingAnalysis, SummaryItem } from '../types';
import { Download, Save, User, ChevronDown, Link as LinkIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TranscriptEditor from './TranscriptEditor';
// @ts-ignore
import html2pdf from 'html2pdf.js';

function TopicAccordion({ item, index, onJumpToTranscript, speakerMap }: {
  key?: React.Key | number;
  item: SummaryItem; index: number;
  onJumpToTranscript: (text: string, speaker: string) => void;
  speakerMap: Record<string, string>;
}) {
  const [open, setOpen] = useState(index === 0);
  return (
    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.08 }}
      className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:border-slate-200 hover:shadow-md transition-all duration-300">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-slate-50/50 transition-colors">
        <div className="flex items-center gap-4">
          <span className="w-8 h-8 flex items-center justify-center rounded-xl font-black text-xs bg-purple-50 text-purple-600">
            {index + 1}
          </span>
          <h5 className="text-base sm:text-lg font-black text-[--c-ink] leading-snug">{item.topic}</h5>
        </div>
        <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${open ? 'rotate-180 text-purple-600' : 'text-slate-300'}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-6 pb-6 space-y-5">
              <div className="p-5 rounded-xl text-[15px] sm:text-[16px] leading-relaxed text-[--c-ink2] bg-purple-50/30 border border-purple-100/30">
                {item.summary.split(/(\[\d+\])/).map((part, i) =>
                  part.match(/\[\d+\]/)
                    ? <sup key={i} className="font-extrabold ml-0.5 text-purple-600">{part}</sup>
                    : part
                )}
              </div>

              {item.citations?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-label text-purple-500/80">인용 근거</p>
                  <div className="space-y-2">
                    {item.citations.map(c => (
                      <div key={c.id} className="flex gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/40 hover:border-purple-100 hover:bg-white transition-all group/c">
                        <span className="text-xs sm:text-sm font-black w-6 shrink-0 text-purple-500">[{c.id}]</span>
                        <div className="flex-1 space-y-1">
                          <p className="text-[13px] sm:text-[14px] text-[--c-muted] leading-relaxed italic">"{c.text}"</p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-label text-slate-400">— {speakerMap[c.speaker] || c.speaker}</span>
                            <button onClick={() => onJumpToTranscript(c.text, c.speaker)}
                              className="opacity-0 group-hover/c:opacity-100 flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-800 transition-all">
                              <LinkIcon className="w-3 h-3" />전문 보기
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function QuestionAccordion({ item, index }: {
  key?: React.Key | number;
  item: { question: string; answerMapping: string };
  index: number;
}) {
  const [open, setOpen] = useState(index === 0);
  return (
    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.08 }}
      className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:border-pink-100 hover:shadow-md transition-all duration-300">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-pink-50/10 transition-colors">
        <div className="flex items-center gap-4">
          <span className="w-8 h-8 flex items-center justify-center rounded-xl font-black text-xs bg-pink-50 text-pink-500 border border-pink-100/30 shadow-inner">
            Q{index + 1}
          </span>
          <h5 className="text-base sm:text-lg font-black text-[--c-ink] leading-snug">{item.question}</h5>
        </div>
        <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${open ? 'rotate-180 text-pink-500' : 'text-slate-300'}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-6 pb-6">
              <div className="p-5 rounded-xl text-[15px] sm:text-[16px] leading-relaxed text-[--c-ink2] bg-pink-50/30 border border-pink-100/30">
                <div className="flex gap-2.5">
                  <span className="text-sm font-black text-purple-500 bg-purple-50 w-5 h-5 rounded-lg flex items-center justify-center shrink-0">A.</span>
                  <p className="text-sm font-extrabold text-slate-700 leading-relaxed">{item.answerMapping}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ActionItemAccordion({ item, index, onDelete, speakerMap }: {
  key?: React.Key | number;
  item: { who: string; what: string; when: string };
  index: number;
  onDelete: () => void;
  speakerMap: Record<string, string>;
}) {
  const [open, setOpen] = useState(index === 0);
  return (
    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.08 }}
      className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:border-orange-100 hover:shadow-md transition-all duration-300 relative group">
      
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-orange-50/10 transition-colors">
        <div className="flex items-center gap-4 pr-10">
          <span className="w-8 h-8 flex items-center justify-center rounded-xl font-black text-xs bg-orange-50 text-orange-600 border border-orange-100/30 shadow-inner">
            {index + 1}
          </span>
          <h5 className="text-base sm:text-lg font-black text-[--c-ink] leading-snug break-words">{item.what}</h5>
        </div>
        <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${open ? 'rotate-180 text-orange-500' : 'text-slate-300'}`} />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute right-14 top-1/2 -translate-y-1/2 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 text-slate-300 hover:text-rose-500 cursor-pointer z-10"
        title="삭제"
      >
        <X className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-6 pb-6">
              <div className="p-5 rounded-xl text-[15px] sm:text-[16px] leading-relaxed text-[--c-ink2] bg-orange-50/30 border border-orange-100/30">
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-orange-600 bg-orange-50/80 px-2.5 py-1 rounded-lg border border-orange-100/40">담당자</span>
                    <span className="text-sm font-extrabold text-slate-700">{speakerMap[item.who] || item.who}</span>
                  </div>
                  {item.when && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">기한</span>
                      <span className="text-sm font-extrabold text-slate-700">{item.when}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AnalysisResult({ meeting, setMeeting, onSave, onUpdateRefinedTranscript, onAddToGlossary }: {
  meeting: Meeting;
  setMeeting: React.Dispatch<React.SetStateAction<Meeting>>;
  onSave: () => void;
  onUpdateRefinedTranscript: (lines: MeetingAnalysis['refinedTranscript']) => void;
  onAddToGlossary: (term: string) => void;
}) {
  const [tab, setTab] = useState<'summary' | 'transcript'>('summary');
  const [highlightedLineId, setHighlightedLineId] = useState<string | null>(null);
  const analysis = meeting.analysis;
  if (!analysis) return null;

  const handleJumpToTranscript = (text: string, speakerId: string) => {
    const normCite = text.replace(/\s+/g, '').toLowerCase();
    
    // 1. Try exact or full substring match on normalized text
    let bestLine = analysis.refinedTranscript.find(line => {
      const normLine = line.text.replace(/\s+/g, '').toLowerCase();
      return normLine.includes(normCite) || normCite.includes(normLine);
    });
    
    // 2. Try Speaker-filtered word overlap
    if (!bestLine) {
      const speakerLines = analysis.refinedTranscript.filter(line => line.speakerId === speakerId);
      if (speakerLines.length > 0) {
        let maxOverlapIdx = -1;
        let maxOverlapCount = 0;
        const citeWords = text.split(/\s+/).filter(w => w.length > 1);
        
        speakerLines.forEach((line, idx) => {
          const overlap = citeWords.filter(w => line.text.includes(w)).length;
          if (overlap > maxOverlapCount) {
            maxOverlapCount = overlap;
            maxOverlapIdx = idx;
          }
        });
        if (maxOverlapIdx !== -1 && maxOverlapCount >= 1) {
          bestLine = speakerLines[maxOverlapIdx];
        }
      }
    }

    // 3. Fallback to any line with word matches
    if (!bestLine) {
      let maxOverlapIdx = -1;
      let maxOverlapCount = 0;
      const citeWords = text.split(/\s+/).filter(w => w.length > 1);
      analysis.refinedTranscript.forEach((line, idx) => {
        const overlap = citeWords.filter(w => line.text.includes(w)).length;
        if (overlap > maxOverlapCount) {
          maxOverlapCount = overlap;
          maxOverlapIdx = idx;
        }
      });

      if (maxOverlapIdx !== -1 && maxOverlapCount >= 1) {
        bestLine = analysis.refinedTranscript[maxOverlapIdx];
      }
    }

    if (bestLine) {
      setHighlightedLineId(bestLine.id);
    }
    setTab('transcript');
  };

  const handleExportPDF = () => {
    // Generate safe filename for PDF
    const safeTitle = (meeting.title || '회의_요약_리포트').replace(/[\/\\?%*:|"<>]/g, '_');
    const safeDate = (meeting.date || '').replace(/[- :]/g, '');
    const filename = `[회의록_요약]_${safeTitle}${safeDate ? '_' + safeDate : ''}.pdf`;

    const element = document.createElement('div');
    element.id = 'temp-pdf-export';
    element.className = 'p-10 bg-white space-y-8';
    element.style.fontFamily = "'Pretendard', 'Noto Sans KR', system-ui, -apple-system, sans-serif";
    element.style.color = '#1e293b';
    element.style.maxWidth = '800px';

    // 1. Header Area
    const headerHTML = `
      <div style="border-bottom: 2px solid #7C3AED; padding-bottom: 20px; margin-bottom: 30px;">
        <p style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #7C3AED; margin: 0 0 6px 0;">Smart Meeting Logger — 요약 리포트</p>
        <h1 style="font-size: 26px; font-weight: 900; color: #1E1F2E; margin: 0 0 12px 0; line-height: 1.2;">${meeting.title || '제목 없음'}</h1>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; font-size: 13px; color: #64748b;">
          ${meeting.type ? `<span style="background: #F5F3FF; color: #7C3AED; font-weight: 700; padding: 4px 10px; border-radius: 99px; border: 1.5px solid rgba(124, 58, 237, 0.1);">${meeting.type}</span>` : ''}
          <span style="font-weight: 600;">일시: ${meeting.date || '-'}</span>
          ${meeting.keywords && meeting.keywords.length > 0 ? `
            <span style="color: #cbd5e1; margin: 0 4px;">|</span>
            <div style="display: flex; gap: 6px;">
              ${meeting.keywords.filter(Boolean).map(kw => `<span style="color: #4B6BFB; font-weight: 600; font-size: 13px;">#${kw}</span>`).join(' ')}
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // 2. Topic Summaries
    let topicsHTML = '';
    if (analysis.summaryItems && analysis.summaryItems.length > 0) {
      topicsHTML = `
        <div style="margin-bottom: 35px;">
          <h3 style="font-size: 18px; font-weight: 900; color: #1E1F2E; border-left: 4px solid #7C3AED; padding-left: 12px; margin-bottom: 15px;">Topic Summaries (주제별 요약)</h3>
          <div style="display: flex; flex-direction: column; gap: 16px;">
            ${analysis.summaryItems.map((item, idx) => `
              <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; background: #fff;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                  <span style="background: #F5F3FF; color: #7C3AED; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; font-weight: 900; font-size: 13px;">${idx + 1}</span>
                  <span style="font-size: 15.5px; font-weight: 800; color: #1E1F2E;">${item.topic}</span>
                </div>
                <div style="font-size: 14px; line-height: 1.7; color: #334155; padding: 14px; background: #faf5ff; border-radius: 8px; border: 1px solid #f3e8ff; margin-bottom: 8px;">
                  ${item.summary}
                </div>
                ${item.citations && item.citations.length > 0 ? `
                  <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e2e8f0;">
                    <p style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; margin: 0 0 8px 0;">인용 근거</p>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                      ${item.citations.map(c => `
                        <div style="font-size: 12px; color: #64748b; line-height: 1.5; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #f1f5f9;">
                          <span style="color: #7C3AED; font-weight: 700; margin-right: 4px;">[${c.id}]</span>
                          <span style="font-style: italic;">"${c.text}"</span>
                          <span style="font-weight: 700; font-size: 11px; color: #94a3b8; margin-left: 6px;">— ${meeting.speakerMap[c.speaker] || c.speaker}</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 3. Pre-Questions & Answers
    let qaHTML = '';
    if (meeting.prefixedQuestions?.trim() && (analysis.questionMappings || []).length > 0) {
      qaHTML = `
        <div style="margin-bottom: 35px;">
          <h3 style="font-size: 18px; font-weight: 900; color: #1E1F2E; border-left: 4px solid #F43F5E; padding-left: 12px; margin-bottom: 15px;">Pre-Questions & Answers (사전 질문 및 답변)</h3>
          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${analysis.questionMappings.map((item, idx) => `
              <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; background: #fff;">
                <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px;">
                  <span style="background: #FFF1F2; color: #F43F5E; font-weight: 900; font-size: 11px; padding: 4px 8px; border-radius: 6px; white-space: nowrap; margin-top: 2px;">질문 ${idx + 1}</span>
                  <span style="font-size: 14.5px; font-weight: 800; color: #1E1F2E; line-height: 1.4;">${item.question}</span>
                </div>
                <div style="font-size: 13.5px; line-height: 1.6; color: #475569; padding: 12px; background: #fff5f5; border-radius: 8px; border: 1px solid #ffe4e6; display: flex; gap: 8px;">
                  <span style="color: #D946A8; font-weight: 900; shrink-0;">A.</span>
                  <span style="font-weight: 700; color: #475569;">${item.answerMapping}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 4. Action Items
    let actionsHTML = '';
    if (analysis.actionItems && analysis.actionItems.length > 0) {
      actionsHTML = `
        <div style="margin-bottom: 35px;">
          <h3 style="font-size: 18px; font-weight: 900; color: #1E1F2E; border-left: 4px solid #EAB308; padding-left: 12px; margin-bottom: 15px;">Action Items (액션 아이템)</h3>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${analysis.actionItems.map((item, idx) => `
              <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #fff;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                  <span style="background: #FEFCE8; color: #EAB308; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; font-weight: 800; font-size: 12px;">${idx + 1}</span>
                  <span style="font-size: 14.5px; font-weight: 800; color: #1E1F2E;">${item.what}</span>
                </div>
                <div style="display: flex; gap: 15px; flex-wrap: wrap; font-size: 12.5px; color: #475569; background: #fefcf0; padding: 8px 12px; border-radius: 6px; border: 1px solid #fef08a;">
                  <div>
                    <span style="font-weight: 800; color: #CA8A04; background: #fef9c3; padding: 2px 6px; border-radius: 4px; margin-right: 6px;">담당자</span>
                    <span style="font-weight: 700; color: #1e293b;">${meeting.speakerMap[item.who] || item.who}</span>
                  </div>
                  ${item.when ? `
                    <div>
                      <span style="font-weight: 800; color: #475569; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; margin-right: 6px;">기한</span>
                      <span style="font-weight: 700; color: #1e293b;">${item.when}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    element.innerHTML = `
      ${headerHTML}
      ${topicsHTML}
      ${qaHTML}
      ${actionsHTML}
    `;

    document.body.appendChild(element);

    const opt = {
      margin:       0.5,
      filename:     filename,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      document.body.removeChild(element);
    }).catch((err: any) => {
      console.error('PDF generation error:', err);
      document.body.removeChild(element);
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <header className="px-8 py-5 bg-white border-b border-slate-100 shrink-0 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-6">
          <div className="flex-1 space-y-2">
            <input type="text" value={meeting.title}
              onChange={(e) => setMeeting(m => ({ ...m, title: e.target.value }))}
              placeholder="회의 제목을 입력하세요"
              className="w-full bg-transparent text-xl font-black text-[--c-ink] focus:outline-none focus:ring-2 focus:ring-blue-100 rounded px-2 -ml-2 transition-all placeholder:text-gray-300" />
            <div className="flex items-center gap-3 flex-wrap">
              {meeting.type && <span className="chip chip-blue">{meeting.type}</span>}
              <span className="text-label">{meeting.date}</span>
              {meeting.keywords.filter(Boolean).map(kw => (
                 <span key={kw} className="chip chip-yellow">#{kw}</span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex bg-slate-100/60 p-1 rounded-xl">
              {(['summary', 'transcript'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200"
                  style={{
                    background: tab === t ? '#fff' : 'transparent',
                    color: tab === t ? 'var(--c-blue)' : 'var(--c-muted)',
                    boxShadow: tab === t ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                  }}>
                  {t === 'summary' ? '요약 리포트' : '회의록 전문'}
                </button>
              ))}
            </div>
            <button onClick={onSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white hover:bg-slate-800 transition-all shadow-md active:scale-95 cursor-pointer"
              style={{ background: 'var(--c-ink)' }}>
              <Save className="w-4 h-4" />저장
            </button>
            <button onClick={handleExportPDF}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-slate-700 bg-white border border-slate-200 hover:border-purple-200 hover:bg-purple-50/20 hover:text-purple-600 transition-all shadow-md active:scale-95 cursor-pointer">
              <Download className="w-4 h-4" />PDF 다운로드
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {tab === 'summary' ? (
            <motion.div key="sum" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="h-full overflow-y-auto custom-scrollbar bg-slate-50/10 p-6 sm:p-10">
              <div className="max-w-[760px] mx-auto space-y-16 py-4">
                
                {/* Topic Summaries Section */}
                <section className="space-y-6">
                  <div>
                    <p className="text-label mb-1 text-purple-600 font-bold">주제별 요약</p>
                    <h4 className="text-2xl font-black text-[--c-ink] tracking-tight">Topic Summaries</h4>
                    <p className="text-sm text-[--c-muted] font-medium leading-relaxed mt-1">내용의 핵심 논의 사항을 주제별로 정리하였습니다.</p>
                  </div>
                  <div className="space-y-4">
                    {analysis.summaryItems.map((item, idx) => (
                      <TopicAccordion key={idx} item={item} index={idx}
                        speakerMap={meeting.speakerMap}
                        onJumpToTranscript={handleJumpToTranscript} />
                    ))}
                  </div>
                </section>

                {/* Pre-Questions & Answers Section */}
                {meeting.prefixedQuestions?.trim() && (analysis.questionMappings || []).length > 0 && (
                  <section className="space-y-6">
                    <div>
                      <p className="text-label mb-1 text-pink-500 font-bold">사전 질문 및 답변</p>
                      <h4 className="text-2xl font-black text-[--c-ink] tracking-tight">Pre-Questions & Answers</h4>
                      <p className="text-sm text-[--c-muted] font-medium leading-relaxed mt-1">사전에 취합된 질문들과 이에 대응하는 논의 및 답변 사항을 매핑하였습니다.</p>
                    </div>
                    <div className="space-y-4">
                      {analysis.questionMappings.map((item, idx) => (
                        <QuestionAccordion key={idx} item={item} index={idx} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Action Items Section */}
                {(analysis.actionItems || []).length > 0 && (
                  <section className="space-y-6">
                    <div>
                      <p className="text-label mb-1 text-orange-500 font-bold">액션 아이템</p>
                      <h4 className="text-2xl font-black text-[--c-ink] tracking-tight">Action Items</h4>
                      <p className="text-sm text-[--c-muted] font-medium leading-relaxed mt-1">회의 중 도출된 향후 실행과제 및 담당자별 역할분담 목록입니다.</p>
                    </div>
                    <div className="space-y-4">
                      {analysis.actionItems.map((item, idx) => (
                        <ActionItemAccordion key={idx} item={item} index={idx}
                          speakerMap={meeting.speakerMap}
                          onDelete={() => {
                            const next = [...analysis.actionItems];
                            next.splice(idx, 1);
                            setMeeting(m => ({ ...m, analysis: { ...analysis, actionItems: next } }));
                          }} />
                      ))}
                    </div>
                  </section>
                )}

              </div>
            </motion.div>
          ) : (
            <motion.div key="trans" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full bg-slate-50/50 flex flex-col">
              <TranscriptEditor
                lines={analysis.refinedTranscript}
                onUpdate={onUpdateRefinedTranscript}
                onAddToGlossary={onAddToGlossary}
                speakerMap={meeting.speakerMap}
                highlightedLineId={highlightedLineId}
                onClearHighlight={() => setHighlightedLineId(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}