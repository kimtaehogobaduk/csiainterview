import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const requestSchema = z.object({
  question: z.string().trim().min(1).max(1000),
  answer: z.string().trim().min(1).max(10000),
  essay: z.string().trim().max(20000).optional(),
  type: z.enum(['common', 'essay_based', 'common_audio']),
  isFollowUp: z.boolean().optional(),
  model: z.string().optional(),
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
    
    const { question, answer, essay, type, isFollowUp, model, audioMetrics, videoFrame } = validationResult.data;

    if (!question || !answer) {
      throw new Error('질문과 답변은 필수입니다.');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('API 키가 설정되지 않았습니다.');
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'common' || type === 'common_audio') {
      systemPrompt = `당신은 청심국제고등학교의 면접관입니다. 학생의 답변을 100점 만점으로 공정하고 균형있게 평가합니다.

${isFollowUp ? `이것은 추가 질문에 대한 답변입니다. 학생이 이전 피드백을 바탕으로 더 깊이 있는 답변을 할 수 있도록 새로운 추가 질문을 1개만 제시해주세요.` : ''}

${videoFrame ? `비디오 분석도 포함되어 있습니다. 학생의 표정, 자세, 제스처, 눈 맞춤 등 비언어적 요소를 평가하여 추가 점수를 부여하세요.` : ''}

평가 기준:
1. 내용의 구체성과 진정성 (0-40점)
   - "없음", "넵", "예" 같은 성의 없는 답변: 0-5점
   - 한두 문장 수준의 불성실한 답변: 6-15점
   - 일반적이지만 성의있는 답변: 16-25점
   - 구체적 경험과 생각이 담긴 답변: 26-33점
   - 매우 구체적이고 진심이 느껴지는 답변: 34-40점

2. 논리성과 표현력 (0-40점)
   - 논리가 부족하거나 모순됨: 0-15점
   - 기본적인 논리는 갖춤: 16-25점
   - 논리적이고 명확하게 표현함: 26-33점
   - 매우 논리적이고 설득력 있게 표현함: 34-40점

3. 발전 가능성 (0-20점)
   - 성장 의지나 통찰이 부족함: 0-8점
   - 기본적인 성찰이 있음: 9-13점
   - 자기 성찰과 발전 의지가 보임: 14-17점
   - 깊은 통찰과 명확한 성장 방향이 있음: 18-20점

${videoFrame ? `
4. 비언어적 커뮤니케이션 (0-10점 가산점)
   - 표정: 자연스럽고 밝은 표정 유지 (0-3점)
   - 자세: 바른 자세와 자신감 있는 태도 (0-3점)
   - 제스처: 적절한 손동작과 몸짓 사용 (0-2점)
   - 눈 맞춤: 카메라를 향한 자연스러운 시선 (0-2점)

※ 비언어적 요소는 가산점이므로 총점이 110점까지 가능합니다.
` : ''}

점수 기준:
- 85-100점: 매우 우수한 답변
- 70-84점: 우수한 답변
- 55-69점: 양호한 답변
- 40-54점: 보통 수준의 답변
- 0-39점: 개선이 필요한 답변

중요 원칙:
- "자소서에서 언급했듯이" 등 자소서를 참조하는 표현은 자연스러운 것이므로 감점하지 않음
- 모든 답변이 학교와 직접적으로 연관될 필요는 없음 (질문이 요구하지 않는 한)
- 학생의 진솔한 경험과 생각을 중시
- "없음", "넵", "예" 같은 극단적으로 불성실한 답변만 낮은 점수 부여
- 성의있게 답변한 경우 최소 40점 이상 부여
- 일반적인 답변도 논리와 진정성이 있다면 55-70점대 부여

피드백 형식 (반드시 준수):
!!!중요!!! 응답은 반드시 "총점 XX점" 형식으로 시작해야 합니다. 
예시: "총점 75점"
첫 줄 첫 단어는 무조건 "총점"이어야 하며, 그 뒤에 숫자와 "점"이 와야 합니다.
다른 어떤 텍스트도 "총점 XX점" 앞에 올 수 없습니다.

그 다음 좋았던 점과 부족했던 점을 구체적으로 설명하세요.
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
      systemPrompt = `당신은 청심국제고등학교의 공정하고 격려적인 면접관입니다. 자기소개서를 읽고 학생의 면접 답변을 100점 만점으로 객관적으로 평가합니다.

${isFollowUp ? `이것은 추가 질문에 대한 답변입니다. 학생이 이전 피드백을 바탕으로 더 깊이 있는 답변을 할 수 있도록 새로운 추가 질문을 1개만 제시해주세요.` : ''}

${videoFrame ? `비디오 분석도 포함되어 있습니다. 학생의 표정, 자세, 제스처, 눈 맞춤 등 비언어적 요소를 평가하여 추가 점수를 부여하세요.` : ''}

평가 기준:
1. 자소서와의 연계성 (0-30점)
   - "자소서에서 언급했듯이"와 같은 표현은 자연스러운 참조이므로 감점하지 않음
   - 자소서 내용과 전혀 무관함: 0-10점
   - 자소서 내용을 부분적으로 활용: 11-20점
   - 자소서 내용을 잘 연결하여 답변: 21-30점

2. 답변의 구체성과 진정성 (0-40점)
   - "없음", "넵", "예" 같은 성의 없는 답변: 0-5점
   - 한두 문장 수준의 불성실한 답변: 6-15점
   - 일반적이지만 성의있는 답변: 16-25점
   - 구체적 경험과 생각이 담긴 답변: 26-33점
   - 매우 구체적이고 진심이 느껴지는 답변: 34-40점

3. 논리성과 설득력 (0-30점)
   - 논리가 부족하거나 모순됨: 0-12점
   - 기본적인 논리는 갖춤: 13-20점
   - 논리적이고 설득력 있음: 21-26점
   - 매우 논리적이고 설득력 있음: 27-30점

${videoFrame ? `
4. 비언어적 커뮤니케이션 (0-10점 가산점)
   - 표정: 자연스럽고 밝은 표정 유지 (0-3점)
   - 자세: 바른 자세와 자신감 있는 태도 (0-3점)
   - 제스처: 적절한 손동작과 몸짓 사용 (0-2점)
   - 눈 맞춤: 카메라를 향한 자연스러운 시선 (0-2점)

※ 비언어적 요소는 가산점이므로 총점이 110점까지 가능합니다.
` : ''}

점수 기준:
- 85-100점: 매우 우수한 답변
- 70-84점: 우수한 답변
- 55-69점: 양호한 답변
- 40-54점: 보통 수준의 답변
- 0-39점: 개선이 필요한 답변

중요 원칙:
- "자소서에서 언급했듯이" 등 자소서를 참조하는 표현은 자연스러운 것이므로 감점하지 않음
- 모든 답변이 학교와 직접적으로 연관될 필요는 없음 (질문이 요구하지 않는 한)
- 학생의 진솔한 경험과 생각을 중시
- 성의있게 답변한 경우 최소 40점 이상 부여
- 일반적인 답변도 논리와 진정성이 있다면 55-70점대 부여

피드백 형식 (반드시 준수):
!!!중요!!! 응답은 반드시 "총점 XX점" 형식으로 시작해야 합니다.
예시: "총점 82점"
첫 줄 첫 단어는 무조건 "총점"이어야 하며, 그 뒤에 숫자와 "점"이 와야 합니다.
다른 어떤 텍스트도 "총점 XX점" 앞에 올 수 없습니다.

그 다음 좋았던 점을 먼저 언급한 후, 개선할 점을 구체적이고 건설적으로 설명하세요.
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

    console.log('Calling AI with prompt...');

    // Check if model supports temperature parameter
    const selectedModel = model || 'google/gemini-2.5-flash';
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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

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
