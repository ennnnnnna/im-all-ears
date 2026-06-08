import React, { useState } from 'react';
import { Meeting } from '../types';
import { User, ChevronDown, Play, Settings2, Sparkles, CheckSquare, RotateCw, Calendar, Type, FileText, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MeetingInputProps {
  meeting: Meeting;
  setMeeting: (meeting: Meeting) => void;
  onStartAnalysis: (options?: { stayInPhase1?: boolean }) => void;
  onNextPhase: () => void;
  isAnalyzing: boolean;
  detectedSpeakers: string[];
  suggestedKeywords?: string[];
  onSave?: () => void;
}

const EXAMPLE_TRANSCRIPT = `🧭 미지의 세계 탐사대 소통 기록
태초마을 탐사 지휘실 | 65분

참석자: 대장 이브이, 대원 파이리, 꼬부기, 피카츄, 이상해씨, 버터플, 나옹, 잠만보, 망나뇽

대장 이브이: 요즘 탐사대 분위기 어때요? 다들 무인도 지형 조사하느라 고생이 많죠?

대원 파이리: 올해 가장 큰 미션이 미개척 고대 유적의 루트를 개척하는 건데... 처음엔 각자 맡은 구역만 파느라 따로 노는 느낌이었어요. 그런데 지난번 합동 야외 서바이벌 훈련 때 팀을 섞어서 야생 포켓몬 추적을 해봤더니 호흡이 기가 막히게 맞더라고요. 시작 전엔 삐걱거릴까 봐 괜히 걱정했던 것 같아요.

대장 이브이: 본부 차원에서 내가 장비를 더 지원해주면 좋을까요? 부담 갖지 말고 편하게 얘기해요. 탐사 지도도 부족하고, 야간 서치라이트 배터리도 맨날 나간다고 하고... 가야 할 유적은 늘어나는데 탐사 보급품(자원)이 턱없이 모자란다는 거 나도 잘 알고 있어요.

대원 피카츄: 탐사할 유적이 많아진 건 신나는데, 안개가 너무 잦아서 '안개 제거용 플래시 렌즈'가 너무 부족해요.

대장 이브이: 현장 보조 대원을 더 뽑아주는 거랑, 플래시 렌즈 보급해주는 것 중에 뭐가 더 급해요?

대원 피카츄: 솔직히... 요즘 최신형 '스마트 로토무 도감'이 유적 벽화를 자동으로 분석해줘서 혼자서도 단서 찾는 속도가 엄청 빨라졌거든요. 근데 유적 내부로 진입하는 속도를 장비 내구도가 못 따라가고 있어서, 둘 다 필요하긴 하지만 굳이 고르자면 안개 속을 뚫고 들어갈 '렌즈 보급'이 더 절실해요.

대원 이상해씨: 저는 공식 포켓몬 리그 인증 고대 유적 발굴을 신청하다 보니까, 우리 탐사대 내부의 서류 승인 절차가 아직 좀 꼬여 있는 것 같더라고요. 이 조장님께 물어보면 저 조장님한테 가보라고 하고... 또 특정 희귀 속성 유적을 조사할 때는 탐사 대원 전용 통신망 사용량을 많이 할당받기 어렵다는 소문도 들었습니다.

대원 버터플: 저는 저희가 해독한 유적 지도 데이터가 실제로 맞는지 교차 검증해줄 수 있는 '이웃 마을 탐사대'와 제휴가 맺어졌으면 좋겠어요.

대장 이브이: 맞아요, 꼭 필요하죠. 외부 탐사대 동료들이랑 동맹을 잘 맺어야 할 것 같아서... 그 협력 루트를 어떻게 뚫을지 계속 고민 중이에요.

대원 나옹: 저도 동감이에요. 고대 유적 함정 해제 테스트를 더 자주 해보고 싶은데, 장비 한 번 충전하고 세팅하는 데 시간이 너무 오래 걸려요. 협력 탐사대를 늘려서 구역을 나누든지, 아니면 함정 해제 시뮬레이터 가동 시간을 줄여야 할 것 같아요.

그리고 하나 더 여쭤봐도 될까요? 혹시 이 '환상의 포켓몬 서식지 조사' 프로젝트, 최종 마감 기한 같은 게 정해져 있나요?

대장 이브이: 전설이나 환상의 포켓몬 흔적을 찾는 게 발굴하고 싶다고 뚝딱 되는 게 아니잖아요. 오래 걸릴 장기 프로젝트라고 생각해요. 그만큼 발견했을 때의 역사적 임팩트도 크지만, 아예 허탕을 칠 리스크도 있고. 마감 기한에 쫓기기보다는 방향을 잃지 않고 끈기 있게 땅을 파는 게 중요합니다.

게다가 이건 이미 포켓몬 리그 최고 위원회의 공식 핵심 과제로 채택되었기 때문에, 중간에 프로젝트가 엎어질 걱정은 안 해도 돼요. 우리는 오직 유적을 완벽하게 파헤치는 방법만 고민하면 됩니다.

대원 잠만보: 탐사의 장기적인 나침반 방향이 좀 더 명확하게 공유되면 좋겠어요. 매일 눈앞에 떨어지는 유적지 벽화 조각만 닦다가 하루가 끝나고, 다음 날은 또 다른 동굴 조사하고... 이게 진짜 전설의 포켓몬을 찾는 최종 목표와 연결이 되고 있는 건지 헷갈릴 때가 있거든요.

대장 이브이: 정말 뼈가 있는 얘기예요. 탐사할 구역이 많다고 눈에 보이는 동굴마다 다 기어 들어가다 보면 정작 남는 지도가 없거든요. 반대로 너무 한 우물만 파는 것도 위험하고... 탐사 반경은 넓게 두되, 우리의 메인 타깃 유적 중심은 확실히 잡고 가야죠.

대원 꼬부기: 우리 탐사대 안에서도 A팀이랑 B팀이 서로 겹치는 고대 문자 연구를 하고 있는 것 같은데, 서로 공유가 잘 안 되는 느낌이에요. 자료를 합치면 더 빨리 해독할 수 있을 텐데 말이죠. 그리고 우리가 발견한 유적들이 다른 지역 탐사대 유적들과 비교했을 때 어떤 고고학적 차별점이 있는지, 그런 고급 정보가 현장 실무 대원들에게도 빠르게 전파되었으면 합니다.

대장 이브이: 실제로 외부 세계에 나가보면 생각보다 대단한 거 없어요. 플래시 장비 많이 쓰고, 하급 몬스터볼 잔뜩 던져서 야생 데이터 물량공세 한 것뿐이지, 유물의 진짜 가치를 알아보는 눈은 없는 경우가 많거든요. 우리가 늦은 것 같아 보여도, 사실 이 구역 탐사는 가장 먼저 깃발을 꽂은 편이에요.

이 '환상의 포켓몬 생태 조사' 분야는 전 세계 리그를 통틀어 시장 잠재력이 어마어마합니다. 지난주 관동지방 대규모 탐사 박람회 다녀온 대원들 소감 좀 얘기해봐요.

대원 망나뇽(외부 박람회 참석): 가장 먼저 느낀 건 스폰서들이 투자하는 탐사 예산 규모가 상상을 초월한다는 거였습니다. 우리가 평소 동네 배틀 대회 규모만 보다가 세계적인 유적 발굴 인프라를 보니 규모가 완전히 다르더라고요. 우리가 여기서 아주 작은 단서 하나만 제대로 입증해도 탐사대 전체에 엄청난 기회가 오겠구나 싶었습니다.

두 번째는 다른 연합 탐사대들이 보유한 포켓몬 화석과 도감 데이터 축적량이 우리보다 훨씬 방대하더라고요. 이 격차를 따라잡기 위한 효율적인 데이터 확보 전략이 필요해 보였습니다.

세 번째는... 그렇게 큰 탐사대들이 정작 유적 내부를 돌파할 때 쓰는 포켓몬 전술이나 함정 해제 스킬 수준은 생각보다 그렇게 정교하지 않았어요. 우리 정예 멤버들의 브레인을 활용하면 충분히 빈틈을 공략해 앞서 나갈 수 있겠다는 자신감이 생겼습니다.

대원 파이리: 저도 박람회장에서 다른 체육관 소속 트레이너들과의 네트워킹과 정보 교환이 얼마나 중요한지 뼈저리게 느꼈어요. 우리 연구 성과를 발표하니 다들 눈을 반짝이며 연락처를 주더라고요. 내년에 또 참가하게 된다면 그때는 정말 전략적으로 제휴를 맺고 오고 싶습니다.

대장 이브이: 기회는 본부가 쥐여주는 게 아니라 우리가 모험하며 개척하는 겁니다. 단순히 로토무 도감 기술에만 의존하기보다는, 포켓몬 생태계와 모험 도메인 전체의 패러다임을 바꾼다는 큰 그림을 계속 그립시다.

그리고 플래시 렌즈 장비 부족이랑 인력 충원 건은 파이리 님이 현장 조장들 의견 종합해서 리포트로 넘겨주세요. 어느 구역 유적에 어떤 장비와 대원이 얼마나 필요한지 백지에 다 펼쳐놓아 봅시다. 일단 아이디어를 다 던져놓고, 그다음에 우선순위를 조율하면 되니까요.

우리가 올해 반짝하고 해체할 탐사대가 아니라, 진짜 세계 최고의 엘리트 탐사대를 만들려면 호흡을 길게 가져가야 합니다. 그 위대한 지도를 우리가 주도적으로 그려나갔으면 좋겠어요. 리그 본부에도 우리 탐사대의 쾌적한 환경을 위해 계속 강력하게 push하고 있으니, 필요한 보급품이 있다면 언제든 제게 직접 무전을 쳐주세요.

대원 파이리: 오늘 유익한 지도 제작 회의였습니다. 감사 무전 올립니다.

대장 이브이: 이 간담회 오늘로 끝 아니에요. 탐사선 안에서 맛있는 나무열매 먹으면서 자주 소통합시다. 다들 즐겁게 모험합시다!

통신 종료`;

export default function MeetingInput({
  meeting,
  setMeeting,
  onStartAnalysis,
  onNextPhase,
  isAnalyzing,
  detectedSpeakers,
  suggestedKeywords = [],
  onSave
}: MeetingInputProps) {
  const [showSpeakerModal, setShowSpeakerModal] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  const handleSpeakerChange = (id: string, name: string) => {
    setMeeting({
      ...meeting,
      speakerMap: {
        ...meeting.speakerMap,
        [id]: name
      }
    });
  };

  const handleAddKeyword = (kw: string) => {
    const trimmed = kw.trim();
    if (!trimmed) return;
    if (!meeting.keywords.includes(trimmed)) {
      setMeeting({
        ...meeting,
        keywords: [...meeting.keywords, trimmed]
      });
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setMeeting({
      ...meeting,
      keywords: meeting.keywords.filter(item => item !== kw)
    });
  };

  const handleLoadExample = () => {
    if (meeting.originalTranscript === EXAMPLE_TRANSCRIPT) {
      setMeeting({
        ...meeting,
        title: '',
        date: '',
        type: '',
        keywords: [],
        originalTranscript: '',
        glossary: '',
        prefixedQuestions: ''
      });
    } else {
      setMeeting({
        ...meeting,
        title: '🧭 미지의 세계 탐사대 소통 기록',
        date: '2026.05.28',
        type: '탐사대 회의',
        keywords: ['고대 유적', '장비 보급', '데이터 확보', '환상의 포켓몬'],
        originalTranscript: EXAMPLE_TRANSCRIPT,
        glossary: '로토무 도감, 플래시 렌즈, 관동지방',
        prefixedQuestions: '질문 1: 안개 속을 뚫고 들어갈 플래시 렌즈 보급 수량\n질문 2: 환상의 포켓몬 서식지 조사 프로젝트 마감 기한'
      });
    }
  };

  const inputClasses = "w-full p-4 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none bg-slate-50/10 hover:bg-slate-50/20 focus:bg-white transition-all placeholder:text-slate-400 font-medium leading-relaxed shadow-[sm_inset_0_1px_2px_rgba(0,0,0,0.02)]";

  const isExampleLoaded = meeting.originalTranscript === EXAMPLE_TRANSCRIPT;

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 py-8 px-6">
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 rounded-xl shadow-inner bg-purple-50/50">
              <Settings2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">1단계: 회의 정보 입력</h2>
              <p className="text-xs text-slate-400 font-bold">요약 및 분석을 진행할 회의록 대화 전문을 입력해주세요.</p>
            </div>
          </div>

          {onSave && (
            <button
              onClick={onSave}
              className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform duration-200" />
              수정사항 저장
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Transcript Column */}
          <div className="lg:col-span-7 h-full">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col h-full transition-all hover:shadow-[0_4px_25px_rgba(0,0,0,0.05)]">
              <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="p-1 bg-white border border-slate-100 rounded-lg shadow-sm">
                    <FileText className="w-4 h-4 text-emerald-500" />
                  </span>
                  <label className="text-sm font-black text-slate-700">회의 녹취록 전문</label>
                </div>
                <button
                  type="button"
                  onClick={handleLoadExample}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer rounded-xl border
                    ${isExampleLoaded 
                      ? 'text-rose-600 bg-rose-50/80 border-rose-100 hover:bg-rose-600 hover:text-white hover:border-rose-600' 
                      : 'text-purple-600 bg-purple-50/80 border-purple-100/40 hover:bg-purple-600 hover:text-white hover:border-purple-600'}`}
                >
                  {isExampleLoaded ? '🗑️ 예시 데이터 지우기' : '🧭 예시 회의록 전문 불러오기'}
                </button>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <textarea
                  value={meeting.originalTranscript}
                  onChange={(e) => setMeeting({ ...meeting, originalTranscript: e.target.value })}
                  placeholder="[참석자 1] [00:00:15] 안녕하세요, 오늘 회의 시작하겠습니다.&#10;[홍길동] [00:00:20] 예, 인사팀장 홍길동입니다..."
                  className="flex-1 w-full min-h-[550px] p-5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none resize-none bg-slate-50/10 hover:bg-slate-50/20 focus:bg-white transition-all placeholder:text-slate-400 font-medium leading-relaxed shadow-sm md:min-h-[580px]"
                />
              </div>
            </div>
          </div>

          {/* Settings Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-8 space-y-8 transition-all hover:shadow-[0_4px_25px_rgba(0,0,0,0.05)]">
              {/* Basic Info */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 ml-1">
                    <Type className="w-4 h-4 text-purple-500" />
                    <label className="text-sm font-black text-slate-700">회의 제목</label>
                  </div>
                  <input
                    type="text"
                    value={meeting.title}
                    onChange={(e) => setMeeting({ ...meeting, title: e.target.value })}
                    placeholder="예: 2024년 하반기 인사 제도 개편 안내"
                    className={inputClasses}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 ml-1">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      <label className="text-sm font-black text-slate-700">회의 일자</label>
                    </div>
                    <input
                      type="date"
                      value={meeting.date.split('.').join('-')}
                      onChange={(e) => {
                        const d = e.target.value;
                        if (d) {
                          setMeeting({ ...meeting, date: d.split('-').join('.') });
                        }
                      }}
                      className={inputClasses}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 ml-1">
                      <Settings2 className="w-4 h-4 text-purple-500" />
                      <label className="text-sm font-black text-slate-700">회의 종류</label>
                    </div>
                    <input
                      type="text"
                      value={meeting.type}
                      onChange={(e) => setMeeting({ ...meeting, type: e.target.value })}
                      placeholder="예: 정기 간담회"
                      className={inputClasses}
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="pt-6 border-t border-slate-100 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 ml-1 block">사내 전문 용어 (오타 교정용)</label>
                  <textarea
                    value={meeting.glossary}
                    onChange={(e) => setMeeting({ ...meeting, glossary: e.target.value })}
                    placeholder="예: PA(People Advisor), 육성팀, 시니어데스크"
                    className={`${inputClasses} h-24 resize-none`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 ml-1 block">사전 질문 리스트 (매핑용)</label>
                  <textarea
                    value={meeting.prefixedQuestions}
                    onChange={(e) => setMeeting({ ...meeting, prefixedQuestions: e.target.value })}
                    placeholder="사전에 취합된 질문들을 입력하면 답변 내용을 자동으로 찾아줍니다."
                    className={`${inputClasses} h-24 resize-none`}
                  />
                </div>

                {/* Keyword Section */}
                <div className="space-y-3 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 ml-1">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <label className="text-sm font-black text-slate-700">키워드</label>
                  </div>
                  
                  {/* Current Active Keywords */}
                  <div className="flex flex-wrap gap-1.5 min-h-[44px] p-2.5 border border-slate-100 rounded-xl bg-slate-50/40 mb-2">
                    {meeting.keywords.filter(Boolean).length === 0 ? (
                      <span className="text-sm text-slate-300 p-1 font-medium italic">지정된 키워드가 없습니다.</span>
                    ) : (
                      meeting.keywords.filter(Boolean).map((kw) => (
                        <span key={kw} className="inline-flex items-center gap-1.5 text-sm font-bold text-purple-600 bg-purple-50/80 border border-purple-100/50 rounded-lg px-2.5 py-1.5 shadow-sm leading-none transition-all hover:bg-purple-100/50">
                          {kw}
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(kw)}
                            className="w-4 h-4 rounded-full hover:bg-purple-200/80 flex items-center justify-center text-purple-400 hover:text-purple-600 transition-colors"
                          >
                            &times;
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Manual Keyword Input Form */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddKeyword(newKeyword);
                          setNewKeyword('');
                        }
                      }}
                      placeholder="키워드 직접 추가 후 Enter"
                      className={`${inputClasses} flex-1 !p-2.5 text-sm`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleAddKeyword(newKeyword);
                        setNewKeyword('');
                      }}
                      className="px-5 bg-purple-600 text-white rounded-xl text-sm font-black whitespace-nowrap hover:bg-purple-700 transition-all active:scale-[0.97] shadow-sm shadow-purple-100"
                    >
                      추가
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {detectedSpeakers.length === 0 ? (
                <button
                  onClick={() => onStartAnalysis({ stayInPhase1: true })}
                  disabled={isAnalyzing || !meeting.originalTranscript}
                  className={`
                    w-full py-5 rounded-2xl font-black text-sm tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2
                    ${isAnalyzing || !meeting.originalTranscript 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                      : 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-[1.01] active:scale-[0.99] shadow-purple-100'}
                  `}
                >
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  {isAnalyzing ? '분석 중...' : '화자 및 키워드 분석 시작'}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="p-5 bg-purple-50/60 border border-purple-100/40 rounded-2xl">
                    <div className="flex items-center gap-2 text-purple-700 font-extrabold text-sm uppercase tracking-wider mb-2">
                      <CheckSquare className="w-4 h-4 text-purple-600" />
                      화자 및 키워드 분석 완료
                    </div>
                    <p className="text-sm text-purple-700/70 font-medium leading-relaxed">
                      {detectedSpeakers.length}명의 참석자와 맞춤 키워드가 식별되었습니다. 아래 버튼을 눌러 참석자 이름을 매핑하거나 다음 단계로 이동하세요.
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => setShowSpeakerModal(true)}
                      className="w-full py-4 border-2 border-purple-100 bg-white text-purple-600 rounded-2xl text-sm font-black uppercase tracking-wider hover:border-purple-600 hover:bg-purple-50/30 transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      참석자 이름 매핑 ({detectedSpeakers.length})
                    </button>

                    <button
                      onClick={onNextPhase}
                      disabled={isAnalyzing}
                      className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm tracking-wider uppercase hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-2 active:scale-99"
                    >
                      2단계: 핵심 주제 선택하기
                      <Play className="w-4 h-4 fill-white" />
                    </button>

                    {onSave && (
                      <button 
                        onClick={onSave}
                        disabled={isAnalyzing}
                        className="w-full py-4 border border-slate-200 hover:border-purple-200 bg-white hover:bg-purple-50/10 text-slate-700 hover:text-purple-600 rounded-2xl text-sm font-black uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        수정사항 저장하기
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => onStartAnalysis({ stayInPhase1: true })}
                    disabled={isAnalyzing}
                    className="w-full py-2.5 text-sm font-bold text-slate-400 hover:text-purple-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    화자 및 키워드 분석 다시하기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Speaker Modal */}
      <AnimatePresence>
        {showSpeakerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-100"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-600 rounded-2xl text-white shadow-lg shadow-purple-200">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">참석자 이름 매핑</h3>
                    <p className="text-xs text-slate-400 font-bold">발견된 {detectedSpeakers.length}명의 참석자에 대한 정보를 실제 성함이나 역할로 매핑해주세요.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSpeakerModal(false)}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-all border border-transparent hover:border-slate-200 shadow-sm"
                >
                  <ChevronDown className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto bg-white flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {detectedSpeakers.map((speakerId) => (
                    <div key={speakerId} className="p-5 bg-slate-50/30 hover:bg-slate-50/70 border border-slate-200/80 rounded-2xl shadow-sm space-y-3 group hover:border-purple-200 transition-all">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-purple-600 uppercase tracking-widest">{speakerId}</label>
                        <span className="text-[10px] text-slate-300 font-bold tracking-wider">IDENTITY</span>
                      </div>
                      <input
                        type="text"
                        value={meeting.speakerMap[speakerId] ?? speakerId}
                        onChange={(e) => handleSpeakerChange(speakerId, e.target.value)}
                        placeholder="이름 또는 직책"
                        className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all bg-white font-black text-slate-700 shadow-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center sm:flex-row flex-col gap-4">
                <div className="text-xs font-bold text-slate-400 italic">
                  * 비워둘 경우 '참석자 ID'가 이름으로 유지됩니다.
                </div>
                <button
                  onClick={() => setShowSpeakerModal(false)}
                  className="px-8 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs tracking-widest uppercase shadow-lg shadow-purple-100 transition-all active:scale-[0.98]"
                >
                  매핑 내용 저장하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
