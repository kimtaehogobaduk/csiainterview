import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const requestSchema = z.object({
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(2000),
  essay: z.string().trim().max(10000).optional(),
  type: z.enum(['common', 'essay_based']),
  isFollowUp: z.boolean().optional()
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
    
    const { question, answer, essay, type, isFollowUp } = validationResult.data;

    if (!question || !answer) {
      throw new Error('질문과 답변은 필수입니다.');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('API 키가 설정되지 않았습니다.');
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'common') {
      systemPrompt = `당신은 청심국제고등학교의 엄격한 면접관입니다. 학생의 답변을 100점 만점으로 매우 엄격하게 평가합니다.

${isFollowUp ? `이것은 추가 질문에 대한 답변입니다. 학생이 이전 피드백을 바탕으로 더 깊이 있는 답변을 할 수 있도록 새로운 추가 질문을 1개만 제시해주세요.` : ''}

평가 기준 (매우 엄격하게 적용):
1. 내용의 구체성과 진정성 (0-25점)
   - "없음", "넵", "예" 같은 성의 없는 답변: 0-3점
   - 한두 문장 수준의 불성실한 답변: 4-8점
   - 질문과 관계없는 엉뚱한 답변: 0-5점
   - 피상적이고 일반적인 답변: 9-15점
   - 구체적 경험이 있는 답변: 16-20점
   - 매우 구체적이고 진심이 느껴지는 답변: 21-25점

2. 논리성과 설득력 (0-25점)
   - 논리가 전혀 없거나 모순됨: 0-8점
   - 논리가 약하고 설득력 부족: 9-15점
   - 기본적인 논리는 갖춤: 16-20점
   - 매우 논리적이고 설득력 있음: 21-25점

3. 학교에 대한 이해도 (0-25점)
   - 학교를 전혀 이해하지 못함: 0-8점
   - 피상적인 이해: 9-15점
   - 기본적인 이해: 16-20점
   - 학교 교육철학을 깊이 이해함: 21-25점

4. 의사소통 능력 (0-25점)
   - 불명확하거나 이해하기 어려움: 0-8점
   - 기본적인 의사소통은 가능: 9-15점
   - 명확하게 표현함: 16-20점
   - 매우 명확하고 효과적으로 소통함: 21-25점

점수 기준 (매우 엄격하게):
- 90-100점: 거의 완벽하고 모범적인 답변 (매우 드물게)
- 80-89점: 매우 우수하고 잘 준비된 답변
- 70-79점: 양호하고 충실한 답변
- 60-69점: 보통 수준의 답변
- 50-59점: 부족한 부분이 많은 답변
- 40-49점: 상당히 부족하고 준비 미흡
- 30-39점: 매우 부족한 답변
- 0-29점: 성의 없거나 질문과 무관한 답변

중요: 
- "없음", "넵", "예", "모르겠어요" 같은 답변은 반드시 0-10점 처리
- 한두 문장으로 대충 답한 경우도 20점 이하
- 질문과 무관한 내용은 즉시 낮은 점수
- 정말 잘한 경우에만 높은 점수를 주세요

피드백 형식:
먼저 "총점 XX점" 형식으로 점수를 명시하고,
좋았던 점과 부족했던 점을 구체적으로 설명하세요.
${isFollowUp ? '마지막으로 개선 방향을 제시하고 새로운 추가 질문 1개를 던지세요.' : '마지막으로 개선 방향을 제시하고 1-2개 추가 질문을 던지세요.'}`;

      userPrompt = `질문: ${question}

답변: ${answer}

이 답변에 대해 엄격하게 점수와 피드백 부탁드립니다.`;
    } else {
      systemPrompt = `당신은 청심국제고등학교의 엄격하고 공정한 면접관입니다. 자기소개서를 읽고 학생의 면접 답변을 100점 만점으로 객관적으로 평가합니다.

${isFollowUp ? `이것은 추가 질문에 대한 답변입니다. 학생이 이전 피드백을 바탕으로 더 깊이 있는 답변을 할 수 있도록 새로운 추가 질문을 1개만 제시해주세요.` : ''}

평가 기준 (각 항목 0-20점, 매우 엄격하게):
1. 자소서 내용과의 일치성 (0-20점)
   - 완전히 모순되거나 관련 없음: 0-5점
   - 부분적으로만 관련됨: 6-12점
   - 자소서 내용과 잘 연결됨: 13-17점
   - 자소서를 깊이 있게 확장하여 답변: 18-20점

2. 구체성과 진정성 (0-20점)
   - 추상적이고 피상적인 답변: 0-5점
   - 일반적인 수준의 답변: 6-12점
   - 구체적인 예시가 있는 답변: 13-17점
   - 매우 구체적이고 진심이 느껴지는 답변: 18-20점

3. 논리성과 설득력 (0-20점)
   - 논리가 없거나 모순됨: 0-5점
   - 논리가 약하고 설득력 부족: 6-12점
   - 기본적인 논리는 갖춤: 13-17점
   - 매우 논리적이고 설득력 있음: 18-20점

4. 학교에 대한 이해도 (0-20점)
   - 학교를 전혀 이해하지 못함: 0-5점
   - 피상적인 이해: 6-12점
   - 기본적인 이해: 13-17점
   - 학교 교육철학을 깊이 이해함: 18-20점

5. 의사소통 능력 (0-20점)
   - 불명확하거나 이해하기 어려움: 0-5점
   - 기본적인 의사소통은 가능: 6-12점
   - 명확하게 표현함: 13-17점
   - 매우 명확하고 효과적으로 소통함: 18-20점

점수 기준 (반드시 준수):
- 90-100점: 거의 완벽한 답변. 모든 항목에서 뛰어남. 극히 드묾.
- 70-89점: 전반적으로 좋으나 개선 여지가 있음
- 50-69점: 평범하거나 부족한 부분이 많음
- 30-49점: 상당히 부족하고 준비가 미흡함
- 0-29점: 매우 부족하거나 질문과 맞지 않음

피드백 형식:
먼저 "총점 XX점" 형식으로 점수를 명시하고,
각 항목별로 어떤 점이 좋았고 무엇이 부족했는지 구체적으로 설명하세요.
${isFollowUp ? '마지막으로 개선이 필요한 부분을 명확히 지적하고, 새로운 추가 질문 1개를 던지세요.' : '마지막으로 개선이 필요한 부분을 명확히 지적하고, 1-2개의 추가 질문을 던지세요.'}

중요: 점수에 인색하게 대하세요. 정말 잘한 경우에만 높은 점수를 주고, 부족하면 과감하게 낮은 점수를 주어야 학생이 발전할 수 있습니다.`;

      userPrompt = `자기소개서:
${essay}

질문: ${question}

답변: ${answer}

이 답변에 대해 점수와 피드백 부탁드립니다.`;
    }

    console.log('Calling AI with prompt...');

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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API 오류: ${response.status}`);
    }

    const data = await response.json();
    const feedback = data.choices[0].message.content;

    // Extract score from feedback (both common and essay-based)
    let score = null;
    const scoreMatch = feedback.match(/총점[:\s]*(\d+)/);
    if (scoreMatch) {
      score = parseInt(scoreMatch[1]);
    }

    console.log('Feedback generated successfully');

    return new Response(
      JSON.stringify({ feedback, score }),
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
