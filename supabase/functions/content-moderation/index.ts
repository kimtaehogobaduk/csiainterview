import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const inappropriateWords = [
  // 욕설
  '씨발', '시발', '좆', '개새끼', '병신', '미친', '애미', '애비', '지랄', '꺼져', '닥쳐',
  '개년', '년', '놈', '개자식', '찌질', '븅신', '등신', '호로', '창녀',
  // 성적 표현
  '섹스', '야동', '포르노', '자위', '딸딸이', '보지', '자지', '보빨', '성교',
  // 차별적 표현
  '장애인', '정신병자', '정신병', '미개인', '후진국'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lowerContent = content.toLowerCase();
    const containsInappropriate = inappropriateWords.some(word => 
      lowerContent.includes(word)
    );

    return new Response(
      JSON.stringify({ 
        blocked: containsInappropriate,
        message: containsInappropriate ? '부적절한 내용이 감지되었습니다.' : '정상'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
