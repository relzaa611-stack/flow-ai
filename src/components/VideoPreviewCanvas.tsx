import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Download, Upload } from 'lucide-react';
import { ExplainerScene, TargetBrowserApp } from '../types';

interface VideoPreviewCanvasProps {
  scenes: ExplainerScene[];
  activeSceneId: string;
  onSelectScene: (sceneId: string) => void;
  selectedApp: TargetBrowserApp;
  onAttachVideoClip: (sceneId: string, videoUrl: string) => void;
}

export const VideoPreviewCanvas: React.FC<VideoPreviewCanvasProps> = ({
  scenes,
  activeSceneId,
  onSelectScene,
  selectedApp,
  onAttachVideoClip,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [elapsedInScene, setElapsedInScene] = useState(0);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const activeScene =
    scenes.find((s) => s.id === activeSceneId) || scenes[0];
  const activeSceneIndex = Math.max(
    0,
    scenes.findIndex((s) => s.id === activeScene?.id)
  );

  const sceneDurationSec = activeScene?.duration === '10s' ? 10 : 5;

  // Render frame onto HTML5 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeScene) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const progress = Math.min(1, Math.max(0, elapsedInScene / sceneDurationSec));

    ctx.clearRect(0, 0, w, h);

    // Camera transform math based on cameraMotion
    ctx.save();
    let scale = 1.0;
    let offsetX = 0;
    let offsetY = 0;

    switch (activeScene.cameraMotion) {
      case 'Slow Dolly In':
        scale = 1.0 + progress * 0.14;
        break;
      case 'Slow Pull Back':
        scale = 1.14 - progress * 0.14;
        break;
      case 'Tracking Right':
        scale = 1.06;
        offsetX = (0.5 - progress) * 48;
        break;
      case 'Orbital Pan Left':
        scale = 1.06;
        offsetX = (progress - 0.5) * 48;
        break;
      case 'Crane Up Reveal':
        scale = 1.05;
        offsetY = (0.5 - progress) * 36;
        break;
      default:
        scale = 1.0;
    }

    ctx.translate(w / 2 + offsetX, h / 2 + offsetY);
    ctx.scale(scale, scale);
    ctx.translate(-w / 2, -h / 2);

    // Studio background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#090D16');
    bgGrad.addColorStop(0.55, '#111827');
    bgGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-60, -60, w + 120, h + 120);

    // Subtle perspective grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    const gridSpacing = 40;
    for (let x = 0; x < w; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Scene-specific procedural visual art
    const cx = w / 2;
    const cy = h / 2 - 18;

    if (activeScene.visualTheme === 'architecture') {
      // Isometric optical processor core
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.lineWidth = 1.5;
      for (let ring = 1; ring <= 3; ring++) {
        const rx = ring * 52;
        const ry = ring * 28;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Animated optical nodes
      for (let node = 0; node < 6; node++) {
        const angle = (node / 6) * Math.PI * 2 + progress * Math.PI * 1.2;
        const nx = cx + Math.cos(angle) * 104;
        const ny = cy + Math.sin(angle) * 56;
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(nx, ny, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (activeScene.visualTheme === 'routing') {
      // Architectural data routing monoliths & fiber conduits
      for (let col = -2; col <= 2; col++) {
        const bx = cx + col * 72 - 18;
        const bh = 95 + Math.abs(col) * 16;
        const by = cy - bh / 2;
        ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.fillRect(bx, by, 36, bh);
        ctx.strokeRect(bx, by, 36, bh);

        // Flowing signal pulse
        const pulseY = by + ((progress * 140 + (col + 2) * 25) % bh);
        ctx.fillStyle = '#FBBF24';
        ctx.fillRect(bx + 4, pulseY, 28, 3);
      }
    } else if (activeScene.visualTheme === 'waveform') {
      // 24kHz harmonic speech modulator wave
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let x = cx - 180; x <= cx + 180; x += 4) {
        const norm = (x - (cx - 180)) / 360;
        const env = Math.sin(norm * Math.PI);
        const y =
          cy +
          Math.sin(norm * 24 + progress * 18) * 36 * env +
          Math.cos(norm * 11 - progress * 12) * 14 * env;
        if (x === cx - 180) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else {
      // Deployment & timeline convergence
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 150, cy - 55, 300, 110);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
      ctx.fillRect(cx - 146, cy - 51, 292 * Math.max(0.15, progress), 102);
    }

    ctx.restore();

    // Measured bottom contrast scrim for readable kinetic callout & closed captions
    const scrim = ctx.createLinearGradient(0, h * 0.48, 0, h);
    scrim.addColorStop(0, 'rgba(11, 15, 23, 0)');
    scrim.addColorStop(0.5, 'rgba(11, 15, 23, 0.72)');
    scrim.addColorStop(1, 'rgba(11, 15, 23, 0.94)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, h * 0.48, w, h * 0.52);

    // Top metadata watermark (camera motion & target app)
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.78)';
    ctx.fillText(
      `SCENE 0${activeScene.sceneNumber} · ${activeScene.cameraMotion.toUpperCase()} · ${activeScene.aspectRatio} · ${selectedApp.name}`,
      20,
      28
    );

    // Kinetic callout lower-third title
    ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FBBF24';
    ctx.fillText(activeScene.kineticCallout, 20, h - 64);

    // Closed-caption voiceover script
    ctx.font = '400 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#F8FAFC';
    const words = activeScene.voiceoverScript.split(' ');
    let line1 = '';
    let line2 = '';
    for (const word of words) {
      if ((line1 + ' ' + word).length < 68) {
        line1 = (line1 + ' ' + word).trim();
      } else {
        line2 = (line2 + ' ' + word).trim();
      }
    }
    ctx.fillText(line1, 20, h - 40);
    if (line2) {
      ctx.fillText(line2, 20, h - 20);
    }

    // Progress bar along bottom edge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(0, h - 4, w, 4);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(0, h - 4, w * progress, 4);
  }, [activeScene, elapsedInScene, sceneDurationSec, selectedApp.name]);

  // Playback timer & auto-advance across scenes
  useEffect(() => {
    if (!isPlayingAll || !activeScene) return;

    // Play audio if available
    if (audioRef.current && activeScene.audioDataUrl && !isMuted) {
      audioRef.current.src = activeScene.audioDataUrl;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore autoplay restrictions in headless mode
      });
    }

    const interval = window.setInterval(() => {
      setElapsedInScene((prev) => {
        const next = prev + 0.1;
        if (next >= sceneDurationSec) {
          const nextScene = scenes[activeSceneIndex + 1];
          if (nextScene) {
            onSelectScene(nextScene.id);
            return 0;
          } else {
            setIsPlayingAll(false);
            return sceneDurationSec;
          }
        }
        return Math.round(next * 10) / 10;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [
    isPlayingAll,
    activeScene,
    activeSceneIndex,
    sceneDurationSec,
    scenes,
    onSelectScene,
    isMuted,
  ]);

  const handleTogglePlay = () => {
    if (!isPlayingAll && elapsedInScene >= sceneDurationSec) {
      setElapsedInScene(0);
    }
    setIsPlayingAll((prev) => !prev);
  };

  const handleRestart = () => {
    setIsPlayingAll(false);
    setElapsedInScene(0);
    if (scenes[0]) {
      onSelectScene(scenes[0].id);
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const handleExportStoryboardManifest = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      targetBrowserApp: selectedApp,
      scenes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowcast-explainer-bundle.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportStatus('Exported explainer storyboard & voiceover bundle (.json)');
  };

  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeScene) return;
    const url = URL.createObjectURL(file);
    onAttachVideoClip(activeScene.id, url);
    setExportStatus(`Attached rendered clip "${file.name}" to Scene ${activeScene.sceneNumber}`);
  };

  return (
    <section
      aria-label="Live Explainer Video & Voiceover Monitor"
      className="border border-slate-800 rounded-xl bg-[#111827] p-5 flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Synchronized Explainer Monitor
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Scene 0{activeScene?.sceneNumber || 1} of 0{scenes.length} ·{' '}
            <span className="font-mono tabular-nums">
              {elapsedInScene.toFixed(1)}s / {sceneDurationSec.toFixed(1)}s
            </span>{' '}
            · Voice: {activeScene?.voicePersona} (24kHz WAV)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm"
            className="hidden"
            onChange={handleVideoFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            Attach Flow Clip
          </button>
          <button
            type="button"
            onClick={handleExportStoryboardManifest}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export Bundle
          </button>
        </div>
      </div>

      {/* Canvas or Attached Veo 3 Clip Viewport */}
      <div className="relative w-full overflow-hidden rounded-lg border border-slate-800 bg-[#090D16] aspect-video flex items-center justify-center">
        {activeScene?.videoClipUrl ? (
          <video
            src={activeScene.videoClipUrl}
            controls
            className="w-full h-full object-cover"
          />
        ) : (
          <canvas
            ref={canvasRef}
            data-testid="explainer-preview-canvas"
            width={720}
            height={405}
            className="w-full h-full object-cover"
          />
        )}
        <audio ref={audioRef} className="hidden" />
      </div>

      {/* Transport & Scene Scrubber Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={isPlayingAll ? 'Pause Explainer Preview' : 'Play Explainer Preview'}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {isPlayingAll ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                Pause Preview
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Play All Scenes
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleRestart}
            aria-label="Reset Timeline to Scene 1"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            aria-label={isMuted ? 'Unmute Voiceover' : 'Mute Voiceover'}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                Muted
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                24kHz Voice Active
              </>
            )}
          </button>
        </div>

        {/* Interactive Scene Scrubber Tabs */}
        <div
          role="group"
          aria-label="Scene Scrubber"
          className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800"
        >
          {scenes.map((scene) => {
            const selected = scene.id === activeScene?.id;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => {
                  setElapsedInScene(0);
                  onSelectScene(scene.id);
                }}
                className={`px-2.5 py-1 text-xs font-mono tabular-nums rounded transition-colors whitespace-nowrap shrink-0 ${
                  selected
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                S0{scene.sceneNumber}
              </button>
            );
          })}
        </div>
      </div>

      {exportStatus && (
        <p role="status" className="text-xs text-amber-300 font-mono">
          {exportStatus}
        </p>
      )}
    </section>
  );
};
