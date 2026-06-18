import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const requestSchema = z.object({
  essay: z.string().trim().min(10, '자기소개서는 최소 10자 이상이어야 합니다.').max(10000, '자기소개서는 최대 10,000자까지 입력 가능합니다.'),
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
    
    const { essay } = validationResult.data;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const CEREBRAS_API_KEY = Deno.env.get('CEREBRAS_API_KEY');
    if (!LOVABLE_API_KEY && !CEREBRAS_API_KEY) {
      throw new Error('API 키가 설정되지 않았습니다.');
    }

    const systemPrompt = `당신은 선생님입니다. 학생의 자기소개서를 읽고 자연스럽게 첨삭해주세요.

확인할 것:
- 맞춤법이나 문법 실수
- 어색하거나 중복되는 표현
- 더 좋게 고칠 수 있는 문장

각 제안은 편하게:
원래 문장을 보여주고, 이렇게 고치면 좋겠다고 말하고, 왜 그런지 간단히 설명해주세요.

문제가 없으면 "잘 작성했네요. 특별히 고칠 부분이 없어요."라고만 해주세요.`;

    const userPrompt = `이 자기소개서 좀 봐주세요:

${essay}`;

    console.log('Checking essay...');

    const requestBody = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
    };

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

      if (response.status === 402 && CEREBRAS_API_KEY) {
        console.log('Lovable AI 크레딧 소진, Cerebras로 전환합니다...');
        response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...requestBody, model: 'gpt-oss-120b' }),
        });
      }
    } else {
      response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CEREBRAS_API_KEY!}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...requestBody, model: 'gpt-oss-120b' }),
      });
    }

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
