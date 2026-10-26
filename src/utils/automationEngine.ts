import type {
  ExplainerScene,
  TargetBrowserApp,
  VoicePersona,
  CameraMotionOption,
  DurationOption,
  AspectRatioOption,
} from '../types.ts';

export interface AppValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates user-specified Pro account browser application settings.
 */
export function validateBrowserAppInput(input: {
  name: string;
  targetUrl: string;
  promptInputSelector: string;
  submitButtonSelector: string;
  promptTemplate: string;
  renderWaitSeconds: number;
}): AppValidationResult {
  const errors: string[] = [];

  if (!input.name || input.name.trim().length < 2) {
    errors.push('App name must be at least 2 characters.');
  }

  const trimmedUrl = (input.targetUrl || '').trim();
  if (!trimmedUrl) {
    errors.push('Target web app URL is required.');
  } else {
    try {
      const parsed = new URL(trimmedUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        errors.push('Target URL must start with https:// or http://.');
      }
    } catch {
      errors.push('Target URL must be a valid URL (e.g., https://labs.google/fx/tools/flow).');
    }
  }

  if (!input.promptInputSelector || input.promptInputSelector.trim().length === 0) {
    errors.push('Prompt input CSS selector is required.');
  }

  if (!input.submitButtonSelector || input.submitButtonSelector.trim().length === 0) {
    errors.push('Submit button CSS selector is required.');
  }

  if (!input.promptTemplate || !input.promptTemplate.includes('{{scene_prompt}}')) {
    errors.push('Prompt template must include the {{scene_prompt}} placeholder.');
  }

  if (
    typeof input.renderWaitSeconds !== 'number' ||
    Number.isNaN(input.renderWaitSeconds) ||
    input.renderWaitSeconds < 5 ||
    input.renderWaitSeconds > 600
  ) {
    errors.push('Render wait time must be between 5 and 600 seconds.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Estimates spoken duration in seconds for a voiceover script.
 */
export function estimateVoiceDurationSec(script: string, wordsPerMinute = 145): number {
  const cleaned = (script || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\|[^|]+\|/g, ' ')
    .trim();
  if (!cleaned) return 0;
  const words = cleaned.split(/\s+/).filter(Boolean).length;
  const rawSeconds = (words / Math.max(60, wordsPerMinute)) * 60;
  return Math.max(1.2, Math.round(rawSeconds * 10) / 10);
}

/**
 * Checks whether a scene's voiceover exceeds the target video clip duration
 * and recommends whether to trigger Veo 3 / Omni scene extension (+5s).
 */
export function evaluateScenePacing(
  estimatedSpeechSeconds: number,
  clipDuration: DurationOption
): {
  clipSeconds: number;
  deltaSeconds: number;
  status: 'optimal' | 'needs-extension' | 'padded';
  recommendation: string;
} {
  const clipSeconds = clipDuration === '10s' ? 10 : 5;
  const deltaSeconds = Math.round((estimatedSpeechSeconds - clipSeconds) * 10) / 10;

  if (deltaSeconds > 0.6) {
    return {
      clipSeconds,
      deltaSeconds,
      status: 'needs-extension',
      recommendation:
        clipSeconds === 5
          ? 'Switch clip duration to 10s or queue +5s Flow Extend'
          : 'Queue +5s Flow Scene Continuation or trim 4–6 words',
    };
  }

  if (deltaSeconds < -2.2) {
    return {
      clipSeconds,
      deltaSeconds,
      status: 'padded',
      recommendation: 'Paced with ambient visual breathing room',
    };
  }

  return {
    clipSeconds,
    deltaSeconds,
    status: 'optimal',
    recommendation: 'Voiceover locked to clip duration',
  };
}

/**
 * Compiles a scene's metadata and prompt into the target browser app's prompt template.
 */
export function compileScenePrompt(
  scene: Pick<
    ExplainerScene,
    | 'sceneNumber'
    | 'title'
    | 'visualPrompt'
    | 'cameraMotion'
    | 'aspectRatio'
    | 'duration'
    | 'kineticCallout'
    | 'voiceoverScript'
  >,
  app: Pick<TargetBrowserApp, 'promptTemplate' | 'supportsFrameContinuation'>
): string {
  const continuityDirective =
    app.supportsFrameContinuation && scene.sceneNumber > 1
      ? 'Maintain visual continuity and lighting from previous frame.'
      : 'Establish primary keyframe lighting and composition.';

  return app.promptTemplate
    .replace(/\{\{scene_number\}\}/g, String(scene.sceneNumber))
    .replace(/\{\{scene_title\}\}/g, scene.title)
    .replace(/\{\{scene_prompt\}\}/g, scene.visualPrompt)
    .replace(/\{\{camera_motion\}\}/g, scene.cameraMotion)
    .replace(/\{\{aspect_ratio\}\}/g, scene.aspectRatio)
    .replace(/\{\{duration\}\}/g, scene.duration)
    .replace(/\{\{kinetic_callout\}\}/g, scene.kineticCallout)
    .replace(/\{\{voiceover_script\}\}/g, scene.voiceoverScript)
    .replace(/\{\{continuity_directive\}\}/g, continuityDirective)
    .trim();
}

/**
 * Generates a deterministic, playable 24kHz 16-bit mono RIFF WAV data URL
 * with cadence-modulated vocal formants matching the script's syllables and persona.
 * Works 100% locally in any browser without requiring external API keys.
 */
export function generateSynthesizedWavDataUrl(
  script: string,
  voicePersona: VoicePersona,
  targetDurationSec?: number
): { dataUrl: string; durationSec: number } {
  const sampleRate = 24000;
  const estSec = targetDurationSec || Math.min(8, Math.max(2, estimateVoiceDurationSec(script)));
  const durationSec = Math.max(1.5, Math.min(10, Math.round(estSec * 10) / 10));
  const numSamples = Math.floor(sampleRate * durationSec);

  const baseFreqMap: Record<VoicePersona, number> = {
    Kore: 195,
    Puck: 155,
    Zephyr: 215,
    Charon: 125,
    Fenrir: 138,
  };
  const f0 = baseFreqMap[voicePersona] || 180;

  const words = (script || 'Explainer scene voiceover').trim().split(/\s+/).filter(Boolean);
  const syllableCount = Math.max(3, words.length * 2);

  // 44-byte WAV RIFF header + 16-bit PCM samples
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format = 1
  view.setUint16(22, 1, true); // Mono = 1 channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeAscii(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let phase1 = 0;
  let phase2 = 0;
  let phase3 = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const progress = t / durationSec;

    // Prosody pitch contour (natural statement intonation)
    const syllablePos = t * (syllableCount / durationSec);
    const syllablePhase = syllablePos - Math.floor(syllablePos);
    const wordIdx = Math.min(words.length - 1, Math.floor(progress * words.length));
    const charSeed = (words[wordIdx]?.charCodeAt(0) || 70) % 17;

    const pitchContour =
      f0 *
      (1.0 +
        0.08 * Math.sin(2 * Math.PI * 1.8 * t) +
        0.04 * (charSeed / 17) -
        0.12 * progress);

    // Syllable envelope with natural consonant pauses
    const syllableEnv =
      syllablePhase < 0.82
        ? Math.sin((syllablePhase / 0.82) * Math.PI) ** 0.65
        : 0.04;

    // Fade in / out envelope
    const fadeEnv =
      t < 0.06 ? t / 0.06 : durationSec - t < 0.12 ? (durationSec - t) / 0.12 : 1.0;

    phase1 += (2 * Math.PI * pitchContour) / sampleRate;
    phase2 += (2 * Math.PI * pitchContour * 2.0) / sampleRate;
    phase3 += (2 * Math.PI * pitchContour * 3.0) / sampleRate;

    const signal =
      0.55 * Math.sin(phase1) +
      0.28 * Math.sin(phase2) +
      0.12 * Math.sin(phase3);

    const sampleVal = Math.max(
      -1,
      Math.min(1, signal * syllableEnv * fadeEnv * 0.35)
    );
    view.setInt16(44 + i * 2, Math.floor(sampleVal * 32767), true);
  }

  // Encode ArrayBuffer to base64 safely in both Node and Browser
  const bytes = new Uint8Array(buffer);
  let base64 = '';
  if (typeof Buffer !== 'undefined') {
    base64 = Buffer.from(bytes).toString('base64');
  } else {
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    base64 = btoa(binary);
  }

  return {
    dataUrl: `data:audio/wav;base64,${base64}`,
    durationSec,
  };
}

/**
 * Generates a Tampermonkey / Violentmonkey Userscript (.user.js) that runs directly inside
 * the user's logged-in Pro browser app (e.g. Google Flow Veo 3, Gemini Advanced, or custom app URL)
 * without requiring any API key.
 */
export function generateTampermonkeyUserscript(
  app: TargetBrowserApp,
  scenes: ExplainerScene[],
  projectTitle: string
): string {
  const compiledQueue = scenes.map((scene) => ({
    sceneNumber: scene.sceneNumber,
    title: scene.title,
    duration: scene.duration,
    aspectRatio: scene.aspectRatio,
    compiledPrompt: compileScenePrompt(scene, app),
    voiceoverScript: scene.voiceoverScript,
  }));

  let matchPattern = `${app.targetUrl}*`;
  try {
    const u = new URL(app.targetUrl);
    matchPattern = `${u.origin}${u.pathname}*`;
  } catch {
    // fallback to raw
  }

  return `// ==UserScript==
// @name         FlowCast Pro Bridge — ${projectTitle} (${app.name})
// @namespace    https://flowcast.studio/automation
// @version      1.4.0
// @description  Automates ${app.name} using your logged-in Pro browser session for "${projectTitle}"
// @match        ${matchPattern}
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const APP_CONFIG = ${JSON.stringify(
    {
      name: app.name,
      targetUrl: app.targetUrl,
      inputSelector: app.promptInputSelector,
      submitSelector: app.submitButtonSelector,
      extendSelector: app.extendButtonSelector,
      renderWaitSeconds: app.renderWaitSeconds,
    },
    null,
    2
  )};

  const SCENE_QUEUE = ${JSON.stringify(compiledQueue, null, 2)};

  let currentIndex = 0;
  let autoLoopActive = false;

  function setNativeInputValue(el, text) {
    if (!el) return false;
    el.focus();
    if (el.isContentEditable) {
      el.innerText = text;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
      return true;
    }
    const proto =
      el instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (nativeSetter) {
      nativeSetter.call(el, text);
    } else {
      el.value = text;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  async function dispatchScene(index) {
    const item = SCENE_QUEUE[index];
    if (!item) return;
    const statusEl = document.getElementById('fc-bridge-status');
    const inputEl = document.querySelector(APP_CONFIG.inputSelector);
    if (!inputEl) {
      if (statusEl) statusEl.textContent = 'Input selector not found: ' + APP_CONFIG.inputSelector;
      return;
    }

    setNativeInputValue(inputEl, item.compiledPrompt);
    if (statusEl) {
      statusEl.textContent = 'Injected Scene ' + item.sceneNumber + ': ' + item.title;
    }

    await new Promise((r) => setTimeout(r, 450));
    const submitBtn = document.querySelector(APP_CONFIG.submitSelector);
    if (submitBtn && !submitBtn.disabled) {
      submitBtn.click();
      if (statusEl) {
        statusEl.textContent =
          'Generating Scene ' + item.sceneNumber + ' (' + APP_CONFIG.renderWaitSeconds + 's wait)...';
      }
    }
  }

  async function runBatchQueue() {
    autoLoopActive = true;
    for (let i = currentIndex; i < SCENE_QUEUE.length; i++) {
      if (!autoLoopActive) break;
      currentIndex = i;
      await dispatchScene(i);
      await new Promise((r) => setTimeout(r, APP_CONFIG.renderWaitSeconds * 1000));
    }
    autoLoopActive = false;
  }

  function mountHud() {
    if (document.getElementById('flowcast-pro-hud')) return;
    const hud = document.createElement('div');
    hud.id = 'flowcast-pro-hud';
    hud.style.cssText =
      'position:fixed;bottom:20px;right:20px;z-index:999999;width:340px;background:#0B0F17;color:#F8FAFC;border:1px solid #334155;border-radius:10px;padding:14px;font-family:sans-serif;box-shadow:0 20px 40px rgba(0,0,0,0.6);';
    hud.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
      '<strong style="font-size:13px;color:#F59E0B;">FlowCast Pro Queue (' + SCENE_QUEUE.length + ' Scenes)</strong>' +
      '<span style="font-size:11px;color:#94A3B8;">' + APP_CONFIG.name + '</span>' +
      '</div>' +
      '<div id="fc-bridge-status" style="font-size:12px;color:#CBD5E1;margin-bottom:10px;">Ready to dispatch Scene 1</div>' +
      '<div style="display:flex;gap:8px;">' +
      '<button id="fc-btn-step" style="flex:1;padding:7px 10px;background:#1E293B;color:#F8FAFC;border:1px solid #475569;border-radius:6px;font-size:12px;cursor:pointer;">Inject Next Scene</button>' +
      '<button id="fc-btn-auto" style="flex:1;padding:7px 10px;background:#F59E0B;color:#0B0F17;font-weight:600;border:none;border-radius:6px;font-size:12px;cursor:pointer;">Auto-Run All</button>' +
      '</div>';
    document.body.appendChild(hud);

    document.getElementById('fc-btn-step').addEventListener('click', () => {
      dispatchScene(currentIndex);
      currentIndex = (currentIndex + 1) % SCENE_QUEUE.length;
    });
    document.getElementById('fc-btn-auto').addEventListener('click', () => {
      if (autoLoopActive) {
        autoLoopActive = false;
      } else {
        runBatchQueue();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountHud);
  } else {
    mountHud();
  }
})();`;
}

/**
 * Generates a Playwright script that attaches to the user's logged-in Chrome profile
 * over CDP (Remote Debugging Port 9222) so their Pro subscription cookies work directly.
 */
export function generateChromeProfilePlaywrightScript(
  app: TargetBrowserApp,
  scenes: ExplainerScene[],
  projectTitle: string
): string {
  const compiledQueue = scenes.map((scene) => ({
    sceneNumber: scene.sceneNumber,
    title: scene.title,
    compiledPrompt: compileScenePrompt(scene, app),
    duration: scene.duration,
  }));

  return `/**
 * FlowCast Studio — Logged-In Pro Browser Session Automation
 * Target App: ${app.name} (${app.targetUrl})
 * Project: ${projectTitle}
 *
 * Step 1: Launch Chrome with your existing Pro profile & remote debugging enabled:
 *   macOS: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222
 *   Windows: chrome.exe --remote-debugging-port=9222
 *
 * Step 2: Run this script:
 *   node automate-pro-session.mjs
 */
import { chromium } from 'playwright';

const TARGET_URL = ${JSON.stringify(app.targetUrl)};
const INPUT_SELECTOR = ${JSON.stringify(app.promptInputSelector)};
const SUBMIT_SELECTOR = ${JSON.stringify(app.submitButtonSelector)};
const WAIT_SECONDS = ${app.renderWaitSeconds};

const SCENES = ${JSON.stringify(compiledQueue, null, 2)};

async function run() {
  console.log('Connecting to your logged-in Pro Chrome session on port 9222...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0] || (await browser.newContext());
  const page = await context.newPage();

  console.log('Opening ' + TARGET_URL + '...');
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

  for (const scene of SCENES) {
    console.log(\`[Scene \${scene.sceneNumber}] Filling prompt: \${scene.title}\`);
    const input = page.locator(INPUT_SELECTOR).first();
    await input.waitFor({ state: 'visible', timeout: 60000 });
    await input.fill(scene.compiledPrompt);

    const submit = page.locator(SUBMIT_SELECTOR).first();
    await submit.click();

    console.log(\`[Scene \${scene.sceneNumber}] Waiting \${WAIT_SECONDS}s for Pro render...\`);
    await page.waitForTimeout(WAIT_SECONDS * 1000);
  }

  console.log('All explainer scenes dispatched in your Pro browser session.');
}

run().catch(console.error);
`;
}

/**
 * Deterministic Topic-to-Storyboard generator so users without API keys can still
 * generate structured Veo 3 / Omni multi-scene explainer scripts on any topic.
 */
export function buildDeterministicStoryboardFromTopic(
  topic: string,
  aspectRatio: AspectRatioOption = '16:9',
  sceneCount = 4
): ExplainerScene[] {
  const cleanTopic = topic.trim() || 'Next-Generation Autonomous Cloud Architecture';
  const cameraCycle: CameraMotionOption[] = [
    'Slow Dolly In',
    'Tracking Right',
    'Orbital Pan Left',
    'Crane Up Reveal',
  ];
  const themeCycle: ExplainerScene['visualTheme'][] = [
    'architecture',
    'routing',
    'deployment',
    'waveform',
  ];

  const blueprints = [
    {
      title: 'The Core Bottleneck',
      visualPrompt: `Cinematic macro view illustrating the problem behind ${cleanTopic}, dramatic studio rim lighting on dark brushed aluminum hardware, shallow depth of field, 4k editorial film look.`,
      kineticCallout: `Why Legacy Workflows Stall`,
      voiceoverScript: `Every modern team hits the same invisible wall when scaling ${cleanTopic}. Manual bottlenecks slow everything down.`,
    },
    {
      title: 'Architectural Breakthrough',
      visualPrompt: `Isometric cross-section reveal of ${cleanTopic} operating in real time, warm amber optical data pathways flowing across precision dark slate modules, clean volumetric lighting.`,
      kineticCallout: `Unified ${cleanTopic.split(' ').slice(0, 3).join(' ')} Engine`,
      voiceoverScript: `Instead of stitching together fragile tools, our unified pipeline coordinates every stage automatically in parallel.`,
    },
    {
      title: 'Live Execution & Routing',
      visualPrompt: `Dynamic tracking shot following high-speed signal routing for ${cleanTopic}, crisp geometric telemetry lines, physically based glass and anodized metal reflections.`,
      kineticCallout: `Sub-Second Synchronization`,
      voiceoverScript: `Watch how each prompt, camera move, and voice cue locks into frame-accurate alignment without manual intervention.`,
    },
    {
      title: 'Production Impact',
      visualPrompt: `Wide-angle architectural reveal of a calm production studio control desk displaying completed ${cleanTopic} outputs, warm dusk illumination, Leica 35mm documentary aesthetic.`,
      kineticCallout: `10x Faster Explainer Production`,
      voiceoverScript: `From raw concept to voiced explainer video in minutes—using the Pro browser apps your team already owns.`,
    },
  ];

  return blueprints.slice(0, sceneCount).map((bp, idx) => {
    const estSec = estimateVoiceDurationSec(bp.voiceoverScript);
    const wav = generateSynthesizedWavDataUrl(bp.voiceoverScript, 'Kore', estSec);
    return {
      id: `scene-gen-${Date.now()}-${idx + 1}`,
      sceneNumber: idx + 1,
      title: bp.title,
      visualPrompt: bp.visualPrompt,
      cameraMotion: cameraCycle[idx % cameraCycle.length],
      aspectRatio,
      duration: estSec > 5.5 ? '10s' : '5s',
      kineticCallout: bp.kineticCallout,
      voiceoverScript: bp.voiceoverScript,
      voicePersona: 'Kore',
      voiceStyle: 'Clear, authoritative product explainer narrator',
      estimatedSpeechSeconds: estSec,
      audioDataUrl: wav.dataUrl,
      audioSource: 'local-wav-synth',
      dispatchStatus: 'queued',
      visualTheme: themeCycle[idx % themeCycle.length],
    };
  });
}
