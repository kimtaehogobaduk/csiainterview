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

    const systemPrompt = `당신은 청심국제고등학교 면접관입니다. 자기소개서를 읽고 학생에게 물어볼 질문들을 생각하고 있습니다.

질문을 만들 때:
- 자소서에 쓴 경험이나 생각을 더 깊이 알아보기 위한 질문
- "왜 그렇게 생각했어?", "그때 어떻게 했어?" 같은 구체적인 질문
- 학생의 가치관, 동기, 진로를 자연스럽게 묻는 질문
- 우리 학교와 연결해서 물어볼 수 있는 질문

5-7개 정도의 질문을 만들되, 각 질문은 한 줄로 간단하게 작성하세요.
번호나 설명 없이 질문만 나열해주세요.`;

    const userPrompt = `이 자기소개서를 읽고 면접 질문을 만들어주세요:

${essay}

각 질문은 줄바꿈으로 구분해주세요.`;

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
