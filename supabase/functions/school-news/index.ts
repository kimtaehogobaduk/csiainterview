import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const requestSchema = z.object({
  schoolName: z.string().trim().min(1).max(100),
  forceRefresh: z.boolean().optional().default(false),
});

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

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
    if (!response.ok && CEREBRAS_API_KEY) {
      console.log(`Lovable AI failed (${response.status}), falling back to Cerebras`);
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

// Cache key for news data stored in school_research_cache's detailed_info as JSON
const NEWS_CACHE_PREFIX = 'news_cache_';
const CACHE_TTL_HOURS = 6; // Refresh cache every 6 hours

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

    const { schoolName, forceRefresh } = validation.data;
    const cacheKey = NEWS_CACHE_PREFIX + schoolName.trim().toLowerCase().replace(/\s+/g, '');
    const supabaseAdmin = getSupabaseAdmin();

    // Check cache unless force refresh
    if (!forceRefresh) {
      const { data: cached } = await supabaseAdmin
        .from('school_research_cache')
        .select('detailed_info, updated_at')
        .eq('school_key', cacheKey)
        .single();

      if (cached?.detailed_info) {
        const updatedAt = new Date(cached.updated_at);
        const hoursSince = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursSince < CACHE_TTL_HOURS) {
          try {
            const cachedData = JSON.parse(cached.detailed_info);
            console.log('News cache hit for:', schoolName, `(${hoursSince.toFixed(1)}h old)`);
            return new Response(
              JSON.stringify(cachedData),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } catch { /* invalid cache, regenerate */ }
        }
      }
    }

    const today = new Date().toISOString().split('T')[0];

    const systemPrompt = `당신은 한국 고등학교 입시 정보 전문가이자 뉴스 큐레이터입니다. 오늘 날짜는 ${today}입니다.

사용자가 입력한 학교에 대해 다음 정보를 JSON 형식으로 제공해주세요.

**뉴스 작성 시 중요 지침:**
- 각 뉴스 기사는 실제 사실에 기반하여 상세하게 작성해주세요.
- summary는 최소 4-6문장으로 구체적인 내용을 담아야 합니다. 수치, 날짜, 구체적 사항을 포함해주세요.
- detailedContent는 8-12문장으로 배경, 의미, 영향, 전망까지 포함한 심층 분석을 해주세요.
- url 필드에는 해당 뉴스와 관련된 실제 뉴스 기사 URL을 제공해주세요. 정확한 URL을 모르면 관련 검색 결과 페이지 URL(예: https://search.naver.com/search.naver?where=news&query=검색어)을 제공해주세요.
- 최신 정보를 우선하되, 확인되지 않은 내용은 "예정", "예상" 등으로 명시해주세요.

응답 형식:
{
  "news": [
    {
      "title": "구체적이고 흥미로운 뉴스 제목",
      "summary": "뉴스 요약 (4-6문장, 구체적 수치와 날짜 포함)",
      "detailedContent": "심층 분석 내용 (8-12문장, 배경/의미/영향/전망 포함)",
      "date": "2026-03-XX",
      "category": "입시|학교소식|교육정책|행사|성과",
      "url": "실제 뉴스 URL 또는 네이버 뉴스 검색 URL",
      "source": "출처 (예: 조선일보, 교육부, 학교 공식 홈페이지 등)"
    }
  ],
  "admissionInfo": {
    "schedule": "주요 입시 일정 (구체적 날짜 포함)",
    "method": "전형 방법 상세 설명 (3-4문장)",
    "tips": ["구체적이고 실용적인 입시 팁 5개"]
  },
  "summary": ["학교 핵심 특징 4-5개 (구체적으로)"]
}

뉴스는 6-8개를 제공해주세요. 반드시 유효한 JSON으로만 응답하세요.`;

    const content = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `"${schoolName}" 학교에 대한 최신 뉴스, 입시 정보, 학교 특징을 상세하게 알려주세요.` }
    ], 0.7);

    let result;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      result = JSON.parse(jsonStr.trim());
    } catch {
      result = {
        news: [{
          title: `${schoolName} 관련 최신 소식`,
          summary: `${schoolName}의 최신 입시 및 학교 관련 소식을 확인해보세요. 해당 학교는 우수한 교육 프로그램과 다양한 비교과 활동을 제공하고 있습니다. 최근 입시 전형에 변화가 있을 수 있으므로 학교 홈페이지를 참고해주세요.`,
          detailedContent: `${schoolName}은 학생들의 자기주도적 학습 능력과 창의성을 중시하는 교육기관입니다. 최근 교육과정 개편과 함께 다양한 변화가 진행되고 있으며, 입시 전형에도 일부 변화가 예상됩니다. 학교 홈페이지나 공식 채널을 통해 최신 정보를 확인하시기 바랍니다.`,
          date: today,
          category: '학교소식',
          url: `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(schoolName + ' 입시 2026')}`,
          source: '검색 결과',
        }],
        admissionInfo: {
          schedule: '자세한 일정은 학교 홈페이지를 참고해주세요.',
          method: '자세한 전형 방법은 학교 모집요강을 확인해주세요.',
          tips: ['학교 홈페이지에서 최신 모집요강을 확인하세요.'],
        },
        summary: [`${schoolName}에 대한 정보를 불러오는 중 오류가 발생했습니다.`],
      };
    }

    // Save to cache
    supabaseAdmin.from('school_research_cache').upsert({
      school_key: cacheKey,
      school_name: schoolName,
      school_type: 'news_cache',
      detailed_info: JSON.stringify(result),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'school_key' }).then(({ error }) => {
      if (error) console.error('News cache save error:', error);
      else console.log('News cached for:', schoolName);
    });

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
