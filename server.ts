import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { Meeting } from "./src/types";

dotenv.config({ path: ['.env.local', '.env'] });

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Simple in-memory rate limiter: max 10 requests per minute per IP
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function apiRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.ip || "unknown-ip";
  const now = Date.now();
  const limitWindow = 60000; // 1 minute
  const limit = 10;

  // Periodic cleanup if store grows large
  if (rateLimitStore.size > 1000) {
    for (const [key, val] of rateLimitStore.entries()) {
      if (now > val.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }

  const record = rateLimitStore.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + limitWindow });
    return next();
  }

  if (record.count >= limit) {
    return res.status(429).json({
      error: "요청 발생 허용 한도를 초과했습니다. 1분에 최대 10회까지 요청할 수 있습니다."
    });
  }

  record.count += 1;
  next();
}

app.use("/api", apiRateLimiter);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

// Robust content generation helper with automatic model fallback and backoff for rate limits/quota exhaustion
async function generateWithRetry(params: any, maxRetries = 3, initialDelay = 1500) {
  // Try standard gemini-3.5-flash first, then fall back to gemini-2.5-flash if rate-limited or quota exceeded
  const baseModel = params.model || "gemini-3.5-flash";
  const modelsToTry = [baseModel, "gemini-3.5-flash", "gemini-2.5-flash"].filter((m, idx, self) => m && self.indexOf(m) === idx);

  for (const currentModel of modelsToTry) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const adjustedParams = { ...params, model: currentModel };
        return await ai.models.generateContent(adjustedParams);
      } catch (error: any) {
        const errorMsg = String(error?.message || error?.status || error || "").toLowerCase();
        const isQuotaExceeded = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("exhausted") || errorMsg.includes("rate limit");
        const isTransient =
          errorMsg.includes("503") ||
          errorMsg.includes("unavailable") ||
          errorMsg.includes("high demand") ||
          isQuotaExceeded ||
          errorMsg.includes("overloaded");

        // If it's a quota / limit error and we have other models to try, switch immediately without sleeping
        if (isQuotaExceeded && currentModel !== modelsToTry[modelsToTry.length - 1]) {
          console.warn(`[Gemini API] Quota/Limit reached for model "${currentModel}". Error: ${error?.message || error}. Dynamic fallback to next model...`);
          break; // Exit retry loop for this model and try the next candidate model
        }

        if (isTransient && attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          console.warn(`[Gemini API] Transient error (Attempt ${attempt + 1}/${maxRetries}) on model "${currentModel}". Retrying in ${delay}ms... Error:`, error?.message || error);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // If this is the last candidate model or it's a non-transient, non-recoverable error, throw it
        if (currentModel === modelsToTry[modelsToTry.length - 1]) {
          throw error;
        }
      }
    }
  }
  throw new Error("모든 사용 가능한 모델(gemini-3.5-flash, gemini-2.5-flash)과 재시도 횟수를 소진했으나 콘텐츠 생성에 실패했습니다 (Quota Exceeded / Rate Limit).");
}

// ── Phase 1: Analyze speakers, topics, AND keywords ──────────────────────────
app.post("/api/analyze-topics", async (req, res) => {
  try {
    const { transcript, excludedTopics = [] } = req.body;

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({ error: "회의록 대화 전문내용이 비어 있으며 분석을 시작할 수 없습니다." });
    }

    const response = await generateWithRetry({
      model: "gemini-3.5-flash",
      contents: `
Analyze the following meeting transcript.

1. **Speakers**: Identify all unique speakers.
   Look for patterns like "[Name] [Time]" or "[Name]:" at the start of paragraphs.
   Use real names if found (e.g., "홍길동"), otherwise "참석자 1", "참석자 2", etc.

2. **Topics**: Recommend important core discussion topics for business/HR/collaboration domain.
   Provide 5–10 highly relevant topics. ALL TOPICS MUST BE IN KOREAN.
   DO NOT include any of these excluded topics: [${excludedTopics.join(", ")}].

3. **Keywords**: Extract 5–8 concise keyword tags that best describe this meeting for archiving.
   Think: what tags would help someone search for this meeting later?
   Examples: 인사제도, 육아휴직, 조직개편, 성과평가, 복지개편
   ALL KEYWORDS MUST BE IN KOREAN. Single words or short compound nouns only.

Transcript:
${transcript}
`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            speakers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Detected speaker IDs or names"
            },
            topics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Recommended core topics in Korean"
            },
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Archive keyword tags in Korean, 5-8 items"
            }
          },
          required: ["speakers", "topics", "keywords"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: "회의 분석 도중 서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주시기 바랍니다." });
  }
});

// ── Phase 2: Refine transcript ────────────────────────────────────────────────
app.post("/api/refine-transcript", async (req, res) => {
  try {
    const { transcript, glossary, questions, selectedTopics, speakerMap, keywords } = req.body;

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({ error: "정리 대상인 회의록 대화 전문내용이 누락되었거나 존재하지 않습니다." });
    }

    const response = await generateWithRetry({
      model: "gemini-3.5-flash",
      contents: `
You are a professional secretary and HR assistant.
Refine the following meeting transcript into a RICH report.

**RULES:**
1. **Refinement (CRITICAL FOR PERFORMANCE)**: Convert colloquial speech/logs to high-value, professional literary Korean. 
   - DO NOT translate or output trivial chat, repetitive greetings, filler words, or brief confirmations (like "네", "아 그래요", "알겠습니다").
   - Instead of regurgitating every original sentence, combine and synthesize consecutive dialogues of the same speaker into cohesive, dense, high-quality paragraphs.
   - Limit the total "refinedLines" array output to at most 12 to 20 highly meaningful key discussion blocks/turns that represent the core discussion flow. This is absolutely critical to prevent output token overload and API timeouts.
2. **Glossary**: Correct terminology using: ${glossary}
3. **Speaker Mapping**: Use mapped names: ${JSON.stringify(speakerMap)}.
4. **Keywords context**: This meeting is tagged with [${(keywords || []).join(", ")}]. Use this context to better understand the domain.
5. **RICH Summary & Citations**: For each topic in [${selectedTopics.join(", ")}]:
   - Provide a DETAILED summary (3-5 sentences).
   - Insert footnotes [1], [2] at relevant points.
   - For each footnote, include the original speaker name and core gist.
6. **Question Mapping**: Map these questions to transcript context: [${questions}]
7. **Action Items**: Extract Who, What, When.
8. **ALL OUTPUT MUST BE IN KOREAN.**

Transcript:
${transcript}
`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summaryItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  citations: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.NUMBER },
                        speaker: { type: Type.STRING },
                        text: { type: Type.STRING }
                      },
                      required: ["id", "speaker", "text"]
                    }
                  }
                },
                required: ["topic", "summary", "citations"]
              }
            },
            questionMappings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answerMapping: { type: Type.STRING }
                },
                required: ["question", "answerMapping"]
              }
            },
            actionItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  who: { type: Type.STRING },
                  what: { type: Type.STRING },
                  when: { type: Type.STRING }
                },
                required: ["who", "what", "when"]
              }
            },
            refinedLines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  speakerId: { type: Type.STRING },
                  speakerName: { type: Type.STRING },
                  text: { type: Type.STRING }
                },
                required: ["speakerId", "speakerName", "text"]
              }
            }
          },
          required: ["summaryItems", "questionMappings", "actionItems", "refinedLines"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Refinement error:", error);
    res.status(500).json({ error: "회의록 심층 리포트 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주시기 바랍니다." });
  }
});

// ── v2: Cross-analysis ────────────────────────────────────────────────────────
app.post("/api/cross-analyze", async (req, res) => {
  try {
    const { meetings } = req.body;

    if (!meetings || !Array.isArray(meetings) || meetings.length < 2) {
      return res.status(400).json({ error: "회의를 교차 분석하기 위해서는 최소 2개 이상의 회의가 입력되어야 합니다." });
    }

    const meetingSummaries = meetings.map((m: any, i: number) => `
## 회의 ${i + 1}: ${m.title} (${m.date}, ${m.type})
키워드: ${m.keywords?.join(', ')}
주제별 요약:
${m.analysis?.summaryItems?.map((s: any) => `- ${s.topic}: ${s.summary}`).join('\n')}
액션아이템:
${m.analysis?.actionItems?.map((a: any) => `- [${a.who}] ${a.what} (${a.when})`).join('\n')}
`).join('\n---\n');

    const response = await generateWithRetry({
      model: "gemini-3.5-flash",
      contents: `
You are an expert HR and organizational analyst.
Analyze the following ${meetings.length} meeting records and produce cross-meeting insights.

${meetingSummaries}

Produce:
1. **actionItemTracking**: All action items across meetings, with meeting source and status inference.
2. **topicTimeline**: How key topics evolved across meetings (earliest to latest mention, changes in stance).
3. **unresolvedIssues**: Issues or concerns raised in multiple meetings without clear resolution.
ALL OUTPUT MUST BE IN KOREAN.
`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            actionItemTracking: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  who: { type: Type.STRING },
                  what: { type: Type.STRING },
                  when: { type: Type.STRING },
                  source: { type: Type.STRING },
                  status: { type: Type.STRING }
                },
                required: ["who", "what", "when", "source", "status"]
              }
            },
            topicTimeline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  evolution: { type: Type.STRING }
                },
                required: ["topic", "evolution"]
              }
            },
            unresolvedIssues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  issue: { type: Type.STRING },
                  appearedIn: { type: Type.ARRAY, items: { type: Type.STRING } },
                  summary: { type: Type.STRING }
                },
                required: ["issue", "appearedIn", "summary"]
              }
            }
          },
          required: ["actionItemTracking", "topicTimeline", "unresolvedIssues"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Cross-analysis error:", error);
    res.status(500).json({ error: "회의록 교차 분석 도중 서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주시기 바랍니다." });
  }
});

// ── Notion Integration Functions and API Routes ─────────────────────────────

interface NotionPropertyMap {
  titleProp: string;
  dateProp?: string;
  typeProp?: string;
  keywordsProp?: string;
}

function checkNotionConfig(res: express.Response): boolean {
  if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
    res.status(400).json({
      error: "노션 환경변수(NOTION_API_KEY 또는 NOTION_DATABASE_ID)가 설정되지 않았습니다. AI Studio 또는 .env 환경 구성을 확인해 주세요."
    });
    return false;
  }
  return true;
}

/**
 * Dynamically queries database schema to retrieve property mapping.
 */
async function getNotionPropertyMap(apiKey: string, databaseId: string): Promise<NotionPropertyMap> {
  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Notion-Version": "2022-06-28"
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`노션 데이터베이스 정보를 조회할 수 없습니다. 데이터베이스 ID를 확인하세요. 상세: ${errText}`);
  }

  const data = await res.json();
  const properties = data.properties || {};

  let titleProp = "";
  let dateProp: string | undefined;
  let typeProp: string | undefined;
  let keywordsProp: string | undefined;

  // 1. Title Property
  for (const [key, val] of Object.entries(properties)) {
    if ((val as any).type === "title") {
      titleProp = key;
      break;
    }
  }

  // 2. Date Property
  for (const [key, val] of Object.entries(properties)) {
    if ((val as any).type === "date") {
      dateProp = key;
      break;
    }
  }

  // 3. Keywords Property (multi_select)
  for (const [key, val] of Object.entries(properties)) {
    if ((val as any).type === "multi_select") {
      keywordsProp = key;
      break;
    }
  }

  // 4. Type Property (select, status, or rich_text matching type keywords)
  const typeKeywords = ["회의유형", "회의 유형", "회의종류", "구분", "유형", "type", "Type"];
  for (const [key, val] of Object.entries(properties)) {
    const type = (val as any).type;
    const lowerKey = key.toLowerCase();
    if (typeKeywords.some(kw => lowerKey.includes(kw))) {
      if (type === "select" || type === "rich_text" || type === "status") {
        typeProp = key;
        break;
      }
    }
  }

  // Select property fallback
  if (!typeProp) {
    for (const [key, val] of Object.entries(properties)) {
      if ((val as any).type === "select") {
        typeProp = key;
        break;
      }
    }
  }

  if (!titleProp) {
    throw new Error("노션 데이터베이스에 제목(Title) 유형의 속성이 존재하지 않습니다.");
  }

  return { titleProp, dateProp, typeProp, keywordsProp };
}

/**
 * Builds standard Notion properties payload based on dynamic property map.
 */
function createNotionPagePayload(meeting: Meeting, map: NotionPropertyMap) {
  const properties: any = {};

  // Title
  properties[map.titleProp] = {
    title: [
      { text: { content: meeting.title || "제목 없음" } }
    ]
  };

  // Date
  if (map.dateProp) {
    const rawDate = meeting.date || new Date().toISOString().split("T")[0];
    const formattedDate = rawDate.replace(/\./g, "-");
    properties[map.dateProp] = {
      date: { start: formattedDate }
    };
  }

  // Type
  if (map.typeProp && meeting.type) {
    properties[map.typeProp] = {
      select: { name: meeting.type }
    };
  }

  // Keywords (Multi-select)
  if (map.keywordsProp && meeting.keywords && meeting.keywords.length > 0) {
    // Sanitize multi_select options: remove symbols causing Notion validation failures
    const cleanKeywords = meeting.keywords
      .map(kw => kw.trim().replace(/,/g, ""))
      .filter(kw => kw.length > 0);
    
    if (cleanKeywords.length > 0) {
      properties[map.keywordsProp] = {
        multi_select: cleanKeywords.map(kw => ({ name: kw }))
      };
    }
  }

  return properties;
}

/**
 * Helper to split text longer than 2000 chars into multiple blocks.
 */
function createTextBlocks(text: string, type: "paragraph" | "bulleted_list_item" | "to_do" = "paragraph"): any[] {
  if (!text) return [];
  const lines = text.split("\n");
  const blocks: any[] = [];

  for (const line of lines) {
    let remaining = line.trim();
    if (!remaining) {
      if (type === "paragraph") {
        blocks.push({
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [] }
        });
      }
      continue;
    }

    while (remaining.length > 1800) {
      const chunk = remaining.substring(0, 1800);
      remaining = remaining.substring(1800);
      blocks.push(buildBlock(chunk, type));
    }
    blocks.push(buildBlock(remaining, type));
  }

  return blocks;
}

function buildBlock(content: string, type: string) {
  if (type === "to_do") {
    return {
      object: "block",
      type: "to_do",
      to_do: {
        rich_text: [{ type: "text", text: { content } }],
        checked: false
      }
    };
  } else if (type === "bulleted_list_item") {
    return {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content } }]
      }
    };
  } else {
    return {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content } }]
      }
    };
  }
}

/**
 * Generates beautiful, well-formatted blocks representing the human readable report content.
 */
function generateMeetingBlocks(meeting: Meeting): any[] {
  const blocks: any[] = [];

  // Title / Banner header
  blocks.push({
    object: "block",
    type: "heading_1",
    heading_1: {
      rich_text: [{ type: "text", text: { content: `📋 ${meeting.title || "회의록"} 요약 보고서` } }]
    }
  });

  const metadataText = `• 회의 날짜: ${meeting.date || "-"}\n• 회의 종류: ${meeting.type || "-"}\n• 작성 일시: ${new Date(meeting.createdAt || Date.now()).toLocaleString("ko-KR")}`;
  blocks.push({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content: metadataText } }]
    }
  });

  blocks.push({
    object: "block",
    type: "divider",
    divider: {}
  });

  // 1. Topics and Summaries
  if (meeting.analysis && meeting.analysis.summaryItems && meeting.analysis.summaryItems.length > 0) {
    blocks.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "🔍 주제별 심층 요약" } }]
      }
    });

    for (const item of meeting.analysis.summaryItems) {
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: {
          rich_text: [{ type: "text", text: { content: `📌 ${item.topic}` } }]
        }
      });

      // Split the summary text appropriately
      blocks.push(...createTextBlocks(item.summary, "paragraph"));

      // Include citations
      if (item.citations && item.citations.length > 0) {
        for (const cit of item.citations) {
          blocks.push({
            object: "block",
            type: "bulleted_list_item",
            bulleted_list_item: {
              rich_text: [
                { type: "text", text: { content: `[${cit.id}] `, annotations: { bold: true, color: "purple" } } },
                { type: "text", text: { content: `(${cit.speaker}) ${cit.text}` } }
              ]
            }
          });
        }
      }
    }

    blocks.push({
      object: "block",
      type: "divider",
      divider: {}
    });
  }

  // 2. Action Items
  if (meeting.analysis && meeting.analysis.actionItems && meeting.analysis.actionItems.length > 0) {
    blocks.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "✅ 액션 아이템" } }]
      }
    });

    for (const action of meeting.analysis.actionItems) {
      blocks.push({
        object: "block",
        type: "to_do",
        to_do: {
          rich_text: [
            { type: "text", text: { content: `[${action.who || "미지정"}] `, annotations: { bold: true } } },
            { type: "text", text: { content: `${action.what} ` } },
            { type: "text", text: { content: action.when ? `(기한: ${action.when})` : "", annotations: { italic: true, color: "gray" } } }
          ],
          checked: action.status === "done"
        }
      });
    }

    blocks.push({
      object: "block",
      type: "divider",
      divider: {}
    });
  }

  // 3. Question Mapping
  if (meeting.analysis && meeting.analysis.questionMappings && meeting.analysis.questionMappings.length > 0) {
    blocks.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "❓ 사전 질문 및 답변 매핑" } }]
      }
    });

    for (const qm of meeting.analysis.questionMappings) {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            { type: "text", text: { content: `Q: ${qm.question}\n`, annotations: { bold: true, color: "blue" } } },
            { type: "text", text: { content: `A: ${qm.answerMapping}` } }
          ]
        }
      });
    }

    blocks.push({
      object: "block",
      type: "divider",
      divider: {}
    });
  }

  // 4. Refined Dialogue flow
  if (meeting.analysis && meeting.analysis.refinedTranscript && meeting.analysis.refinedTranscript.length > 0) {
    blocks.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "💬 정제된 대화 흐름" } }]
      }
    });

    for (const line of meeting.analysis.refinedTranscript) {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            { type: "text", text: { content: `${line.speakerName}: `, annotations: { bold: true } } },
            { type: "text", text: { content: line.text } }
          ]
        }
      });
    }
  }

  return blocks;
}

/**
 * Splits structured Meeting object to string pieces and stores them in Notion code blocks.
 */
function generateMetadataBlocks(meeting: Meeting): any[] {
  // Create a copy of the meeting to avoid infinite loops or extra junk
  const cleanObj = { ...meeting };
  const jsonStr = JSON.stringify(cleanObj);
  const chunks: string[] = [];

  for (let i = 0; i < jsonStr.length; i += 1800) {
    chunks.push(jsonStr.substring(i, i + 1800));
  }

  return [
    {
      object: "block",
      type: "divider",
      divider: {}
    },
    {
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [{ type: "text", text: { content: "⚙️ System Metadata (Do not delete)" } }]
      }
    },
    ...chunks.map((chunk, idx) => ({
      object: "block",
      type: "code",
      code: {
        caption: [{ type: "text", text: { content: `Part ${idx + 1}` } }],
        rich_text: [{ type: "text", text: { content: chunk } }],
        language: "json"
      }
    }))
  ];
}

// ── GET Notion Configuration state ──────────────────────────────────────────
app.get("/api/notion/status", (_req, res) => {
  const isConfigured = !!(process.env.NOTION_API_KEY && process.env.NOTION_DATABASE_ID);
  res.json({ configured: isConfigured });
});

// ── GET Notion database page list ─────────────────────────────────────────────
app.get("/api/notion/meetings", async (_req, res) => {
  try {
    if (!checkNotionConfig(res)) return;
    const apiKey = process.env.NOTION_API_KEY!;
    const databaseId = process.env.NOTION_DATABASE_ID!;

    const map = await getNotionPropertyMap(apiKey, databaseId);

    const queryRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sorts: [
          {
            timestamp: "created_time",
            direction: "descending"
          }
        ]
      })
    });

    if (!queryRes.ok) {
      const errText = await queryRes.text();
      throw new Error(`노션 데이터베이스 조회 실패: ${errText}`);
    }

    const data = await queryRes.json();
    const results = data.results || [];
    const meetings: Meeting[] = [];

    for (const page of results) {
      const props = page.properties || {};

      // Parse dynamic title
      let title = "";
      if (props[map.titleProp] && props[map.titleProp].title && props[map.titleProp].title[0]) {
        title = props[map.titleProp].title[0].plain_text || "";
      }

      // Parse date
      let date = "";
      if (map.dateProp && props[map.dateProp] && props[map.dateProp].date) {
        const rawDate = props[map.dateProp].date.start || "";
        date = rawDate.replace(/-/g, ".");
      } else {
        const createdTime = page.created_time || "";
        date = createdTime.split("T")[0].replace(/-/g, ".");
      }

      // Parse type
      let typeStr = "";
      if (map.typeProp && props[map.typeProp]) {
        const pObj = props[map.typeProp];
        if (pObj.type === "select" && pObj.select) {
          typeStr = pObj.select.name || "";
        } else if (pObj.type === "rich_text" && pObj.rich_text && pObj.rich_text[0]) {
          typeStr = pObj.rich_text[0].plain_text || "";
        } else if (pObj.type === "status" && pObj.status) {
          typeStr = pObj.status.name || "";
        }
      }

      // Parse keywords
      const keywords: string[] = [];
      if (map.keywordsProp && props[map.keywordsProp] && props[map.keywordsProp].multi_select) {
        props[map.keywordsProp].multi_select.forEach((item: any) => {
          if (item.name) keywords.push(item.name);
        });
      }

      meetings.push({
        id: page.id, // Notion page ID is mapped as the meeting ID for loading
        title,
        date,
        type: typeStr,
        keywords,
        originalTranscript: "",
        glossary: "",
        prefixedQuestions: "",
        speakerMap: {},
        createdAt: page.created_time || new Date().toISOString(),
        updatedAt: page.last_edited_time || new Date().toISOString(),
        notionPageId: page.id,
        syncedAt: page.last_edited_time
      });
    }

    res.json(meetings);
  } catch (error: any) {
    console.error("List Notion meetings error:", error);
    res.status(500).json({ error: error.message || "노션 목록 가져오기에 실패했습니다." });
  }
});

// ── GET Notion meeting page breakdown / restoration ─────────────────────────
app.get("/api/notion/meetings/:id", async (req, res) => {
  try {
    if (!checkNotionConfig(res)) return;
    const { id } = req.params;
    const apiKey = process.env.NOTION_API_KEY!;

    const blocksRes = await fetch(`https://api.notion.com/v1/blocks/${id}/children?page_size=100`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28"
      }
    });

    if (!blocksRes.ok) {
      const errText = await blocksRes.text();
      throw new Error(`노션 블록 조회 실패: ${errText}`);
    }

    const blocksData = await blocksRes.json();
    const blocks = blocksData.results || [];
    let hasMore = blocksData.has_more;
    let nextCursor = blocksData.next_cursor;

    while (hasMore && nextCursor) {
      const pagedRes = await fetch(`https://api.notion.com/v1/blocks/${id}/children?start_cursor=${nextCursor}&page_size=100`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Notion-Version": "2022-06-28"
        }
      });
      if (pagedRes.ok) {
        const pagedData = await pagedRes.json();
        blocks.push(...(pagedData.results || []));
        hasMore = pagedData.has_more;
        nextCursor = pagedData.next_cursor;
      } else {
        break;
      }
    }

    // Filter code blocks that contain our serialized JSON
    const jsonBlocks = blocks.filter((b: any) => {
      if (b.type !== "code") return false;
      return b.code?.language === "json";
    });

    if (jsonBlocks.length === 0) {
      throw new Error("해당 노션 페이지에서 저장된 스마트 미팅 시스템 메타데이터를 백업 디렉터리에서 탐색할 수 없습니다.");
    }

    let fullJsonStr = "";
    for (const jb of jsonBlocks) {
      const textArray = jb.code?.rich_text || [];
      const content = textArray.map((t: any) => t.plain_text).join("");
      fullJsonStr += content;
    }

    const parsedMeeting: Meeting = JSON.parse(fullJsonStr.trim());
    parsedMeeting.notionPageId = id; // map details page id correct

    res.json(parsedMeeting);
  } catch (error: any) {
    console.error(`Fetch Notion detail (ID ${req.params.id}) failed:`, error);
    res.status(500).json({ error: error.message || "노션 데이터 세부 복원 도중 오류 발생" });
  }
});

// ── POST Save/Upsert a Meeting into Notion ───────────────────────────────────
app.post("/api/notion/meetings", async (req, res) => {
  try {
    if (!checkNotionConfig(res)) return;
    const meeting: Meeting = req.body;
    const apiKey = process.env.NOTION_API_KEY!;
    const databaseId = process.env.NOTION_DATABASE_ID!;

    // 1. Resolve dynamic mapping
    const map = await getNotionPropertyMap(apiKey, databaseId);

    // 2. Archive previous pages if they mapped or match SML ID
    if (meeting.notionPageId) {
      try {
        await fetch(`https://api.notion.com/v1/pages/${meeting.notionPageId}`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ archived: true })
        });
        console.log(`Archived prior notion page format: ${meeting.notionPageId}`);
      } catch (archErr) {
        console.warn(`Could not archive previous page ID ${meeting.notionPageId}:`, archErr);
      }
    }

    // 3. Assemble dynamic properties payload
    const properties = createNotionPagePayload(meeting, map);

    // 4. Generate visual blocks and JSON backup chunks
    const reportBlocks = generateMeetingBlocks(meeting);
    const metadataBlocks = generateMetadataBlocks(meeting);
    const allBlocks = [...reportBlocks, ...metadataBlocks];

    const initialBlocks = allBlocks.slice(0, 100);
    const remainingBlocks = allBlocks.slice(100);

    // 5. Send POST to Notion Page API
    const createRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        icon: { type: "emoji", emoji: "📋" },
        properties,
        children: initialBlocks
      })
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`노션 페이지 생성 API 호출 실패. 상세: ${errText}`);
    }

    const createdPage = await createRes.json();
    const newPageId = createdPage.id;

    // 6. Append remaining blocks in batched slots of 100
    if (remainingBlocks.length > 0) {
      for (let i = 0; i < remainingBlocks.length; i += 100) {
        const batch = remainingBlocks.slice(i, i + 100);
        const appendRes = await fetch(`https://api.notion.com/v1/blocks/${newPageId}/children`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ children: batch })
        });
        if (!appendRes.ok) {
          const appendErr = await appendRes.text();
          console.error(`Warning: Batch appender error: ${appendErr}`);
        }
      }
    }

    // Assemble final updated model
    const responseMeeting: Meeting = {
      ...meeting,
      notionPageId: newPageId,
      syncedAt: new Date().toISOString()
    };

    res.json(responseMeeting);
  } catch (error: any) {
    console.error("Notion Save error:", error);
    res.status(500).json({ error: error.message || "노션 데이터베이스 저장 도중 오류 발생" });
  }
});

// ── DELETE/Archive Notion Meeting Page ───────────────────────────────────────
app.delete("/api/notion/meetings/:id", async (req, res) => {
  try {
    if (!checkNotionConfig(res)) return;
    const { id } = req.params;
    const apiKey = process.env.NOTION_API_KEY!;

    const archiveRes = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ archived: true })
    });

    if (!archiveRes.ok) {
      const errText = await archiveRes.text();
      throw new Error(`노션 아카아브 API 호출 실패: ${errText}`);
    }

    res.json({ success: true, message: "회의록 삭제 완료" });
  } catch (error: any) {
    console.error("Notion Delete error:", error);
    res.status(500).json({ error: error.message || "노션 회의록을 삭제할 수 없습니다." });
  }
});

// ── Static / Vite ─────────────────────────────────────────────────────────────
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();