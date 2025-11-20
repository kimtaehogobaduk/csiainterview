import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, answer, essay, type } = await req.json();

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
      systemPrompt = `당신은 청심국제고등학교 입시 면접 전문가입니다. 학생의 답변을 평가하고 건설적인 피드백을 제공하세요.

평가 기준:
1. 답변의 논리성과 일관성
2. 구체적인 사례 제시
3. 학교에 대한 이해도
4. 진정성과 열정
5. 의사소통 능력

피드백 형식:
- 긍정적인 점 2-3가지
- 개선이 필요한 점 2-3가지
- 추가 질문 1-2개 (더 깊이 있는 답변을 유도)
- 전반적인 평가와 조언`;

      userPrompt = `면접 질문: ${question}

학생 답변: ${answer}

위 답변에 대한 상세한 피드백을 한국어로 제공해주세요.`;
    } else {
      systemPrompt = `당신은 청심국제고등학교 입시 면접 전문가입니다. 학생의 자기소개서를 바탕으로 한 면접 답변을 평가하고, 100점 만점으로 점수를 부여하세요.

평가 기준 (각 20점):
1. 자기소개서와의 일관성 (20점)
2. 답변의 구체성과 진정성 (20점)
3. 논리적 전개와 설득력 (20점)
4. 학교에 대한 이해도 (20점)
5. 의사소통 능력과 표현력 (20점)

피드백 형식:
- 각 평가 기준별 점수와 이유
- 총점 (100점 만점)
- 긍정적인 점
- 개선이 필요한 점
- 추가 질문 1-2개`;

      userPrompt = `자기소개서:
${essay}

면접 질문: ${question}

학생 답변: ${answer}

위 답변에 대한 상세한 평가와 점수를 한국어로 제공해주세요.`;
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

    // Extract score for essay-based interviews
    let score = null;
    if (type === 'essay_based') {
      const scoreMatch = feedback.match(/총점[:\s]*(\d+)/);
      if (scoreMatch) {
        score = parseInt(scoreMatch[1]);
      }
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
