import React, { useState } from 'react';
import {
  Copy,
  Check,
  Terminal,
  Code2,
  PlayCircle,
  CheckCircle2,
  ArrowRight,
  Download,
} from 'lucide-react';
import { ExplainerScene, TargetBrowserApp } from '../types';
import {
  compileScenePrompt,
  generateTampermonkeyUserscript,
  generateChromeProfilePlaywrightScript,
} from '../utils/automationEngine';

interface AutomationBridgeProps {
  selectedApp: TargetBrowserApp;
  scenes: ExplainerScene[];
  projectTitle: string;
  onUpdateSceneStatus: (
    sceneId: string,
    status: ExplainerScene['dispatchStatus']
  ) => void;
  onBatchAdvanceQueue: () => void;
}

export const AutomationBridge: React.FC<AutomationBridgeProps> = ({
  selectedApp,
  scenes,
  projectTitle,
  onUpdateSceneStatus,
  onBatchAdvanceQueue,
}) => {
  const [scriptFormat, setScriptFormat] = useState<'userscript' | 'playwright'>(
    'userscript'
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bridgeFeedback, setBridgeFeedback] = useState<string | null>(null);

  const userscriptCode = generateTampermonkeyUserscript(
    selectedApp,
    scenes,
    projectTitle
  );
  const playwrightCode = generateChromeProfilePlaywrightScript(
    selectedApp,
    scenes,
    projectTitle
  );

  const activeScript =
    scriptFormat === 'userscript' ? userscriptCode : playwrightCode;

  const handleCopyText = async (text: string, id: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for restricted clipboard contexts
    }
    setCopiedId(id);
    setBridgeFeedback(label);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadScript = () => {
    const filename =
      scriptFormat === 'userscript'
        ? `flowcast-${selectedApp.id}.user.js`
        : `automate-${selectedApp.id}-pro.mjs`;
    const blob = new Blob([activeScript], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setBridgeFeedback(`Downloaded ${filename} for ${selectedApp.name}`);
  };

  const renderedCount = scenes.filter(
    (s) => s.dispatchStatus === 'rendered'
  ).length;
  const dispatchedCount = scenes.filter(
    (s) => s.dispatchStatus === 'dispatched'
  ).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left 6 Columns: Live Pro Browser Scene Queue Dispatcher */}
      <div className="lg:col-span-6 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">
              Pro Session Queue Dispatcher
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
              Target: {selectedApp.name} · {renderedCount} Rendered ·{' '}
              {dispatchedCount} Dispatched · {scenes.length} Total Scenes
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              onBatchAdvanceQueue();
              setBridgeFeedback(
                `Dispatched all ${scenes.length} compiled scene prompts to ${selectedApp.name} queue.`
              );
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <PlayCircle className="w-4 h-4" />
            Dispatch Entire Queue
          </button>
        </div>

        {bridgeFeedback && (
          <div
            role="status"
            className="px-3.5 py-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs text-amber-200 font-mono"
          >
            {bridgeFeedback}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {scenes.map((scene) => {
            const compiled = compileScenePrompt(scene, selectedApp);
            return (
              <div
                key={scene.id}
                className="border border-slate-800 rounded-xl bg-[#111827] p-4 flex flex-col gap-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      0{scene.sceneNumber}. {scene.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                      {scene.duration} · {scene.aspectRatio} · {scene.cameraMotion} · Status:{' '}
                      <span
                        className={
                          scene.dispatchStatus === 'rendered'
                            ? 'text-emerald-400 font-semibold'
                            : scene.dispatchStatus === 'dispatched'
                            ? 'text-amber-300 font-semibold'
                            : 'text-slate-300'
                        }
                      >
                        {scene.dispatchStatus.toUpperCase()}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyText(
                          compiled,
                          `prompt-${scene.id}`,
                          `Copied Scene ${scene.sceneNumber} compiled Flow prompt & marked Dispatched.`
                        );
                        onUpdateSceneStatus(scene.id, 'dispatched');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      {copiedId === `prompt-${scene.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Copied Prompt
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy & Dispatch
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdateSceneStatus(
                          scene.id,
                          scene.dispatchStatus === 'rendered'
                            ? 'queued'
                            : 'rendered'
                        )
                      }
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                        scene.dispatchStatus === 'rendered'
                          ? 'bg-emerald-950/60 border-emerald-700/70 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {scene.dispatchStatus === 'rendered'
                        ? 'Rendered'
                        : 'Mark Rendered'}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/90 font-mono text-xs text-slate-300 leading-relaxed break-words">
                  {compiled}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right 6 Columns: Live Generated Browser Automation Scripts */}
      <div className="lg:col-span-6 border border-slate-800 rounded-xl bg-[#111827] p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Zero-API-Key Browser Session Scripts
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Auto-generated for{' '}
              <strong className="text-slate-200">{selectedApp.name}</strong> (
              <code className="text-amber-300">{selectedApp.targetUrl}</code>)
            </p>
          </div>

          {/* Interactive Segmented Control */}
          <div
            role="group"
            aria-label="Automation Script Format"
            className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg"
          >
            <button
              type="button"
              onClick={() => setScriptFormat('userscript')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                scriptFormat === 'userscript'
                  ? 'bg-amber-400 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              In-Tab Userscript / Console
            </button>
            <button
              type="button"
              onClick={() => setScriptFormat('playwright')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                scriptFormat === 'playwright'
                  ? 'bg-amber-400 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Chrome Profile CDP
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-300 bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 leading-relaxed">
          {scriptFormat === 'userscript' ? (
            <p>
              <strong>How to run with your logged-in Pro account:</strong> Install in Tampermonkey or paste directly into the DevTools Console on{' '}
              <code className="text-amber-300">{selectedApp.targetUrl}</code>. It mounts a floating queue controller right inside your Pro tab and injects all{' '}
              <span className="font-mono tabular-nums">{scenes.length}</span> scenes automatically.
            </p>
          ) : (
            <p>
              <strong>How to attach to your signed-in Chrome profile:</strong> Launch Chrome with{' '}
              <code className="text-amber-300">--remote-debugging-port=9222</code> and run this script. Playwright reuses your logged-in Google AI Pro cookies without needing any API key.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono text-slate-400">
            {scriptFormat === 'userscript'
              ? `flowcast-${selectedApp.id}.user.js`
              : `automate-${selectedApp.id}-pro.mjs`}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleCopyText(
                  activeScript,
                  'copy-main-script',
                  `Copied ${
                    scriptFormat === 'userscript'
                      ? 'Tampermonkey / Console Injector'
                      : 'Chrome CDP Playwright'
                  } script to clipboard.`
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {copiedId === 'copy-main-script' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied Script
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Script
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadScript}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Download Script
            </button>
          </div>
        </div>

        <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-[460px] leading-relaxed">
          <code>{activeScript}</code>
        </pre>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
          <span>DOM Input Target: {selectedApp.promptInputSelector}</span>
          <a
            href={selectedApp.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-amber-300 hover:underline font-medium whitespace-nowrap"
          >
            Open {selectedApp.name}
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
