import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { text, language = 'en', voice = 'female', exaggeration = 1.0, cfg_weight = 0.5, temperature = 0.7 } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Calling Chatterbox TTS with:', { text, language, voice });

    const chatterboxUrl = 'https://chatterbox-o2h0.onrender.com/v1/tts';

    const response = await fetch(chatterboxUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        language,
        voice,
        exaggeration,
        cfg_weight,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Chatterbox API error:', response.status, errorText);
      throw new Error(`Chatterbox API error: ${response.statusText}`);
    }

    const audioData = await response.arrayBuffer();
    console.log('Successfully generated audio, size:', audioData.byteLength, 'bytes');

    return new Response(audioData, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/wav',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to generate audio from Chatterbox'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});