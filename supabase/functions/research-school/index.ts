import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  schoolName: z.string().trim().min(2).max(100),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    
    const validationResult = requestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: '학교 이름을 입력해주세요.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { schoolName } = validationResult.data;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const CEREBRAS_API_KEY = Deno.env.get('CEREBRAS_API_KEY');
    if (!LOVABLE_API_KEY && !CEREBRAS_API_KEY) {
      throw new Error('API 키가 설정되지 않았습니다.');
    }

    const systemPrompt = `당신은 한국의 고등학교 입시 전문가입니다. 사용자가 입력한 학교에 대한 정보를 분석하여 면접 준비에 필요한 정보를 제공합니다.

주어진 학교명을 분석하여 다음 형식의 JSON으로 응답해주세요:

{
  "name": "학교 정식 명칭",
  "type": "학교 유형 (예: 자율형사립고, 외국어고, 국제고, 과학고, 영재학교, 일반고 등)",
  "keywords": ["핵심 키워드 5개"],
  "characteristics": "학교의 특징과 교육 철학에 대한 2-3문장 설명",
  "interviewFocus": "면접에서 중요시하는 역량과 평가 기준 (예: 자기주도학습, 창의성, 리더십 등)",
  "commonQuestions": [
    "이 학교 면접에서 자주 나오는 질문 10개"
  ]
}

알려진 학교라면 실제 정보를 바탕으로, 알려지지 않은 학교라면 학교 유형을 추정하여 합리적인 정보를 생성해주세요.
반드시 유효한 JSON 형식으로만 응답하세요.`;

    const userPrompt = `"${schoolName}" 학교에 대한 면접 준비 정보를 JSON 형식으로 제공해주세요.`;

    console.log('Researching school:', schoolName);

    const requestBody = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5,
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
          body: JSON.stringify({ ...requestBody, model: 'llama-4-scout-17b-16e-instruct' }),
        });
      }
    } else {
      response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CEREBRAS_API_KEY!}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...requestBody, model: 'llama-4-scout-17b-16e-instruct' }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API 오류: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse JSON from response
    let schoolInfo;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      schoolInfo = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse school info JSON:', content);
      // Return default structure if parsing fails
      schoolInfo = {
        name: schoolName,
        type: '고등학교',
        keywords: ['자기주도학습', '창의성', '리더십', '학업 역량', '인성'],
        characteristics: `${schoolName}은(는) 학생들의 잠재력을 키우고 미래 인재를 양성하는 교육을 목표로 합니다.`,
        interviewFocus: '자기주도학습 능력, 진로 목표, 학업 열정, 인성',
        commonQuestions: [
          `${schoolName}에 지원하게 된 동기는 무엇인가요?`,
          '본인의 장점과 단점을 말해주세요.',
          '학교생활 중 가장 기억에 남는 경험은?',
          '진로 계획과 꿈에 대해 말해주세요.',
          '자기주도학습 경험을 구체적으로 말해주세요.',
          '어려운 상황을 극복한 경험이 있나요?',
          '봉사활동이나 리더십 경험을 말해주세요.',
          '독서 경험 중 가장 인상 깊었던 책은?',
          '우리 학교에서 가장 하고 싶은 활동은?',
          '10년 후 본인의 모습을 상상해 말해주세요.'
        ]
      };
    }

    console.log('School info generated:', schoolInfo.name);

    return new Response(
      JSON.stringify({ schoolInfo }),
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
