import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('audible-rpg');
const manifestPath = path.join(root, 'narration.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

const apiKey = process.env.ELEVENLABS_API_KEY;
const voiceId = process.env.ELEVENLABS_VOICE_ID;
if (!apiKey || !voiceId) throw new Error('Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID');

let generated = 0;
for (const line of manifest.lines) {
  if (!line.id || !line.text || !line.file) throw new Error('Each narration line needs id, text, and file');
  const out = path.join(root, line.file);
  try {
    await fs.access(out);
    console.log(`SKIP ${line.id}: ${line.file} already exists`);
    continue;
  } catch {}

  await fs.mkdir(path.dirname(out), { recursive: true });
  console.log(`GENERATE ${line.id}`);
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(manifest.voice.output_format || 'mp3_44100_128')}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    },
    body: JSON.stringify({
      text: line.text,
      model_id: manifest.voice.model || 'eleven_multilingual_v2'
    })
  });
  if (!response.ok) throw new Error(`ElevenLabs ${response.status}: ${await response.text()}`);
  await fs.writeFile(out, Buffer.from(await response.arrayBuffer()));
  generated++;
}
console.log(`Done. Generated ${generated} new narration file(s).`);
