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
    const { email, password } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Check if this email exists in user_migrations and hasn't been migrated yet
    const { data: migration, error: migrationError } = await supabase
      .from('user_migrations')
      .select('*')
      .eq('email', email)
      .eq('migrated', false)
      .maybeSingle()

    if (migrationError) {
      return new Response(JSON.stringify({ 
        success: false, 
        needsSignup: true,
        error: 'Migration check failed' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // If no pending migration found, this is not a migrating user
    if (!migration) {
      return new Response(JSON.stringify({ 
        success: false, 
        needsSignup: true,
        error: 'No migration data found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create the user with admin API
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: migration.full_name }
    })

    if (createError) {
      // User might already exist
      if (createError.message.includes('already been registered')) {
        return new Response(JSON.stringify({ 
          success: false, 
          needsSignup: false,
          error: 'User already exists, try logging in with your password' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      throw createError
    }

    // The profile and data migration will be handled by the trigger
    // But let's also ensure the migration data is properly applied
    
    if (newUser.user) {
      // Update profile with migration data
      await supabase.from('profiles').update({
        full_name: migration.full_name,
        ai_model: migration.ai_model,
        essay_question_count: migration.essay_question_count,
        mileage: migration.mileage,
        enable_camera: migration.enable_camera,
        desired_school: migration.desired_school,
        onboarding_completed: true
      }).eq('id', newUser.user.id)

      // Migrate essays
      await supabase.from('essays')
        .update({ user_id: newUser.user.id })
        .eq('user_id', migration.old_user_id)

      // Migrate interview sessions
      await supabase.from('interview_sessions')
        .update({ user_id: newUser.user.id })
        .eq('user_id', migration.old_user_id)

      // Migrate mileage transactions
      await supabase.from('mileage_transactions')
        .update({ user_id: newUser.user.id })
        .eq('user_id', migration.old_user_id)

      // Migrate saved questions
      await supabase.from('saved_questions')
        .update({ user_id: newUser.user.id })
        .eq('user_id', migration.old_user_id)

      // Migrate monthly leaderboard
      await supabase.from('monthly_leaderboard')
        .update({ user_id: newUser.user.id })
        .eq('user_id', migration.old_user_id)

      // Add admin role if applicable
      if (migration.role === 'admin') {
        await supabase.from('user_roles').upsert({
          user_id: newUser.user.id,
          role: 'admin'
        }, { onConflict: 'user_id' })
      }

      // Mark migration as complete
      await supabase.from('user_migrations').update({
        migrated: true,
        new_user_id: newUser.user.id,
        migrated_at: new Date().toISOString()
      }).eq('id', migration.id)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Account created and data migrated successfully',
      userId: newUser.user?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
