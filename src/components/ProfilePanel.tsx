import { useGameData } from '../store/useGame';
import { getProfileLevel, getProfileTitle } from '../store/gameStore';
import './ProfilePanel.css';

export function ProfilePanel() {
  const state = useGameData();
  const { profile } = state;
  const level = getProfileLevel(profile.xp);
  const title = getProfileTitle(level);

  // Calculate XP progress within current level
  let xpRemaining = profile.xp;
  for (let i = 1; i < level; i++) {
    xpRemaining -= Math.floor(100 * Math.pow(1.5, i - 1));
  }
  const xpForNext = Math.floor(100 * Math.pow(1.5, level - 1));
  const progress = Math.min(1, xpRemaining / xpForNext);

  const badges = profile.completedQuestIds.length;

  return (
    <div className="profile-panel">
      <div className="profile-header">
        <div className="profile-level-badge">Lv.{level}</div>
        <div className="profile-info">
          <span className="profile-title">{title}</span>
          <span className="profile-xp">{profile.xp} XP total</span>
        </div>
        {badges > 0 && <span className="profile-badges">{badges} 🏅</span>}
      </div>
      <div className="profile-xp-bar">
        <div className="profile-xp-fill" style={{ width: `${progress * 100}%` }} />
        <span className="profile-xp-label">{xpRemaining} / {xpForNext} XP</span>
      </div>
    </div>
  );
}
