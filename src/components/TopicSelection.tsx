import React, { useState, useEffect } from 'react';
import { Sparkles, RotateCw, X, Play, GripVertical, Save } from 'lucide-react';
import { motion } from 'motion/react';

interface TopicSelectionProps {
  recommendedTopics: string[];
  selectedTopics: string[];
  onToggleTopic: (topic: string) => void;
  onSetSelectedTopics?: (topics: string[]) => void;
  onReorderTopics?: (topics: string[]) => void;
  onRefreshTopics: () => void;
  onExcludeTopic: (topic: string) => void;
  onStartFinalAnalysis: () => void;
  isAnalyzing: boolean;
  onSave?: () => void;
}

export default function TopicSelection({
  recommendedTopics,
  selectedTopics,
  onToggleTopic,
  onSetSelectedTopics,
  onReorderTopics,
  onRefreshTopics,
  onExcludeTopic,
  onStartFinalAnalysis,
  isAnalyzing,
  onSave
}: TopicSelectionProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isAnalyzing) {
      setIsRefreshing(false);
    }
  }, [isAnalyzing]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefreshTopics();
  };

  const isAllSelected = recommendedTopics.length > 0 && recommendedTopics.every(t => selectedTopics.includes(t));
  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      if (onSetSelectedTopics) onSetSelectedTopics([]);
    } else {
      if (onSetSelectedTopics) onSetSelectedTopics([...recommendedTopics]);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    if (!sourceIndexStr) return;
    const sourceIndex = parseInt(sourceIndexStr, 10);
    
    if (sourceIndex === targetIndex) return;

    const newTopics = [...recommendedTopics];
    const [removed] = newTopics.splice(sourceIndex, 1);
    newTopics.splice(targetIndex, 0, removed);

    if (onReorderTopics) {
      onReorderTopics(newTopics);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="max-w-[760px] mx-auto space-y-8 py-12 px-6">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: 'var(--c-blue-soft)', color: 'var(--c-blue)' }}>
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          AI 화자 및 키워드 분석 완료
        </div>
        <h2 className="text-2xl font-black text-[--c-ink] tracking-tight">2단계: 핵심 주제 선택</h2>
        <p className="text-sm text-[--c-muted] font-medium leading-relaxed">
          보고서 생성을 원하는 핵심 논의 주제들을 선택하고, <span className="text-purple-600 font-extrabold underline">원하는 순서대로 드래그</span>하여 중요도를 바꿀 수 있습니다.<br />
          선택 및 지정된 순서에 맞춰 심층 요약 및 정제된 Q&A가 작성됩니다.
        </p>
      </div>

      {recommendedTopics.length > 0 && (
        <div className="flex items-center justify-between px-6 py-4 bg-purple-50/20 border border-slate-200/50 rounded-2xl shadow-[sm_inset_0_1px_1px_rgba(255,255,255,0.6)] max-w-full">
          <button
            disabled={isAnalyzing}
            onClick={handleSelectAllToggle}
            className="flex items-center gap-3.5 cursor-pointer text-left focus:outline-none select-none group"
          >
            <span className="w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all font-bold shadow-inner"
              style={{
                background: isAllSelected ? 'var(--c-blue)' : '#fff',
                borderColor: isAllSelected ? 'var(--c-blue)' : '#CBD5E1'
              }}>
              {isAllSelected && <span className="w-1.5 h-1.5 bg-white rounded-full block" />}
            </span>
            <span className="font-extrabold text-xs sm:text-sm text-slate-700 tracking-tight group-hover:text-purple-600 transition-colors">
              주제 전체 선택 / 해제
            </span>
          </button>
          <span className="text-[11px] sm:text-xs text-purple-600 font-extrabold bg-purple-50/50 border border-purple-100/30 px-3 py-1 rounded-xl shadow-sm">
            선택됨 : {selectedTopics.length} / {recommendedTopics.length}개
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        {recommendedTopics.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-[--c-border] rounded-2xl bg-white space-y-2">
            <p className="text-sm font-semibold text-[--c-muted]">추출된 추천 주제가 없습니다.</p>
            <button
              onClick={handleRefresh}
              disabled={isAnalyzing}
              className="text-xs font-bold flex items-center gap-1.5 mx-auto transition-colors"
               style={{ color: 'var(--c-blue)' }}
            >
              <RotateCw className="w-3.5 h-3.5" />
              주제 다시 불러오기
            </button>
          </div>
        ) : (
          recommendedTopics.map((topic, index) => {
            const isSelected = selectedTopics.includes(topic);
            return (
              <motion.div
                key={topic}
                initial={{ opacity: 0, y: 12 }}
                animate={{ 
                  opacity: draggedIndex === index ? 0.35 : 1, 
                  y: 0,
                  scale: draggedIndex === index ? 0.97 : 1
                }}
                transition={{ duration: 0.2 }}
                className={`group relative flex items-center gap-2 p-1.5 rounded-2xl transition-all duration-300 ${
                  dragOverIndex === index ? 'bg-purple-50/80 border-2 border-dashed border-purple-300 shadow-md scale-[1.01]' : 'border-2 border-transparent'
                }`}
                draggable={!isAnalyzing}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={() => setDragOverIndex(null)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, index)}
              >
                {!isAnalyzing && (
                  <div 
                    className="p-2 cursor-grab active:cursor-grabbing text-slate-300 hover:text-purple-600 transition-colors shrink-0"
                    title="드래그하여 순서 변경"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                )}
                
                <button
                  disabled={isAnalyzing}
                  onClick={() => onToggleTopic(topic)}
                  className="flex-1 flex items-center justify-between p-5 rounded-2xl border-2 transition-all text-left bg-white shadow-sm"
                  style={{
                    borderColor: isSelected ? 'var(--c-blue)' : 'var(--c-border)',
                    boxShadow: isSelected ? '0 4px 12px rgba(124, 58, 237, 0.05)' : 'none',
                    opacity: isAnalyzing ? 0.8 : 1,
                  }}
                >
                  <div className="flex items-center gap-4 pr-10">
                    <span className="w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all font-bold shadow-inner"
                      style={{
                        background: isSelected ? 'var(--c-blue)' : '#fff',
                        borderColor: isSelected ? 'var(--c-blue)' : '#CBD5E1'
                      }}>
                      {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full block" />}
                    </span>
                    <span className="font-extrabold text-sm text-[--c-ink] tracking-tight">
                      <span className="text-purple-600 font-black mr-1.5">{index + 1}.</span>
                      {topic}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="chip chip-blue text-[10px] uppercase font-black px-3 py-1 mr-6 rounded-lg tracking-wider bg-purple-50 border-purple-100 shadow-sm leading-none">Selected</span>
                  )}
                </button>

                {!isAnalyzing && (
                  <button
                    disabled={isAnalyzing}
                    onClick={(e) => {
                      e.stopPropagation();
                      onExcludeTopic(topic);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50"
                    style={{ color: '#CBD5E1' }}
                    title="이 주제 제외"
                  >
                    <X className="w-4 hover:text-rose-500 transition-colors" />
                  </button>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      <div className="flex flex-col items-center gap-5 pt-6">
        <button
          onClick={handleRefresh}
          disabled={isAnalyzing}
          className="flex items-center gap-1.5 text-xs font-extrabold uppercase transition-colors"
          style={{ color: 'var(--c-muted)' }}
        >
          <RotateCw className={`w-3.5 h-3.5 ${(isAnalyzing && isRefreshing) ? 'animate-spin' : ''}`} />
          다른 주제 추천받기 (새로고침)
        </button>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg justify-center">
          {onSave && (
            <button
              onClick={onSave}
              disabled={isAnalyzing}
              className="flex-1 py-4 px-6 border-2 border-slate-200/80 bg-white hover:border-purple-600 hover:bg-purple-50/20 text-slate-700 hover:text-purple-600 rounded-2xl text-sm font-black uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              수정사항 저장
            </button>
          )}

          <button
            onClick={onStartFinalAnalysis}
            disabled={isAnalyzing || selectedTopics.length === 0}
            className="flex-1 py-4 px-6 rounded-2xl font-black text-sm uppercase text-white transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            style={{
              background: (isAnalyzing || selectedTopics.length === 0) ? '#E2E8F0' : 'var(--c-ink)',
              color: (isAnalyzing || selectedTopics.length === 0) ? '#94A3B8' : '#fff',
              cursor: (isAnalyzing || selectedTopics.length === 0) ? 'not-allowed' : 'pointer',
            }}
          >
            {isAnalyzing && !isRefreshing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-white animate-spin"></span>
                심층 리포트 생성 중...
              </span>
            ) : (
              <>
                3단계: 최종 리포트 생성 시작
                <Play className="w-3.5 h-3.5 fill-white" />
              </>
            )}
          </button>
        </div>
        {isAnalyzing && !isRefreshing && (
          <p className="text-[11px] text-slate-500 font-medium text-center max-w-sm animate-pulse leading-medium">
            선택하신 핵심 주제별 요약과 Q&A 매핑, 중요 액션 아이템 및 정제된<br />대화록을 AI가 함께 작성하고 있습니다. 평균 15초 이내에 완료됩니다.
          </p>
        )}
      </div>
    </div>
  );
}
