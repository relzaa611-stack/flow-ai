import { TargetBrowserApp, ExplainerProject } from '../types';
import { generateSynthesizedWavDataUrl } from '../utils/automationEngine';

export const DEFAULT_BROWSER_APPS: TargetBrowserApp[] = [
  {
    id: 'google-flow-veo3',
    name: 'Google Flow (Veo 3 Filmmaking Tool)',
    engineFamily: 'veo-3-flow',
    targetUrl: 'https://labs.google/fx/tools/flow',
    accountTierLabel: 'Logged-in Google AI Pro / Ultra Session',
    promptInputSelector: 'textarea[placeholder*="Describe"], textarea[aria-label*="prompt"], div[contenteditable="true"]',
    submitButtonSelector: 'button[aria-label*="Generate"], button[type="submit"]',
    extendButtonSelector: 'button[aria-label*="Extend"], button[aria-label*="Add to scene"]',
    promptTemplate:
      '[Veo 3 Scene {{scene_number}} | {{aspect_ratio}} | {{duration}} | Camera: {{camera_motion}}] {{scene_prompt}} — {{continuity_directive}} On-screen graphic cue: "{{kinetic_callout}}"',
    renderWaitSeconds: 45,
    supportsFrameContinuation: true,
    supportsIngredientsUpload: true,
    isDefaultPreset: true,
  },
  {
    id: 'gemini-web-pro',
    name: 'Gemini Web App (Veo / Omni Pro Account)',
    engineFamily: 'gemini-omni',
    targetUrl: 'https://gemini.google.com/app',
    accountTierLabel: 'Logged-in Gemini Advanced / Pro Session',
    promptInputSelector: 'div.ql-editor[contenteditable="true"], rich-textarea div[contenteditable="true"], textarea',
    submitButtonSelector: 'button.send-button, button[aria-label*="Send message"]',
    extendButtonSelector: 'button[aria-label*="Modify"], button[aria-label*="Redo"]',
    promptTemplate:
      'Generate a {{duration}} {{aspect_ratio}} explainer video clip for Scene {{scene_number}} ({{scene_title}}). Camera motion: {{camera_motion}}. Visuals: {{scene_prompt}}. Sync to voiceover: "{{voiceover_script}}"',
    renderWaitSeconds: 35,
    supportsFrameContinuation: true,
    supportsIngredientsUpload: true,
    isDefaultPreset: true,
  },
  {
    id: 'google-vids-studio',
    name: 'Google Vids (Workspace AI Explainer Studio)',
    engineFamily: 'custom-browser',
    targetUrl: 'https://docs.google.com/videos',
    accountTierLabel: 'Logged-in Workspace Pro Session',
    promptInputSelector: 'textarea[aria-label*="Help me create"], div[contenteditable="true"]',
    submitButtonSelector: 'button[aria-label*="Create"], button[type="submit"]',
    extendButtonSelector: 'button[aria-label*="Insert scene"]',
    promptTemplate:
      'Scene {{scene_number}}: {{scene_title}} ({{duration}}). Visual direction: {{scene_prompt}} [Camera: {{camera_motion}}]. Voiceover script: "{{voiceover_script}}"',
    renderWaitSeconds: 30,
    supportsFrameContinuation: false,
    supportsIngredientsUpload: true,
    isDefaultPreset: true,
  },
];

const scene1Wav = generateSynthesizedWavDataUrl(
  'Every AI video workflow breaks down when you try to keep characters, lighting, and voiceovers aligned across multiple scenes.',
  'Kore',
  5.0
);
const scene2Wav = generateSynthesizedWavDataUrl(
  'By pairing Google Flow Veo 3 camera control with automated browser queue injection, each scene inherits exact frame continuity.',
  'Kore',
  5.0
);
const scene3Wav = generateSynthesizedWavDataUrl(
  'Simultaneously, our integrated speech engine synthesizes frame-locked voiceover tracks and checks pacing before a single frame renders.',
  'Puck',
  5.0
);
const scene4Wav = generateSynthesizedWavDataUrl(
  'Connect your existing Pro browser apps, dispatch the entire storyboard queue, and export a broadcast-ready explainer in minutes.',
  'Kore',
  5.0
);

export const INITIAL_PROJECT: ExplainerProject = {
  id: 'proj-flow-explainer-01',
  title: 'Automating Multi-Scene Explainer Videos with Flow Veo 3 & Omni',
  topicSummary:
    'How product & engineering teams automate Google Flow (Veo 3) and Gemini Omni browser sessions with synchronized multi-speaker voiceovers.',
  selectedAppId: 'google-flow-veo3',
  aspectRatio: '16:9',
  voiceMode: 'single',
  scenes: [
    {
      id: 'scene-1',
      sceneNumber: 1,
      title: 'The Multi-Scene Continuity Gap',
      visualPrompt:
        'Clean scientific isometric rendering of an optical computing processor chip with golden light pathways on a dark matte slate surface, sleek metallic cross-sections, studio rim lighting.',
      cameraMotion: 'Slow Dolly In',
      aspectRatio: '16:9',
      duration: '5s',
      kineticCallout: '01 · Frame & Voice Drift in Manual Workflows',
      voiceoverScript:
        'Every AI video workflow breaks down when you try to keep characters, lighting, and voiceovers aligned across multiple scenes.',
      voicePersona: 'Kore',
      voiceStyle: 'Clear, authoritative documentary narrator',
      estimatedSpeechSeconds: 4.8,
      audioDataUrl: scene1Wav.dataUrl,
      audioSource: 'local-wav-synth',
      dispatchStatus: 'rendered',
      visualTheme: 'architecture',
    },
    {
      id: 'scene-2',
      sceneNumber: 2,
      title: 'Flow Veo 3 Browser Queue Automation',
      visualPrompt:
        'Cinematic wide-angle view of an architectural datarouting hall with minimalist brushed aluminum monoliths and warm amber fiber optic conduits, atmospheric depth.',
      cameraMotion: 'Tracking Right',
      aspectRatio: '16:9',
      duration: '5s',
      kineticCallout: '02 · Automated Browser Queue & Ingredients Lock',
      voiceoverScript:
        'By pairing Google Flow Veo 3 camera control with automated browser queue injection, each scene inherits exact frame continuity.',
      voicePersona: 'Kore',
      voiceStyle: 'Crisp, technical product architect',
      estimatedSpeechSeconds: 4.9,
      audioDataUrl: scene2Wav.dataUrl,
      audioSource: 'local-wav-synth',
      dispatchStatus: 'dispatched',
      visualTheme: 'routing',
    },
    {
      id: 'scene-3',
      sceneNumber: 3,
      title: 'Synchronized Voiceover & Pacing Engine',
      visualPrompt:
        'Macro studio shot of a precision acoustic waveform modulator displaying synchronized gold and cyan harmonic curves over a dark anodized console.',
      cameraMotion: 'Orbital Pan Left',
      aspectRatio: '16:9',
      duration: '5s',
      kineticCallout: '03 · 24kHz Voice Synthesis & Pacing Check',
      voiceoverScript:
        'Simultaneously, our integrated speech engine synthesizes frame-locked voiceover tracks and checks pacing before a single frame renders.',
      voicePersona: 'Puck',
      voiceStyle: 'Energetic, articulate co-host',
      estimatedSpeechSeconds: 5.0,
      audioDataUrl: scene3Wav.dataUrl,
      audioSource: 'local-wav-synth',
      dispatchStatus: 'queued',
      visualTheme: 'waveform',
    },
    {
      id: 'scene-4',
      sceneNumber: 4,
      title: 'Unified Timeline Assembly & Export',
      visualPrompt:
        'High-contrast editorial photo of an engineering control desk overlooking a minimalist glass studio at dusk, warm amber monitors showing completed video timeline.',
      cameraMotion: 'Crane Up Reveal',
      aspectRatio: '16:9',
      duration: '5s',
      kineticCallout: '04 · Zero-Key Browser Pro Automation',
      voiceoverScript:
        'Connect your existing Pro browser apps, dispatch the entire storyboard queue, and export a broadcast-ready explainer in minutes.',
      voicePersona: 'Kore',
      voiceStyle: 'Confident concluding summary',
      estimatedSpeechSeconds: 4.7,
      audioDataUrl: scene4Wav.dataUrl,
      audioSource: 'local-wav-synth',
      dispatchStatus: 'queued',
      visualTheme: 'deployment',
    },
  ],
};
