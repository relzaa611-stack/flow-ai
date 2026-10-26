import React from 'react';

export type StudioTab = 'storyboard' | 'apps' | 'automation' | 'timeline';

interface TopBarProps {
  activeTab: StudioTab;
  onSelectTab: (tab: StudioTab) => void;
  onAddScene: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onAddScene,
}) => {
  const navItems: { id: StudioTab; label: string }[] = [
    { id: 'storyboard', label: 'Storyboard' },
    { id: 'apps', label: 'Browser Apps' },
    { id: 'automation', label: 'Pro Bridge' },
    { id: 'timeline', label: 'Timeline Player' },
  ];

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800/90 bg-[#0B0F17]">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#storyboard"
        onClick={(e) => {
          e.preventDefault();
          onSelectTab('storyboard');
        }}
        className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400"
      >
        FlowCast Studio
      </a>

      {/* Zone 2: 4 clean single-line text navigation links */}
      <nav
        aria-label="Primary Workspace Navigation"
        className="flex items-center gap-6 text-sm font-medium text-slate-400 overflow-x-auto"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-2 focus-visible:outline-amber-400 ${
                isActive
                  ? 'text-slate-100 border-amber-400'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onAddScene}
          className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-300"
        >
          Add Scene
        </button>
      </div>
    </header>
  );
};
