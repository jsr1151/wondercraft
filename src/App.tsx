import { useMemo } from 'react';
import type { InsightType } from './types';
import { GameProvider, getProfileLevel } from './store/gameStore';
import { useGame } from './store/useGame';
import { BigBang } from './components/BigBang';
import { PlanetCanvas } from './components/PlanetCanvas';
import { ELEMENTS } from './data/elements';
import { CraftingArea } from './components/CraftingArea';
import { ElementCollection } from './components/ElementCollection';
import { RecentDiscoveries } from './components/RecentDiscoveries';
import { EventLog } from './components/EventLog';
import { HintPanel } from './components/HintPanel';
import { InsightPanel } from './components/InsightPanel';
import { MasterRecipeLab } from './components/MasterRecipeLab';
import { EmojiAtlas } from './components/EmojiAtlas';
import { UntriedCombosSidebar } from './components/UntriedCombosSidebar';
import { SolarSystemView } from './components/SolarSystemView';
import { ProfilePanel } from './components/ProfilePanel';
import { QuestPanel } from './components/QuestPanel';
import { RecoveryPanel } from './components/RecoveryPanel';
import './App.css';

interface CollapsiblePanelProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsiblePanel({ title, children, defaultOpen = true }: CollapsiblePanelProps) {
  return (
    <details className="panel-shell" open={defaultOpen}>
      <summary className="panel-shell-summary">{title}</summary>
      <div className="panel-shell-body">{children}</div>
    </details>
  );
}

function GameApp() {
  const { state, dispatch } = useGame();

  const handleBigBang = () => dispatch({ type: 'BIG_BANG' });
  const handleReset = () => {
    if (confirm('Reset the world? All progress will be lost.')) {
      dispatch({ type: 'RESET_WORLD' });
    }
  };
  const handleHint = () => dispatch({ type: 'REQUEST_INSIGHT_HINT_AUTO' });
  const handleInsightHint = (insightType: InsightType) =>
    dispatch({ type: 'REQUEST_INSIGHT_HINT', insightType });
  const handleInsightRandomUnlock = (insightType: InsightType) =>
    dispatch({ type: 'REQUEST_RANDOM_DISCOVERY', insightType });

  // Build element-id → icon lookup for planet rendering (emoji strings OR image URLs)
  const emojiMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const el of ELEMENTS) {
      if (el.emoji) map[el.id] = el.emoji;
    }
    for (const el of state.customElements) {
      if (el.emoji) map[el.id] = el.emoji;
    }
    // Icon overrides win — include image URLs so the planet can draw them
    for (const [id, icon] of Object.entries(state.iconOverrides)) {
      if (icon && icon.trim()) {
        map[id] = icon;
      }
    }
    return map;
  }, [state.customElements, state.iconOverrides]);

  if (!state.bigBangDone) {
    return <BigBang onBigBang={handleBigBang} />;
  }

  const activePlanetName = state.planets[state.activePlanetIndex]?.name ?? 'Genesis';

  const discoveredCount = state.discoveredElements.size;
  const profileLevel = getProfileLevel(state.profile.xp);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <span className="app-title-icon">🔮</span>
          <h1>Wondercraft</h1>
          <span className="app-subtitle">{activePlanetName} — {discoveredCount} elements</span>
        </div>
        <div className="app-controls">
          <button className="btn-hint" onClick={handleHint}>💡 Insight Hint</button>
          <button className="btn-reset" onClick={handleReset}>🔄 Reset</button>
        </div>
      </header>

      <RecoveryPanel />

      <main className="app-main">
        <div className="app-left">
          <PlanetCanvas
            worldInfluence={state.worldInfluence}
            seed={state.seed}
            profileLevel={profileLevel}
            discoveredElements={state.discoveredElements}
            emojiMap={emojiMap}
          />
          <SolarSystemView />
          <CollapsiblePanel title="Hints" defaultOpen>
            <HintPanel hints={state.hints} />
          </CollapsiblePanel>
          <CollapsiblePanel title="Insight" defaultOpen>
            <InsightPanel
              insight={state.insight}
              onRequestHint={handleInsightHint}
              onRequestRandomDiscovery={handleInsightRandomUnlock}
            />
          </CollapsiblePanel>
          <CollapsiblePanel title="Profile" defaultOpen>
            <ProfilePanel />
          </CollapsiblePanel>
          <CollapsiblePanel title="Quests" defaultOpen>
            <QuestPanel />
          </CollapsiblePanel>
        </div>
        <div className="app-right">
          <CollapsiblePanel title="Crafting" defaultOpen>
            <CraftingArea />
          </CollapsiblePanel>
          <CollapsiblePanel title="Master Recipes" defaultOpen>
            <MasterRecipeLab />
          </CollapsiblePanel>
          <CollapsiblePanel title="Elements" defaultOpen>
            <ElementCollection />
          </CollapsiblePanel>
        </div>
      </main>

      <CollapsiblePanel title="Recent Discoveries" defaultOpen>
        <RecentDiscoveries />
      </CollapsiblePanel>
      <CollapsiblePanel title="Event Log" defaultOpen={false}>
        <EventLog />
      </CollapsiblePanel>
      <CollapsiblePanel title="Emoji Atlas" defaultOpen={false}>
        <EmojiAtlas />
      </CollapsiblePanel>
      <UntriedCombosSidebar />
    </div>
  );
}

function App() {
  return (
    <GameProvider>
      <GameApp />
    </GameProvider>
  );
}

export default App;
