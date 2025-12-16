import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: migrationData } = await req.json()
    
    const results = {
      essays: 0,
      interviewSessions: 0,
      mileageTransactions: 0,
      savedQuestions: 0,
      errors: [] as string[]
    }

    // Import essays
    if (migrationData.essays && migrationData.essays.length > 0) {
      for (const essay of migrationData.essays) {
        const { error } = await supabase.from('essays').upsert({
          id: essay.id,
          user_id: essay.user_id,
          content: essay.content,
          created_at: essay.created_at,
          updated_at: essay.updated_at
        }, { onConflict: 'id' })
        
        if (error) {
          results.errors.push(`Essay ${essay.id}: ${error.message}`)
        } else {
          results.essays++
        }
      }
    }

    // Import interview sessions
    if (migrationData.interviewSessions && migrationData.interviewSessions.length > 0) {
      for (const session of migrationData.interviewSessions) {
        const { error } = await supabase.from('interview_sessions').upsert({
          id: session.id,
          user_id: session.user_id,
          session_type: session.session_type,
          question: session.question,
          answer: session.answer,
          ai_feedback: session.ai_feedback,
          score: session.score,
          created_at: session.created_at,
          video_url: session.video_url
        }, { onConflict: 'id' })
        
        if (error) {
          results.errors.push(`Session ${session.id}: ${error.message}`)
        } else {
          results.interviewSessions++
        }
      }
    }

    // Import mileage transactions
    if (migrationData.mileageTransactions && migrationData.mileageTransactions.length > 0) {
      for (const tx of migrationData.mileageTransactions) {
        const { error } = await supabase.from('mileage_transactions').upsert({
          id: tx.id,
          user_id: tx.user_id,
          amount: tx.amount,
          reason: tx.reason,
          session_id: tx.session_id,
          created_at: tx.created_at
        }, { onConflict: 'id' })
        
        if (error) {
          results.errors.push(`Transaction ${tx.id}: ${error.message}`)
        } else {
          results.mileageTransactions++
        }
      }
    }

    // Import saved questions
    if (migrationData.savedQuestions && migrationData.savedQuestions.length > 0) {
      for (const q of migrationData.savedQuestions) {
        const { error } = await supabase.from('saved_questions').upsert({
          id: q.id,
          user_id: q.user_id,
          question: q.question,
          source: q.source,
          essay: q.essay,
          created_at: q.created_at
        }, { onConflict: 'id' })
        
        if (error) {
          results.errors.push(`Question ${q.id}: ${error.message}`)
        } else {
          results.savedQuestions++
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
