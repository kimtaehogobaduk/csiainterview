import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const requestSchema = z.object({
  essay: z.string().trim().min(10, '자기소개서는 최소 10자 이상이어야 합니다.').max(10000, '자기소개서는 최대 10,000자까지 입력 가능합니다.'),
  count: z.number().int().min(1).max(50).optional().default(10),
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
    
    const { essay, count } = validationResult.data;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('API 키가 설정되지 않았습니다.');
    }

    // Calculate question distribution based on count
    const baseQuestions = Math.floor(count * 0.6); // 60% from essay
    const expandedQuestions = count - baseQuestions; // 40% expanded topics

    const systemPrompt = `당신은 청심국제고등학교 면접관입니다. 자기소개서를 읽고 학생에게 물어볼 질문들을 생성합니다.

질문 생성 원칙:
1. 자소서 내용 기반 질문 (${baseQuestions}개):
   - 자소서에 쓴 경험이나 생각을 더 깊이 알아보는 질문
   - "왜 그렇게 생각했어?", "그때 어떻게 했어?" 같은 구체적인 질문
   - 학생의 가치관, 동기, 진로를 자연스럽게 묻는 질문

2. 관련 주제 확장 질문 (${expandedQuestions}개):
   - 자소서에서 다룬 내용을 보고 면접관이 추가로 궁금해할 만한 질문
   - 예: 수학/과학 공부법을 썼다면 → 국어, 영어, 사회 등 다른 과목의 학습 방식 질문
   - 예: 특정 활동을 언급했다면 → 관련된 다른 활동이나 경험에 대한 질문
   - 자소서에 없지만 학생의 전반적인 능력과 태도를 파악할 수 있는 질문

총 ${count}개의 질문을 만들되, 각 질문은 한 줄로 간단하게 작성하세요.
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
      .slice(0, count);

    // Shuffle questions randomly using Fisher-Yates algorithm
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }

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
