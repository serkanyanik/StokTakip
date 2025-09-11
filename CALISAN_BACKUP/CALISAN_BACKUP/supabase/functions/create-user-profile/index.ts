import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get request body
    const { 
      user_id, 
      name, 
      email, 
      is_depo_admin, 
      is_depo_sorumlu1, 
      is_depo_sorumlu2, 
      is_depo_sorumlu3, 
      is_depo_sorumlu4, 
      created_by 
    } = await req.json()

    // Create user profile using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        id: user_id,
        name,
        email,
        is_depo_admin: is_depo_admin || false,
        is_depo_sorumlu1: is_depo_sorumlu1 || false,
        is_depo_sorumlu2: is_depo_sorumlu2 || false,
        is_depo_sorumlu3: is_depo_sorumlu3 || false,
        is_depo_sorumlu4: is_depo_sorumlu4 || false,
        is_active: true,
        created_by
      })
      .select()

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ 
        data,
        message: 'User profile created successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
