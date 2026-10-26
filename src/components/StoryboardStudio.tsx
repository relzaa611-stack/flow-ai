import React, { useState, useRef } from 'react';
import {
  Wand2,
  Volume2,
  Mic,
  Square,
  Download,
  Trash2,
  Copy,
  Check,
  ArrowUpRight,
} from 'lucide-react';
import {
  AspectRatioOption,
  CameraMotionOption,
  DurationOption,
  ExplainerScene,
  TargetBrowserApp,
  VoicePersona,
} from '../types';
import {
  compileScenePrompt,
  estimateVoiceDurationSec,
  evaluateScenePacing,
} from '../utils/automationEngine';
import { VideoPreviewCanvas } from './VideoPreviewCanvas';

interface StoryboardStudioProps {
  projectTitle: string;
  onChangeProjectTitle: (title: string) => void;
  scenes: ExplainerScene[];
  activeSceneId: string;
  onSelectScene: (sceneId: string) => void;
  selectedApp: TargetBrowserApp;
  apps: TargetBrowserApp[];
  onSelectApp: (appId: string) => void;
  voiceMode: 'single' | 'dual-speaker';
  onChangeVoiceMode: (mode: 'single' | 'dual-speaker') => void;
  onUpdateScene: (updated: ExplainerScene) => void;
  onDeleteScene: (sceneId: string) => void;
  onReplaceAllScenes: (newScenes: ExplainerScene[], newTitle?: string) => void;
  onOpenAutomationTab: () => void;
}

const CAMERA_MOTIONS: CameraMotionOption[] = [
  'Slow Dolly In',
  'Tracking Right',
  'Orbital Pan Left',
  'Crane Up Reveal',
  'Slow Pull Back',
  'Static Locked',
];

const VOICE_PERSONAS: VoicePersona[] = [
  'Kore',
  'Puck',
  'Zephyr',
  'Charon',
  'Fenrir',
];

export const StoryboardStudio: React.FC<StoryboardStudioProps> = ({
  projectTitle,
  onChangeProjectTitle,
  scenes,
  activeSceneId,
  onSelectScene,
  selectedApp,
  apps,
  onSelectApp,
  voiceMode,
  onChangeVoiceMode,
  onUpdateScene,
  onDeleteScene,
  onReplaceAllScenes,
  onOpenAutomationTab,
}) => {
  const [topicInput, setTopicInput] = useState('');
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'queued' | 'dispatched' | 'rendered'
  >('all');
  const [synthesizingSceneId, setSynthesizingSceneId] = useState<string | null>(
    null
  );
  const [recordingSceneId, setRecordingSceneId] = useState<string | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [studioNotice, setStudioNotice] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const singleAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const filteredScenes = scenes.filter((s) =>
    statusFilter === 'all' ? true : s.dispatchStatus === statusFilter
  );

  const totalDurationSec = scenes.reduce(
    (sum, s) => sum + (s.duration === '10s' ? 10 : 5),
    0
  );

  const handleGenerateFromTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = topicInput.trim();
    if (!trimmed) {
      setStudioNotice('Enter an explainer topic or product summary to generate a storyboard.');
      return;
    }

    setIsGeneratingStoryboard(true);
    setStudioNotice('Building Veo 3 / Omni multi-scene storyboard & 24kHz voiceover tracks...');
    try {
      const response = await fetch('/api/storyboard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: trimmed,
          aspectRatio: '16:9',
          sceneCount: 4,
        }),
      });
      const data = await response.json();
      if (Array.isArray(data.scenes) && data.scenes.length > 0) {
        onReplaceAllScenes(data.scenes, trimmed);
        setTopicInput('');
        setStudioNotice(
          `Generated ${data.scenes.length} explainer scenes with synchronized voiceovers (${data.source}).`
        );
      }
    } catch {
      setStudioNotice('Failed to reach storyboard generator.');
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  const handleSynthesizeSceneVoice = async (scene: ExplainerScene) => {
    setSynthesizingSceneId(scene.id);
    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: scene.voiceoverScript,
          secondaryScript: scene.secondarySpeakerScript || '',
          voicePersona: scene.voicePersona,
          secondaryVoicePersona: scene.secondaryVoicePersona || 'Puck',
          voiceStyle: scene.voiceStyle,
          voiceMode,
        }),
      });
      const data = await res.json();
      if (data.audioDataUrl) {
        onUpdateScene({
          ...scene,
          audioDataUrl: data.audioDataUrl,
          estimatedSpeechSeconds:
            data.durationSec || estimateVoiceDurationSec(scene.voiceoverScript),
          audioSource: data.audioSource || 'local-wav-synth',
        });
        setStudioNotice(
          `Synthesized 24kHz WAV voiceover for Scene ${scene.sceneNumber} (${scene.voicePersona}).`
        );
      }
    } catch {
      setStudioNotice(`Voice synthesis failed for Scene ${scene.sceneNumber}.`);
    } finally {
      setSynthesizingSceneId(null);
    }
  };

  const handlePlaySceneVoice = (scene: ExplainerScene) => {
    // Also trigger browser native speech synthesis if available for audible words
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(scene.voiceoverScript);
        utter.rate = 1.02;
        window.speechSynthesis.speak(utter);
      } catch {
        // Ignore if blocked
      }
    }

    if (scene.audioDataUrl && singleAudioPlayerRef.current) {
      singleAudioPlayerRef.current.src = scene.audioDataUrl;
      singleAudioPlayerRef.current.currentTime = 0;
      singleAudioPlayerRef.current.play().catch(() => {});
      setStudioNotice(
        `Playing Scene ${scene.sceneNumber} voiceover (${scene.estimatedSpeechSeconds}s, ${scene.voicePersona})`
      );
    }
  };

  const handleToggleMicRecord = async (scene: ExplainerScene) => {
    if (recordingSceneId === scene.id) {
      mediaRecorderRef.current?.stop();
      setRecordingSceneId(null);
      return;
    }

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setStudioNotice('Microphone capture is not available in this browser environment.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        onUpdateScene({
          ...scene,
          audioDataUrl: url,
          audioSource: 'mic-recording',
        });
        stream.getTracks().forEach((t) => t.stop());
        setStudioNotice(`Saved live microphone voiceover for Scene ${scene.sceneNumber}.`);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingSceneId(scene.id);
    } catch {
      setStudioNotice('Microphone permission denied or no audio input device found.');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <audio ref={singleAudioPlayerRef} className="hidden" />

      {/* Top Project Context & Topic-to-Storyboard Automation Bar */}
      <div className="border border-slate-800 rounded-xl bg-[#111827] p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-[260px]">
            <label htmlFor="project-title-input" className="sr-only">
              Explainer Project Title
            </label>
            <input
              id="project-title-input"
              type="text"
              value={projectTitle}
              onChange={(e) => onChangeProjectTitle(e.target.value)}
              className="w-full text-lg font-bold text-slate-100 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-amber-400 focus:outline-none pb-0.5"
            />
            <p className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
              <span>{scenes.length} Scenes</span>
              <span aria-hidden="true"> · </span>
              <span>Total Runtime {totalDurationSec}s</span>
              <span aria-hidden="true"> · </span>
              <span>Active Pro Browser Target: {selectedApp.name}</span>
            </p>
          </div>

          {/* Target Pro Browser App Quick Selector + Voice Mode Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="active-target-app-select"
                className="text-xs text-slate-400 whitespace-nowrap"
              >
                Target Pro App:
              </label>
              <select
                id="active-target-app-select"
                value={selectedApp.id}
                onChange={(e) => onSelectApp(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:border-amber-400 focus:outline-none"
              >
                {apps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              role="group"
              aria-label="Voiceover Speaker Mode"
              className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg"
            >
              <button
                type="button"
                onClick={() => onChangeVoiceMode('single')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  voiceMode === 'single'
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Single Narrator
              </button>
              <button
                type="button"
                onClick={() => onChangeVoiceMode('dual-speaker')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  voiceMode === 'dual-speaker'
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dual-Speaker Dialogue
              </button>
            </div>
          </div>
        </div>

        {/* Topic to Multi-Scene Storyboard Generator Form */}
        <form
          onSubmit={handleGenerateFromTopic}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 border-t border-slate-800/80"
        >
          <label htmlFor="topic-prompt-input" className="sr-only">
            Explainer Video Topic or Script Brief
          </label>
          <input
            id="topic-prompt-input"
            type="text"
            placeholder="Describe any explainer video topic (e.g., 'How Zero-Knowledge Proofs Secure Cross-Chain Payments')..."
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            className="flex-1 px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isGeneratingStoryboard}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Wand2 className="w-3.5 h-3.5" />
            {isGeneratingStoryboard
              ? 'Generating Storyboard...'
              : 'Auto-Generate Scenes & Voice'}
          </button>
        </form>

        {studioNotice && (
          <p role="status" className="text-xs text-amber-300 font-mono">
            {studioNotice}
          </p>
        )}
      </div>

      {/* Main 12-Column Split: Left 7 Cols Scene Storyboard Cards, Right 5 Cols Live Video + Voice Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Multi-Scene Storyboard & Voice Controls */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-100">
              Scene Storyboard & Voiceover Queue
            </h2>

            {/* Interactive Status Filter Buttons */}
            <div
              role="group"
              aria-label="Filter Scenes by Dispatch Status"
              className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg"
            >
              {(['all', 'queued', 'dispatched', 'rendered'] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      statusFilter === st
                        ? 'bg-slate-800 text-slate-100 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st === 'all'
                      ? `All (${scenes.length})`
                      : st.charAt(0).toUpperCase() + st.slice(1)}
                  </button>
                )
              )}
            </div>
          </div>

          {filteredScenes.length === 0 ? (
            <div className="border border-slate-800 rounded-xl bg-[#111827] p-8 text-center">
              <p className="text-sm text-slate-300">
                No scenes match the "{statusFilter}" filter.
              </p>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="mt-3 px-3.5 py-1.5 text-xs font-medium text-slate-950 bg-amber-400 rounded-lg"
              >
                Show All Scenes
              </button>
            </div>
          ) : (
            filteredScenes.map((scene) => {
              const isSelected = scene.id === activeSceneId;
              const pacing = evaluateScenePacing(
                scene.estimatedSpeechSeconds,
                scene.duration
              );
              const compiledPrompt = compileScenePrompt(scene, selectedApp);

              return (
                <article
                  key={scene.id}
                  onClick={() => onSelectScene(scene.id)}
                  className={`border rounded-xl p-5 transition-colors flex flex-col gap-4 ${
                    isSelected
                      ? 'border-amber-400/80 bg-[#111827]'
                      : 'border-slate-800 bg-[#0F1624] hover:border-slate-700'
                  }`}
                >
                  {/* Scene Header & Metadata Line */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-amber-400 tabular-nums">
                          0{scene.sceneNumber}.
                        </span>
                        <input
                          type="text"
                          aria-label={`Scene ${scene.sceneNumber} Title`}
                          value={scene.title}
                          onChange={(e) =>
                            onUpdateScene({ ...scene, title: e.target.value })
                          }
                          className="text-sm font-semibold text-slate-100 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-amber-400 focus:outline-none w-full"
                        />
                      </div>

                      {/* Zero-Pill Unboxed Metadata with · separators */}
                      <p className="text-xs text-slate-400 font-mono tabular-nums mt-1">
                        <span>Clip {scene.duration}</span>
                        <span aria-hidden="true"> · </span>
                        <span>Voice {scene.estimatedSpeechSeconds.toFixed(1)}s</span>
                        <span aria-hidden="true"> · </span>
                        <span
                          className={
                            pacing.status === 'needs-extension'
                              ? 'text-amber-300'
                              : 'text-emerald-400'
                          }
                        >
                          {pacing.recommendation}
                        </span>
                        <span aria-hidden="true"> · </span>
                        <span>Status: {scene.dispatchStatus.toUpperCase()}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard?.writeText(compiledPrompt).catch(() => {});
                          setCopiedPromptId(scene.id);
                          onUpdateScene({
                            ...scene,
                            dispatchStatus: 'dispatched',
                          });
                          setStudioNotice(
                            `Copied Scene ${scene.sceneNumber} Flow prompt & marked Dispatched.`
                          );
                          window.setTimeout(() => setCopiedPromptId(null), 1800);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        {copiedPromptId === scene.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Copied Flow Prompt
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Prompt ({selectedApp.name.split('(')[0].trim()})
                          </>
                        )}
                      </button>

                      {scenes.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteScene(scene.id);
                          }}
                          aria-label={`Delete Scene ${scene.sceneNumber}`}
                          className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Visual Prompt & Camera Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label
                        htmlFor={`camera-${scene.id}`}
                        className="block text-xs text-slate-400 mb-1"
                      >
                        Flow Camera Motion
                      </label>
                      <select
                        id={`camera-${scene.id}`}
                        value={scene.cameraMotion}
                        onChange={(e) =>
                          onUpdateScene({
                            ...scene,
                            cameraMotion: e.target.value as CameraMotionOption,
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:border-amber-400 focus:outline-none"
                      >
                        {CAMERA_MOTIONS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor={`duration-${scene.id}`}
                        className="block text-xs text-slate-400 mb-1"
                      >
                        Clip Duration
                      </label>
                      <select
                        id={`duration-${scene.id}`}
                        value={scene.duration}
                        onChange={(e) =>
                          onUpdateScene({
                            ...scene,
                            duration: e.target.value as DurationOption,
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:border-amber-400 focus:outline-none"
                      >
                        <option value="5s">5s Standard Clip</option>
                        <option value="10s">10s Extended Clip (+5s Flow Extend)</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor={`callout-${scene.id}`}
                        className="block text-xs text-slate-400 mb-1"
                      >
                        On-Screen Kinetic Graphic
                      </label>
                      <input
                        id={`callout-${scene.id}`}
                        type="text"
                        value={scene.kineticCallout}
                        onChange={(e) =>
                          onUpdateScene({
                            ...scene,
                            kineticCallout: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor={`visual-prompt-${scene.id}`}
                      className="block text-xs text-slate-400 mb-1"
                    >
                      Veo 3 / Omni Visual Scene Prompt
                    </label>
                    <textarea
                      id={`visual-prompt-${scene.id}`}
                      rows={2}
                      value={scene.visualPrompt}
                      onChange={(e) =>
                        onUpdateScene({
                          ...scene,
                          visualPrompt: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:border-amber-400 focus:outline-none leading-relaxed"
                    />
                  </div>

                  {/* Integrated Voiceover Script & Synthesis Bar */}
                  <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div className="sm:col-span-2">
                        <label
                          htmlFor={`voice-script-${scene.id}`}
                          className="block text-xs text-slate-400 mb-1"
                        >
                          Synchronized Voiceover Script
                        </label>
                        <input
                          id={`voice-script-${scene.id}`}
                          type="text"
                          value={scene.voiceoverScript}
                          onChange={(e) => {
                            const newScript = e.target.value;
                            onUpdateScene({
                              ...scene,
                              voiceoverScript: newScript,
                              estimatedSpeechSeconds:
                                estimateVoiceDurationSec(newScript),
                            });
                          }}
                          className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`voice-persona-${scene.id}`}
                          className="block text-xs text-slate-400 mb-1"
                        >
                          Narrator Persona
                        </label>
                        <select
                          id={`voice-persona-${scene.id}`}
                          value={scene.voicePersona}
                          onChange={(e) =>
                            onUpdateScene({
                              ...scene,
                              voicePersona: e.target.value as VoicePersona,
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:border-amber-400 focus:outline-none"
                        >
                          {VOICE_PERSONAS.map((vp) => (
                            <option key={vp} value={vp}>
                              {vp} (24kHz)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {voiceMode === 'dual-speaker' && (
                      <div>
                        <label
                          htmlFor={`cohost-script-${scene.id}`}
                          className="block text-xs text-slate-400 mb-1"
                        >
                          Co-Host Dialogue Line (Supports |yeah| backchanneling)
                        </label>
                        <input
                          id={`cohost-script-${scene.id}`}
                          type="text"
                          placeholder="e.g., That's right |yeah| frame continuity stays locked across cuts."
                          value={scene.secondarySpeakerScript || ''}
                          onChange={(e) =>
                            onUpdateScene({
                              ...scene,
                              secondarySpeakerScript: e.target.value,
                            })
                          }
                          className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Voice Synthesis & Playback Action Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSynthesizeSceneVoice(scene);
                          }}
                          disabled={synthesizingSceneId === scene.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          {synthesizingSceneId === scene.id
                            ? 'Synthesizing...'
                            : 'Synthesize Voice'}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlaySceneVoice(scene);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                          Play Voice ({scene.estimatedSpeechSeconds.toFixed(1)}s)
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleMicRecord(scene);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                            recordingSceneId === scene.id
                              ? 'bg-rose-950 border-rose-700 text-rose-200'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {recordingSceneId === scene.id ? (
                            <>
                              <Square className="w-3.5 h-3.5 text-rose-400" />
                              Stop Mic
                            </>
                          ) : (
                            <>
                              <Mic className="w-3.5 h-3.5" />
                              Record Mic
                            </>
                          )}
                        </button>
                      </div>

                      {scene.audioDataUrl && (
                        <a
                          href={scene.audioDataUrl}
                          download={`scene-0${scene.sceneNumber}-${scene.voicePersona.toLowerCase()}.wav`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-amber-300 whitespace-nowrap"
                        >
                          <Download className="w-3.5 h-3.5" />
                          .WAV
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Right Column: Live Synchronized Explainer Video Monitor & Pro Automation Quick Bridge */}
        <div className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-6">
          <VideoPreviewCanvas
            scenes={scenes}
            activeSceneId={activeSceneId}
            onSelectScene={onSelectScene}
            selectedApp={selectedApp}
            onAttachVideoClip={(sceneId, videoUrl) => {
              const target = scenes.find((s) => s.id === sceneId);
              if (target) {
                onUpdateScene({
                  ...target,
                  videoClipUrl: videoUrl,
                  dispatchStatus: 'rendered',
                });
              }
            }}
          />

          <div className="border border-slate-800 rounded-xl bg-[#111827] p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">
                Browser Pro Session Automation Ready
              </h3>
              <span className="text-xs font-mono text-amber-300">
                No API Key Required
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your storyboard is formatted for{' '}
              <strong className="text-slate-200">{selectedApp.name}</strong> (
              <code className="text-amber-300">{selectedApp.targetUrl}</code>). Open the Pro Bridge to copy your in-tab Tampermonkey queue injector or Chrome profile script.
            </p>
            <button
              type="button"
              onClick={onOpenAutomationTab}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              Open Pro Browser Automation Bridge
              <ArrowUpRight className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
