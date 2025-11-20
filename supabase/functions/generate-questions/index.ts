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
    const { essay } = await req.json();

    if (!essay) {
      throw new Error('자기소개서는 필수입니다.');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('API 키가 설정되지 않았습니다.');
    }

    const systemPrompt = `당신은 청심국제고등학교 입시 면접 전문가입니다. 학생의 자기소개서를 분석하여 심층적인 면접 질문을 생성하세요.

질문 생성 가이드:
1. 자기소개서의 핵심 내용을 파악하고, 그에 대한 구체적인 질문 만들기
2. 학생의 경험, 가치관, 동기 등을 심층적으로 탐색하는 질문
3. "왜?", "어떻게?" 등을 통해 학생의 사고 과정을 파악할 수 있는 질문
4. 청심국제고등학교의 교육 철학과 연결되는 질문
5. 학생의 진로와 미래 계획에 대한 질문

총 5-7개의 질문을 생성하되, 각 질문은 한 줄로 간결하게 작성하세요.
질문만 나열하고, 번호나 설명은 붙이지 마세요.`;

    const userPrompt = `다음 자기소개서를 분석하여 면접 질문을 생성해주세요:

${essay}

각 질문은 줄바꿈으로 구분하여 제시해주세요.`;

    console.log('Calling AI to generate questions...');

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
      .slice(0, 7);

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
