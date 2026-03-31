import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCHOOL_DETAILED: Record<string, { name: string; keywords: string[]; focus: string; detailedInfo: string }> = {
  cheongshim: {
    name: '청심국제고등학교',
    keywords: ['ACG 교육', '글로벌 리더', '기숙사', '가평', '건학 이념'],
    focus: 'ACG 교육 철학에 대한 이해, 글로벌 리더십, 기숙사 생활 적응력, 봉사정신',
    detailedInfo: `청심국제고등학교는 경기도 가평에 위치한 자율형 사립고. ACG(Academic, Character, Global) 교육 철학. 3년 전원 기숙사 생활, 글로벌 리더십, 봉사활동 필수, 효정 문화. 면접에서 ACG 이해도, 기숙사 적응력, 봉사정신, 글로벌 시각을 중시.`
  },
  hana: {
    name: '하나고등학교', keywords: ['자기주도학습', '창의융합', '하나정신', '전인교육'],
    focus: '자기주도학습 능력, 창의적 문제해결력, 하나정신(정직, 봉사, 창의)에 대한 이해',
    detailedInfo: `하나고등학교는 서울 자율형 사립고. 하나정신(정직, 봉사, 창의) 핵심가치. 자기주도학습 시스템, 창의융합 프로젝트, 멘토링. 면접에서 자기주도학습 경험, 하나정신 이해, 창의적 문제해결 경험 중시.`
  },
  sangsan: {
    name: '상산고등학교', keywords: ['과학영재', '수학과학', '연구역량', 'STEM'],
    focus: '수학·과학 탐구 능력, 논리적 사고력, 연구에 대한 열정, 학문적 호기심',
    detailedInfo: `상산고등학교는 전북 전주 자율형 사립고. 수학·과학 심화교육, STEM, R&E 프로그램, 올림피아드 준비. 면접에서 수학·과학 탐구 경험, 논리적 사고력, 연구 열정 중시.`
  },
  minsa: {
    name: '민족사관고등학교', keywords: ['민족정신', '한국학', '전통문화', '글로벌'],
    focus: '민족정신과 정체성, 한국 문화에 대한 이해, 글로벌 시각, 리더십',
    detailedInfo: `민족사관고등학교는 강원 횡성 자율형 사립고. 한국 민족정신+글로벌 역량 동시 추구. 한국학 교육, 전통문화 체험, 기숙사 생활. 면접에서 한국 문화·역사 관심, 민족정신, 리더십, 글로벌 시각 중시.`
  },
  daewon: {
    name: '대원외국어고등학교', keywords: ['외국어 교육', '국제화', '어학 역량', '글로벌 인재'],
    focus: '외국어 능력, 국제 감각, 문화적 다양성 이해, 의사소통 능력',
    detailedInfo: `대원외국어고등학교는 서울 외국어고. 다양한 외국어 심화과정, 국제교류, 외국어 토론대회, 해외연수. 면접에서 외국어 학습 동기·노력, 국제감각, 다문화 이해 중시.`
  },
  daeil: {
    name: '대일외국어고등학교', keywords: ['외국어', '인성교육', '글로벌 역량'],
    focus: '외국어 학습 경험, 인성, 국제 이해, 자기주도성',
    detailedInfo: `대일외국어고등학교는 서울 외국어고. 외국어+인성 겸비 글로벌 인재 양성. 면접에서 외국어 학습 경험, 인성·가치관, 국제 이해, 자기주도학습 중시.`
  },
  myungduk: {
    name: '명덕외국어고등학교', keywords: ['외국어', '창의인재', '글로벌 소양'],
    focus: '창의성, 외국어 능력, 글로벌 마인드, 학업 열정',
    detailedInfo: `명덕외국어고등학교는 서울 외국어고. 창의적 사고+글로벌 소양. 면접에서 창의성, 외국어 능력, 글로벌 마인드, 학업 열정 중시.`
  },
  gyeonggi: {
    name: '경기외국어고등학교', keywords: ['외국어', '국제화', '다문화 이해'],
    focus: '외국어 학습 동기, 국제 이슈 관심, 다문화 이해, 학업 계획',
    detailedInfo: `경기외국어고등학교는 경기도 외국어고. 외국어+국제화 역량. 면접에서 외국어 학습 동기, 국제 이슈 관심, 다문화 이해, 진로 계획 중시.`
  },
  busan: {
    name: '부산국제고등학교', keywords: ['국제화', 'IB 과정', '글로벌 리더'],
    focus: 'IB 교육에 대한 이해, 국제적 감각, 비판적 사고, 학업 열정',
    detailedInfo: `부산국제고등학교는 부산 국제고. IB Diploma Programme 운영, 비판적 사고, CAS 활동. 면접에서 IB 이해도, 비판적 사고, 국제 감각, 학업 열정 중시.`
  },
  incheon: {
    name: '인천외국어고등학교', keywords: ['외국어', '국제교류', '어학 역량'],
    focus: '외국어 능력, 국제 감각, 자기주도학습, 진로 계획',
    detailedInfo: `인천외국어고등학교는 인천 외국어고. 외국어 심화+국제교류. 면접에서 외국어 능력, 국제 감각, 자기주도학습, 진로 계획 중시.`
  },
  other: {
    name: '자율형 사립고/외국어고', keywords: ['자기주도학습', '창의성', '리더십', '학업 역량'],
    focus: '자기주도학습 능력, 진로 목표, 학업 열정, 인성',
    detailedInfo: `자율형 사립고/외국어고. 자기주도적 학습, 창의성, 리더십 강조. 면접에서 자기주도학습, 진로 목표, 학업 열정, 인성 중시.`
  }
};

const requestSchema = z.object({
  essay: z.string().trim().min(10, '자기소개서는 최소 10자 이상이어야 합니다.').max(10000, '자기소개서는 최대 10,000자까지 입력 가능합니다.'),
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
  if (!LOVABLE_API_KEY && !CEREBRAS_API_KEY) {
    throw new Error('API 키가 설정되지 않았습니다.');
  }

  const requestBody = { model: 'google/gemini-2.5-flash', messages, temperature };
  let response: Response;

  if (LOVABLE_API_KEY) {
    response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    if (response.status === 402 && CEREBRAS_API_KEY) {
      console.log('Lovable AI 크레딧 소진, Cerebras로 전환합니다...');
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

async function getSchoolDetailedInfo(schoolKey: string, schoolInfo: any): Promise<string> {
  // Predefined schools: use pre-built info (no AI call!)
  if (!schoolKey.startsWith('custom:') && SCHOOL_DETAILED[schoolKey]) {
    console.log('Using pre-built school info for:', SCHOOL_DETAILED[schoolKey].name);
    return SCHOOL_DETAILED[schoolKey].detailedInfo;
  }

  // Custom schools only: brief AI research
  console.log('Researching custom school:', schoolInfo.name);
  return await callAI([
    { role: 'system', content: '한국 고등학교 입시 전문가입니다. 간결하게 답변합니다.' },
    { role: 'user', content: `"${schoolInfo.name}"의 학교 유형, 교육 철학, 인재상, 면접 중점 사항을 5문장 이내로 요약해주세요.` }
  ], 0.3);
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

    let schoolInfo;
    if (school.startsWith('custom:') && customSchoolInfo) {
      schoolInfo = {
        name: customSchoolInfo.name,
        keywords: customSchoolInfo.keywords || ['자기주도학습', '창의성', '리더십'],
        focus: customSchoolInfo.interviewFocus || '자기주도학습 능력, 진로 목표, 학업 열정, 인성'
      };
    } else {
      const s = SCHOOL_DETAILED[school] || SCHOOL_DETAILED['cheongshim'];
      schoolInfo = { name: s.name, keywords: s.keywords, focus: s.focus };
    }

    // Get detailed info (instant for predefined, AI only for custom)
    const detailedInfo = await getSchoolDetailedInfo(school, schoolInfo);

    const baseQuestions = Math.floor(count * 0.6);
    const expandedQuestions = count - baseQuestions;

    const systemPrompt = `당신은 ${schoolInfo.name} 면접관입니다. 자기소개서를 읽고 질문을 생성합니다.

**학교 상세 정보:**
${detailedInfo}

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
