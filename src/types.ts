// ─────────────────────────────────────────────
// v2-ready data structures
// ─────────────────────────────────────────────

export interface ActionItem {
  who: string;
  what: string;
  when: string;
  status?: 'pending' | 'done';
}

export interface Citation {
  id: number;
  text: string;
  speaker: string;
}

export interface SummaryItem {
  topic: string;
  summary: string;
  citations: Citation[];
}

export interface QuestionMapping {
  question: string;
  answerMapping: string;
}

export interface RefinedTranscriptLine {
  id: string;
  timestamp?: string;
  speakerId: string;
  speakerName: string;
  text: string;
}

export interface MeetingAnalysis {
  topics: string[];
  selectedTopics: string[];
  excludedTopics?: string[];
  summaryItems: SummaryItem[];
  questionMappings: QuestionMapping[];
  actionItems: ActionItem[];
  refinedTranscript: RefinedTranscriptLine[];
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  type: string;
  keywords: string[];
  originalTranscript: string;
  glossary: string;
  prefixedQuestions: string;
  speakerMap: Record<string, string>;
  analysis?: MeetingAnalysis;
  preprocessStats?: {
    before: number;
    after: number;
  };
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}