import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// School information for customized prompts
const SCHOOL_INFO: Record<string, { name: string; keywords: string[]; focus: string }> = {
  cheongshim: {
    name: '청심국제고등학교',
    keywords: ['ACG 교육', '글로벌 리더', '기숙사', '가평', '건학 이념'],
    focus: 'ACG 교육 철학에 대한 이해, 글로벌 리더십, 기숙사 생활 적응력, 봉사정신'
  },
  hana: {
    name: '하나고등학교',
    keywords: ['자기주도학습', '창의융합', '하나정신', '전인교육'],
    focus: '자기주도학습 능력, 창의적 문제해결력, 하나정신(정직, 봉사, 창의)에 대한 이해'
  },
  sangsan: {
    name: '상산고등학교',
    keywords: ['과학영재', '수학과학', '연구역량', 'STEM'],
    focus: '수학·과학 탐구 능력, 논리적 사고력, 연구에 대한 열정, 학문적 호기심'
  },
  minsa: {
    name: '민족사관고등학교',
    keywords: ['민족정신', '한국학', '전통문화', '글로벌'],
    focus: '민족정신과 정체성, 한국 문화에 대한 이해, 글로벌 시각, 리더십'
  },
  daewon: {
    name: '대원외국어고등학교',
    keywords: ['외국어 교육', '국제화', '어학 역량', '글로벌 인재'],
    focus: '외국어 능력, 국제 감각, 문화적 다양성 이해, 의사소통 능력'
  },
  daeil: {
    name: '대일외국어고등학교',
    keywords: ['외국어', '인성교육', '글로벌 역량'],
    focus: '외국어 학습 경험, 인성, 국제 이해, 자기주도성'
  },
  myungduk: {
    name: '명덕외국어고등학교',
    keywords: ['외국어', '창의인재', '글로벌 소양'],
    focus: '창의성, 외국어 능력, 글로벌 마인드, 학업 열정'
  },
  gyeonggi: {
    name: '경기외국어고등학교',
    keywords: ['외국어', '국제화', '다문화 이해'],
    focus: '외국어 학습 동기, 국제 이슈 관심, 다문화 이해, 학업 계획'
  },
  busan: {
    name: '부산국제고등학교',
    keywords: ['국제화', 'IB 과정', '글로벌 리더'],
    focus: 'IB 교육에 대한 이해, 국제적 감각, 비판적 사고, 학업 열정'
  },
  incheon: {
    name: '인천외국어고등학교',
    keywords: ['외국어', '국제교류', '어학 역량'],
    focus: '외국어 능력, 국제 감각, 자기주도학습, 진로 계획'
  },
  other: {
    name: '자율형 사립고/외국어고',
    keywords: ['자기주도학습', '창의성', '리더십', '학업 역량'],
    focus: '자기주도학습 능력, 진로 목표, 학업 열정, 인성'
  }
};

// Input validation schema
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    
    // Validate input
    const validationResult = requestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: validationResult.error.issues[0].message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { essay, count, school, customSchoolInfo } = validationResult.data;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const CEREBRAS_API_KEY = Deno.env.get('CEREBRAS_API_KEY');
    if (!LOVABLE_API_KEY && !CEREBRAS_API_KEY) {
      throw new Error('API 키가 설정되지 않았습니다.');
    }

    // Get school-specific information
    let schoolInfo;
    if (school.startsWith('custom:') && customSchoolInfo) {
      schoolInfo = {
        name: customSchoolInfo.name,
        keywords: customSchoolInfo.keywords || ['자기주도학습', '창의성', '리더십'],
        focus: customSchoolInfo.interviewFocus || '자기주도학습 능력, 진로 목표, 학업 열정, 인성'
      };
    } else {
      schoolInfo = SCHOOL_INFO[school] || SCHOOL_INFO['cheongshim'];
    }

    // Calculate question distribution based on count
    const baseQuestions = Math.floor(count * 0.6); // 60% from essay
    const expandedQuestions = count - baseQuestions; // 40% expanded topics

    const systemPrompt = `당신은 ${schoolInfo.name} 면접관입니다. 자기소개서를 읽고 학생에게 물어볼 질문들을 생성합니다.

학교 특성:
- 핵심 키워드: ${schoolInfo.keywords.join(', ')}
- 면접 중점 사항: ${schoolInfo.focus}

질문 생성 원칙:
1. 자소서 내용 기반 질문 (${baseQuestions}개):
   - 자소서에 쓴 경험이나 생각을 더 깊이 알아보는 질문
   - "왜 그렇게 생각했어?", "그때 어떻게 했어?" 같은 구체적인 질문
   - 학생의 가치관, 동기, 진로를 자연스럽게 묻는 질문
   - ${schoolInfo.name}의 특성과 연결된 질문 포함

2. 관련 주제 확장 질문 (${expandedQuestions}개):
   - 자소서에서 다룬 내용을 보고 면접관이 추가로 궁금해할 만한 질문
   - 예: 수학/과학 공부법을 썼다면 → 국어, 영어, 사회 등 다른 과목의 학습 방식 질문
   - 예: 특정 활동을 언급했다면 → 관련된 다른 활동이나 경험에 대한 질문
   - ${schoolInfo.name}에서 중요시하는 역량(${schoolInfo.focus})과 관련된 질문

총 ${count}개의 질문을 만들되, 각 질문은 한 줄로 간단하게 작성하세요.
번호나 설명 없이 질문만 나열해주세요.`;

    const userPrompt = `이 자기소개서를 읽고 ${schoolInfo.name} 면접 질문을 만들어주세요:

${essay}

각 질문은 줄바꿈으로 구분해주세요.`;

    console.log('Calling AI to generate questions for school:', school);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API 오류: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse questions from response
    const questions = content
      .split('\n')
      .map((q: string) => q.trim())
      .filter((q: string) => q.length > 10 && !q.match(/^\d+\.|^[-*]/))
      .slice(0, count);

    // Shuffle questions randomly using Fisher-Yates algorithm
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    console.log('Generated questions:', questions);

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
