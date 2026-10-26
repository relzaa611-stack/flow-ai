import React, { useState } from 'react';
import { Globe, Plus, Check, Trash2, ExternalLink } from 'lucide-react';
import { EngineFamily, TargetBrowserApp } from '../types';
import { validateBrowserAppInput } from '../utils/automationEngine';

interface TargetAppsManagerProps {
  apps: TargetBrowserApp[];
  selectedAppId: string;
  onSelectApp: (appId: string) => void;
  onAddApp: (newApp: TargetBrowserApp) => void;
  onUpdateApp: (updatedApp: TargetBrowserApp) => void;
  onDeleteApp: (appId: string) => void;
}

export const TargetAppsManager: React.FC<TargetAppsManagerProps> = ({
  apps,
  selectedAppId,
  onSelectApp,
  onAddApp,
  onUpdateApp,
  onDeleteApp,
}) => {
  const [name, setName] = useState('');
  const [engineFamily, setEngineFamily] = useState<EngineFamily>('veo-3-flow');
  const [targetUrl, setTargetUrl] = useState('https://labs.google/fx/tools/flow');
  const [accountTierLabel, setAccountTierLabel] = useState('Logged-in Pro Browser Account');
  const [promptInputSelector, setPromptInputSelector] = useState(
    'textarea[placeholder*="Describe"], div[contenteditable="true"]'
  );
  const [submitButtonSelector, setSubmitButtonSelector] = useState(
    'button[aria-label*="Generate"], button[type="submit"]'
  );
  const [extendButtonSelector, setExtendButtonSelector] = useState(
    'button[aria-label*="Extend"]'
  );
  const [promptTemplate, setPromptTemplate] = useState(
    '[Scene {{scene_number}} | {{aspect_ratio}} | {{duration}} | Camera: {{camera_motion}}] {{scene_prompt}} — Voice cue: "{{voiceover_script}}"'
  );
  const [renderWaitSeconds, setRenderWaitSeconds] = useState<number>(45);
  const [supportsFrameContinuation, setSupportsFrameContinuation] = useState(true);
  const [supportsIngredientsUpload, setSupportsIngredientsUpload] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const selectedApp = apps.find((a) => a.id === selectedAppId) || apps[0];

  const handleCreateCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateBrowserAppInput({
      name,
      targetUrl,
      promptInputSelector,
      submitButtonSelector,
      promptTemplate,
      renderWaitSeconds: Number(renderWaitSeconds),
    });

    if (!validation.valid) {
      setValidationErrors(validation.errors);
      setSaveMessage(null);
      return;
    }

    const created: TargetBrowserApp = {
      id: `custom-app-${Date.now()}`,
      name: name.trim(),
      engineFamily,
      targetUrl: targetUrl.trim(),
      accountTierLabel: accountTierLabel.trim() || 'Logged-in Pro Browser Account',
      promptInputSelector: promptInputSelector.trim(),
      submitButtonSelector: submitButtonSelector.trim(),
      extendButtonSelector: extendButtonSelector.trim() || 'button[aria-label*="Extend"]',
      promptTemplate: promptTemplate.trim(),
      renderWaitSeconds: Number(renderWaitSeconds),
      supportsFrameContinuation,
      supportsIngredientsUpload,
      isDefaultPreset: false,
    };

    onAddApp(created);
    onSelectApp(created.id);
    setValidationErrors([]);
    setName('');
    setSaveMessage(`Added "${created.name}" and set as active Pro Browser target.`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left 7 Columns: Active Browser Apps List & Inspector */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-xl font-semibold text-slate-100">
            Configured Pro Browser Applications
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Select or customize the web apps where your Google AI Pro, Ultra, or Workspace account is signed in. No API keys required—automation runs against your active browser session.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {apps.map((app) => {
            const isSelected = app.id === selectedAppId;
            return (
              <div
                key={app.id}
                className={`border rounded-xl p-5 transition-colors ${
                  isSelected
                    ? 'border-amber-400/80 bg-[#111827]'
                    : 'border-slate-800 bg-[#0F1624] hover:border-slate-700'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-semibold text-slate-100">
                        {app.name}
                      </h3>
                    </div>
                    {/* Unboxed clean metadata with typographic separators */}
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      <span>{app.accountTierLabel}</span>
                      <span aria-hidden="true"> · </span>
                      <span>Wait {app.renderWaitSeconds}s</span>
                      <span aria-hidden="true"> · </span>
                      <span>
                        {app.supportsFrameContinuation
                          ? 'Frame Continuity Enabled'
                          : 'Independent Clips'}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectApp(app.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Active Target App
                        </>
                      ) : (
                        'Select Target App'
                      )}
                    </button>

                    {!app.isDefaultPreset && (
                      <button
                        type="button"
                        onClick={() => onDeleteApp(app.id)}
                        aria-label={`Remove ${app.name}`}
                        className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Target Web App URL</span>
                    <a
                      href={app.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-amber-300 hover:underline break-all"
                    >
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      {app.targetUrl}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">DOM Input Selector</span>
                    <code className="font-mono text-slate-200 bg-slate-900/90 px-2 py-1 rounded block truncate">
                      {app.promptInputSelector}
                    </code>
                  </div>
                </div>

                <div className="mt-3 text-xs">
                  <label
                    htmlFor={`template-${app.id}`}
                    className="text-slate-400 block mb-1"
                  >
                    Prompt Injection Template (Editable)
                  </label>
                  <input
                    id={`template-${app.id}`}
                    type="text"
                    value={app.promptTemplate}
                    onChange={(e) =>
                      onUpdateApp({ ...app, promptTemplate: e.target.value })
                    }
                    className="w-full px-3 py-1.5 font-mono text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right 5 Columns: Specify Custom Pro Browser App Form */}
      <div className="lg:col-span-5 border border-slate-800 rounded-xl bg-[#111827] p-6">
        <h3 className="text-base font-semibold text-slate-100">
          Specify Custom Pro Browser App
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Add any web app where you have a logged-in Pro subscription (custom Flow workspace, internal Veo 3 portal, NotebookLM Studio, or Gemini web instance).
        </p>

        <form onSubmit={handleCreateCustomApp} className="mt-5 flex flex-col gap-4" noValidate>
          <div>
            <label
              htmlFor="custom-app-name"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Application Name
            </label>
            <input
              id="custom-app-name"
              type="text"
              placeholder="e.g., My Custom Flow Veo 3 Workspace"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="custom-app-engine"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Engine Family
              </label>
              <select
                id="custom-app-engine"
                value={engineFamily}
                onChange={(e) => setEngineFamily(e.target.value as EngineFamily)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:border-amber-400 focus:outline-none"
              >
                <option value="veo-3-flow">Google Flow (Veo 3)</option>
                <option value="gemini-omni">Gemini Omni / Web Pro</option>
                <option value="custom-browser">Custom Web Studio</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="custom-app-wait"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Render Wait (Seconds)
              </label>
              <input
                id="custom-app-wait"
                type="number"
                min={5}
                max={600}
                value={renderWaitSeconds}
                onChange={(e) => setRenderWaitSeconds(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="custom-app-url"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Target Web App URL
            </label>
            <input
              id="custom-app-url"
              type="url"
              placeholder="https://labs.google/fx/tools/flow"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="custom-app-tier"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Account Session Label
            </label>
            <input
              id="custom-app-tier"
              type="text"
              value={accountTierLabel}
              onChange={(e) => setAccountTierLabel(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="custom-app-input-selector"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Prompt Input CSS Selector
              </label>
              <input
                id="custom-app-input-selector"
                type="text"
                value={promptInputSelector}
                onChange={(e) => setPromptInputSelector(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="custom-app-submit-selector"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Submit Button CSS Selector
              </label>
              <input
                id="custom-app-submit-selector"
                type="text"
                value={submitButtonSelector}
                onChange={(e) => setSubmitButtonSelector(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="custom-app-extend-selector"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Scene Extend / Continuation Selector
            </label>
            <input
              id="custom-app-extend-selector"
              type="text"
              value={extendButtonSelector}
              onChange={(e) => setExtendButtonSelector(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="custom-app-template"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Prompt Template (Must include <code>{'{{scene_prompt}}'}</code>)
            </label>
            <textarea
              id="custom-app-template"
              rows={3}
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2 text-xs text-slate-300">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={supportsFrameContinuation}
                onChange={(e) => setSupportsFrameContinuation(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-amber-400 focus:ring-amber-400"
              />
              <span>Supports Frame-to-Frame Scene Continuity</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={supportsIngredientsUpload}
                onChange={(e) => setSupportsIngredientsUpload(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-amber-400 focus:ring-amber-400"
              />
              <span>Supports Reference Character / Ingredients Upload</span>
            </label>
          </div>

          {validationErrors.length > 0 && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-200 flex flex-col gap-1"
            >
              {validationErrors.map((err, i) => (
                <p key={i}>• {err}</p>
              ))}
            </div>
          )}

          {saveMessage && (
            <p role="status" className="text-xs text-emerald-400 font-medium">
              {saveMessage}
            </p>
          )}

          <button
            type="submit"
            className="mt-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Save Custom Pro App
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800 text-xs text-slate-400">
          Currently active target:{' '}
          <strong className="text-slate-200">{selectedApp?.name}</strong>
        </div>
      </div>
    </div>
  );
};
