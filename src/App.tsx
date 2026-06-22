import React, { useState, useEffect } from 'react';
import { Meeting, MeetingAnalysis } from './types';
import { storage } from './storage';
import MeetingInput from './components/MeetingInput';
import TopicSelection from './components/TopicSelection';
import AnalysisResult from './components/AnalysisResult';
import ArchivePage from './components/ArchivePage';
import InsightsPage from './components/InsightsPage';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Archive, BarChart2, Plus } from 'lucide-react';
import { preprocessTranscript, PreprocessResult, splitIntoChunks, mergeAnalyzeTopicsResponses, mergeRefineTranscriptResponses } from './utils/preprocess';

const createEmptyMeeting = (): Meeting => ({
  id: crypto.randomUUID(),
  title: '',
  date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
  type: '',
  keywords: [],
  originalTranscript: '',
  glossary: '',
  prefixedQuestions: '',
  speakerMap: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

type Page = 'analyze' | 'archive' | 'insights';

export default function App() {
  const [page, setPage] = useState<Page>('analyze');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [currentMeeting, setCurrentMeeting] = useState<Meeting>(createEmptyMeeting());
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string | null>(null);
  const [detectedSpeakers, setDetectedSpeakers] = useState<string[]>([]);
  const [recommendedTopics, setRecommendedTopics] = useState<string[]>([]);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [excludedTopics, setExcludedTopics] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refreshMeetings = async () => {
    try {
      const res = await fetch('/api/notion/meetings');
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
      } else {
        setMeetings(storage.getAll());
      }
    } catch (err) {
      console.warn("Could not load from Notion. Falling back to local storage.", err);
      setMeetings(storage.getAll());
    }
  };

  useEffect(() => {
    refreshMeetings();
  }, []);

  const handleNewMeeting = () => {
    setCurrentMeeting(createEmptyMeeting());
    setPhase(1);
    setDetectedSpeakers([]);
    setRecommendedTopics([]);
    setSuggestedKeywords([]);
    setExcludedTopics([]);
    setError(null);
    setPage('analyze');
  };

  const handleLoadMeeting = async (meeting: Meeting) => {
    setError(null);
    setIsAnalyzing(true);
    setAnalysisProgress('회의 상세 정보를 노션에서 불러오는 중...');
    try {
      let fullMeeting = meeting;
      // Lazy load details if requested from list-only item lacking originalTranscript
      if (meeting.notionPageId && !meeting.originalTranscript) {
        const res = await fetch(`/api/notion/meetings/${meeting.notionPageId}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || '노션 아카이브 상세 정보를 가져올 수 없습니다.');
        }
        fullMeeting = await res.json();
      }
      
      setCurrentMeeting(fullMeeting);
      setPhase(fullMeeting.analysis ? 3 : 1);
      
      if (fullMeeting.analysis) {
        setDetectedSpeakers(Object.keys(fullMeeting.speakerMap || {}));
        setRecommendedTopics(fullMeeting.analysis.topics || []);
        setExcludedTopics(fullMeeting.analysis.excludedTopics || []);
      } else {
        setDetectedSpeakers([]);
        setRecommendedTopics([]);
        setExcludedTopics([]);
      }
      setSuggestedKeywords(fullMeeting.keywords || []);
      setPage('analyze');
    } catch (err: any) {
      console.warn("Failed to load full meeting from Notion. Loading cached template instead status.", err);
      const cached = storage.getAll().find(c => c.id === meeting.id || (meeting.notionPageId && c.notionPageId === meeting.notionPageId));
      if (cached) {
        setCurrentMeeting(cached);
        setPhase(cached.analysis ? 3 : 1);
        setSuggestedKeywords(cached.keywords || []);
        setPage('analyze');
        setError(`⚠️ 노션 상세 로드 실패로 로컬 캐시 사본을 불러왔습니다. 상세: ${err.message || err}`);
      } else {
        setError(`회의 대화록 로딩 실패: ${err.message || err}`);
      }
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    setIsAnalyzing(true);
    setAnalysisProgress('삭제 처리 중...');
    try {
      const cached = storage.getAll().find(c => c.id === id);
      const targetId = cached?.notionPageId || id;

      if (targetId) {
        const res = await fetch(`/api/notion/meetings/${targetId}`, {
          method: 'DELETE'
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || '노션 페이지를 아카이브/삭제할 수 없습니다.');
        }
      }
    } catch (e: any) {
      console.warn("Notion delete failed, proceeding with local purge:", e);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    }
    
    storage.remove(id);
    await refreshMeetings();
    if (currentMeeting.id === id || (currentMeeting.notionPageId && currentMeeting.notionPageId === id)) {
      handleNewMeeting();
    }
  };

  const handlePreprocessApplied = (result: PreprocessResult) => {
    setCurrentMeeting(m => {
      const nextSpeakerMap = { ...m.speakerMap };
      result.detectedClovaSpeakers.forEach(s => {
        if (!nextSpeakerMap[s]) {
          nextSpeakerMap[s] = s;
        }
      });
      return {
        ...m,
        originalTranscript: result.cleanedText,
        speakerMap: nextSpeakerMap,
        preprocessStats: {
          before: result.beforeCount,
          after: result.afterCount
        }
      };
    });

    setDetectedSpeakers(prev => Array.from(new Set([...prev, ...result.detectedClovaSpeakers])));
  };

  const startPhase1Analysis = async (options?: { refresh?: boolean; stayInPhase1?: boolean }) => {
    if (!currentMeeting.originalTranscript) return;
    setIsAnalyzing(true);
    setAnalysisProgress(null);
    setError(null);
    try {
      // 1. Run browser-side preprocessing before AI invocation
      const preprocessResult = preprocessTranscript(currentMeeting.originalTranscript);
      const cleanedTranscript = preprocessResult.cleanedText;
      const initialClovaSpeakers = preprocessResult.detectedClovaSpeakers;

      // Update speakerMap in meeting without overwriting existing mappings
      const updatedSpeakerMap = { ...currentMeeting.speakerMap };
      initialClovaSpeakers.forEach(s => {
        if (!updatedSpeakerMap[s]) {
          updatedSpeakerMap[s] = s;
        }
      });

      // Split cleanedTranscript into chunked segments if length > 20,000 characters
      const chunks = splitIntoChunks(cleanedTranscript);

      const results: any[] = [];
      for (let i = 0; i < chunks.length; i++) {
        if (chunks.length > 1) {
          setAnalysisProgress(`${i + 1}/${chunks.length} 구간 분석 중...`);
        } else {
          setAnalysisProgress('분석 중...');
        }

        const response = await fetch('/api/analyze-topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: chunks[i],
            excludedTopics: options?.refresh ? excludedTopics : [],
          }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        results.push(data);
      }

      // Merge sequential outputs
      const mergedResult = mergeAnalyzeTopicsResponses(results);

      // Merge speakers from server with locally preprocessed ones
      const mergedSpeakers = Array.from(new Set([...initialClovaSpeakers, ...(mergedResult.speakers || [])]));

      setDetectedSpeakers(mergedSpeakers);
      setRecommendedTopics(mergedResult.topics || []);
      setSuggestedKeywords(mergedResult.keywords || []);

      // Update current meeting state
      const nextMeeting = {
        ...currentMeeting,
        originalTranscript: cleanedTranscript,
        speakerMap: updatedSpeakerMap,
        preprocessStats: {
          before: preprocessResult.beforeCount,
          after: preprocessResult.afterCount
        }
      };

      if (!options?.refresh) {
        const mergedKeywords = Array.from(new Set([...nextMeeting.keywords, ...(mergedResult.keywords || [])]));
        setCurrentMeeting(m => ({
          ...m,
          originalTranscript: cleanedTranscript,
          speakerMap: updatedSpeakerMap,
          preprocessStats: {
            before: preprocessResult.beforeCount,
            after: preprocessResult.afterCount
          },
          keywords: mergedKeywords
        }));
      } else {
        setCurrentMeeting(m => ({
          ...m,
          originalTranscript: cleanedTranscript,
          speakerMap: updatedSpeakerMap,
          preprocessStats: {
            before: preprocessResult.beforeCount,
            after: preprocessResult.afterCount
          }
        }));
      }

      if (!options?.stayInPhase1) setPhase(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    }
  };

  const startPhase2Analysis = async () => {
    if (!currentMeeting.analysis?.selectedTopics?.length) return;

    const fullSpeakerMap: Record<string, string> = { ...currentMeeting.speakerMap };
    detectedSpeakers.forEach((sid, idx) => {
      if (!fullSpeakerMap[sid]?.trim()) fullSpeakerMap[sid] = sid;
    });

    setIsAnalyzing(true);
    setAnalysisProgress(null);
    setError(null);
    try {
      // Split cleanedTranscript into chunked segments if length > 20,000 characters
      const chunks = splitIntoChunks(currentMeeting.originalTranscript);

      const results: any[] = [];
      for (let i = 0; i < chunks.length; i++) {
        if (chunks.length > 1) {
          setAnalysisProgress(`${i + 1}/${chunks.length} 구간 분석 중...`);
        } else {
          setAnalysisProgress('심층 리포트 생성 중...');
        }

        const response = await fetch('/api/refine-transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: chunks[i],
            glossary: currentMeeting.glossary,
            questions: currentMeeting.prefixedQuestions,
            selectedTopics: currentMeeting.analysis.selectedTopics,
            speakerMap: fullSpeakerMap,
            keywords: currentMeeting.keywords,
          }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        results.push(data);
      }

      // Merge sequential outputs
      const mergedResult = mergeRefineTranscriptResponses(results);

      const analysis: MeetingAnalysis = {
        topics: recommendedTopics,
        selectedTopics: currentMeeting.analysis.selectedTopics,
        excludedTopics,
        summaryItems: mergedResult.summaryItems,
        questionMappings: mergedResult.questionMappings,
        actionItems: mergedResult.actionItems,
        refinedTranscript: mergedResult.refinedLines.map((l: any, i: number) => ({ ...l, id: String(i) })),
      };

      setCurrentMeeting(m => ({ ...m, speakerMap: fullSpeakerMap, analysis }));
      setPhase(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    }
  };

  const handleSaveMeeting = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress('노션 데이터베이스에 저장 중...');
    try {
      const toSave = { ...currentMeeting, updatedAt: new Date().toISOString() };
      
      const response = await fetch('/api/notion/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSave),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `서버 오류 (상태코드: ${response.status})`);
      }

      const syncedMeeting = await response.json();
      
      // Save replica to localStorage as cache/backup
      storage.save(syncedMeeting);
      setCurrentMeeting(syncedMeeting);
      await refreshMeetings();
      alert('성공적으로 노션 데이터베이스에 저장되었습니다!');
    } catch (err: any) {
      console.error('Notion save error. Saving to local storage instead:', err);
      try {
        const localSave = { ...currentMeeting, updatedAt: new Date().toISOString() };
        storage.save(localSave);
        await refreshMeetings();
        alert(`⚠️ 노션 저장을 완료할 수 없어 브라우저 로컬 스토리지에 대신 안전하게 임시 저장되었습니다.\n\n사유: ${err.message || err}`);
      } catch (localErr: any) {
        alert(`저장 실패: ${localErr.message || localErr}`);
      }
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[--c-bg] overflow-hidden">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-8 h-16 shrink-0 z-40 sticky top-0 transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50/50 rounded-xl border border-purple-100/30 shadow-[sm_inset_0_1px_1px_rgba(255,255,255,0.6)]">
            <Sparkles className="w-5 h-5 animate-pulse text-purple-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black tracking-tight text-slate-800 leading-none">Smart Meeting Logger</span>
            <span className="text-[10px] text-purple-500 font-extrabold mt-1 tracking-tight">AI 기반 회의 정제 및 의사결정 요약 자동화 솔루션</span>
          </div>
        </div>

        <nav className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/30 shadow-inner">
          <NavBtn active={page === 'analyze'} onClick={() => setPage('analyze')} icon={<Sparkles className="w-4 h-4" />} label="분석" />
          <NavBtn active={page === 'archive'} onClick={() => setPage('archive')} icon={<Archive className="w-4 h-4" />} label="아카이브" />
          <NavBtn active={page === 'insights'} onClick={() => setPage('insights')} icon={<BarChart2 className="w-4 h-4" />} label="인사이트" />
        </nav>

        <button
          onClick={handleNewMeeting}
          className="group flex items-center gap-2 text-xs font-black px-4.5 py-2.5 rounded-xl border border-purple-100 text-purple-600 bg-purple-50/60 hover:bg-purple-600 hover:text-white hover:border-purple-600 hover:shadow-lg hover:shadow-purple-100 transition-all duration-200 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
          새 분석 시작하기
        </button>
      </header>

      {error && (
        <div className="mx-6 mt-4 p-3 rounded-xl text-sm font-semibold flex items-center gap-2"
          style={{ background: '#FEF2F2', color: 'var(--c-red)', border: '1px solid #FCA5A5' }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--c-red)' }} />
          {error}
        </div>
      )}

      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {page === 'analyze' && (
            <motion.div key="analyze" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-center gap-4 shrink-0">
                <div className="bg-white px-6 py-3 rounded-2xl flex items-center gap-5 shadow-sm border border-slate-100">
                  <PhaseTab n={1} active={phase === 1} label="1단계: 입력" onClick={() => setPhase(1)} />
                  <div className="w-6 h-px bg-slate-200" />
                  <PhaseTab n={2} active={phase === 2} label="2단계: 주제 선택" onClick={() => { if (detectedSpeakers.length) setPhase(2); }} disabled={!detectedSpeakers.length} />
                  <div className="w-6 h-px bg-slate-200" />
                  <PhaseTab n={3} active={phase === 3} label="3단계: 리포트" onClick={() => { if (currentMeeting.analysis) setPhase(3); }} disabled={!currentMeeting.analysis} />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                  {phase === 1 && (
                    <motion.div key="p1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <MeetingInput
                        meeting={currentMeeting}
                        setMeeting={setCurrentMeeting}
                        onStartAnalysis={(opts) => startPhase1Analysis(opts)}
                        onNextPhase={() => setPhase(2)}
                        isAnalyzing={isAnalyzing}
                        detectedSpeakers={detectedSpeakers}
                        suggestedKeywords={suggestedKeywords}
                        onSave={handleSaveMeeting}
                        onPreprocessApplied={handlePreprocessApplied}
                        analysisProgress={analysisProgress || undefined}
                      />
                    </motion.div>
                  )}
                  {phase === 2 && (
                    <motion.div key="p2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <TopicSelection
                        recommendedTopics={recommendedTopics}
                        selectedTopics={currentMeeting.analysis?.selectedTopics || []}
                        onToggleTopic={(topic) => {
                          const cur = currentMeeting.analysis?.selectedTopics || [];
                          const next = cur.includes(topic) ? cur.filter(t => t !== topic) : [...cur, topic];
                          setCurrentMeeting(m => ({
                            ...m,
                            analysis: { ...(m.analysis || { topics: recommendedTopics, summaryItems: [], questionMappings: [], actionItems: [], refinedTranscript: [] }), selectedTopics: next }
                          }));
                        }}
                        onSetSelectedTopics={(topics) => {
                          setCurrentMeeting(m => ({
                            ...m,
                            analysis: { ...(m.analysis || { topics: recommendedTopics, summaryItems: [], questionMappings: [], actionItems: [], refinedTranscript: [] }), selectedTopics: topics }
                          }));
                        }}
                        onReorderTopics={(reordered) => {
                          setRecommendedTopics(reordered);
                          const cur = currentMeeting.analysis?.selectedTopics || [];
                          const next = reordered.filter(t => cur.includes(t));
                          setCurrentMeeting(m => ({
                            ...m,
                            analysis: { ...(m.analysis || { topics: reordered, summaryItems: [], questionMappings: [], actionItems: [], refinedTranscript: [] }), selectedTopics: next }
                          }));
                        }}
                        onExcludeTopic={(topic) => {
                          setExcludedTopics(e => [...e, topic]);
                          setRecommendedTopics(t => t.filter(x => x !== topic));
                          const cur = currentMeeting.analysis?.selectedTopics || [];
                          if (cur.includes(topic))
                            setCurrentMeeting(m => ({ ...m, analysis: { ...m.analysis!, selectedTopics: cur.filter(t => t !== topic) } }));
                        }}
                        onRefreshTopics={() => startPhase1Analysis({ refresh: true })}
                        onStartFinalAnalysis={startPhase2Analysis}
                        isAnalyzing={isAnalyzing}
                        onSave={handleSaveMeeting}
                        analysisProgress={analysisProgress || undefined}
                      />
                    </motion.div>
                  )}
                  {phase === 3 && (
                    <motion.div key="p3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                      <AnalysisResult
                        meeting={currentMeeting}
                        setMeeting={setCurrentMeeting}
                        onSave={handleSaveMeeting}
                        onUpdateRefinedTranscript={(lines) => {
                          if (window.confirm('전문이 수정되었습니다.\n수정된 스크립트로 1차 분석을 다시 진행하시겠습니까?')) {
                            const reconstructed = lines.map(l => `[${l.speakerName}] ${l.text}`).join('\n');
                            setCurrentMeeting(m => ({ ...m, originalTranscript: reconstructed, analysis: undefined }));
                            setDetectedSpeakers([]);
                            setRecommendedTopics([]);
                            setPhase(1);
                          } else {
                            setCurrentMeeting(m => ({ ...m, analysis: { ...m.analysis!, refinedTranscript: lines } }));
                          }
                        }}
                        onAddToGlossary={(term) => {
                          setCurrentMeeting(m => ({ ...m, glossary: m.glossary ? `${m.glossary}, ${term}` : term }));
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {page === 'archive' && (
            <motion.div key="archive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto custom-scrollbar">
              <ArchivePage meetings={meetings} onLoad={handleLoadMeeting} onDelete={handleDeleteMeeting} />
            </motion.div>
          )}

          {page === 'insights' && (
            <motion.div key="insights" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto custom-scrollbar">
              <InsightsPage meetings={meetings} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick} 
      className={`
        flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all duration-200 cursor-pointer
        ${active 
          ? 'bg-white text-purple-600 shadow-[0_4px_12px_rgba(124,58,237,0.08)] border border-slate-200/50' 
          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/40 border border-transparent'}
      `}
    >
      <span className={active ? 'text-purple-500 scale-110' : 'text-slate-400'}>
        {icon}
      </span>
      {label}
    </button>
  );
}

function PhaseTab({ n, active, label, onClick, disabled }: { n: number; active: boolean; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
        active ? '' : 'hover:bg-slate-50'
      }`}
      style={{
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'default' : 'pointer',
        background: active ? 'var(--c-blue-soft)' : 'transparent',
      }}
    >
      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black transition-all"
        style={{
          background: active ? 'var(--c-blue)' : '#F1F5F9',
          color: active ? '#fff' : 'var(--c-muted)',
          boxShadow: active ? '0 2px 8px rgba(79, 70, 229, 0.15)' : 'none',
        }}>
        {n}
      </span>
      <span className="text-xs sm:text-sm font-extrabold transition-colors"
        style={{ color: active ? 'var(--c-blue)' : 'var(--c-muted)' }}>
        {label}
      </span>
    </button>
  );
}