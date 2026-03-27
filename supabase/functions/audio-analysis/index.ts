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
    const { audioBase64, question, type } = await req.json();

    if (!audioBase64 || !question) {
      return new Response(
        JSON.stringify({ error: 'audioBase64 and question are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const CEREBRAS_API_KEY = Deno.env.get('CEREBRAS_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    if (!LOVABLE_API_KEY && !CEREBRAS_API_KEY) {
      throw new Error('AI API 키가 설정되지 않았습니다.');
    }

    console.log('Analyzing audio for question:', question);

    // Step 1: Convert base64 audio to binary
    const binaryAudio = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    
    // Step 2: Transcribe audio using OpenAI Whisper with timestamps
    const formData = new FormData();
    const audioBlob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'word');

    console.log('Calling Whisper API for transcription...');
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API error:', whisperResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Whisper API error', details: errorText }),
        { status: whisperResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transcription = await whisperResponse.json();
    console.log('Transcription received:', transcription.text);

    // Step 3: Analyze speech patterns from timestamps
    const words = transcription.words || [];
    let totalPauses = 0;
    let longPauses = 0;
    let speakingDuration = 0;
    
    if (words.length > 0) {
      speakingDuration = words[words.length - 1].end - words[0].start;
      
      for (let i = 1; i < words.length; i++) {
        const pause = words[i].start - words[i - 1].end;
        if (pause > 0.1) totalPauses++;
        if (pause > 0.5) longPauses++;
      }
    }

    const wordsPerMinute = speakingDuration > 0 ? (words.length / speakingDuration) * 60 : 0;
    const avgPausePerWord = words.length > 1 ? totalPauses / (words.length - 1) : 0;

    console.log(`Analysis: ${words.length} words, ${wordsPerMinute.toFixed(1)} WPM, ${totalPauses} pauses, ${longPauses} long pauses`);

    // Step 4: Generate feedback using Gemini with speech analysis data
    const systemPrompt = `당신은 전문 면접 코치입니다. 사용자의 음성 답변을 엄격하고 객관적으로 분석하여 다음 항목들을 평가해주세요:

1. **발음 및 명확성** (20점) - 음성 인식 정확도와 텍스트 품질 기반
2. **말하기 속도** (20점) - 분당 ${wordsPerMinute.toFixed(1)}단어 (적정 범위: 120-150 WPM)
3. **유창성** (20점) - 휴지(pause) 빈도: ${totalPauses}회, 긴 휴지: ${longPauses}회
4. **억양 및 강조** (20점) - 답변의 자연스러움과 구성
5. **전체적인 전달력** (20점) - 종합적인 의사소통 능력

**평가 기준:**
- 90점 이상은 매우 드물게 부여
- 실제로 부족한 답변에는 낮은 점수(0-30점) 부여
- 객관적이고 엄격한 평가 필수

**출력 형식:**
각 항목별로 점수와 핵심 피드백을 제공하고, 마지막에 "총점 XX점 / 100점" 형식으로 표시해주세요.`;

    const userPrompt = type === 'essay_based'
      ? `면접 질문: ${question}\n\n답변 텍스트: "${transcription.text}"\n\n위 답변을 음성 분석 데이터와 함께 평가해주세요.`
      : `공통 면접 질문: ${question}\n\n답변 텍스트: "${transcription.text}"\n\n위 답변을 음성 분석 데이터와 함께 평가해주세요.`;

    const aiRequestBody = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 1000,
    };

    let aiResponse: Response;
    
    if (LOVABLE_API_KEY) {
      aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(aiRequestBody),
      });

      if (aiResponse.status === 402 && CEREBRAS_API_KEY) {
        console.log('Lovable AI 크레딧 소진, Cerebras로 전환합니다...');
        aiResponse = await fetch('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...aiRequestBody, model: 'llama-4-scout-17b-16e-instruct' }),
        });
      }
    } else {
      aiResponse = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CEREBRAS_API_KEY!}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...aiRequestBody, model: 'llama-4-scout-17b-16e-instruct' }),
      });
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI API error', details: errorText }),
        { status: aiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(aiResponse.body, {
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