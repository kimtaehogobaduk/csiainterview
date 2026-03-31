import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCHOOL_INFO: Record<string, { name: string; keywords: string[]; focus: string; characteristics: string }> = {
  cheongshim: {
    name: '청심국제고등학교',
    keywords: ['ACG 교육', '글로벌 리더', '기숙사', '가평', '건학 이념'],
    focus: 'ACG 교육 철학에 대한 이해, 글로벌 리더십, 기숙사 생활 적응력, 봉사정신',
    characteristics: 'ACG(Academic, Character, Global) 교육 철학, 가평 위치, 3년 기숙사 생활'
  },
  hana: { name: '하나고등학교', keywords: ['자기주도학습', '창의융합', '하나정신', '전인교육'], focus: '자기주도학습 능력, 창의적 문제해결력, 하나정신(정직, 봉사, 창의)에 대한 이해', characteristics: '자기주도학습 중심, 창의융합 역량, 하나정신 강조' },
  sangsan: { name: '상산고등학교', keywords: ['과학영재', '수학과학', '연구역량', 'STEM', '논리적 사고'], focus: '수학·과학 탐구 능력, 논리적 사고력, 연구에 대한 열정, 학문적 호기심', characteristics: '수학·과학 영재교육, 연구역량 강화, 전북 전주 위치' },
  minsa: { name: '민족사관고등학교', keywords: ['민족정신', '한국학', '전통문화', '글로벌', '한국 정체성'], focus: '민족정신과 정체성, 한국 문화에 대한 이해, 글로벌 시각, 리더십', characteristics: '민족정신과 글로벌 역량 동시 강조, 한국학 교육, 강원 횡성 위치' },
  daewon: { name: '대원외국어고등학교', keywords: ['외국어 교육', '국제화', '어학 역량', '글로벌 인재'], focus: '외국어 능력, 국제 감각, 문화적 다양성 이해, 의사소통 능력', characteristics: '뛰어난 외국어 능력과 국제적 감각, 서울 위치' },
  daeil: { name: '대일외국어고등학교', keywords: ['외국어', '인성교육', '글로벌 역량'], focus: '외국어 학습 경험, 인성, 국제 이해, 자기주도성', characteristics: '외국어 능력과 인성 겸비, 글로벌 인재 양성' },
  myungduk: { name: '명덕외국어고등학교', keywords: ['외국어', '창의인재', '글로벌 소양'], focus: '창의성, 외국어 능력, 글로벌 마인드, 학업 열정', characteristics: '창의적 사고와 글로벌 소양 강조' },
  gyeonggi: { name: '경기외국어고등학교', keywords: ['외국어', '국제화', '다문화 이해'], focus: '외국어 학습 동기, 국제 이슈 관심, 다문화 이해, 학업 계획', characteristics: '경기 지역 대표 외국어 특성화 고등학교' },
  busan: { name: '부산국제고등학교', keywords: ['국제화', 'IB 과정', '글로벌 리더', '비판적 사고'], focus: 'IB 교육에 대한 이해, 국제적 감각, 비판적 사고, 학업 열정', characteristics: 'IB 과정 운영, 글로벌 인재 양성, 부산 위치' },
  incheon: { name: '인천외국어고등학교', keywords: ['외국어', '국제교류', '어학 역량'], focus: '외국어 능력, 국제 감각, 자기주도학습, 진로 계획', characteristics: '인천 지역 대표 외국어 특성화 고등학교' },
  other: { name: '자율형 사립고/외국어고', keywords: ['자기주도학습', '창의성', '리더십', '학업 역량'], focus: '자기주도학습 능력, 진로 목표, 학업 열정, 인성', characteristics: '자기주도적 학습 능력과 창의적 인재 양성' }
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

async function researchSchool(schoolName: string): Promise<string> {
  console.log('Step 1: Researching school info for:', schoolName);

  const researchPrompt = `당신은 한국의 고등학교 입시 전문가입니다.
"${schoolName}"에 대해 면접 질문 생성에 필요한 구체적인 정보를 조사해주세요.

다음 내용을 포함해주세요:
1. 학교의 정식 명칭과 유형 (자사고, 외고, 국제고, 과학고 등)
2. 학교의 교육 철학과 핵심 가치
3. 학교의 독특한 프로그램이나 커리큘럼 (예: IB, ACG, 특별 교과 등)
4. 학교가 면접에서 중시하는 역량과 인재상
5. 학교의 위치, 기숙사 여부, 특별한 전통
6. 최근 입시 트렌드나 면접 경향
7. 학교의 유명한 졸업생이나 성과

가능한 한 구체적이고 정확한 정보를 제공해주세요. 알려진 학교라면 실제 정보를 바탕으로, 잘 알려지지 않은 학교라면 학교 유형을 추정하여 합리적인 정보를 제공해주세요.`;

  const content = await callAI([
    { role: 'system', content: '당신은 한국 고등학교 입시 전문가입니다. 구체적이고 정확한 학교 정보를 제공합니다.' },
    { role: 'user', content: researchPrompt }
  ], 0.3);

  console.log('School research completed, length:', content.length);
  return content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { school, customSchoolInfo, count = 30 } = await req.json();

    // Get base school info
    let schoolInfo;
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

    // Step 1: Research the school for detailed info
    const schoolResearch = await researchSchool(schoolInfo.name);

    // Step 2: Generate questions using the researched info
    console.log('Step 2: Generating questions with enriched school info for:', schoolInfo.name);

    const systemPrompt = `당신은 ${schoolInfo.name} 입학 면접 전문가입니다.
아래는 AI가 조사한 "${schoolInfo.name}"에 대한 상세 정보입니다. 이 정보를 충분히 반영하여 면접 질문을 생성하세요.

**AI 조사 학교 정보:**
${schoolResearch}

**추가 학교 정보:**
- 핵심 키워드: ${schoolInfo.keywords.join(', ')}
- 특성: ${schoolInfo.characteristics}
- 면접 중점 사항: ${schoolInfo.focus}

**질문 생성 원칙:**
1. 모든 질문은 "${schoolInfo.name}"에 맞게 작성 (예: "${schoolInfo.name}에 지원하게 된 동기는?")
2. 위 조사 결과에서 나온 학교의 구체적인 프로그램, 교육 철학, 인재상을 직접 반영한 질문 포함
3. 다음 카테고리별로 골고루 분배:
   - 지원 동기 및 학교 이해 (5~6개)
   - 학업 역량 및 학습 태도 (5~6개)
   - 인성 및 리더십 (5~6개)
   - 진로 계획 및 목표 (4~5개)
   - 시사/사회 문제 인식 (4~5개)
   - 학교 특색 관련 질문 (4~5개)

4. 각 질문은:
   - 중학생이 답변할 수 있는 수준
   - 구체적이고 명확한 표현
   - 학생의 생각과 경험을 이끌어낼 수 있는 개방형 질문

반드시 정확히 ${count}개의 질문을 생성하세요.
각 질문은 줄바꿈으로 구분해주세요. 번호는 붙이지 마세요.`;

    const content = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${schoolInfo.name} 면접을 위한 공통 질문 ${count}개를 생성해주세요.` }
    ], 0.8);

    // Parse questions from response
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
