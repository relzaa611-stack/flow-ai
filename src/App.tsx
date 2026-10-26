import { useState } from 'react';
import { TopBar, StudioTab } from './components/TopBar';
import { StoryboardStudio } from './components/StoryboardStudio';
import { TargetAppsManager } from './components/TargetAppsManager';
import { AutomationBridge } from './components/AutomationBridge';
import { VideoPreviewCanvas } from './components/VideoPreviewCanvas';
import { DEFAULT_BROWSER_APPS, INITIAL_PROJECT } from './data/presets';
import { ExplainerScene, TargetBrowserApp } from './types';
import { generateSynthesizedWavDataUrl } from './utils/automationEngine';

export default function App() {
  const [activeTab, setActiveTab] = useState<StudioTab>('storyboard');
  const [apps, setApps] = useState<TargetBrowserApp[]>(DEFAULT_BROWSER_APPS);
  const [selectedAppId, setSelectedAppId] = useState<string>(
    INITIAL_PROJECT.selectedAppId
  );
  const [projectTitle, setProjectTitle] = useState<string>(
    INITIAL_PROJECT.title
  );
  const [voiceMode, setVoiceMode] = useState<'single' | 'dual-speaker'>(
    INITIAL_PROJECT.voiceMode
  );
  const [scenes, setScenes] = useState<ExplainerScene[]>(
    INITIAL_PROJECT.scenes
  );
  const [activeSceneId, setActiveSceneId] = useState<string>(
    INITIAL_PROJECT.scenes[0]?.id || ''
  );

  const selectedApp =
    apps.find((a) => a.id === selectedAppId) || apps[0];

  const handleAddScene = () => {
    const nextNumber = scenes.length + 1;
    const defaultScript = `Scene ${nextNumber} voiceover explaining the visual transition in ${selectedApp.name}.`;
    const wav = generateSynthesizedWavDataUrl(defaultScript, 'Kore', 4.5);
    const newScene: ExplainerScene = {
      id: `scene-${Date.now()}`,
      sceneNumber: nextNumber,
      title: `Scene ${nextNumber}: Visual Continuation`,
      visualPrompt:
        'Cinematic tracking shot continuing the lighting and visual subject from the previous frame, crisp 4k studio aesthetic.',
      cameraMotion: 'Slow Dolly In',
      aspectRatio: '16:9',
      duration: '5s',
      kineticCallout: `0${nextNumber} · Automated Frame Lock`,
      voiceoverScript: defaultScript,
      voicePersona: 'Kore',
      voiceStyle: 'Clear, authoritative explainer narrator',
      estimatedSpeechSeconds: 4.5,
      audioDataUrl: wav.dataUrl,
      audioSource: 'local-wav-synth',
      dispatchStatus: 'queued',
      visualTheme: 'architecture',
    };

    setScenes((prev) => [...prev, newScene]);
    setActiveSceneId(newScene.id);
    setActiveTab('storyboard');
  };

  const handleUpdateScene = (updated: ExplainerScene) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  };

  const handleDeleteScene = (sceneId: string) => {
    setScenes((prev) => {
      const remaining = prev
        .filter((s) => s.id !== sceneId)
        .map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
      if (activeSceneId === sceneId && remaining[0]) {
        setActiveSceneId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleReplaceAllScenes = (
    newScenes: ExplainerScene[],
    newTitle?: string
  ) => {
    setScenes(newScenes);
    if (newScenes[0]) {
      setActiveSceneId(newScenes[0].id);
    }
    if (newTitle) {
      setProjectTitle(newTitle);
    }
  };

  const handleAddApp = (newApp: TargetBrowserApp) => {
    setApps((prev) => [newApp, ...prev]);
  };

  const handleUpdateApp = (updatedApp: TargetBrowserApp) => {
    setApps((prev) =>
      prev.map((a) => (a.id === updatedApp.id ? updatedApp : a))
    );
  };

  const handleDeleteApp = (appId: string) => {
    setApps((prev) => {
      const filtered = prev.filter((a) => a.id !== appId);
      if (selectedAppId === appId && filtered[0]) {
        setSelectedAppId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleBatchAdvanceQueue = () => {
    setScenes((prev) =>
      prev.map((s) =>
        s.dispatchStatus === 'queued'
          ? { ...s, dispatchStatus: 'dispatched' }
          : s
      )
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onAddScene={handleAddScene}
      />

      <main className="flex-1 w-full max-w-[1380px] mx-auto px-6 py-8">
        {activeTab === 'storyboard' && (
          <StoryboardStudio
            projectTitle={projectTitle}
            onChangeProjectTitle={setProjectTitle}
            scenes={scenes}
            activeSceneId={activeSceneId}
            onSelectScene={setActiveSceneId}
            selectedApp={selectedApp}
            apps={apps}
            onSelectApp={setSelectedAppId}
            voiceMode={voiceMode}
            onChangeVoiceMode={setVoiceMode}
            onUpdateScene={handleUpdateScene}
            onDeleteScene={handleDeleteScene}
            onReplaceAllScenes={handleReplaceAllScenes}
            onOpenAutomationTab={() => setActiveTab('automation')}
          />
        )}

        {activeTab === 'apps' && (
          <TargetAppsManager
            apps={apps}
            selectedAppId={selectedAppId}
            onSelectApp={setSelectedAppId}
            onAddApp={handleAddApp}
            onUpdateApp={handleUpdateApp}
            onDeleteApp={handleDeleteApp}
          />
        )}

        {activeTab === 'automation' && (
          <AutomationBridge
            selectedApp={selectedApp}
            scenes={scenes}
            projectTitle={projectTitle}
            onUpdateSceneStatus={(sceneId, status) => {
              const found = scenes.find((s) => s.id === sceneId);
              if (found) {
                handleUpdateScene({ ...found, dispatchStatus: status });
              }
            }}
            onBatchAdvanceQueue={handleBatchAdvanceQueue}
          />
        )}

        {activeTab === 'timeline' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-6">
            <div className="border-b border-slate-800 pb-4">
              <h1 className="text-xl font-semibold text-slate-100">
                Master Explainer Timeline & Clip Assembly
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Preview all scenes in sequence with 24kHz voiceover tracks, or attach MP4/WebM clips rendered from your logged-in{' '}
                <strong className="text-slate-200">{selectedApp.name}</strong> browser session.
              </p>
            </div>

            <VideoPreviewCanvas
              scenes={scenes}
              activeSceneId={activeSceneId}
              onSelectScene={setActiveSceneId}
              selectedApp={selectedApp}
              onAttachVideoClip={(sceneId, videoUrl) => {
                const target = scenes.find((s) => s.id === sceneId);
                if (target) {
                  handleUpdateScene({
                    ...target,
                    videoClipUrl: videoUrl,
                    dispatchStatus: 'rendered',
                  });
                }
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
