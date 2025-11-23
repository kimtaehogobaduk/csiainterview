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
    const { audioBase64, question, type } = await req.json();

    if (!audioBase64 || !question) {
      return new Response(
        JSON.stringify({ error: 'audioBase64 and question are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Analyzing audio for question:', question);

    // Prepare the system prompt for audio analysis - optimized for speed
    const systemPrompt = `당신은 전문 면접 코치입니다. 사용자의 음성 답변을 간결하게 분석하여 다음 항목들을 평가해주세요:

1. **발음 및 명확성** (20점)
2. **말하기 속도** (20점)
3. **유창성** (20점)
4. **억양 및 강조** (20점)
5. **전체적인 전달력** (20점)

**출력 형식:**
각 항목별로 점수와 핵심 피드백을 간결하게 제공하고, 마지막에 "총점 XX점 / 100점" 형식으로 표시해주세요.
개선 방법도 간단명료하게 제시해주세요.`;

    const userPrompt = type === 'essay_based'
      ? `면접 질문: ${question}\n\n위 질문에 대한 답변 음성을 분석해주세요.`
      : `공통 면접 질문: ${question}\n\n위 질문에 대한 답변 음성을 분석해주세요.`;

    // Call Lovable AI Gateway with audio - optimized parameters for speed
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
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'audio',
                audio: audioBase64
              }
            ]
          }
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI Gateway error', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Stream the response back to the client
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Error in audio-analysis function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});