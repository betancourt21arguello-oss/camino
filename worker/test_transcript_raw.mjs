import https from 'https';
import http from 'http';
import { DOMParser } from '@xmldom/xmldom';

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    }).on('error', reject);
  });
}

async function getTranscriptRaw(videoUrl) {
  const html = await fetch(videoUrl);
  const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+meta|<\/script>)/s);
  if (!match) throw new Error('ytInitialPlayerResponse not found');
  const data = JSON.parse(match[1]);
  const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(tracks) || tracks.length === 0) return null;

  const esTrack = tracks.find((t) => (t.languageCode || '').startsWith('es')) || tracks[0];
  const xml = await fetch(esTrack.baseUrl);
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const nodes = doc.getElementsByTagName('text');
  const out = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const text = node.textContent || '';
    const start = parseFloat(node.getAttribute('start') || '0');
    const dur = parseFloat(node.getAttribute('dur') || '0');
    out.push({ text, offset: start, duration: dur });
  }
  return out;
}

(async () => {
  const url = 'https://www.youtube.com/watch?v=2G-wjgx40SY';
  const data = await getTranscriptRaw(url);
  console.log('Lines:', data?.length || 0);
  if (data?.length) console.log('First:', data[0]);
})().catch((e) => console.error('Error:', e.message));
