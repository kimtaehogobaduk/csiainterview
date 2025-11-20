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

    const systemPrompt = `당신은 한국어 작문 전문가입니다. 자기소개서의 맞춤법, 문법, 그리고 문장 구조를 검토하여 개선 사항을 제안하세요.

검토 항목:
1. 맞춤법 오류
2. 문법 오류
3. 어색한 문장 표현
4. 중복 표현
5. 더 나은 표현 제안

각 제안사항은 다음 형식으로 작성:
- 원문: [문제가 있는 부분]
- 수정: [개선된 표현]
- 이유: [왜 수정이 필요한지]

문제가 없다면 "검토 완료. 문제가 발견되지 않았습니다."라고만 답변하세요.`;

    const userPrompt = `다음 자기소개서를 검토해주세요:

${essay}`;

    console.log('Checking essay...');

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
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API 오류: ${response.status}`);
    }

    const data = await response.json();
    const suggestions = data.choices[0].message.content;

    console.log('Essay check completed');

    return new Response(
      JSON.stringify({ suggestions }),
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
