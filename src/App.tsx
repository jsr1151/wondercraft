import { GameProvider } from './store/gameStore';
import { useGame } from './store/useGame';
import { BigBang } from './components/BigBang';
import { PlanetCanvas } from './components/PlanetCanvas';
import { CraftingArea } from './components/CraftingArea';
import { ElementCollection } from './components/ElementCollection';
import { RecentDiscoveries } from './components/RecentDiscoveries';
import { EventLog } from './components/EventLog';
import { HintPanel } from './components/HintPanel';
import { MasterRecipeLab } from './components/MasterRecipeLab';
import { EmojiAtlas } from './components/EmojiAtlas';
import { UntriedCombosSidebar } from './components/UntriedCombosSidebar';
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
  const handleHint = () => dispatch({ type: 'REQUEST_HINT' });

  if (!state.bigBangDone) {
    return <BigBang onBigBang={handleBigBang} />;
  }

  const discoveredCount = state.discoveredElements.size;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <span className="app-title-icon">🔮</span>
          <h1>Wondercraft</h1>
          <span className="app-subtitle">Elements Discovered: {discoveredCount}</span>
        </div>
        <div className="app-controls">
          <button className="btn-hint" onClick={handleHint}>💡 Hint</button>
          <button className="btn-reset" onClick={handleReset}>🔄 Reset</button>
        </div>
      </header>

      <main className="app-main">
        <div className="app-left">
          <PlanetCanvas
            worldInfluence={state.worldInfluence}
            seed={state.seed}
          />
          <CollapsiblePanel title="Hints" defaultOpen>
            <HintPanel hints={state.hints} />
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
