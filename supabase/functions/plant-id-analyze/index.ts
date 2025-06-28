// Plant.ID API Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { imageBase64 } = await req.json()
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: imageBase64' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call Plant.ID API
    const plantIdResponse = await fetch('https://api.plant.id/v2/health_assessment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: Deno.env.get('PLANT_ID_API_KEY'),
        images: [imageBase64],
        plant_details: ['common_names', 'url', 'wiki_description', 'taxonomy'],
        disease_details: ['treatment', 'description', 'common_names', 'url', 'classification', 'symptoms'],
      }),
    })

    if (!plantIdResponse.ok) {
      const error = await plantIdResponse.text()
      console.error('Plant.ID API error:', error)
      throw new Error(`Plant.ID API error: ${plantIdResponse.status} ${plantIdResponse.statusText}`)
    }

    const data = await plantIdResponse.json()
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in plant-id-analyze:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
