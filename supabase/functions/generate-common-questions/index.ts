import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCHOOL_INFO: Record<string, { name: string; focus: string; detailedInfo: string }> = {
  cheongshim: {
    name: '청심국제고등학교',
    focus: 'ACG 교육 철학에 대한 이해, 글로벌 리더십, 기숙사 생활 적응력, 봉사정신',
    detailedInfo: `청심국제고등학교는 경기도 가평에 위치한 자율형 사립고등학교입니다. ACG(Academic, Character, Global) 교육 철학. 3년 전원 기숙사 생활, 글로벌 리더십 프로그램, 봉사활동 필수, 건학 이념에 기반한 인성교육. 인재상: 봉사정신과 글로벌 리더십을 갖춘 인재. 면접 중점: 지원 동기의 진정성, ACG 교육 철학 이해도, 기숙사 생활 적응력, 봉사 경험, 글로벌 시각.`
  },
  hana: {
    name: '하나고등학교',
    focus: '자기주도학습 능력, 창의적 문제해결력, 하나정신(정직, 봉사, 창의)에 대한 이해',
    detailedInfo: `하나고등학교는 서울 자율형 사립고. 하나정신(정직, 봉사, 창의) 핵심가치. 자기주도학습 시스템, 창의융합 프로젝트, 멘토링. 면접에서 자기주도학습 경험, 하나정신 이해, 창의적 문제해결 경험, 협업 능력 중시.`
  },
  sangsan: {
    name: '상산고등학교',
    focus: '수학·과학 탐구 능력, 논리적 사고력, 연구에 대한 열정, 학문적 호기심',
    detailedInfo: `상산고등학교는 전북 전주 자율형 사립고. 수학·과학 심화교육, STEM, R&E 프로그램, 올림피아드 준비. 면접에서 수학·과학 탐구 경험, 논리적 사고력, 연구 열정 중시.`
  },
  minsa: {
    name: '민족사관고등학교',
    focus: '민족정신과 정체성, 한국 문화에 대한 이해, 글로벌 시각, 리더십',
    detailedInfo: `민족사관고등학교는 강원 횡성 자율형 사립고. 한국 민족정신+글로벌 역량. 한국학 교육, 전통문화 체험, 기숙사 생활. 면접에서 한국 문화·역사 관심, 민족정신, 리더십, 글로벌 시각 중시.`
  },
  daewon: {
    name: '대원외국어고등학교',
    focus: '외국어 능력, 국제 감각, 문화적 다양성 이해, 의사소통 능력',
    detailedInfo: `대원외국어고등학교는 서울 외국어고. 다양한 외국어 심화과정, 국제교류, 외국어 토론대회, 해외연수. 면접에서 외국어 학습 동기·노력, 국제감각, 다문화 이해 중시.`
  },
  daejungsin: {
    name: '대전신성고등학교',
    focus: '과학·수학 탐구 능력, 논리적 사고력, 연구 열정, 자기주도학습',
    detailedInfo: `대전신성고등학교는 대전의 과학 중점 자율형 사립고. 과학·수학 심화교육, STEM, R&E, 연구 역량 강화. 면접에서 과학·수학 탐구 경험, 논리적 사고력, 연구 열정, 자기주도학습 중시.`
  },
  seoulscience: {
    name: '서울과학고등학교',
    focus: '과학·수학 탐구 능력, 논리적 사고력, 연구에 대한 열정, 학문적 호기심',
    detailedInfo: `서울과학고등학교는 서울의 과학 영재 고등학교. 심화된 과학·수학 교육, 독자적인 연구 프로그램, R&E, 올림피아드. 면접에서 과학·수학 탐구 경험, 논리적 사고력, 연구 열정, 학문적 호기심 중시.`
  },
  hansungscience: {
    name: '한성과학고등학교',
    focus: '과학·수학 탐구 능력, 창의적 문제해결력, 연구 열정, 융합적 사고',
    detailedInfo: `한성과학고등학교는 서울의 과학 영재 고등학교. 창의융합형 과학 영재 양성, 심화 과학·수학, R&E, 연구 프로그램. 면접에서 과학·수학 탐구, 창의적 문제해결, 연구 열정, 융합적 사고 중시.`
  },
  hwimun: {
    name: '휘문고등학교',
    focus: '자기주도학습 능력, 창의적 문제해결력, 인성, 진로 목표',
    detailedInfo: `휘문고등학교는 서울의 자율형 사립고. 인성 교육, 창의융합 역량 강화, 자기주도학습, 멘토링. 면접에서 자기주도학습, 창의적 문제해결, 인성, 진로 목표 중시.`
  },
  busan: {
    name: '부산국제고등학교',
    focus: 'IB 교육에 대한 이해, 국제적 감각, 비판적 사고, 학업 열정',
    detailedInfo: `부산국제고등학교는 부산 국제고. IB Diploma Programme, 비판적 사고, CAS 활동. 면접에서 IB 이해도, 비판적 사고, 국제 감각, 학업 열정 중시.`
  },
  other: {
    name: '특목고/자사고/영재고/외국어고',
    focus: '자기주도학습 능력, 진로 목표, 학업 열정, 인성',
    detailedInfo: `특수목적고, 자율형 사립고, 영재고 및 외국어고. 자기주도적 학습, 창의성, 리더십 강조. 면접에서 자기주도학습, 진로 목표, 학업 열정, 인성 중시.`
  }
};

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

async function getSchoolInfo(school: string, customSchoolInfo: any): Promise<{ name: string; focus: string; detailedInfo: string }> {
  // 1. Predefined schools - instant
  if (!school.startsWith('custom:') && SCHOOL_INFO[school]) {
    return SCHOOL_INFO[school];
  }

  // 2. Custom school - extract name and check DB cache
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
      focus: cached.interview_focus || '자기주도학습 능력, 진로 목표, 학업 열정, 인성',
      detailedInfo: cached.detailed_info || `${cached.school_name} 면접 준비용 정보.`,
    };
  }

  // 3. If customSchoolInfo provided from frontend, use it
  if (customSchoolInfo) {
    return {
      name: customSchoolInfo.name || customName,
      focus: customSchoolInfo.interviewFocus || '자기주도학습 능력, 진로 목표, 학업 열정, 인성',
      detailedInfo: customSchoolInfo.characteristics || `${customSchoolInfo.name || customName} 면접 준비용 정보.`,
    };
  }

  // 4. Fallback: brief AI research + cache
  console.log('Researching custom school on-the-fly:', customName);
  const research = await callAI([
    { role: 'system', content: '한국 고등학교 입시 전문가입니다. 간결하게 답변합니다.' },
    { role: 'user', content: `"${customName}"의 학교 유형, 교육 철학, 인재상, 면접 중점 사항을 5문장 이내로 요약해주세요.` }
  ], 0.3);

  // Cache for next time (fire and forget)
  supabaseAdmin.from('school_research_cache').upsert({
    school_key: schoolKey,
    school_name: customName,
    interview_focus: '자기주도학습 능력, 진로 목표, 학업 열정, 인성',
    detailed_info: research,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'school_key' }).then(({ error }) => {
    if (error) console.error('Cache save error:', error);
  });

  return { name: customName, focus: '자기주도학습 능력, 진로 목표, 학업 열정, 인성', detailedInfo: research };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { school, customSchoolInfo, count = 30 } = await req.json();

    const schoolInfo = await getSchoolInfo(school, customSchoolInfo);
    console.log('Generating questions for:', schoolInfo.name);

    // Try to use pre-generated cached question pool for instant response
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const schoolKey = schoolInfo.name.trim().toLowerCase().replace(/\s+/g, '');
      const { data: cachedRow } = await supabaseAdmin
        .from('school_research_cache')
        .select('common_questions')
        .eq('school_key', schoolKey)
        .single();
      const pool = (cachedRow?.common_questions as string[] | undefined) || [];
      if (pool.length >= count) {
        // Shuffle and slice
        const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
        console.log('Returning cached pool questions:', shuffled.length);
        return new Response(
          JSON.stringify({ questions: shuffled, schoolName: schoolInfo.name, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (e) {
      console.log('Cache pool lookup failed, falling back to live generation:', e);
    }

    const systemPrompt = `당신은 ${schoolInfo.name} 입학 면접 전문가입니다.

**학교 상세 정보:**
${schoolInfo.detailedInfo}

**질문 생성 원칙:**
1. 모든 질문은 "${schoolInfo.name}"에 맞게 작성
2. 위 학교 정보의 구체적인 프로그램, 교육 철학, 인재상을 직접 반영
3. 카테고리별 분배:
   - 지원 동기 및 학교 이해 (5~6개)
   - 학업 역량 및 학습 태도 (5~6개)
   - 인성 및 리더십 (5~6개)
   - 진로 계획 및 목표 (4~5개)
   - 시사/사회 문제 인식 (4~5개)
   - 학교 특색 관련 질문 (4~5개)
4. 중학생이 답변할 수 있는 수준의 개방형 질문

정확히 ${count}개의 질문을 줄바꿈으로 구분하여 생성하세요. 번호 없이.`;

    const content = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${schoolInfo.name} 면접을 위한 공통 질문 ${count}개를 생성해주세요.` }
    ], 0.8);

    const questions = content
      .split('\n')
      .map((q: string) => q.trim())
      .filter((q: string) => q.length > 10 && !q.match(/^\d+\.|^[-*]|^#/))
      .map((q: string) => q.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter((q: string) => q.length > 10)
      .slice(0, count);

    console.log('Generated questions count:', questions.length);

    return new Response(
      JSON.stringify({ questions, schoolName: schoolInfo.name }),
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
