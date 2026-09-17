import { useState } from "react";

export function useGameController() {
  const [activeGame, setActiveGame] = useState(null);
  const [gameResult, setGameResult] = useState(null);

  const resetGame = () => {
    setActiveGame(null);
    setGameResult(null);
  };

  return { activeGame, setActiveGame, gameResult, setGameResult, resetGame };
}
