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
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: '이메일을 입력해주세요.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (!profile) {
      // For security, don't reveal if email exists
      return new Response(
        JSON.stringify({ success: true, message: '계정 정보를 이메일로 발송했습니다.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send password reset email using Supabase
    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (resetError) {
      console.error('Reset error:', resetError);
      throw new Error('비밀번호 재설정 링크 생성 실패');
    }

    // Send custom email with resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    
    const { error: emailError } = await resend.emails.send({
      from: '청심국제고 면접 준비 <onboarding@resend.dev>',
      to: [email],
      subject: '계정 정보 및 비밀번호 재설정',
      html: `
        <h2>계정 정보</h2>
        <p>아이디(이메일): <strong>${email}</strong></p>
        <p>비밀번호를 재설정하려면 Supabase에서 발송한 이메일을 확인해주세요.</p>
        <p>또는 로그인 페이지에서 "비밀번호 찾기"를 이용해주세요.</p>
        <p>요청하지 않으셨다면 이 이메일을 무시하세요.</p>
      `,
    });

    if (emailError) {
      console.error('Email error:', emailError);
    }

    return new Response(
      JSON.stringify({ success: true, message: '계정 정보를 이메일로 발송했습니다.' }),
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
