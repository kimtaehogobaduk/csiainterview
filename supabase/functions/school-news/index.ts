import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const requestSchema = z.object({
  schoolName: z.string().trim().min(1).max(100),
});

async function callAI(messages: Array<{role: string; content: string}>, temperature: number) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const CEREBRAS_API_KEY = Deno.env.get('CEREBRAS_API_KEY');
  if (!LOVABLE_API_KEY && !CEREBRAS_API_KEY) throw new Error('API 키가 설정되지 않았습니다.');

  const requestBody = { model: 'google/gemini-2.5-flash', messages, temperature };
  let response: Response;

  if (LOVABLE_API_KEY) {
    response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    if (response.status === 402 && CEREBRAS_API_KEY) {
      response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${CEREBRAS_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...requestBody, model: 'llama-4-scout-17b-16e-instruct' }),
      });
    }
  } else {
    response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CEREBRAS_API_KEY!}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...requestBody, model: 'llama-4-scout-17b-16e-instruct' }),
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error:', response.status, errorText);
    throw new Error(`AI API 오류: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    const validation = requestSchema.safeParse(rawBody);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: '학교 이름을 입력해주세요.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { schoolName } = validation.data;
    const today = new Date().toISOString().split('T')[0];

    const systemPrompt = `당신은 한국 고등학교 입시 정보 전문가이자 뉴스 큐레이터입니다. 오늘 날짜는 ${today}입니다.

사용자가 입력한 학교에 대해 다음 정보를 JSON 형식으로 제공해주세요:

1. **학교 최신 뉴스/소식** (news): 해당 학교와 관련된 최근 뉴스, 입시 관련 소식, 학교 행사 등. 각 뉴스에는 실제로 검색 가능한 관련 키워드와 출처 정보를 포함해주세요.
2. **입시 정보** (admissionInfo): 해당 학교의 최신 입시 일정, 전형 방법, 모집 인원 등
3. **학교 특징 요약** (summary): 학교의 핵심 특징 3-4가지

응답 형식:
{
  "news": [
    {
      "title": "뉴스 제목",
      "summary": "뉴스 요약 (2-3문장)",
      "date": "2026-03-XX",
      "category": "입시|학교소식|교육정책|행사",
      "searchQuery": "해당 뉴스를 네이버에서 검색할 수 있는 정확한 검색어",
      "sourceHint": "예상 출처 (예: 교육부, 학교 홈페이지, 언론사 등)"
    }
  ],
  "admissionInfo": {
    "schedule": "주요 입시 일정 요약",
    "method": "전형 방법 요약",
    "tips": ["입시 팁 3-5개"]
  },
  "summary": ["학교 특징 1", "학교 특징 2", "학교 특징 3"]
}

중요:
- 뉴스는 최소 5개, 최대 8개 제공
- 가능한 한 최신 정보를 기반으로 하되, 확인되지 않은 정보는 "예정" 등으로 명시
- searchQuery는 사용자가 네이버 뉴스에서 실제로 검색할 수 있는 구체적인 검색어로 작성
- 날짜는 최근 날짜로 설정하되, 정확하지 않으면 대략적인 시기를 표시
- 반드시 유효한 JSON으로만 응답`;

    const content = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `"${schoolName}" 학교에 대한 최신 뉴스, 입시 정보, 학교 특징을 알려주세요.` }
    ], 0.7);

    let result;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      result = JSON.parse(jsonStr.trim());
    } catch {
      result = {
        news: [
          {
            title: `${schoolName} 관련 최신 소식`,
            summary: `${schoolName}의 최신 입시 및 학교 관련 소식을 확인해보세요.`,
            date: today,
            category: '학교소식',
            searchQuery: `${schoolName} 입시 2026`,
            sourceHint: '검색 결과'
          }
        ],
        admissionInfo: {
          schedule: '자세한 일정은 학교 홈페이지를 참고해주세요.',
          method: '자세한 전형 방법은 학교 모집요강을 확인해주세요.',
          tips: ['학교 홈페이지에서 최신 모집요강을 확인하세요.']
        },
        summary: [`${schoolName}에 대한 정보를 불러오는 중 오류가 발생했습니다.`]
      };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
