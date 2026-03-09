import { useGame } from '../store/useGame';
import { QUESTS } from '../store/gameStore';
import './QuestPanel.css';

export function QuestPanel() {
  const { state, dispatch } = useGame();
  const { profile } = state;

  const activeQuest = QUESTS.find((q) => q.id === profile.activeQuestId);
  const availableQuests = QUESTS.filter(
    (q) => !profile.completedQuestIds.includes(q.id) && q.id !== profile.activeQuestId
  );
  const completedQuests = QUESTS.filter((q) => profile.completedQuestIds.includes(q.id));

  return (
    <div className="quest-panel">
      {activeQuest && (
        <div className="quest-active">
          <div className="quest-active-header">
            <span className="quest-badge">{activeQuest.badge ?? '📜'}</span>
            <span className="quest-active-title">{activeQuest.title}</span>
            <span className="quest-type-tag">{activeQuest.type}</span>
          </div>
          <p className="quest-desc">{activeQuest.description}</p>
          <span className="quest-reward">+{activeQuest.xpReward} XP</span>
        </div>
      )}

      {!activeQuest && availableQuests.length > 0 && (
        <p className="quest-prompt">Choose a quest to begin:</p>
      )}

      {availableQuests.length > 0 && (
        <div className="quest-list">
          {availableQuests.map((quest) => (
            <div
              key={quest.id}
              className="quest-item"
              onClick={() => dispatch({ type: 'START_QUEST', questId: quest.id })}
            >
              <span className="quest-item-badge">{quest.badge ?? '📜'}</span>
              <div className="quest-item-info">
                <span className="quest-item-title">{quest.title}</span>
                <span className="quest-item-desc">{quest.description}</span>
              </div>
              <span className="quest-item-reward">+{quest.xpReward}</span>
            </div>
          ))}
        </div>
      )}

      {completedQuests.length > 0 && (
        <div className="quest-completed">
          <span className="quest-completed-header">Completed ({completedQuests.length})</span>
          <div className="quest-completed-badges">
            {completedQuests.map((q) => (
              <span key={q.id} className="quest-completed-badge" title={q.title}>
                {q.badge ?? '✅'}
              </span>
            ))}
          </div>
        </div>
      )}

      {availableQuests.length === 0 && !activeQuest && completedQuests.length > 0 && (
        <p className="quest-all-done">All quests completed! 🎉</p>
      )}
    </div>
  );
}
