import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  buildDeterministicStoryboardFromTopic,
  generateSynthesizedWavDataUrl,
  estimateVoiceDurationSec,
} from './src/utils/automationEngine.ts';
import type { AspectRatioOption, VoicePersona } from './src/types.ts';

dotenv.config();

function getGenAIClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '25mb' }));

  // Health & mode status endpoint
  app.get('/api/status', (_req, res) => {
    const hasKey = Boolean(getGenAIClient());
    res.json({
      ok: true,
      executionMode: hasKey ? 'hybrid-cloud-and-browser' : 'browser-pro-session',
    });
  });

  // 1. Storyboard Generation Endpoint (Gemini 3.8 Flash + Deterministic Browser Pro Fallback)
  app.post('/api/storyboard/generate', async (req, res) => {
    const {
      topic = 'Autonomous Cloud Explainer',
      aspectRatio = '16:9',
      sceneCount = 4,
    } = req.body || {};

    const ai = getGenAIClient();
    if (ai) {
      try {
        const interaction = await ai.interactions.create({
          model: 'gemini-3.8-flash',
          input: `Create a ${sceneCount}-scene explainer video storyboard for: "${topic}".
For each scene, provide:
- title (short 3-5 words)
- visualPrompt (detailed cinematic prompt optimized for Google Flow Veo 3 and Gemini Omni video generation)
- cameraMotion (one of: "Static Locked", "Slow Dolly In", "Slow Pull Back", "Orbital Pan Left", "Tracking Right", "Crane Up Reveal")
- kineticCallout (short 3-5 word on-screen graphic callout)
- voiceoverScript (1-2 crisp spoken sentences timed for a 5-second scene)`,
          response_format: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                visualPrompt: { type: Type.STRING },
                cameraMotion: { type: Type.STRING },
                kineticCallout: { type: Type.STRING },
                voiceoverScript: { type: Type.STRING },
              },
              required: [
                'title',
                'visualPrompt',
                'cameraMotion',
                'kineticCallout',
                'voiceoverScript',
              ],
            },
          },
        });

        const rawText = interaction.output_text || '';
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const themes = ['architecture', 'routing', 'waveform', 'deployment'] as const;
          const scenes = parsed.map((item, idx) => {
            const script = String(item.voiceoverScript || '');
            const estSec = estimateVoiceDurationSec(script);
            const wav = generateSynthesizedWavDataUrl(script, 'Kore', estSec);
            return {
              id: `scene-ai-${Date.now()}-${idx + 1}`,
              sceneNumber: idx + 1,
              title: String(item.title || `Scene ${idx + 1}`),
              visualPrompt: String(item.visualPrompt || ''),
              cameraMotion: item.cameraMotion || 'Slow Dolly In',
              aspectRatio: (aspectRatio as AspectRatioOption) || '16:9',
              duration: estSec > 5.5 ? '10s' : '5s',
              kineticCallout: String(item.kineticCallout || `0${idx + 1} · Key Insight`),
              voiceoverScript: script,
              voicePersona: 'Kore' as VoicePersona,
              voiceStyle: 'Clear, authoritative product explainer narrator',
              estimatedSpeechSeconds: estSec,
              audioDataUrl: wav.dataUrl,
              audioSource: 'local-wav-synth',
              dispatchStatus: 'queued',
              visualTheme: themes[idx % themes.length],
            };
          });
          res.json({ scenes, source: 'gemini-3.8-flash' });
          return;
        }
      } catch (_err) {
        // Fall through cleanly to deterministic Browser-Pro storyboard engine
      }
    }

    const fallbackScenes = buildDeterministicStoryboardFromTopic(
      String(topic),
      (aspectRatio as AspectRatioOption) || '16:9',
      Number(sceneCount) || 4
    );
    res.json({
      scenes: fallbackScenes,
      source: 'browser-pro-engine',
    });
  });

  // 2. Integrated Voiceover TTS Endpoint (Gemini 3.8 TTS + 24kHz WAV Synthesizer Fallback)
  app.post('/api/tts/generate', async (req, res) => {
    const {
      script = '',
      secondaryScript = '',
      voicePersona = 'Kore',
      secondaryVoicePersona = 'Puck',
      voiceStyle = 'Clear, authoritative explainer narrator',
      voiceMode = 'single',
    } = req.body || {};

    const cleanScript = String(script).trim() || 'Explainer scene voiceover ready.';
    const estSec = estimateVoiceDurationSec(
      voiceMode === 'dual-speaker' && secondaryScript
        ? `${cleanScript} ${secondaryScript}`
        : cleanScript
    );

    const ai = getGenAIClient();
    if (ai) {
      try {
        if (voiceMode === 'dual-speaker' && secondaryScript) {
          const interaction = await ai.interactions.create({
            model: 'gemini-3.8-flash-tts',
            input: [
              {
                type: 'text',
                text: `Narrator: ${cleanScript}`,
                annotations: [
                  {
                    type: 'speech_metadata',
                    speaker: 'Narrator',
                    style: voiceStyle,
                  },
                ],
              },
              {
                type: 'text',
                text: `CoHost: ${secondaryScript}`,
                annotations: [
                  {
                    type: 'speech_metadata',
                    speaker: 'CoHost',
                    style: 'Curious, articulate co-host',
                  },
                ],
              },
            ],
            response_format: { type: 'audio' },
            generation_config: {
              speech_config: {
                speakers: [
                  { speaker: 'Narrator', voice: voicePersona },
                  { speaker: 'CoHost', voice: secondaryVoicePersona },
                ],
              },
            },
          });

          const audio = interaction.output_audio;
          if (audio?.data) {
            res.json({
              audioDataUrl: `data:audio/wav;base64,${audio.data}`,
              durationSec: estSec,
              audioSource: 'gemini-tts',
            });
            return;
          }
        } else {
          const interaction = await ai.interactions.create({
            model: 'gemini-3.8-flash-lite-tts',
            input: [
              {
                type: 'text',
                text: cleanScript,
                annotations: [
                  {
                    type: 'speech_metadata',
                    style: voiceStyle,
                  },
                ],
              },
            ],
            response_format: { type: 'audio' },
            generation_config: {
              speech_config: [
                {
                  language: 'en-US',
                  voice: voicePersona,
                },
              ],
            },
          });

          const audio = interaction.output_audio;
          if (audio?.data) {
            res.json({
              audioDataUrl: `data:audio/wav;base64,${audio.data}`,
              durationSec: estSec,
              audioSource: 'gemini-tts',
            });
            return;
          }
        }
      } catch (_err) {
        // Fall through cleanly to local 24kHz WAV formant synthesizer
      }
    }

    const combinedText =
      voiceMode === 'dual-speaker' && secondaryScript
        ? `${cleanScript} ${secondaryScript}`
        : cleanScript;
    const wav = generateSynthesizedWavDataUrl(
      combinedText,
      (voicePersona as VoicePersona) || 'Kore',
      estSec
    );

    res.json({
      audioDataUrl: wav.dataUrl,
      durationSec: wav.durationSec,
      audioSource: 'local-wav-synth',
    });
  });

  // 3. Browser Pro Session Video Queue Endpoint (No Paid API Key Required)
  app.post('/api/video/omni', async (req, res) => {
    const {
      prompt = '',
      aspectRatio = '16:9',
      duration = '5s',
    } = req.body || {};

    res.json({
      ok: true,
      source: 'browser-pro-queue',
      prompt,
      aspectRatio,
      duration,
      message:
        'Queued for your logged-in Pro browser session. Use the Browser Automation Bridge or Canvas Studio Renderer.',
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FlowCast Studio server running on http://localhost:${PORT}`);
  });
}

startServer();
