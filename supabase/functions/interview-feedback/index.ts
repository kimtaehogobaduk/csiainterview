import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// School information for customized prompts
const SCHOOL_INFO: Record<string, { name: string; focus: string }> = {
  cheongshim: {
    name: '청심국제고등학교',
    focus: 'ACG 교육 철학에 대한 이해, 글로벌 리더십, 기숙사 생활 적응력, 봉사정신'
  },
  hana: {
    name: '하나고등학교',
    focus: '자기주도학습 능력, 창의적 문제해결력, 하나정신(정직, 봉사, 창의)에 대한 이해'
  },
  sangsan: {
    name: '상산고등학교',
    focus: '수학·과학 탐구 능력, 논리적 사고력, 연구에 대한 열정, 학문적 호기심'
  },
  minsa: {
    name: '민족사관고등학교',
    focus: '민족정신과 정체성, 한국 문화에 대한 이해, 글로벌 시각, 리더십'
  },
  daewon: {
    name: '대원외국어고등학교',
    focus: '외국어 능력, 국제 감각, 문화적 다양성 이해, 의사소통 능력'
  },
  daejungsin: {
    name: '대전신성고등학교',
    focus: '과학·수학 탐구 능력, 논리적 사고력, 연구 열정, 자기주도학습'
  },
  seoulscience: {
    name: '서울과학고등학교',
    focus: '과학·수학 탐구 능력, 논리적 사고력, 연구에 대한 열정, 학문적 호기심'
  },
  hansungscience: {
    name: '한성과학고등학교',
    focus: '과학·수학 탐구 능력, 창의적 문제해결력, 연구 열정, 융합적 사고'
  },
  hwimun: {
    name: '휘문고등학교',
    focus: '자기주도학습 능력, 창의적 문제해결력, 인성, 진로 목표'
  },
  busan: {
    name: '부산국제고등학교',
    focus: 'IB 교육에 대한 이해, 국제적 감각, 비판적 사고, 학업 열정'
  },
  other: {
    name: '특목고/자사고/영재고/외국어고',
    focus: '자기주도학습 능력, 진로 목표, 학업 열정, 인성'
  }
};

// Input validation schema
const requestSchema = z.object({
  question: z.string().trim().min(1).max(1000),
  answer: z.string().trim().min(1).max(10000),
  essay: z.string().trim().max(20000).optional(),
  type: z.enum(['common', 'essay_based', 'common_audio', 'essay_based_audio']),
  isFollowUp: z.boolean().optional(),
  model: z.string().optional(),
  school: z.string().optional(),
  customSchoolInfo: z.object({
    name: z.string(),
    interviewFocus: z.string().optional(),
  }).optional(),
  audioMetrics: z.object({
    wordsPerMinute: z.number().optional(),
    wordCount: z.number().optional(),
    duration: z.number().optional()
  }).optional(),
  videoFrame: z.string().nullish()
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
        JSON.stringify({ error: '입력값이 올바르지 않습니다.', details: validationResult.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { question, answer, essay, type, isFollowUp, model, school, customSchoolInfo, audioMetrics, videoFrame } = validationResult.data;

    if (!question || !answer) {
      throw new Error('질문과 답변은 필수입니다.');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const CEREBRAS_API_KEY = Deno.env.get('CEREBRAS_API_KEY');
    if (!LOVABLE_API_KEY && !CEREBRAS_API_KEY) {
      throw new Error('API 키가 설정되지 않았습니다.');
    }

    // Get school-specific information
    let schoolInfo;
    if (school?.startsWith('custom:') && customSchoolInfo) {
      schoolInfo = {
        name: customSchoolInfo.name,
        focus: customSchoolInfo.interviewFocus || '자기주도학습 능력, 진로 목표, 학업 열정, 인성'
      };
    } else {
      schoolInfo = SCHOOL_INFO[school || 'cheongshim'] || SCHOOL_INFO['cheongshim'];
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'common' || type === 'common_audio') {
      systemPrompt = `당신은 ${schoolInfo.name}의 따뜻하고 격려적인 면접관입니다. 학생의 노력을 인정하며 100점 만점으로 공정하게 평가합니다.

${schoolInfo.name}에서 중요시하는 역량: ${schoolInfo.focus}

${isFollowUp ? `이것은 추가 질문에 대한 답변입니다. 학생이 이전 피드백을 바탕으로 더 깊이 있는 답변을 할 수 있도록 새로운 추가 질문을 1개만 제시해주세요.` : ''}

${videoFrame ? `비디오 분석도 포함되어 있습니다. 학생의 표정, 자세, 제스처, 눈 맞춤 등 비언어적 요소를 평가하여 추가 점수를 부여하세요.` : ''}

평가 기준 (더 관대하고 격려적인 기준):

1. 내용의 구체성과 진정성 (0-40점)
   - "없음", "넵", "예" 같은 극단적으로 불성실한 답변: 0-10점
   - 짧지만 성의를 보인 답변: 20-28점
   - 일반적이고 무난한 답변: 29-34점
   - 구체적 경험과 생각이 담긴 답변: 35-38점
   - 매우 구체적이고 진심이 느껴지는 답변: 39-40점

2. 논리성과 표현력 (0-40점)
   - 논리가 많이 부족하거나 모순됨: 10-20점
   - 기본적인 논리는 갖춤: 25-32점
   - 논리적이고 명확하게 표현함: 33-37점
   - 매우 논리적이고 설득력 있게 표현함: 38-40점

3. 발전 가능성 (0-20점)
   - 기본적인 성찰이 있음: 10-14점
   - 자기 성찰과 발전 의지가 보임: 15-17점
   - 깊은 통찰과 명확한 성장 방향이 있음: 18-20점

${videoFrame ? `
4. 비언어적 커뮤니케이션 (0-10점 가산점)
   - 표정: 자연스럽고 밝은 표정 유지 (0-3점)
   - 자세: 바른 자세와 자신감 있는 태도 (0-3점)
   - 제스처: 적절한 손동작과 몸짓 사용 (0-2점)
   - 눈 맞춤: 카메라를 향한 자연스러운 시선 (0-2점)

※ 비언어적 요소는 가산점이므로 총점이 110점까지 가능합니다.
` : ''}

점수 기준 (관대한 평가):
- 91-100점: 매우 우수한 답변
- 76-90점: 우수한 답변
- 60-75점: 양호하고 무난한 답변
- 50-59점: 노력이 보이는 답변
- 0-49점: 더 많은 노력이 필요한 답변

중요 원칙:
- "자소서에서 언급했듯이" 등 자소서를 참조하는 표현은 자연스러운 것이므로 감점하지 않음
- 모든 답변이 학교와 직접적으로 연관될 필요는 없음 (질문이 요구하지 않는 한)
- 학생의 진솔한 경험과 생각을 중시하고 노력을 인정
- 극단적으로 불성실한 답변("없음", "넵", "예")이 아니면 최소 50점 보장
- 성의있고 일반적인 답변은 60-75점대 부여
- 조금이라도 구체성이 있으면 70점대 중후반 부여
- 학생을 격려하되 개선점은 명확히 제시
- ${schoolInfo.name}의 특성과 연결되는 답변은 추가로 인정

===================
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
절대적으로 중요한 응답 형식 규칙:
===================
응답의 첫 줄은 반드시 정확히 다음 형식이어야 합니다:
"총점: 75점"

- 첫 단어는 반드시 "총점"
- 그 다음 콜론(:) 또는 공백
- 그 다음 숫자(0-110)
- 그 다음 "점"
- 이 첫 줄 앞에는 절대 다른 텍스트가 와서는 안됩니다
- 이 형식을 정확히 지키지 않으면 시스템이 점수를 인식하지 못합니다

올바른 예시:
총점: 75점

잘못된 예시:
- "이 답변의 총점은 75점입니다" (X)
- "평가 결과: 총점 75점" (X)  
- "75점" (X)
- 어떤 다른 형식도 안됩니다

===================
첫 줄 이후에는:
좋았던 점과 부족했던 점을 구체적으로 설명하세요.
${videoFrame ? '비언어적 커뮤니케이션에 대한 피드백도 포함하세요.' : ''}
${isFollowUp ? '마지막으로 개선 방향을 제시하고 새로운 추가 질문 1개를 던지세요.' : '마지막으로 개선 방향을 제시하고 1-2개 추가 질문을 던지세요.'}`;

      userPrompt = `질문: ${question}

답변: ${answer}
${type === 'common_audio' && audioMetrics ? `
발표 지표:
- 분당 단어 수: ${audioMetrics.wordsPerMinute || 'N/A'}
- 총 단어 수: ${audioMetrics.wordCount || 'N/A'}
- 발표 시간: ${audioMetrics.duration || 'N/A'}초

발표 품질에 대한 평가도 포함해주세요.` : ''}

이 답변에 대해 엄격하게 점수와 피드백 부탁드립니다.`;
    } else {
      systemPrompt = `당신은 ${schoolInfo.name}의 따뜻하고 격려적인 면접관입니다. 자기소개서를 읽고 학생의 노력을 인정하며 100점 만점으로 공정하게 평가합니다.

${schoolInfo.name}에서 중요시하는 역량: ${schoolInfo.focus}

${isFollowUp ? `이것은 추가 질문에 대한 답변입니다. 학생이 이전 피드백을 바탕으로 더 깊이 있는 답변을 할 수 있도록 새로운 추가 질문을 1개만 제시해주세요.` : ''}

${videoFrame ? `비디오 분석도 포함되어 있습니다. 학생의 표정, 자세, 제스처, 눈 맞춤 등 비언어적 요소를 평가하여 추가 점수를 부여하세요.` : ''}

평가 기준 (더 관대하고 격려적인 기준):

1. 자소서와의 연계성 (0-30점)
   - "자소서에서 언급했듯이"와 같은 표현은 자연스러운 참조이므로 감점하지 않음
   - 자소서 내용과 전혀 무관함: 10-15점
   - 자소서 내용을 부분적으로 활용: 18-24점
   - 자소서 내용을 잘 연결하여 답변: 25-30점

2. 답변의 구체성과 진정성 (0-40점)
   - "없음", "넵", "예" 같은 극단적으로 불성실한 답변: 0-10점
   - 짧지만 성의를 보인 답변: 20-28점
   - 일반적이고 무난한 답변: 29-34점
   - 구체적 경험과 생각이 담긴 답변: 35-38점
   - 매우 구체적이고 진심이 느껴지는 답변: 39-40점

3. 논리성과 설득력 (0-30점)
   - 논리가 많이 부족하거나 모순됨: 10-15점
   - 기본적인 논리는 갖춤: 18-23점
   - 논리적이고 설득력 있음: 24-27점
   - 매우 논리적이고 설득력 있음: 28-30점

${videoFrame ? `
4. 비언어적 커뮤니케이션 (0-10점 가산점)
   - 표정: 자연스럽고 밝은 표정 유지 (0-3점)
   - 자세: 바른 자세와 자신감 있는 태도 (0-3점)
   - 제스처: 적절한 손동작과 몸짓 사용 (0-2점)
   - 눈 맞춤: 카메라를 향한 자연스러운 시선 (0-2점)

※ 비언어적 요소는 가산점이므로 총점이 110점까지 가능합니다.
` : ''}

점수 기준 (관대한 평가):
- 91-100점: 매우 우수한 답변
- 76-90점: 우수한 답변
- 60-75점: 양호하고 무난한 답변
- 50-59점: 노력이 보이는 답변
- 0-49점: 더 많은 노력이 필요한 답변

중요 원칙:
- "자소서에서 언급했듯이" 등 자소서를 참조하는 표현은 자연스러운 것이므로 감점하지 않음
- 모든 답변이 학교와 직접적으로 연관될 필요는 없음 (질문이 요구하지 않는 한)
- 학생의 진솔한 경험과 생각을 중시하고 노력을 인정
- 극단적으로 불성실한 답변("없음", "넵", "예")이 아니면 최소 50점 보장
- 성의있고 일반적인 답변은 60-75점대 부여
- 조금이라도 구체성이 있으면 70점대 중후반 부여
- 학생을 격려하되 개선점은 명확히 제시
- ${schoolInfo.name}의 특성과 연결되는 답변은 추가로 인정

===================
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
절대적으로 중요한 응답 형식 규칙:
===================
응답의 첫 줄은 반드시 정확히 다음 형식이어야 합니다:
"총점: 75점"

- 첫 단어는 반드시 "총점"
- 그 다음 콜론(:) 또는 공백
- 그 다음 숫자(0-110)
- 그 다음 "점"
- 이 첫 줄 앞에는 절대 다른 텍스트가 와서는 안됩니다
- 이 형식을 정확히 지키지 않으면 시스템이 점수를 인식하지 못합니다

올바른 예시:
총점: 75점

잘못된 예시:
- "이 답변의 총점은 75점입니다" (X)
- "평가 결과: 총점 75점" (X)
- "75점" (X)
- 어떤 다른 형식도 안됩니다

===================
첫 줄 이후에는:
좋았던 점을 먼저 언급한 후, 개선할 점을 구체적이고 건설적으로 설명하세요.
${videoFrame ? '비언어적 커뮤니케이션에 대한 피드백도 포함하세요.' : ''}
${isFollowUp ? '마지막으로 발전 방향을 제시하고, 새로운 추가 질문 1개를 던지세요.' : '마지막으로 발전 방향을 제시하고, 1-2개의 추가 질문을 던지세요.'}

중요: 
- 학생의 노력과 잠재력을 인정하면서도, 개선이 필요한 부분은 명확하게 지적해주세요. 
- 격려적이면서도 구체적인 피드백을 제공하세요.`;

      userPrompt = `자기소개서:
${essay}

질문: ${question}

답변: ${answer}

이 답변에 대해 점수와 피드백 부탁드립니다.`;
    }

    console.log('Calling AI with prompt for school:', school);

    // Check if model supports temperature parameter
    const selectedModel = model || 'google/gemini-3.8-flash';
    const isNewOpenAIModel = selectedModel.includes('gpt-5') || 
                              selectedModel.includes('gpt-4.1') || 
                              selectedModel.includes('o3') || 
                              selectedModel.includes('o4');

    const requestBody: any = {
      model: selectedModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: videoFrame 
            ? [
                { type: 'text', text: userPrompt },
                { 
                  type: 'image_url', 
                  image_url: { url: videoFrame }
                }
              ]
            : userPrompt
        }
      ],
      stream: true
    };

    // Only add temperature for models that support it
    if (!isNewOpenAIModel) {
      requestBody.temperature = 0.7;
    }

    let response: Response;
    
    if (LOVABLE_API_KEY) {
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // Fallback to Cerebras on 402 (credits exhausted)
      if (response.status === 402 && CEREBRAS_API_KEY) {
        console.log('Lovable AI 크레딧 소진, Cerebras로 전환합니다...');
        const cerebrasBody = { ...requestBody, model: 'gpt-oss-120b' };
        response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cerebrasBody),
        });
      }
    } else {
      const cerebrasBody = { ...requestBody, model: 'gpt-oss-120b' };
      response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CEREBRAS_API_KEY!}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cerebrasBody),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API 오류: ${response.status}`);
    }

    // Stream response directly to client
    const stream = response.body;

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

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
