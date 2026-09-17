import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  schoolName: z.string().trim().min(2).max(100),
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

  const requestBody = { model: 'google/gemini-3.8-flash', messages, temperature };
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
        body: JSON.stringify({ ...requestBody, model: 'gpt-oss-120b' }),
      });
    }
  } else {
    response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CEREBRAS_API_KEY!}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...requestBody, model: 'gpt-oss-120b' }),
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
    const validationResult = requestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: '학교 이름을 입력해주세요.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { schoolName } = validationResult.data;
    const schoolKey = schoolName.trim().toLowerCase().replace(/\s+/g, '');
    const supabaseAdmin = getSupabaseAdmin();

    // Check cache first
    const { data: cached } = await supabaseAdmin
      .from('school_research_cache')
      .select('*')
      .eq('school_key', schoolKey)
      .single();

    if (cached) {
      console.log('Cache hit for:', schoolName);
      return new Response(
        JSON.stringify({
          schoolInfo: {
            name: cached.school_name,
            type: cached.school_type,
            keywords: cached.keywords,
            characteristics: cached.characteristics,
            interviewFocus: cached.interview_focus,
            commonQuestions: cached.common_questions,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AI research
    console.log('Researching school:', schoolName);

    const systemPrompt = `당신은 한국의 고등학교 입시 전문가입니다. 사용자가 입력한 학교에 대한 정보를 분석하여 면접 준비에 필요한 정보를 제공합니다.

주어진 학교명을 분석하여 다음 형식의 JSON으로 응답해주세요:

{
  "name": "학교 정식 명칭",
  "type": "학교 유형 (예: 자율형사립고, 외국어고, 국제고, 과학고, 영재학교, 일반고 등)",
  "keywords": ["핵심 키워드 5개"],
  "characteristics": "학교의 특징과 교육 철학에 대한 2-3문장 설명",
  "interviewFocus": "면접에서 중요시하는 역량과 평가 기준",
  "detailedInfo": "학교의 교육 철학, 특별 프로그램, 인재상, 면접 중점, 특별한 전통을 포함한 5-8문장의 상세 설명",
  "commonQuestions": ["이 학교 면접에서 자주 나오는 질문 10개"]
}

반드시 유효한 JSON 형식으로만 응답하세요.`;

    const content = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `"${schoolName}" 학교에 대한 면접 준비 정보를 JSON 형식으로 제공해주세요.` }
    ], 0.5);

    let schoolInfo;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      schoolInfo = JSON.parse(jsonStr.trim());
    } catch {
      schoolInfo = {
        name: schoolName,
        type: '고등학교',
        keywords: ['자기주도학습', '창의성', '리더십', '학업 역량', '인성'],
        characteristics: `${schoolName}은(는) 학생들의 잠재력을 키우고 미래 인재를 양성하는 교육을 목표로 합니다.`,
        interviewFocus: '자기주도학습 능력, 진로 목표, 학업 열정, 인성',
        detailedInfo: `${schoolName}은(는) 자기주도적 학습과 창의성을 중시하는 고등학교입니다. 면접에서 자기주도학습, 진로 목표, 학업 열정, 인성을 중시합니다.`,
        commonQuestions: [
          `${schoolName}에 지원하게 된 동기는 무엇인가요?`,
          '본인의 장점과 단점을 말해주세요.',
          '학교생활 중 가장 기억에 남는 경험은?',
          '진로 계획과 꿈에 대해 말해주세요.',
          '자기주도학습 경험을 구체적으로 말해주세요.',
        ]
      };
    }

    // Save to cache (fire and forget)
    supabaseAdmin.from('school_research_cache').upsert({
      school_key: schoolKey,
      school_name: schoolInfo.name,
      school_type: schoolInfo.type || '고등학교',
      keywords: schoolInfo.keywords || [],
      characteristics: schoolInfo.characteristics || '',
      interview_focus: schoolInfo.interviewFocus || '',
      detailed_info: schoolInfo.detailedInfo || schoolInfo.characteristics || '',
      common_questions: schoolInfo.commonQuestions || [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'school_key' }).then(({ error }) => {
      if (error) console.error('Cache save error:', error);
      else console.log('School info cached:', schoolInfo.name);
    });

    return new Response(
      JSON.stringify({ schoolInfo }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
