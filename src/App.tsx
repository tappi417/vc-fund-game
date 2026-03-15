import { useGame } from './context/GameContext';
import { TitleScreen } from './screens/TitleScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { GameScreen } from './screens/GameScreen';
import { ResultScreen } from './screens/ResultScreen';
import { HelpScreen } from './screens/HelpScreen';

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
      return <ResultScreen />;
    case 'help':
      return <HelpScreen />;
    default:
      return <TitleScreen />;
  }
}
