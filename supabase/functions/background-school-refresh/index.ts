import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PREDEFINED_SCHOOLS = [
  '청심국제고등학교', '하나고등학교', '상산고등학교', '민족사관고등학교',
  '대원외국어고등학교', '대전신성고등학교', '서울과학고등학교',
  '한성과학고등학교', '휘문고등학교', '부산국제고등학교',
];

async function callAI(messages: Array<{role: string; content: string}>, temperature = 0.5) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const CEREBRAS_API_KEY = Deno.env.get('CEREBRAS_API_KEY');
  if (!LOVABLE_API_KEY && !CEREBRAS_API_KEY) throw new Error('No AI key');

  const body = { model: 'google/gemini-2.5-flash', messages, temperature };
  let res: Response;

  if (LOVABLE_API_KEY) {
    res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok && CEREBRAS_API_KEY) {
      res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${CEREBRAS_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, model: 'llama-4-scout-17b-16e-instruct' }),
      });
    }
  } else {
    res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CEREBRAS_API_KEY!}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, model: 'llama-4-scout-17b-16e-instruct' }),
    });
  }
  if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content as string;
}

function schoolKeyOf(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, '');
}

async function refreshOne(supabase: any, schoolName: string) {
  console.log('[refresh]', schoolName);

  const info = await callAI([
    { role: 'system', content: '당신은 한국 고등학교 입시 전문가입니다. 최신 입시 트렌드, 학교 프로그램, 인재상을 정확히 파악합니다. JSON으로만 답변합니다.' },
    { role: 'user', content: `"${schoolName}"에 대한 최신 입시 정보를 조사해주세요. 다음 JSON 형식으로만 답변하세요:
{
  "characteristics": "학교 특징, 교육 철학, 인재상 (3-5문장)",
  "interviewFocus": "면접에서 중점적으로 평가하는 역량 (한 줄)",
  "detailedInfo": "면접 준비를 위한 상세 정보: 학교 위치, 교육 프로그램, 특별 활동, 최근 입시 트렌드, 면접 유형 등 (8-12문장)"
}` }
  ], 0.4);

  let parsed: any = {};
  try {
    const m = info.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
  } catch (e) { console.error('parse fail', schoolName, e); }

  const detailedInfo = parsed.detailedInfo || parsed.characteristics || info;
  const characteristics = parsed.characteristics || '';
  const interviewFocus = parsed.interviewFocus || '자기주도학습, 진로 목표, 학업 열정, 인성';

  // Generate fresh common question pool
  const qContent = await callAI([
    { role: 'system', content: `당신은 ${schoolName} 면접 전문가입니다. 학교 정보: ${detailedInfo}` },
    { role: 'user', content: `${schoolName} 면접 공통 질문 40개를 생성해주세요. 지원동기, 학업역량, 인성·리더십, 진로계획, 시사, 학교 특색 카테고리를 골고루 포함. 줄바꿈으로 구분, 번호 없이.` }
  ], 0.8);

  const questions = qContent
    .split('\n')
    .map((q: string) => q.trim().replace(/^\d+[\.\)]\s*/, ''))
    .filter((q: string) => q.length > 10 && !q.match(/^[-*#]/))
    .slice(0, 40);

  const { error } = await supabase.from('school_research_cache').upsert({
    school_key: schoolKeyOf(schoolName),
    school_name: schoolName,
    characteristics,
    interview_focus: interviewFocus,
    detailed_info: detailedInfo,
    common_questions: questions,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'school_key' });

  if (error) console.error('upsert error', schoolName, error);
  return { schoolName, questionCount: questions.length };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Get all custom schools from cache (oldest first)
    const { data: cached } = await supabase
      .from('school_research_cache')
      .select('school_name, updated_at')
      .order('updated_at', { ascending: true })
      .limit(50);

    const cachedNames: string[] = (cached || []).map((r: any) => r.school_name);

    // Merge predefined + cached, dedupe
    const all = Array.from(new Set([...PREDEFINED_SCHOOLS, ...cachedNames]));

    // Refresh up to 3 schools per run (oldest first) to keep within time/cost budget
    // Prioritize: schools never refreshed, then those with oldest updated_at
    const existingKeys = new Set((cached || []).map((r: any) => schoolKeyOf(r.school_name)));
    const neverRefreshed = all.filter(n => !existingKeys.has(schoolKeyOf(n)));
    const refreshOrder = [
      ...neverRefreshed,
      ...cachedNames, // already sorted oldest first
    ];

    const batch = refreshOrder.slice(0, 3);
    console.log('Refreshing batch:', batch);

    const results = await Promise.allSettled(batch.map(name => refreshOne(supabase, name)));
    const summary = results.map((r, i) => ({
      school: batch[i],
      ok: r.status === 'fulfilled',
      ...(r.status === 'fulfilled' ? r.value : { error: String((r as any).reason) }),
    }));

    return new Response(JSON.stringify({ refreshed: summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('background refresh error', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});