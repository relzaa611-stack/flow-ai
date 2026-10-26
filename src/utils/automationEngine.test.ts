import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateBrowserAppInput,
  estimateVoiceDurationSec,
  evaluateScenePacing,
  compileScenePrompt,
  generateSynthesizedWavDataUrl,
  generateTampermonkeyUserscript,
  buildDeterministicStoryboardFromTopic,
} from './automationEngine';
import { TargetBrowserApp } from '../types';

test('validateBrowserAppInput accepts valid custom Pro browser app config', () => {
  const result = validateBrowserAppInput({
    name: 'Google Flow Veo 3 Pro',
    targetUrl: 'https://labs.google/fx/tools/flow',
    promptInputSelector: 'textarea[placeholder*="prompt"]',
    submitButtonSelector: 'button[aria-label*="Generate"]',
    promptTemplate: '[Camera: {{camera_motion}}] {{scene_prompt}}',
    renderWaitSeconds: 45,
  });
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('validateBrowserAppInput rejects missing URL or missing {{scene_prompt}} placeholder', () => {
  const result = validateBrowserAppInput({
    name: 'A',
    targetUrl: 'not-a-valid-url',
    promptInputSelector: '',
    submitButtonSelector: 'button',
    promptTemplate: 'Static template without placeholder',
    renderWaitSeconds: 2,
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('at least 2 characters')));
  assert.ok(result.errors.some((e) => e.includes('valid URL')));
  assert.ok(result.errors.some((e) => e.includes('{{scene_prompt}}')));
});

test('estimateVoiceDurationSec and evaluateScenePacing calculate accurate timing', () => {
  const shortScript = 'Automate Google Flow Veo three scenes with synchronized voice.';
  const sec = estimateVoiceDurationSec(shortScript, 145);
  assert.ok(sec >= 2 && sec <= 5);

  const pacingOptimal = evaluateScenePacing(4.2, '5s');
  assert.equal(pacingOptimal.status, 'optimal');

  const pacingLong = evaluateScenePacing(7.5, '5s');
  assert.equal(pacingLong.status, 'needs-extension');
});

test('compileScenePrompt substitutes all scene tokens and continuity directives', () => {
  const compiled = compileScenePrompt(
    {
      sceneNumber: 2,
      title: 'Optical Routing',
      visualPrompt: 'Macro shot of fiber optic conduits glowing amber',
      cameraMotion: 'Slow Dolly In',
      aspectRatio: '16:9',
      duration: '5s',
      kineticCallout: 'Zero-Latency Bus',
      voiceoverScript: 'Signals traverse the optical bus in microseconds.',
    },
    {
      promptTemplate:
        'Scene {{scene_number}} ({{duration}}, {{aspect_ratio}}) | Camera: {{camera_motion}} | {{scene_prompt}} | {{continuity_directive}}',
      supportsFrameContinuation: true,
    }
  );

  assert.ok(compiled.includes('Scene 2 (5s, 16:9)'));
  assert.ok(compiled.includes('Camera: Slow Dolly In'));
  assert.ok(compiled.includes('Macro shot of fiber optic conduits glowing amber'));
  assert.ok(compiled.includes('Maintain visual continuity'));
});

test('generateSynthesizedWavDataUrl creates a valid RIFF WAVE base64 data URL', () => {
  const { dataUrl, durationSec } = generateSynthesizedWavDataUrl(
    'Welcome to FlowCast Studio explainer automation.',
    'Kore',
    2.0
  );
  assert.ok(dataUrl.startsWith('data:audio/wav;base64,'));
  assert.equal(durationSec, 2.0);

  const base64Part = dataUrl.split(',')[1];
  const buf = Buffer.from(base64Part, 'base64');
  assert.equal(buf.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(buf.subarray(8, 12).toString('ascii'), 'WAVE');
});

test('generateTampermonkeyUserscript embeds specified app URL and scene queue', () => {
  const mockApp: TargetBrowserApp = {
    id: 'custom-flow',
    name: 'Custom Flow Pro',
    engineFamily: 'veo-3-flow',
    targetUrl: 'https://labs.google/fx/tools/flow',
    accountTierLabel: 'Google AI Pro Account',
    promptInputSelector: 'textarea.flow-prompt',
    submitButtonSelector: 'button.flow-generate',
    extendButtonSelector: 'button.flow-extend',
    promptTemplate: '{{scene_prompt}} --motion "{{camera_motion}}"',
    renderWaitSeconds: 40,
    supportsFrameContinuation: true,
    supportsIngredientsUpload: true,
  };
  const scenes = buildDeterministicStoryboardFromTopic('Quantum Photonics', '16:9', 2);
  const script = generateTampermonkeyUserscript(mockApp, scenes, 'Quantum Explainer');

  assert.ok(script.includes('// ==UserScript=='));
  assert.ok(script.includes('https://labs.google/fx/tools/flow*'));
  assert.ok(script.includes('textarea.flow-prompt'));
  assert.ok(script.includes('Quantum Photonics'));
});
