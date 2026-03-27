import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { existingQuestions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const CEREBRAS_API_KEY = Deno.env.get('CEREBRAS_API_KEY');
    
    if (!LOVABLE_API_KEY && !CEREBRAS_API_KEY) {
      throw new Error('API 키가 설정되지 않았습니다.');
    }

    console.log('Generating additional questions based on existing ones...');

    const systemPrompt = `당신은 청심국제고등학교 입학 면접 문항을 개발하는 전문가입니다. 
기존 150개의 면접 질문을 참고하여, 유사한 스타일과 난이도로 200개의 새로운 면접 질문을 생성해주세요.

질문은 다음 카테고리를 포함해야 합니다:
- 학교 지원 동기 및 이해
- 학업 역량 및 학습 태도
- 글로벌 역량 및 국제 감각
- 인성 및 리더십
- 기숙사 생활 적응력
- 진로 계획 및 목표
- 시사 및 사회 문제 인식

각 질문은:
1. 중학생이 답변할 수 있는 수준이어야 합니다
2. 구체적이고 명확해야 합니다
3. 학생의 생각과 경험을 이끌어낼 수 있어야 합니다
4. 기존 질문과 중복되지 않아야 합니다

반드시 정확히 200개의 질문을 JSON 배열 형식으로 반환해주세요:
["질문1", "질문2", ..., "질문200"]`;

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
          { 
            role: 'user', 
            content: `기존 질문 목록:\n${JSON.stringify(existingQuestions, null, 2)}\n\n이를 참고하여 200개의 새로운 질문을 생성해주세요.` 
          }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to extract questions from AI response');
    }
    
    const newQuestions = JSON.parse(jsonMatch[0]);
    console.log(`Generated ${newQuestions.length} new questions`);

    return new Response(
      JSON.stringify({ questions: newQuestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in expand-questions function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
