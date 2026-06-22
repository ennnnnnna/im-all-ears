/**
 * Utilities for preprocessing CLOVA Note meeting transcripts in the browser.
 */

import { SummaryItem, QuestionMapping, ActionItem } from '../types';

export interface PreprocessResult {
  cleanedText: string;
  beforeCount: number;
  afterCount: number;
  detectedClovaSpeakers: string[];
}

export function preprocessTranscript(text: string): PreprocessResult {
  if (!text) {
    return {
      cleanedText: '',
      beforeCount: 0,
      afterCount: 0,
      detectedClovaSpeakers: []
    };
  }

  const beforeCount = text.length;

  // 1. Standardize line endings to LF (\n)
  let cleaned = text.replace(/\r\n/g, '\n');

  // 2. Identify CLOVA Note speaker indicators before we strip timestamps or clean text.
  // CLOVA Note transcript typically contains rows or paragraphs like:
  // - "[참석자 1] [00:15:32] 안녕하세요"
  // - "참석자 1 00:15:23"
  // - "참석자 1: 오늘 회의는..."
  // - "발화자 2: 그렇네요."
  // - "[발화자 3] 15:32"
  // We need to capture "참석자 X" and "발화자 X" pattern.
  const speakerSet = new Set<string>();
  
  // Regex to detect speaker formats like "[참석자 1]", "참석자 1:", "발화자 2"
  // This handles Korean "참석자" and "발화자" with trailing digits.
  const clovaSpeakerRegex = /(?:\[(참석자\s*\d+|발화자\s*\d+)\]|(?:\b|^)(참석자\s*\d+|발화자\s*\d+))(?=[:\s\[]|$)/g;
  
  let match;
  clovaSpeakerRegex.lastIndex = 0;
  while ((match = clovaSpeakerRegex.exec(cleaned)) !== null) {
    const speakerName = match[1] || match[2];
    if (speakerName) {
      speakerSet.add(speakerName.trim());
    }
  }

  // 3. Remove timestamp patterns
  // Examples:
  // - [00:15:32] or [15:32]
  // - (00:15:32) or (15:32)
  // - 00:15:32 or 15:32
  cleaned = cleaned.replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, '');
  cleaned = cleaned.replace(/\(\d{1,2}:\d{2}(?::\d{2})?\)/g, '');
  cleaned = cleaned.replace(/\b\d{1,2}:\d{2}:\d{2}\b/g, '');
  cleaned = cleaned.replace(/\b\d{1,2}:\d{2}\b/g, '');

  // 4. Remove filler words (간투사)
  // "음", "어", "그", "막", "이제 뭐"
  // Due to JS native regex \b limitation in matching non-ASCII Korean text,
  // we use modern lookbehind and lookahead to check for word boundaries or spacing details.
  // Word boundaries for Korean: start of line/string, space, or standard punctuation
  const boundStart = '(?<=^|[\\s,.\\-~!?()\\[\\]{}])';
  const boundEnd = '(?=$|[\\s,.\\-~!?()\\[\\]{}])';

  // Order matters: match longer compound phrase "이제 뭐" first
  const fillerPatterns = ['이제\\s+뭐', '음', '어', '그', '막'];
  for (const filler of fillerPatterns) {
    // Optionally match trailing filler markers/punctuation like ... or ~ or ,
    const regex = new RegExp(`${boundStart}${filler}(?:[.,~\\-]*)${boundEnd}`, 'g');
    cleaned = cleaned.replace(regex, '');
  }

  // 5. Cleanup residual formatting artifacts line-by-line
  const lines = cleaned.split('\n').map(line => {
    let l = line.trim();

    // Remove empty brackets e.g. "[]", "()" left over from timestamp stripping
    l = l.replace(/\[\s*\]/g, '');
    l = l.replace(/\(\s*\)/g, '');

    // Replace multiple spaces with a single space
    l = l.replace(/\s+/g, ' ');

    // Remove leftover messy double separators
    l = l.replace(/,\s*,/g, ',');
    
    // Clean up empty speaker lines if they were left hanging
    // but if it's a speaker colon header with text, preserve the colon spacing cleanly
    l = l.replace(/\s*:\s*/g, ': ');

    // Strip leading punctuation/messy leftovers from start of dialogue lines
    // (excluding brackets like [Speaker])
    l = l.replace(/^[,.\-~!?\s]+/g, '');

    return l.trim();
  }).filter(line => {
    // Filter out truly empty lines, or lines having only colons/brackets from text wipe
    if (!line) return false;
    if (line === ':' || line === '[]' || line === '()') return false;
    return true;
  });

  const cleanedText = lines.join('\n');
  const afterCount = cleanedText.length;

  return {
    cleanedText,
    beforeCount,
    afterCount,
    detectedClovaSpeakers: Array.from(speakerSet)
  };
}

/**
 * Splits meeting transcript into paragraph-based chunks of at most maxChunkSize characters.
 */
export function splitIntoChunks(text: string, maxChunkSize: number = 18000): string[] {
  if (text.length <= 20000) {
    return [text];
  }

  const paragraphs = text.split('\n');
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue; // skip trivial empty lines inside chunking

    if (currentLength + trimmedPara.length + 1 > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n'));
      currentChunk = [trimmedPara];
      currentLength = trimmedPara.length;
    } else {
      currentChunk.push(trimmedPara);
      currentLength += trimmedPara.length + 1; // +1 for the newline
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n'));
  }

  return chunks;
}

export interface AnalyzeTopicsResponse {
  speakers?: string[];
  topics?: string[];
  keywords?: string[];
}

export interface RefineTranscriptResponse {
  summaryItems?: Array<{
    topic: string;
    summary: string;
    citations?: Array<{
      id: number;
      speaker: string;
      text: string;
    }>;
  }>;
  questionMappings?: Array<{
    question: string;
    answerMapping: string;
  }>;
  actionItems?: Array<{
    who: string;
    what: string;
    when: string;
  }>;
  refinedLines?: Array<{
    speakerId: string;
    speakerName: string;
    text: string;
  }>;
}

/**
 * Combines multiple Phase 1 (analyze-topics) results without duplicates.
 */
export function mergeAnalyzeTopicsResponses(responses: AnalyzeTopicsResponse[]): Required<AnalyzeTopicsResponse> {
  const speakersSet = new Set<string>();
  const topicsSet = new Set<string>();
  const keywordsSet = new Set<string>();

  for (const resp of responses) {
    if (resp.speakers) {
      resp.speakers.forEach(s => {
        if (s && s.trim()) speakersSet.add(s.trim());
      });
    }
    if (resp.topics) {
      resp.topics.forEach(t => {
        if (t && t.trim()) topicsSet.add(t.trim());
      });
    }
    if (resp.keywords) {
      resp.keywords.forEach(k => {
        if (k && k.trim()) keywordsSet.add(k.trim());
      });
    }
  }

  return {
    speakers: Array.from(speakersSet),
    topics: Array.from(topicsSet),
    keywords: Array.from(keywordsSet)
  };
}

/**
 * Sequentially fuses multiple Phase 2 (refine-transcript) responses:
 * - Concatenates refinedLines chronologically.
 * - Deduplicates action items.
 * - Merges summaryItems: If same topic exists, joins summaries with double-newline and remaps footnotes to globally unique ids.
 * - Group questionMappings and merges or takes valid mappings.
 */
export interface MergedRefineTranscriptResult {
  summaryItems: SummaryItem[];
  questionMappings: QuestionMapping[];
  actionItems: ActionItem[];
  refinedLines: Array<{ speakerId: string; speakerName: string; text: string }>;
}

export function mergeRefineTranscriptResponses(responses: RefineTranscriptResponse[]): MergedRefineTranscriptResult {
  const mergedSummaryItems: SummaryItem[] = [];

  const rawQuestionGroups = new Map<string, string[]>();
  const mergedActionItems: Array<{ who: string; what: string; when: string }> = [];
  const mergedRefinedLines: Array<{ speakerId: string; speakerName: string; text: string }> = [];

  let citationGlobalId = 1;

  for (const resp of responses) {
    // 1. Merge refinedLines
    if (resp.refinedLines) {
      mergedRefinedLines.push(...resp.refinedLines);
    }

    // 2. Accumulate action items uniquely
    if (resp.actionItems) {
      for (const item of resp.actionItems) {
        const whoStr = (item.who || '-').trim();
        const whatStr = (item.what || '').trim();
        const whenStr = (item.when || '-').trim();
        
        if (!whatStr) continue;

        const isDup = mergedActionItems.some(
          existing =>
            existing.who.trim() === whoStr &&
            existing.what.trim() === whatStr &&
            existing.when.trim() === whenStr
        );
        if (!isDup) {
          mergedActionItems.push({ who: whoStr, what: whatStr, when: whenStr });
        }
      }
    }

    // 3. Accumulate question mappings
    if (resp.questionMappings) {
      for (const q of resp.questionMappings) {
        if (!q.question) continue;
        const questionText = q.question.trim();
        const answerText = (q.answerMapping || '').trim();
        if (!rawQuestionGroups.has(questionText)) {
          rawQuestionGroups.set(questionText, []);
        }
        
        const isMockAnswer =
          !answerText ||
          answerText === '-' ||
          answerText.includes('답변 없음') ||
          answerText.includes('찾을 수 없음') ||
          answerText.includes('본문에서 확인할 수 없습니다') ||
          answerText.includes('언급되지 않았습니다');
          
        rawQuestionGroups.get(questionText)!.push(JSON.stringify({ text: answerText, isMock: isMockAnswer }));
      }
    }

    // 4. Merge summary items with footnote/citation remapping
    if (resp.summaryItems) {
      for (const item of resp.summaryItems) {
        if (!item.topic) continue;
        const topicName = item.topic.trim();
        
        const citationLocalToGlobal: Record<number, number> = {};
        const remappedCitations: Array<{ id: number; speaker: string; text: string }> = [];

        if (item.citations) {
          for (const cit of item.citations) {
            const newId = citationGlobalId++;
            citationLocalToGlobal[cit.id] = newId;
            remappedCitations.push({
              id: newId,
              speaker: cit.speaker || '-',
              text: cit.text || ''
            });
          }
        }

        let remappedSummary = item.summary || '';
        if (Object.keys(citationLocalToGlobal).length > 0) {
          remappedSummary = remappedSummary.replace(/\[(\d+)\]/g, (match, p1) => {
            const localId = parseInt(p1, 10);
            const globalId = citationLocalToGlobal[localId];
            return globalId ? `[${globalId}]` : match;
          });
        }

        const existingTopic = mergedSummaryItems.find(t => t.topic.trim().toLowerCase() === topicName.toLowerCase());
        if (existingTopic) {
          existingTopic.summary = existingTopic.summary.trim() + '\n\n' + remappedSummary.trim();
          if (remappedCitations.length > 0) {
            existingTopic.citations.push(...remappedCitations);
          }
        } else {
          mergedSummaryItems.push({
            topic: topicName,
            summary: remappedSummary,
            citations: remappedCitations
          });
        }
      }
    }
  }

  // Finalize question mappings:
  const mergedQuestionMappings: Array<{ question: string; answerMapping: string }> = [];
  for (const [question, itemsJson] of rawQuestionGroups.entries()) {
    const parsed = itemsJson.map(j => JSON.parse(j));
    const realAnswers = parsed.filter(p => !p.isMock).map(p => p.text);
    let finalAnswer = '';
    if (realAnswers.length > 0) {
      const uniqueReal = Array.from(new Set(realAnswers));
      finalAnswer = uniqueReal.join('\n');
    } else {
      finalAnswer = parsed[0]?.text || '내용을 구체적인 본문에서 확인할 수 없습니다.';
    }
    mergedQuestionMappings.push({
      question,
      answerMapping: finalAnswer
    });
  }

  return {
    summaryItems: mergedSummaryItems,
    questionMappings: mergedQuestionMappings,
    actionItems: mergedActionItems,
    refinedLines: mergedRefinedLines
  };
}
