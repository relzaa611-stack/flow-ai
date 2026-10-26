export type EngineFamily = 'veo-3-flow' | 'gemini-omni' | 'custom-browser';

export type AspectRatioOption = '16:9' | '9:16';
export type DurationOption = '5s' | '10s';
export type CameraMotionOption =
  | 'Static Locked'
  | 'Slow Dolly In'
  | 'Slow Pull Back'
  | 'Orbital Pan Left'
  | 'Tracking Right'
  | 'Crane Up Reveal';

export type VoicePersona = 'Kore' | 'Puck' | 'Zephyr' | 'Charon' | 'Fenrir';

export interface TargetBrowserApp {
  id: string;
  name: string;
  engineFamily: EngineFamily;
  targetUrl: string;
  accountTierLabel: string;
  promptInputSelector: string;
  submitButtonSelector: string;
  extendButtonSelector: string;
  promptTemplate: string;
  renderWaitSeconds: number;
  supportsFrameContinuation: boolean;
  supportsIngredientsUpload: boolean;
  isDefaultPreset?: boolean;
}

export interface ExplainerScene {
  id: string;
  sceneNumber: number;
  title: string;
  visualPrompt: string;
  cameraMotion: CameraMotionOption;
  aspectRatio: AspectRatioOption;
  duration: DurationOption;
  kineticCallout: string;
  voiceoverScript: string;
  secondarySpeakerScript?: string;
  voicePersona: VoicePersona;
  secondaryVoicePersona?: VoicePersona;
  voiceStyle: string;
  estimatedSpeechSeconds: number;
  audioDataUrl?: string;
  audioSource?: 'gemini-tts' | 'local-wav-synth' | 'mic-recording' | 'uploaded';
  videoClipUrl?: string;
  dispatchStatus: 'queued' | 'dispatched' | 'rendered';
  visualTheme: 'architecture' | 'routing' | 'deployment' | 'waveform' | 'custom';
}

export interface ExplainerProject {
  id: string;
  title: string;
  topicSummary: string;
  selectedAppId: string;
  aspectRatio: AspectRatioOption;
  voiceMode: 'single' | 'dual-speaker';
  scenes: ExplainerScene[];
}
