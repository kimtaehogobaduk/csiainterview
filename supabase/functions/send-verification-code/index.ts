import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, type } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: '이메일을 입력해주세요.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await supabase
      .from('verification_codes')
      .insert({
        email,
        code,
        expires_at: expiresAt.toISOString(),
        type: type || 'signup'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('인증 코드 저장 실패');
    }

    // Send email
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    
    const subject = type === 'reset' ? '비밀번호 재설정 인증 코드' : '회원가입 인증 코드';
    const message = type === 'reset' 
      ? `비밀번호 재설정을 위한 인증 코드입니다: <strong>${code}</strong><br>이 코드는 10분 동안 유효합니다.`
      : `회원가입을 위한 인증 코드입니다: <strong>${code}</strong><br>이 코드는 10분 동안 유효합니다.`;

    const { error: emailError } = await resend.emails.send({
      from: '청심국제고 면접 준비 <onboarding@resend.dev>',
      to: [email],
      subject,
      html: `
        <h2>인증 코드</h2>
        <p>${message}</p>
        <p>요청하지 않으셨다면 이 이메일을 무시하세요.</p>
      `,
    });

    if (emailError) {
      console.error('Email error:', emailError);
      throw new Error('이메일 전송 실패');
    }

    return new Response(
      JSON.stringify({ success: true, message: '인증 코드가 발송되었습니다.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
