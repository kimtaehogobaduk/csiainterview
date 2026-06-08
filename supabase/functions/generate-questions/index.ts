import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCHOOL_DETAILED: Record<string, { name: string; focus: string; detailedInfo: string }> = {
  cheongshim: {
    name: '청심국제고등학교',
    focus: 'ACG 교육 철학에 대한 이해, 글로벌 리더십, 기숙사 생활 적응력, 봉사정신',
    detailedInfo: `청심국제고등학교는 경기도 가평에 위치한 자율형 사립고. ACG(Academic, Character, Global) 교육 철학. 3년 전원 기숙사 생활, 글로벌 리더십, 봉사활동 필수, 효정 문화. 면접에서 ACG 이해도, 기숙사 적응력, 봉사정신, 글로벌 시각을 중시.`
  },
  hana: { name: '하나고등학교', focus: '자기주도학습 능력, 창의적 문제해결력, 하나정신에 대한 이해', detailedInfo: `하나고등학교는 서울 자율형 사립고. 하나정신(정직, 봉사, 창의). 자기주도학습, 창의융합, 멘토링. 면접에서 자기주도학습, 하나정신 이해, 창의적 문제해결 중시.` },
  sangsan: { name: '상산고등학교', focus: '수학·과학 탐구, 논리적 사고력, 연구 열정', detailedInfo: `상산고등학교는 전북 전주 자율형 사립고. 수학·과학 심화, STEM, R&E. 면접에서 수학·과학 탐구, 논리적 사고력, 연구 열정 중시.` },
  minsa: { name: '민족사관고등학교', focus: '민족정신, 한국 문화 이해, 글로벌 시각, 리더십', detailedInfo: `민족사관고등학교는 강원 횡성 자율형 사립고. 민족정신+글로벌 역량. 한국학, 전통문화, 기숙사. 면접에서 한국 문화·역사, 민족정신, 리더십, 글로벌 시각 중시.` },
  daewon: { name: '대원외국어고등학교', focus: '외국어 능력, 국제 감각, 다문화 이해', detailedInfo: `대원외국어고등학교는 서울 외국어고. 외국어 심화, 국제교류, 토론대회, 해외연수. 면접에서 외국어 동기·노력, 국제감각, 다문화 이해 중시.` },
  daejungsin: { name: '대전신성고등학교', focus: '과학·수학 탐구 능력, 논리적 사고력, 연구 열정, 자기주도학습', detailedInfo: `대전신성고등학교는 대전의 과학 중점 자율형 사립고. 과학·수학 심화, STEM, R&E, 연구 역량 강화. 면접에서 과학·수학 탐구, 논리적 사고력, 연구 열정, 자기주도학습 중시.` },
  seoulscience: { name: '서울과학고등학교', focus: '과학·수학 탐구 능력, 논리적 사고력, 연구에 대한 열정, 학문적 호기심', detailedInfo: `서울과학고등학교는 서울의 과학 영재 고등학교. 심화 과학·수학, 독자 연구 프로그램, R&E, 올림피아드. 면접에서 과학·수학 탐구, 논리적 사고력, 연구 열정, 학문적 호기심 중시.` },
  hansungscience: { name: '한성과학고등학교', focus: '과학·수학 탐구 능력, 창의적 문제해결력, 연구 열정, 융합적 사고', detailedInfo: `한성과학고등학교는 서울의 과학 영재 고등학교. 창의융합형 과학 영재 양성, 심화 과학·수학, R&E, 연구 프로그램. 면접에서 과학·수학 탐구, 창의적 문제해결, 연구 열정, 융합적 사고 중시.` },
  hwimun: { name: '휘문고등학교', focus: '자기주도학습 능력, 창의적 문제해결력, 인성, 진로 목표', detailedInfo: `휘문고등학교는 서울의 자율형 사립고. 인성 교육, 창의융합 역량 강화, 자기주도학습, 멘토링. 면접에서 자기주도학습, 창의적 문제해결, 인성, 진로 목표 중시.` },
  busan: { name: '부산국제고등학교', focus: 'IB 교육, 국제 감각, 비판적 사고, 학업 열정', detailedInfo: `부산국제고등학교는 부산 국제고. IB Diploma, 비판적 사고, CAS. 면접에서 IB 이해, 비판적 사고, 국제 감각, 학업 열정 중시.` },
  other: { name: '특목고/자사고/영재고/외국어고', focus: '자기주도학습, 진로 목표, 학업 열정, 인성', detailedInfo: `특수목적고, 자율형 사립고, 영재고 및 외국어고. 자기주도적 학습, 창의성, 리더십. 면접에서 자기주도학습, 진로 목표, 학업 열정, 인성 중시.` }
};

const requestSchema = z.object({
  essay: z.string().trim().min(10).max(10000),
  count: z.number().int().min(1).max(50).optional().default(10),
  school: z.string().optional().default('cheongshim'),
  customSchoolInfo: z.object({
    name: z.string(),
    keywords: z.array(z.string()).optional(),
    characteristics: z.string().optional(),
    interviewFocus: z.string().optional(),
  }).optional(),
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

async function getSchoolInfo(school: string, customSchoolInfo: any): Promise<{ name: string; focus: string; detailedInfo: string }> {
  if (!school.startsWith('custom:') && SCHOOL_DETAILED[school]) {
    return SCHOOL_DETAILED[school];
  }

  const customName = school.startsWith('custom:') ? school.replace('custom:', '') : school;
  const schoolKey = customName.trim().toLowerCase().replace(/\s+/g, '');

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: cached } = await supabaseAdmin
    .from('school_research_cache')
    .select('school_name, interview_focus, detailed_info')
    .eq('school_key', schoolKey)
    .single();

  if (cached) {
    console.log('Using cached school info for:', cached.school_name);
    return {
      name: cached.school_name,
      focus: cached.interview_focus || '자기주도학습, 진로 목표, 학업 열정, 인성',
      detailedInfo: cached.detailed_info || `${cached.school_name} 면접 준비용 정보.`,
    };
  }

  if (customSchoolInfo) {
    return {
      name: customSchoolInfo.name || customName,
      focus: customSchoolInfo.interviewFocus || '자기주도학습, 진로 목표, 학업 열정, 인성',
      detailedInfo: customSchoolInfo.characteristics || `${customSchoolInfo.name || customName} 면접 준비용 정보.`,
    };
  }

  // Fallback AI research + cache
  const research = await callAI([
    { role: 'system', content: '한국 고등학교 입시 전문가입니다. 간결하게 답변합니다.' },
    { role: 'user', content: `"${customName}"의 학교 유형, 교육 철학, 인재상, 면접 중점 사항을 5문장 이내로 요약해주세요.` }
  ], 0.3);

  supabaseAdmin.from('school_research_cache').upsert({
    school_key: schoolKey,
    school_name: customName,
    interview_focus: '자기주도학습, 진로 목표, 학업 열정, 인성',
    detailed_info: research,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'school_key' }).then(({ error }) => {
    if (error) console.error('Cache save error:', error);
  });

  return { name: customName, focus: '자기주도학습, 진로 목표, 학업 열정, 인성', detailedInfo: research };
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
        JSON.stringify({ error: validationResult.error.issues[0].message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { essay, count, school, customSchoolInfo } = validationResult.data;
    const schoolInfo = await getSchoolInfo(school, customSchoolInfo);

    const baseQuestions = Math.floor(count * 0.6);
    const expandedQuestions = count - baseQuestions;

    const systemPrompt = `당신은 ${schoolInfo.name} 면접관입니다. 자기소개서를 읽고 질문을 생성합니다.

**학교 상세 정보:**
${schoolInfo.detailedInfo}

질문 생성 원칙:
1. 자소서 내용 기반 질문 (${baseQuestions}개):
   - 자소서 경험을 더 깊이 파악하는 구체적 질문
   - 학교의 교육 철학·인재상과 자소서를 연결한 질문
2. 관련 주제 확장 질문 (${expandedQuestions}개):
   - 면접관이 추가로 궁금해할 만한 질문
   - ${schoolInfo.name}이 중시하는 역량(${schoolInfo.focus}) 관련 질문

총 ${count}개, 한 줄씩, 번호 없이.`;

    const content = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `자기소개서:\n${essay}\n\n${schoolInfo.name} 면접 질문 ${count}개를 줄바꿈으로 구분해 생성해주세요.` }
    ], 0.8);

    const questions = content
      .split('\n')
      .map((q: string) => q.trim())
      .filter((q: string) => q.length > 10 && !q.match(/^\d+\.|^[-*]/))
      .slice(0, count);

    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    console.log('Generated questions:', questions.length);

    return new Response(
      JSON.stringify({ questions }),
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
