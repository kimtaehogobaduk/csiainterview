import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rich pre-built school info to avoid extra AI call for known schools
const SCHOOL_INFO: Record<string, { name: string; keywords: string[]; focus: string; characteristics: string; detailedInfo: string }> = {
  cheongshim: {
    name: '청심국제고등학교',
    keywords: ['ACG 교육', '글로벌 리더', '기숙사', '가평', '건학 이념'],
    focus: 'ACG 교육 철학에 대한 이해, 글로벌 리더십, 기숙사 생활 적응력, 봉사정신',
    characteristics: 'ACG(Academic, Character, Global) 교육 철학, 가평 위치, 3년 기숙사 생활',
    detailedInfo: `청심국제고등학교는 경기도 가평에 위치한 자율형 사립고등학교입니다.
교육 철학: ACG(Academic, Character, Global) 교육을 핵심으로 하며, 학문적 역량, 인성, 글로벌 역량을 균형있게 기릅니다.
특별 프로그램: 3년 전원 기숙사 생활, 글로벌 리더십 프로그램, 봉사활동 필수, 건학 이념에 기반한 인성교육.
인재상: 봉사정신과 글로벌 리더십을 갖춘 인재, ACG 교육 철학에 공감하는 학생.
면접 중점: 지원 동기의 진정성, ACG 교육 철학 이해도, 기숙사 생활 적응력, 봉사 경험, 글로벌 시각.
특별한 전통: 효정 문화, 참부모 교육, 자연 속 교육환경 활용.`
  },
  hana: {
    name: '하나고등학교',
    keywords: ['자기주도학습', '창의융합', '하나정신', '전인교육'],
    focus: '자기주도학습 능력, 창의적 문제해결력, 하나정신(정직, 봉사, 창의)에 대한 이해',
    characteristics: '자기주도학습 중심, 창의융합 역량, 하나정신 강조',
    detailedInfo: `하나고등학교는 서울에 위치한 자율형 사립고등학교입니다.
교육 철학: '하나정신'(정직, 봉사, 창의)을 핵심 가치로 삼으며, 자기주도학습과 전인교육을 강조합니다.
특별 프로그램: 자기주도학습 시스템, 창의융합 프로젝트, 멘토링 프로그램, 학생 자치활동.
인재상: 자기주도적으로 학습하고, 창의적으로 문제를 해결하며, 공동체에 기여하는 인재.
면접 중점: 자기주도학습 경험과 방법, 하나정신에 대한 이해, 창의적 문제해결 경험, 협업 능력.
특별한 전통: 학생 주도의 학교 문화, 다양한 동아리 활동, 학술제.`
  },
  sangsan: {
    name: '상산고등학교',
    keywords: ['과학영재', '수학과학', '연구역량', 'STEM', '논리적 사고'],
    focus: '수학·과학 탐구 능력, 논리적 사고력, 연구에 대한 열정, 학문적 호기심',
    characteristics: '수학·과학 영재교육, 연구역량 강화, 전북 전주 위치',
    detailedInfo: `상산고등학교는 전북 전주에 위치한 자율형 사립고등학교입니다.
교육 철학: 수학·과학 중심의 심화 교육과 연구역량 강화를 통해 미래 과학기술 인재를 양성합니다.
특별 프로그램: STEM 심화 교육, 연구 프로젝트, 수학·과학 올림피아드 준비, 대학 연계 프로그램.
인재상: 논리적 사고력과 연구에 대한 열정을 갖춘 학생, 학문적 호기심이 강한 인재.
면접 중점: 수학·과학 탐구 경험, 논리적 사고력, 연구 계획, 학문적 호기심과 열정.
특별한 전통: 과학연구 발표회, 수학경시대회, R&E 프로그램.`
  },
  minsa: {
    name: '민족사관고등학교',
    keywords: ['민족정신', '한국학', '전통문화', '글로벌', '한국 정체성'],
    focus: '민족정신과 정체성, 한국 문화에 대한 이해, 글로벌 시각, 리더십',
    characteristics: '민족정신과 글로벌 역량 동시 강조, 한국학 교육, 강원 횡성 위치',
    detailedInfo: `민족사관고등학교는 강원도 횡성에 위치한 자율형 사립고등학교입니다.
교육 철학: 한국의 민족정신과 글로벌 역량을 동시에 갖춘 인재 양성을 목표로 합니다.
특별 프로그램: 한국학 교육, 전통문화 체험, 글로벌 리더십 프로그램, 기숙사 생활, 학술 심화 과정.
인재상: 한국 정체성을 바탕으로 세계를 이끌 수 있는 리더, 민족 문화에 자부심을 가진 글로벌 인재.
면접 중점: 한국 문화와 역사에 대한 관심, 민족정신 이해, 리더십 경험, 글로벌 시각.
특별한 전통: 한국학 심화, 전통예절 교육, 국제교류 프로그램.`
  },
  daewon: {
    name: '대원외국어고등학교',
    keywords: ['외국어 교육', '국제화', '어학 역량', '글로벌 인재'],
    focus: '외국어 능력, 국제 감각, 문화적 다양성 이해, 의사소통 능력',
    characteristics: '뛰어난 외국어 능력과 국제적 감각, 서울 위치',
    detailedInfo: `대원외국어고등학교는 서울에 위치한 외국어고등학교입니다.
교육 철학: 뛰어난 외국어 능력과 국제적 감각을 갖춘 글로벌 인재 양성을 목표로 합니다.
특별 프로그램: 다양한 외국어 심화 과정, 국제교류, 외국어 토론대회, 해외 연수 프로그램.
인재상: 외국어 능력이 뛰어나고 문화적 다양성을 이해하며 국제사회에 기여할 수 있는 인재.
면접 중점: 외국어 학습 동기와 노력, 국제 감각, 다문화 이해, 의사소통 능력.`
  },
  daeil: {
    name: '대일외국어고등학교',
    keywords: ['외국어', '인성교육', '글로벌 역량'],
    focus: '외국어 학습 경험, 인성, 국제 이해, 자기주도성',
    characteristics: '외국어 능력과 인성 겸비, 글로벌 인재 양성',
    detailedInfo: `대일외국어고등학교는 서울에 위치한 외국어고등학교입니다.
교육 철학: 외국어 능력과 인성을 겸비한 글로벌 인재 양성을 목표로 합니다.
특별 프로그램: 외국어 심화 교육, 인성교육 프로그램, 국제교류, 동아리 활동.
인재상: 외국어 능력과 바른 인성을 갖추고 자기주도적으로 학습하는 학생.
면접 중점: 외국어 학습 경험, 인성과 가치관, 국제 이해, 자기주도학습 능력.`
  },
  myungduk: {
    name: '명덕외국어고등학교',
    keywords: ['외국어', '창의인재', '글로벌 소양'],
    focus: '창의성, 외국어 능력, 글로벌 마인드, 학업 열정',
    characteristics: '창의적 사고와 글로벌 소양 강조',
    detailedInfo: `명덕외국어고등학교는 서울에 위치한 외국어고등학교입니다.
교육 철학: 창의적 사고와 글로벌 소양을 갖춘 인재 양성을 목표로 합니다.
특별 프로그램: 외국어 심화, 창의융합 프로젝트, 글로벌 체험 프로그램.
인재상: 창의적이고 외국어 능력이 뛰어나며 글로벌 마인드를 갖춘 학생.
면접 중점: 창의성, 외국어 능력, 글로벌 마인드, 학업 열정과 계획.`
  },
  gyeonggi: {
    name: '경기외국어고등학교',
    keywords: ['외국어', '국제화', '다문화 이해'],
    focus: '외국어 학습 동기, 국제 이슈 관심, 다문화 이해, 학업 계획',
    characteristics: '경기 지역 대표 외국어 특성화 고등학교',
    detailedInfo: `경기외국어고등학교는 경기도에 위치한 외국어고등학교입니다.
교육 철학: 외국어 능력과 국제화 역량을 갖춘 인재 양성을 목표로 합니다.
특별 프로그램: 외국어 심화 교육, 국제교류 프로그램, 다문화 이해 교육.
인재상: 외국어에 열정이 있고 국제 이슈에 관심을 가진 학생.
면접 중점: 외국어 학습 동기, 국제 이슈 관심도, 다문화 이해, 진로 계획.`
  },
  busan: {
    name: '부산국제고등학교',
    keywords: ['국제화', 'IB 과정', '글로벌 리더', '비판적 사고'],
    focus: 'IB 교육에 대한 이해, 국제적 감각, 비판적 사고, 학업 열정',
    characteristics: 'IB 과정 운영, 글로벌 인재 양성, 부산 위치',
    detailedInfo: `부산국제고등학교는 부산에 위치한 국제고등학교입니다.
교육 철학: IB(International Baccalaureate) 과정을 운영하며 국제적 감각과 비판적 사고력을 갖춘 글로벌 리더 양성을 목표로 합니다.
특별 프로그램: IB Diploma Programme, 비판적 사고 교육, 국제교류, CAS(창의·활동·봉사) 활동.
인재상: 비판적 사고력과 국제적 감각을 갖춘 학생, IB 교육에 대한 이해와 열정이 있는 인재.
면접 중점: IB 교육과정 이해도, 비판적 사고 능력, 국제적 감각, 학업 열정과 계획.`
  },
  incheon: {
    name: '인천외국어고등학교',
    keywords: ['외국어', '국제교류', '어학 역량'],
    focus: '외국어 능력, 국제 감각, 자기주도학습, 진로 계획',
    characteristics: '인천 지역 대표 외국어 특성화 고등학교',
    detailedInfo: `인천외국어고등학교는 인천에 위치한 외국어고등학교입니다.
교육 철학: 외국어 능력과 국제 감각을 갖춘 인재 양성을 목표로 합니다.
특별 프로그램: 외국어 심화 교육, 국제교류 프로그램, 어학 경시대회.
인재상: 외국어에 뛰어나고 국제 감각을 갖추며 자기주도적으로 학습하는 학생.
면접 중점: 외국어 능력, 국제 감각, 자기주도학습 경험, 진로 계획.`
  },
  other: {
    name: '자율형 사립고/외국어고',
    keywords: ['자기주도학습', '창의성', '리더십', '학업 역량'],
    focus: '자기주도학습 능력, 진로 목표, 학업 열정, 인성',
    characteristics: '자기주도적 학습 능력과 창의적 인재 양성',
    detailedInfo: `자율형 사립고/외국어고는 자기주도적 학습 능력과 창의적 인재 양성을 목표로 합니다.
교육 철학: 학생의 자율성과 창의성을 존중하며, 개성과 잠재력을 발휘할 수 있는 교육환경을 제공합니다.
인재상: 자기주도적으로 학습하고 창의적으로 문제를 해결하며 리더십을 발휘하는 학생.
면접 중점: 자기주도학습 능력, 진로 목표의 구체성, 학업 열정, 인성과 가치관.`
  }
};

async function callAI(messages: Array<{role: string; content: string}>, temperature: number) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const CEREBRAS_API_KEY = Deno.env.get('CEREBRAS_API_KEY');
  if (!LOVABLE_API_KEY && !CEREBRAS_API_KEY) {
    throw new Error('API 키가 설정되지 않았습니다.');
  }

  const requestBody = {
    model: 'google/gemini-2.5-flash',
    messages,
    temperature,
  };

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

async function getSchoolDetailedInfo(schoolKey: string, schoolInfo: any, customSchoolInfo: any): Promise<string> {
  // For predefined schools, use pre-built detailed info (no AI call needed!)
  if (!schoolKey.startsWith('custom:') && SCHOOL_INFO[schoolKey]) {
    console.log('Using pre-built school info for:', schoolInfo.name);
    return SCHOOL_INFO[schoolKey].detailedInfo;
  }

  // Only research custom/unknown schools via AI
  console.log('Researching custom school:', schoolInfo.name);
  const researchPrompt = `"${schoolInfo.name}"에 대해 면접 질문 생성에 필요한 정보를 간략히 조사해주세요.
학교 유형, 교육 철학, 인재상, 면접 중점 사항을 5문장 이내로 요약해주세요.`;

  return await callAI([
    { role: 'system', content: '한국 고등학교 입시 전문가입니다. 간결하게 답변합니다.' },
    { role: 'user', content: researchPrompt }
  ], 0.3);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { school, customSchoolInfo, count = 30 } = await req.json();

    let schoolInfo;
    let schoolKey = school;
    if (school.startsWith('custom:') && customSchoolInfo) {
      schoolInfo = {
        name: customSchoolInfo.name,
        keywords: customSchoolInfo.keywords || ['자기주도학습', '창의성', '리더십'],
        focus: customSchoolInfo.interviewFocus || '자기주도학습 능력, 진로 목표, 학업 열정, 인성',
        characteristics: customSchoolInfo.characteristics || '자율형 고등학교'
      };
    } else {
      schoolInfo = SCHOOL_INFO[school] || SCHOOL_INFO['cheongshim'];
    }

    // Get detailed info (instant for predefined schools, AI call only for custom)
    const detailedInfo = await getSchoolDetailedInfo(schoolKey, schoolInfo, customSchoolInfo);

    console.log('Generating questions for:', schoolInfo.name);

    const systemPrompt = `당신은 ${schoolInfo.name} 입학 면접 전문가입니다.

**학교 상세 정보:**
${detailedInfo}

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
