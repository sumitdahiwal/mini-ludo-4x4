import { useEffect, useState } from "react";
import "./App.css";

const PLAYERS = [
  {
    id: "green",
    name: "Green",
    short: "G",
    color: "#22c55e",
    soft: "rgba(34, 197, 94, .16)",
    rotation: 1,
  },
  {
    id: "red",
    name: "Red",
    short: "R",
    color: "#fb7185",
    soft: "rgba(251, 113, 133, .16)",
    rotation: 3,
  },
  {
    id: "yellow",
    name: "Yellow",
    short: "Y",
    color: "#fbbf24",
    soft: "rgba(251, 191, 36, .16)",
    rotation: 2,
  },
  {
    id: "blue",
    name: "Blue",
    short: "B",
    color: "#38bdf8",
    soft: "rgba(56, 189, 248, .16)",
    rotation: 0,
  },
];
const TURN_ORDER = ["yellow", "blue", "green", "red"];

const rotateCell = ([row, col], rotations) => {
  let rotated = [row, col];
  for (let count = 0; count < rotations; count += 1) {
    rotated = [rotated[1], 4 - rotated[0]];
  }
  return rotated;
};

const HOME_CELLS = {
  "2,4": "green",
  "2,0": "red",
  "0,2": "blue",
  "4,2": "yellow",
};
const CENTER_CELL = [2, 2];
const INNER_LANES = Object.fromEntries(
  PLAYERS.map((player) => [
    player.id,
    rotateCell([1, 3], player.rotation),
  ])
);
const SAFE_CELLS = new Set(["0,2", "2,0", "2,2", "2,4", "4,2"]);
const BASE_ROUTE = [
  [0, 2], [0, 1], [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, 1],
  [4, 2], [4, 3], [4, 4], [3, 4], [2, 4], [1, 4], [0, 4], [0, 3],
  [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [2, 1], [1, 1], [1, 2],
  CENTER_CELL,
];

const buildRoute = (player) =>
  BASE_ROUTE.map((cell) =>
    cell === CENTER_CELL ? CENTER_CELL : rotateCell(cell, player.rotation)
  );

const ROUTES = Object.fromEntries(
  PLAYERS.map((player) => [player.id, buildRoute(player)])
);

const LANE_ARROWS = {
  green: "←",
  red: "→",
  yellow: "↑",
  blue: "↓",
};

const GAME_MODES = [
  {
    id: "computer",
    title: "Play computer",
    detail: "You vs the computer",
    icon: "🤖",
    players: 2,
  },
  {
    id: "2",
    title: "2 players",
    detail: "A head-to-head match",
    icon: "👥",
    players: 2,
  },
  {
    id: "3",
    title: "3 players",
    detail: "Bring in one more friend",
    icon: "🎲",
    players: 3,
  },
  {
    id: "4",
    title: "4 players",
    detail: "The full Ludo table",
    icon: "🏆",
    players: 4,
  },
];

const DIE_VALUES = [1, 2, 3, 4, 8];
const rollDie = () => DIE_VALUES[Math.floor(Math.random() * DIE_VALUES.length)];

const canTokenMove = (token, score, playerId) =>
  (token.state === "ACTIVE" || token.state === "CAPTURED") &&
  token.position + score < ROUTES[playerId].length;

const makeTokens = () =>
  PLAYERS.reduce((result, player) => {
    result[player.id] = Array.from({ length: 4 }, (_, index) => ({
      id: `${player.short}${index + 1}`,
      player: player.id,
      state: "ACTIVE",
      position: 0,
      boardVisible: false,
    }));
    return result;
  }, {});

const cloneTokens = (tokens) =>
  Object.fromEntries(
    Object.entries(tokens).map(([playerId, playerTokens]) => [
      playerId,
      playerTokens.map((token) => ({ ...token })),
    ])
  );

function App() {
  const [tokens, setTokens] = useState(makeTokens);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [dice, setDice] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState("");
  const [winner, setWinner] = useState(null);
  const [turns, setTurns] = useState(0);
  const [captures, setCaptures] = useState(0);
  const [selectedMode, setSelectedMode] = useState("computer");
  const [gameMode, setGameMode] = useState(null);
  const [debugMode, setDebugMode] = useState(false);
  const [bonusRolls, setBonusRolls] = useState(0);

  const mode = GAME_MODES.find((item) => item.id === gameMode);
  const activePlayers = mode
    ? TURN_ORDER.map((playerId) => PLAYERS.find((item) => item.id === playerId))
        .slice(0, mode.players)
        .map((item, index) =>
        gameMode === "computer" && index === 1
          ? { ...item, name: "Computer", short: "AI" }
          : item
      )
    : PLAYERS;
  const player = activePlayers[currentPlayer];
  const activePlayerIds = new Set(activePlayers.map((item) => item.id));

  const tokenCount = activePlayers.reduce(
    (sum, item) =>
      sum + tokens[item.id].filter((token) => token.state === "FINISHED").length,
    0
  );
  const computerTurn =
    gameMode === "computer" && currentPlayer === 1 && !winner;

  const canMove = (token) => {
    if (winner || rolling || dice === null) return false;
    return canTokenMove(token, dice, player.id);
  };
  const movableTokenCount =
    dice === null
      ? 0
      : tokens[player.id].filter((token) => canMove(token)).length;

  const nextTurn = () => {
    const next = (currentPlayer + 1) % activePlayers.length;
    setCurrentPlayer(next);
    setDice(null);
    setBonusRolls(0);
    setMessage(`${activePlayers[next].name}'s turn — roll the die`);
  };

  const handleRoll = () => {
    if (rolling || winner || dice !== null) return;

    setRolling(true);
    setMessage("Rolling the die...");

    window.setTimeout(() => {
      const value = rollDie();
      setDice(value);
      setRolling(false);
      setTurns((current) => current + 1);
      const remainingBonuses = Math.max(0, bonusRolls - 1);
      const nextBonusCount =
        remainingBonuses + (value === 4 || value === 8 ? 1 : 0);
      setBonusRolls(nextBonusCount);
      const movable = tokens[player.id].some((token) =>
        canTokenMove(token, value, player.id)
      );

      if (!movable) {
        if (nextBonusCount > 0) {
          setMessage(`${value}! No legal move — roll your bonus die.`);
          window.setTimeout(() => setDice(null), 700);
        } else {
          setMessage(`${player.name} has no legal move — turn passes.`);
          window.setTimeout(nextTurn, 700);
        }
      } else {
        setMessage(`${value}! Choose one highlighted token to move.`);
      }
    }, 420);
  };

  const captureOpponents = (newTokens, movedPlayerId, movedToken) => {
    if (movedToken.state !== "ACTIVE" || !movedToken.boardVisible) return 0;

    const [row, col] = ROUTES[movedPlayerId][movedToken.position];
    const absolutePosition = `${row},${col}`;

    let captured = 0;

    activePlayers.forEach((otherPlayer) => {
      if (otherPlayer.id === movedPlayerId) return;

      newTokens[otherPlayer.id] = newTokens[otherPlayer.id].map((token) => {
        if (token.state !== "ACTIVE" || !token.boardVisible) return token;

        const [otherRow, otherCol] =
          ROUTES[otherPlayer.id][token.position];
        const otherPosition = `${otherRow},${otherCol}`;

        if (
          otherPosition === absolutePosition &&
          !SAFE_CELLS.has(absolutePosition)
        ) {
          captured += 1;
          return {
            ...token,
            state: "CAPTURED",
            position: 0,
            boardVisible: false,
          };
        }

        return token;
      });
    });

    return captured;
  };

  const moveToken = (tokenIndex) => {
    if (!canMove(tokens[player.id][tokenIndex])) return;

    const newTokens = cloneTokens(tokens);
    const token = newTokens[player.id][tokenIndex];
    token.position += dice;
    token.state = "ACTIVE";
    token.boardVisible = true;

    if (token.position === ROUTES[player.id].length - 1) {
      token.state = "FINISHED";
    }

    const captured = captureOpponents(newTokens, player.id, token);

    setTokens(newTokens);
    setCaptures((current) => current + captured);

    const finishedCount = newTokens[player.id].filter(
      (item) => item.state === "FINISHED"
    ).length;

    if (finishedCount === 4) {
      setWinner(player);
      setDice(null);
      setMessage(`${player.name} wins Chowka Bhara! 🏆`);
      return;
    }

    const nextBonusCount = bonusRolls + (captured > 0 ? 1 : 0);
    setBonusRolls(nextBonusCount);
    setDice(null);

    if (captured > 0) {
      setMessage(`${player.name} captured ${captured} token${captured > 1 ? "s" : ""}! Bonus roll earned.`);
    }

    window.setTimeout(() => {
      if (nextBonusCount > 0) {
        setMessage(`${player.name} has ${nextBonusCount} bonus roll${nextBonusCount > 1 ? "s" : ""} available.`);
      } else {
        const next = (currentPlayer + 1) % activePlayers.length;
        setCurrentPlayer(next);
        setMessage(`${activePlayers[next].name}'s turn — roll the die`);
      }
    }, 450);
  };

  const startGame = () => {
    setGameMode(selectedMode);
    setTokens(makeTokens());
    setCurrentPlayer(0);
    setDice(null);
    setRolling(false);
    setWinner(null);
    setTurns(0);
    setCaptures(0);
    setBonusRolls(0);
    setMessage("Yellow starts — roll the die");
  };

  const resetGame = () => {
    setTokens(makeTokens());
    setCurrentPlayer(0);
    setDice(null);
    setRolling(false);
    setWinner(null);
    setTurns(0);
    setCaptures(0);
    setBonusRolls(0);
    setMessage(`${activePlayers[0].name} starts — roll the die`);
  };

  const tokenAt = (playerId, token) => {
    if (!token.boardVisible || token.state === "CAPTURED") return null;

    const [row, col] = ROUTES[playerId][token.position];
    return `${row},${col}`;
  };

  const trackTokenMap = {};
  activePlayers.forEach((p) => {
    tokens[p.id].forEach((token, tokenIndex) => {
      const position = tokenAt(p.id, token);
      if (position !== null) {
        if (!trackTokenMap[position]) trackTokenMap[position] = [];
        trackTokenMap[position].push({
          player: p,
          token,
          tokenIndex,
          movable:
            p.id === player.id && canMove(token),
        });
      }
    });
  });

  useEffect(() => {
    if (!computerTurn || rolling) return undefined;

    if (dice === null) {
      const timer = window.setTimeout(handleRoll, 650);
      return () => window.clearTimeout(timer);
    }

    const choices = tokens[player.id]
      .map((token, index) => ({ token, index }))
      .filter(({ token }) => canTokenMove(token, dice, player.id));

    if (!choices.length) return undefined;

    const selected = choices.reduce((best, choice) => {
      const score = choice.token.position + dice;
      const bestScore = best.token.position + dice;
      return score > bestScore ? choice : best;
    });
    const timer = window.setTimeout(() => moveToken(selected.index), 650);
    return () => window.clearTimeout(timer);
  }, [computerTurn, rolling, dice, tokens, player?.id]);

  return (
    <main className="app">
      <div className="glow glow-one" />
      <div className="glow glow-two" />
      <div className="glow glow-three" />

      <section className="game-shell">
        <header className="header">
          <div className="brand">
            <div className="brand-icon">L</div>
            <div>
              <h1>CHOWKA BHARA</h1>
              <p>INDIAN 5×5 EDITION</p>
            </div>
          </div>

          {gameMode && (
            <div className="turn-pill">
              <span
                className="turn-dot"
                style={{ background: player.color, boxShadow: `0 0 13px ${player.color}` }}
              />
              {winner ? "GAME OVER" : `${player.name.toUpperCase()}'S TURN`}
            </div>
          )}
        </header>

        {!gameMode ? (
          <section className="setup">
            <div className="setup-kicker">READY TO PLAY?</div>
            <h2>Choose your game</h2>
            <p className="setup-copy">
              Pick your players before the first roll. The board is ready when
              you are.
            </p>

            <div className="mode-options">
              {GAME_MODES.map((option) => (
                <button
                  className={`mode-card ${selectedMode === option.id ? "selected" : ""}`}
                  key={option.id}
                  onClick={() => setSelectedMode(option.id)}
                  aria-pressed={selectedMode === option.id}
                >
                  <span className="mode-icon">{option.icon}</span>
                  <strong>{option.title}</strong>
                  <small>{option.detail}</small>
                </button>
              ))}
            </div>

            <button className="start-button" onClick={startGame}>
              Start game <span aria-hidden="true">→</span>
            </button>
          </section>
        ) : (
          <>
        <div className="stats">
          <div className="stat-card">
            <span>TURN</span>
            <strong>{turns.toString().padStart(2, "0")}</strong>
            <small>{player.name}</small>
          </div>
          <div className="stat-card featured">
            <span>CAPTURES</span>
            <strong>{captures.toString().padStart(2, "0")}</strong>
            <small>TAKEN TOKENS</small>
          </div>
          <div className="stat-card">
            <span>FINISHED</span>
            <strong>{tokenCount}/{activePlayers.length * 4}</strong>
            <small>PLAYERS IN GAME</small>
          </div>
          <div className="stat-card">
            <span>DIE</span>
            <strong>{dice ?? "—"}</strong>
            <small>{rolling ? "ROLLING" : "READY"}</small>
          </div>
        </div>

        <div className="layout">
          <aside className="side-panel">
            <div className="panel-title">PLAYERS</div>

            <div className="players">
              {activePlayers.map((item, index) => {
                const finished = tokens[item.id].filter(
                  (token) => token.state === "FINISHED"
                ).length;
                const active = index === currentPlayer && !winner;

                return (
                  <div
                    className={`player-row ${active ? "active" : ""}`}
                    key={item.id}
                  >
                    <div
                      className="player-avatar"
                      style={{
                        color: item.color,
                        background: item.soft,
                        borderColor: `${item.color}55`,
                      }}
                    >
                      {item.short}
                    </div>
                    <div className="player-info">
                      <strong>{item.name}</strong>
                      <span>{finished}/4 finished</span>
                    </div>
                    {active && <i />}
                  </div>
                );
              })}
            </div>

            <div className="rules">
              <div className="panel-title">GAME RULES</div>
              <p>🎲 Roll one of 1, 2, 3, 4, or 8.</p>
              <p>🏠 All tokens are ready on the first roll.</p>
              <p>↶ Follow your player-specific outer route into the inner path.</p>
              <p>💥 Capture on non-safe cells; captures grant a bonus roll.</p>
              <p>✨ Rolling a 4 or 8 grants a bonus roll.</p>
              <p>🏁 Reach the center exactly; first to finish all four wins.</p>
            </div>
          </aside>

          <div className="board-section">
            <div className="board">
              {Array.from({ length: 25 }, (_, index) => {
                const row = Math.floor(index / 5);
                const col = index % 5;
                const cellKey = `${row},${col}`;
                const homePlayerId = HOME_CELLS[cellKey];
                const homePlayer = PLAYERS.find(
                  (item) => item.id === homePlayerId
                );
                const homeTokenIndex = homePlayer
                  ? Object.keys(HOME_CELLS)
                      .filter((key) => HOME_CELLS[key] === homePlayerId)
                      .indexOf(cellKey)
                  : -1;
                const lanePlayer = PLAYERS.find((item) => {
                  const [laneRow, laneCol] = INNER_LANES[item.id];
                  return laneRow === row && laneCol === col;
                });
                const occupants = trackTokenMap[cellKey] || [];
                const onRoute = PLAYERS.some((item) =>
                  ROUTES[item.id].some(
                    ([routeRow, routeCol]) => routeRow === row && routeCol === col
                  )
                );
                const safe = SAFE_CELLS.has(cellKey);
                const classes = [
                  "board-cell",
                  onRoute ? "track-cell" : "",
                  homePlayer ? `home-cell home-${homePlayerId}` : "",
                  safe ? "safe-cell" : "",
                  cellKey === "2,2" ? "center-cell" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <div
                    className={`${classes}${occupants.length ? " occupied" : ""}`}
                    key={cellKey}
                  >
                    {onRoute && (
                      <>
                        <span className="cell-number">
                          {Math.min(
                            ...activePlayers.flatMap((item) =>
                              ROUTES[item.id]
                                .map(([routeRow, routeCol], routeIndex) =>
                                  routeRow === row && routeCol === col
                                    ? routeIndex + 1
                                    : Number.POSITIVE_INFINITY
                                )
                                .filter(Number.isFinite)
                            )
                          )}
                        </span>
                        {lanePlayer && (
                          <span
                            className="start-arrow"
                            style={{ color: lanePlayer.color }}
                            aria-hidden="true"
                          >
                            {LANE_ARROWS[lanePlayer.id]}
                          </span>
                        )}
                        <div className="tokens">
                          {occupants.map((item) => (
                            <button
                              key={item.token.id}
                              className={`token ${item.token.state === "FINISHED" ? "finished-token" : ""} ${item.movable ? "movable" : ""}`}
                              style={{ background: item.player.color }}
                              onClick={() => moveToken(item.tokenIndex)}
                              disabled={!item.movable}
                              title={`${item.player.name} token${item.token.state === "FINISHED" ? " finished at Central Home" : ""}`}
                              aria-label={`${item.player.name} token${item.token.state === "FINISHED" ? ", finished at Central Home" : ""}`}
                            >
                              {item.player.short}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                                    {homePlayer &&
                      homeTokenIndex >= 0 &&
                      activePlayerIds.has(homePlayerId) && (
                      <div className="home-tokens">
                        {tokens[homePlayerId]
                          .slice(0, 4)
                          .map((homeToken, tokenOffset) => {
                            const tokenIndex = tokenOffset;
                            if (
                              homeToken.boardVisible ||
                              homeToken.state === "FINISHED"
                            ) {
                              return null;
                            }
                            const movable =
                              homePlayer.id === player.id && canMove(homeToken);
                            return (
                              <button
                                className={`token home-token ${movable ? "movable" : ""}`}
                                key={homeToken.id}
                                style={{ background: homePlayer.color }}
                                onClick={() => moveToken(tokenIndex)}
                                disabled={!movable}
                                title={`${homePlayer.name} token at home, ready to move`}
                              >
                                {homePlayer.short}
                              </button>
                            );
                          })}
                      </div>
                    )}
                    {cellKey === "2,2" && (
                      <span className="center-mark" aria-label="Finish">✦</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="dice-area">
              <button
                className={`dice ${rolling ? "rolling" : ""}`}
                onClick={handleRoll}
                disabled={rolling || dice !== null || Boolean(winner)}
                aria-label="Roll die"
              >
                <span className="dice-value">
                  {rolling ? "•" : dice ?? "?"}
                </span>
                <span className="dice-label">ROLL</span>
              </button>

              <div className="message">
                <strong>{winner ? `${winner.name} WINS!` : message}</strong>
                <span>
                  {winner
                    ? "Start a new game and challenge everyone again."
                    : movableTokenCount
                    ? "Click a highlighted token to move it."
                    : bonusRolls > 0
                    ? `Roll again (${bonusRolls} bonus roll${bonusRolls > 1 ? "s" : ""} queued).`
                    : dice !== null
                    ? "Passing to the next player."
                    : "Roll the die to continue."}
                </span>
              </div>

              <button className="reset-button" onClick={resetGame}>
                ↻
              </button>
            </div>
            <button className="change-mode" onClick={() => setGameMode(null)}>
              Change game mode
            </button>
            <button
              className="debug-toggle"
              onClick={() => setDebugMode((enabled) => !enabled)}
              aria-expanded={debugMode}
            >
              {debugMode ? "Hide debug info" : "Show debug info"}
            </button>
            {debugMode && (
              <section className="debug-panel" aria-label="Game debug information">
                <div className="debug-summary">
                  <span>Current player: <strong>{player.name}</strong></span>
                  <span>Dice: <strong>{dice ?? "—"}</strong></span>
                  <span>Bonus rolls queued: <strong>{bonusRolls}</strong></span>
                </div>
                {activePlayers.map((item) => (
                  <div className="debug-player" key={item.id}>
                    <strong style={{ color: item.color }}>{item.name}</strong>
                    {tokens[item.id].map((token) => (
                      <p key={token.id}>
                        {token.id}: {token.state} · Route index {token.position}
                        {" · "}Cell {ROUTES[item.id][token.position].join(", ")}
                        {" · "}Visual {token.boardVisible ? "board" : "HOME"}
                      </p>
                    ))}
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>

        <footer>
          <span>TRADITION • LUCK • STRATEGY</span>
          <span>5×5 CHOWKA BHARA</span>
        </footer>

        <div className="creator">
          <span />
          <div>
            <small>CRAFTED WITH ♡ BY</small>
            <strong>CHAITU</strong>
          </div>
          <span />
        </div>
          </>
        )}
      </section>
    </main>
  );
}

export default App;