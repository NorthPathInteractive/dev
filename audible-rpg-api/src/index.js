const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true, service: 'audible-rpg-api' });
    if (url.pathname !== '/narrate' || request.method !== 'POST') return json({ error: 'Not found' }, 404);

    if (!env.ELEVENLABS_API_KEY || !env.ELEVENLABS_VOICE_ID) {
      return json({ error: 'Narrator is not configured yet.' }, 503);
    }

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const text = String(body?.text || '').trim();
    if (!text || text.length > 2000) return json({ error: 'Text must contain 1–2000 characters.' }, 400);

    const model = 'eleven_multilingual_v2';
    const key = `narration/${await sha256(`${env.ELEVENLABS_VOICE_ID}|${model}|${text}`)}.mp3`;
    const cached = await env.AUDIO_CACHE.get(key);
    if (cached) {
      return new Response(cached.body, {
        headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Audible-RPG-Cache': 'HIT' },
      });
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(env.ELEVENLABS_VOICE_ID)}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: model }),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error('ElevenLabs error', response.status, detail);
      return json({ error: 'Narration generation failed.' }, 502);
    }

    const audio = await response.arrayBuffer();
    await env.AUDIO_CACHE.put(key, audio, { httpMetadata: { contentType: 'audio/mpeg' } });
    return new Response(audio, {
      headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Audible-RPG-Cache': 'MISS' },
    });
  },
};
