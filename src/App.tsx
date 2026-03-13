import { useGame } from './context/GameContext';
import { TitleScreen } from './screens/TitleScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { GameScreen } from './screens/GameScreen';

export function App() {
  const { state } = useGame();

  switch (state.screen) {
    case 'title':
      return <TitleScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'game':
      return <GameScreen />;
    case 'result':
      // Phase 4で実装予定
      return <GameScreen />;
    default:
      return <TitleScreen />;
  }
}
