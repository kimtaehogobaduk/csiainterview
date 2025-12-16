import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();
    
    console.log('Setting up admin account for:', email);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Get all existing users
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    console.log('Found', existingUsers.users.length, 'existing users');

    // 2. Delete all existing users
    for (const user of existingUsers.users) {
      console.log('Deleting user:', user.email);
      
      // Delete related data first
      await supabaseAdmin.from('mileage_transactions').delete().eq('user_id', user.id);
      await supabaseAdmin.from('saved_questions').delete().eq('user_id', user.id);
      await supabaseAdmin.from('interview_sessions').delete().eq('user_id', user.id);
      await supabaseAdmin.from('essays').delete().eq('user_id', user.id);
      await supabaseAdmin.from('admin_messages').delete().eq('user_id', user.id);
      await supabaseAdmin.from('monthly_leaderboard').delete().eq('user_id', user.id);
      await supabaseAdmin.from('user_customization').delete().eq('user_id', user.id);
      await supabaseAdmin.from('user_items').delete().eq('user_id', user.id);
      await supabaseAdmin.from('user_roles').delete().eq('user_id', user.id);
      await supabaseAdmin.from('profiles').delete().eq('id', user.id);
      
      // Delete the auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error('Error deleting user:', user.email, deleteError);
      }
    }

    console.log('All users deleted');

    // 3. Create new admin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: '관리자' }
    });

    if (createError) {
      console.error('Error creating admin user:', createError);
      throw createError;
    }

    console.log('Admin user created:', newUser.user?.id);

    // 4. Create profile for admin
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: newUser.user!.id,
      email: email,
      full_name: '관리자',
      onboarding_completed: true,
      mileage: 0
    });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }

    // 5. Assign admin role
    const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
      user_id: newUser.user!.id,
      role: 'admin'
    });

    if (roleError) {
      console.error('Error assigning admin role:', roleError);
    }

    console.log('Admin setup complete');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '관리자 계정이 생성되었습니다.',
        userId: newUser.user?.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Setup admin error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});