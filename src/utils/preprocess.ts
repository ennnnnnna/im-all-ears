/**
 * Utilities for preprocessing CLOVA Note meeting transcripts in the browser.
 */

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
