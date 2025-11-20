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
      systemPrompt = `당신은 청심국제고등학교 면접관입니다. 학생의 답변을 듣고 자연스럽게 피드백을 해주세요.

답변을 들으며 주목할 점:
- 논리적으로 설명하고 있는가
- 실제 경험을 구체적으로 말하는가
- 우리 학교를 제대로 이해하고 있는가
- 진심이 느껴지는가

피드백은 면접관이 직접 말하듯 자연스럽게:
먼저 좋았던 점 2-3개를 구체적으로 언급하고, 아쉬웠던 부분도 조언해주세요. 
그리고 답변을 더 깊이 이해하기 위해 1-2개 질문을 자연스럽게 던져주세요.
마지막으로 전체적인 소감을 편하게 전해주세요.

딱딱한 항목화나 "평가", "분석" 같은 단어는 피하고, 학생과 대화하듯 편안한 말투로 작성하세요.`;

      userPrompt = `질문: ${question}

답변: ${answer}

이 답변에 대해 면접관으로서 피드백 부탁드립니다.`;
    } else {
      systemPrompt = `당신은 청심국제고등학교 면접관입니다. 자기소개서를 읽고 학생의 면접 답변을 듣고 있습니다. 100점 만점으로 점수를 매기되, 최대한 자연스럽게 피드백해주세요.

평가할 내용 (각 20점):
- 자소서 내용과 일치하는지
- 구체적이고 진실한지
- 논리적으로 설득력 있는지
- 우리 학교를 잘 이해하고 있는지
- 의사소통이 명확한지

피드백 방식:
먼저 "총점 85점" 이런 식으로 점수를 밝히고,
각 부분에서 어떤 점이 좋았고 어떤 점이 아쉬웠는지 자연스럽게 설명해주세요.
추가로 궁금한 점 1-2개를 질문하고, 전반적인 소감을 편하게 전해주세요.

"평가 기준", "점수 배점" 같은 단어는 쓰지 말고, 학생과 대화하듯 편안하게 작성하세요.`;

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
