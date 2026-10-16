import { useState, useEffect, useRef } from "react";

const ROUNDS = [
  { label: "3s", cards: 3 },
  { label: "4s", cards: 4 },
  { label: "5s", cards: 5 },
  { label: "6s", cards: 6 },
  { label: "7s", cards: 7 },
  { label: "8s", cards: 8 },
  { label: "9s", cards: 9 },
  { label: "10s", cards: 10 },
  { label: "Jacks", cards: 11 },
  { label: "Queens", cards: 12 },
  { label: "Kings", cards: 13 },
];

const SUIT_SYMBOLS = ["♠", "♥", "♦", "♣", "★"];
const PLAYER_COLORS = [
  { bg: "#2D6A4F", light: "#52B788", text: "#D8F3DC" },
  { bg: "#7B2D8B", light: "#C77DFF", text: "#F3D8FF" },
  { bg: "#C77B2D", light: "#F4A261", text: "#FFF3D8" },
  { bg: "#2D5F8B", light: "#48CAE4", text: "#D8F0FF" },
  { bg: "#8B2D2D", light: "#E07070", text: "#FFD8D8" },
  { bg: "#2D7B6B", light: "#52D9C2", text: "#D8FFF6" },
];

function getTotal(scores) {
  return scores.reduce((sum, s) => sum + (parseInt(s) || 0), 0);
}

function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

// ─── Screens ────────────────────────────────────────────────────────────────

function HomeScreen({ games, onNew, onResume, onViewHistory, onDeleteGame }) {
  const activeGames = games.filter((g) => !g.finished);
  const finishedGames = games.filter((g) => g.finished);

  return (
    <div style={styles.screen}>
      <div style={styles.homeHero}>
        <div style={styles.suitRow}>
          {SUIT_SYMBOLS.map((s, i) => (
            <span key={i} style={{ ...styles.heroSuit, animationDelay: `${i * 0.15}s` }}>{s}</span>
          ))}
        </div>
        <h1 style={styles.heroTitle}>Five Crowns</h1>
        <p style={styles.heroSub}>Score Tracker</p>
      </div>

      <button style={styles.primaryBtn} onClick={onNew}>
        ＋ New Game
      </button>

      {activeGames.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>In Progress</h2>
          {activeGames.map((g) => (
            <GameCard key={g.id} game={g} onResume={() => onResume(g.id)} onDelete={() => onDeleteGame(g.id)} />
          ))}
        </div>
      )}

      {finishedGames.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Completed Games</h2>
          {finishedGames.slice(-5).reverse().map((g) => (
            <GameCard key={g.id} game={g} onResume={() => onResume(g.id)} onDelete={() => onDeleteGame(g.id)} finished />
          ))}
        </div>
      )}
    </div>
  );
}

function GameCard({ game, onResume, onDelete, finished }) {
  const roundLabel = ROUNDS[game.currentRound]?.label || "Done";
  const totals = game.players.map((p) => getTotal(p.scores));
  const minTotal = Math.min(...totals);
  const leader = game.players[totals.indexOf(minTotal)];

  return (
    <div style={styles.gameCard}>
      <div style={{ flex: 1 }} onClick={onResume}>
        <div style={styles.gameCardTitle}>{game.players.map((p) => p.name).join(", ")}</div>
        <div style={styles.gameCardMeta}>
          {finished ? `🏆 ${leader.name} won` : `Round: ${roundLabel}`} · {game.players.length} players
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button style={styles.resumeBtn} onClick={onResume}>{finished ? "View" : "Resume"}</button>
        <button style={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); onDelete(); }}>✕</button>
      </div>
    </div>
  );
}

function PlayerInput({ index, value, onChange, onRemove, showRemove, frequentPlayers, currentNames }) {
  const [open, setOpen] = useState(false);
  const color = PLAYER_COLORS[index % PLAYER_COLORS.length];

  // Filter suggestions: match typed text, exclude already-selected names
  const suggestions = frequentPlayers.filter(
    (p) =>
      p.toLowerCase().includes(value.toLowerCase()) &&
      !currentNames.some((n, ni) => ni !== index && n.trim().toLowerCase() === p.toLowerCase())
  );
  const showDropdown = open && suggestions.length > 0;

  return (
    <div style={{ position: "relative" }}>
      <div style={styles.playerInputRow}>
        <div style={{ ...styles.playerDot, background: color.light }} />
        <input
          style={styles.playerInput}
          placeholder={`Player ${index + 1}`}
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          maxLength={16}
          autoComplete="off"
        />
        {showRemove && (
          <button style={styles.removeBtn} onClick={onRemove}>✕</button>
        )}
      </div>

      {showDropdown && (
        <div style={styles.suggestionsDropdown}>
          {suggestions.map((p) => (
            <div
              key={p}
              style={styles.suggestionItem}
              onMouseDown={() => { onChange(p); setOpen(false); }}
            >
              <span style={{ color: color.light, marginRight: 8 }}>★</span>
              {p}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SetupScreen({ onStart, onBack, frequentPlayers }) {
  const [names, setNames] = useState(["", ""]);

  const addPlayer = () => {
    if (names.length < 8) setNames([...names, ""]);
  };
  const removePlayer = (i) => {
    if (names.length > 2) setNames(names.filter((_, idx) => idx !== i));
  };
  const updateName = (i, val) => {
    const n = [...names];
    n[i] = val;
    setNames(n);
  };

  const canStart = names.every((n) => n.trim().length > 0);

  const handleStart = () => {
    if (!canStart) return;
    onStart(names.map((n) => n.trim()));
  };

  return (
    <div style={styles.screen}>
      <button style={styles.backBtn} onClick={onBack}>← Back</button>
      <h2 style={styles.pageTitle}>New Game</h2>
      <p style={styles.pageSubtitle}>Who's playing?</p>

      <div style={styles.playerList}>
        {names.map((name, i) => (
          <PlayerInput
            key={i}
            index={i}
            value={name}
            onChange={(val) => updateName(i, val)}
            onRemove={() => removePlayer(i)}
            showRemove={names.length > 2}
            frequentPlayers={frequentPlayers}
            currentNames={names}
          />
        ))}
      </div>

      {names.length < 8 && (
        <button style={styles.ghostBtn} onClick={addPlayer}>＋ Add Player</button>
      )}

      <button
        style={{ ...styles.primaryBtn, marginTop: 24, opacity: canStart ? 1 : 0.4 }}
        onClick={handleStart}
        disabled={!canStart}
      >
        Start Game
      </button>
    </div>
  );
}

function PlayerHistoryModal({ player, playerIndex, currentRound, onClose }) {
  const color = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
  const total = getTotal(player.scores);

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...styles.modalHeader, borderBottom: `2px solid ${color.light}` }}>
          <div>
            <div style={{ ...styles.modalPlayerName, color: color.light }}>{player.name}</div>
            <div style={styles.modalTotal}>Total: {total} pts</div>
          </div>
          <button style={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div style={styles.modalBody}>
          {ROUNDS.slice(0, currentRound).map((r, ri) => (
            <div key={ri} style={{ ...styles.modalRow, background: ri % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent" }}>
              <span style={styles.modalRoundLabel}>{r.label}</span>
              <span style={{ ...styles.modalRoundScore, color: player.scores[ri] === 0 ? "#52B788" : "#E8E0D0" }}>
                {player.scores[ri] !== undefined ? player.scores[ri] : "—"}
                {player.scores[ri] === 0 && <span style={{ fontSize: 11, color: "#52B788", marginLeft: 4 }}>✓ out</span>}
              </span>
            </div>
          ))}
          {currentRound === 0 && (
            <div style={{ textAlign: "center", color: "#6B7C8A", padding: "20px 0", fontSize: 13 }}>
              No rounds played yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreEntryScreen({ game, onSaveRound, onFinishGame, onBack }) {
  const round = ROUNDS[game.currentRound];
  const [scores, setScores] = useState(game.players.map(() => ""));
  const [modalPlayer, setModalPlayer] = useState(null); // index of player to show history for
  const inputRefs = useRef([]);

  const totals = game.players.map((p) => getTotal(p.scores));
  const nonZeroTotals = totals.filter((t) => t > 0);
  const minTotal = nonZeroTotals.length > 0 ? Math.min(...totals) : null;
  const isLastRound = game.currentRound === ROUNDS.length - 1;

  const updateScore = (i, val) => {
    const s = [...scores];
    s[i] = val.replace(/[^0-9]/g, "");
    setScores(s);
  };

  const allFilled = scores.every((s) => s !== "");

  const handleSave = () => {
    if (!allFilled) return;
    const numScores = scores.map((s) => parseInt(s) || 0);
    onSaveRound(numScores);
    setScores(game.players.map(() => ""));
  };

  return (
    <div style={styles.screen}>
      {modalPlayer !== null && (
        <PlayerHistoryModal
          player={game.players[modalPlayer]}
          playerIndex={modalPlayer}
          currentRound={game.currentRound}
          onClose={() => setModalPlayer(null)}
        />
      )}

      <button style={styles.backBtn} onClick={onBack}>← Back</button>

      {/* Round Header */}
      <div style={styles.roundHeader}>
        <div style={styles.roundBadge}>Round {game.currentRound + 1} of {ROUNDS.length}</div>
        <h2 style={styles.roundTitle}>{round.label}</h2>
        <p style={styles.roundSub}>{round.cards} cards dealt</p>
      </div>

      {/* Scoreboard */}
      <div style={styles.scoreboardCard}>
        <div style={styles.scoreboardHeader}>
          <span>Player <span style={{ opacity: 0.5, fontSize: 10 }}>tap for history</span></span>
          <span>Total</span>
          <span>Score</span>
        </div>
        {game.players.map((player, i) => {
          const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
          const total = totals[i];
          const isLeading = minTotal !== null && total === minTotal && total > 0;
          return (
            <div key={i} style={{ ...styles.scoreRow, borderLeft: `3px solid ${color.light}` }}>
              <div
                style={{ ...styles.scorePlayerName, cursor: "pointer" }}
                onClick={() => setModalPlayer(i)}
              >
                {isLeading && <span style={styles.crownIcon}>♛ </span>}
                {player.name} <span style={{ fontSize: 13, opacity: 0.45 }}>＋</span>
              </div>
              <div
                style={{ ...styles.scoreTotal, color: color.light, cursor: "pointer" }}
                onClick={() => setModalPlayer(i)}
              >
                {total > 0 ? total : "—"}
              </div>
              <input
                ref={(el) => (inputRefs.current[i] = el)}
                style={styles.scoreInput}
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder=""
                value={scores[i]}
                onChange={(e) => updateScore(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && i < game.players.length - 1) {
                    inputRefs.current[i + 1]?.focus();
                  }
                }}
              />
            </div>
          );
        })}
      </div>

      <button
        style={{ ...styles.primaryBtn, opacity: allFilled ? 1 : 0.4 }}
        onClick={handleSave}
        disabled={!allFilled}
      >
        {isLastRound ? "Save Final Round" : `Save & Next Round →`}
      </button>

      {isLastRound && allFilled && (
        <button style={{ ...styles.primaryBtn, marginTop: 8, background: "#B5451B" }} onClick={() => { handleSave(); }}>
          🏆 Finish Game
        </button>
      )}
    </div>
  );
}

function ResultsScreen({ game, onBack, onNewGame }) {
  const totals = game.players.map((p) => getTotal(p.scores));
  const minTotal = Math.min(...totals);
  const sorted = [...game.players.map((p, i) => ({ ...p, total: totals[i], index: i }))]
    .sort((a, b) => a.total - b.total);
  const winner = sorted[0];

  return (
    <div style={styles.screen}>
      <button style={styles.backBtn} onClick={onBack}>← Back</button>

      <div style={styles.winnerBanner}>
        <div style={styles.winnerCrown}>♛</div>
        <h2 style={styles.winnerName}>{winner.name}</h2>
        <p style={styles.winnerLabel}>wins with {winner.total} points!</p>
      </div>

      {/* Full Scorecard */}
      <div style={styles.scorecard}>
        <div style={styles.scorecardHeader}>
          <div style={styles.scorecardRound}>Round</div>
          {game.players.map((p, i) => (
            <div key={i} style={{ ...styles.scorecardPlayer, color: PLAYER_COLORS[i % PLAYER_COLORS.length].light }}>
              {p.name}
            </div>
          ))}
        </div>
        {ROUNDS.map((r, ri) => (
          <div key={ri} style={{ ...styles.scorecardRow, background: ri % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent" }}>
            <div style={styles.scorecardRound}>{r.label}</div>
            {game.players.map((p, pi) => (
              <div key={pi} style={styles.scorecardCell}>
                {p.scores[ri] !== undefined ? p.scores[ri] : "—"}
              </div>
            ))}
          </div>
        ))}
        <div style={styles.scorecardTotals}>
          <div style={styles.scorecardRound}>Total</div>
          {totals.map((t, i) => (
            <div key={i} style={{
              ...styles.scorecardCell,
              fontWeight: 700,
              color: t === minTotal ? "#F4D35E" : "#fff"
            }}>{t}</div>
          ))}
        </div>
      </div>

      <button style={styles.primaryBtn} onClick={onNewGame}>＋ New Game</button>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [games, setGames] = useLocalStorage("fivecrowns_games", []);
  const [screen, setScreen] = useState("home"); // home | setup | game | results
  const [activeGameId, setActiveGameId] = useState(null);

  const activeGame = games.find((g) => g.id === activeGameId);

  // Build sorted list of frequent players from game history
  const frequentPlayers = (() => {
    const counts = {};
    games.forEach((g) => g.players.forEach((p) => {
      const name = p.name.trim();
      if (name) counts[name] = (counts[name] || 0) + 1;
    }));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  })();

  const createGame = (playerNames) => {
    const newGame = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      players: playerNames.map((name) => ({ name, scores: [] })),
      currentRound: 0,
      finished: false,
    };
    setGames((prev) => [...prev, newGame]);
    setActiveGameId(newGame.id);
    setScreen("game");
  };

  const saveRound = (roundScores) => {
    setGames((prev) =>
      prev.map((g) => {
        if (g.id !== activeGameId) return g;
        const updatedPlayers = g.players.map((p, i) => ({
          ...p,
          scores: [...p.scores, roundScores[i]],
        }));
        const nextRound = g.currentRound + 1;
        const finished = nextRound >= ROUNDS.length;
        return { ...g, players: updatedPlayers, currentRound: nextRound, finished };
      })
    );
    // Check if that was the last round
    const game = games.find((g) => g.id === activeGameId);
    if (game && game.currentRound + 1 >= ROUNDS.length) {
      setScreen("results");
    }
  };

  const deleteGame = (id) => {
    setGames((prev) => prev.filter((g) => g.id !== id));
  };

  const resumeGame = (id) => {
    const g = games.find((game) => game.id === id);
    setActiveGameId(id);
    setScreen(g?.finished ? "results" : "game");
  };

  return (
    <div style={styles.app}>
      <div style={styles.container}>
        {screen === "home" && (
          <HomeScreen
            games={games}
            onNew={() => setScreen("setup")}
            onResume={resumeGame}
            onViewHistory={() => {}}
            onDeleteGame={deleteGame}
          />
        )}
        {screen === "setup" && (
          <SetupScreen onStart={createGame} onBack={() => setScreen("home")} frequentPlayers={frequentPlayers} />
        )}
        {screen === "game" && activeGame && !activeGame.finished && (
          <ScoreEntryScreen
            game={activeGame}
            onSaveRound={saveRound}
            onFinishGame={() => setScreen("results")}
            onBack={() => setScreen("home")}
          />
        )}
        {(screen === "results" || (screen === "game" && activeGame?.finished)) && activeGame && (
          <ResultsScreen
            game={activeGame}
            onBack={() => setScreen("home")}
            onNewGame={() => setScreen("setup")}
          />
        )}
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  app: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #0D1B2A 0%, #1B2838 50%, #0D2318 100%)",
    fontFamily: "'Georgia', 'Times New Roman', serif",
    color: "#E8E0D0",
    padding: "0 0 40px 0",
  },
  container: {
    maxWidth: 480,
    margin: "0 auto",
    padding: "0 16px",
  },
  screen: {
    paddingTop: 16,
  },

  // Home
  homeHero: {
    textAlign: "center",
    padding: "32px 0 24px",
  },
  suitRow: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    marginBottom: 12,
  },
  heroSuit: {
    fontSize: 28,
    opacity: 0.7,
    animation: "float 3s ease-in-out infinite alternate",
    display: "inline-block",
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: 700,
    margin: 0,
    letterSpacing: "0.05em",
    color: "#F4D35E",
    textShadow: "0 2px 20px rgba(244,211,94,0.4)",
  },
  heroSub: {
    fontSize: 14,
    color: "#9BA8B0",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    margin: "4px 0 0",
  },

  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "#6B7C8A",
    marginBottom: 10,
    fontFamily: "'Georgia', serif",
  },
  gameCard: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "12px 14px",
    marginBottom: 8,
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
  },
  gameCardTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#E8E0D0",
    marginBottom: 2,
  },
  gameCardMeta: {
    fontSize: 12,
    color: "#6B7C8A",
  },
  resumeBtn: {
    background: "rgba(244,211,94,0.15)",
    border: "1px solid rgba(244,211,94,0.3)",
    color: "#F4D35E",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  deleteBtn: {
    background: "rgba(255,80,80,0.1)",
    border: "1px solid rgba(255,80,80,0.2)",
    color: "#FF6B6B",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 13,
    cursor: "pointer",
  },

  // Buttons
  primaryBtn: {
    width: "100%",
    padding: "15px",
    background: "linear-gradient(135deg, #2D6A4F, #52B788)",
    border: "none",
    borderRadius: 12,
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.03em",
    boxShadow: "0 4px 20px rgba(82,183,136,0.3)",
    fontFamily: "'Georgia', serif",
  },
  ghostBtn: {
    width: "100%",
    padding: "12px",
    background: "transparent",
    border: "1px dashed rgba(255,255,255,0.2)",
    borderRadius: 12,
    color: "#9BA8B0",
    fontSize: 14,
    cursor: "pointer",
    marginTop: 8,
    fontFamily: "'Georgia', serif",
  },
  backBtn: {
    background: "transparent",
    border: "none",
    color: "#9BA8B0",
    fontSize: 14,
    cursor: "pointer",
    padding: "4px 0",
    marginBottom: 8,
    fontFamily: "'Georgia', serif",
  },

  // Setup
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "#F4D35E",
    margin: "8px 0 4px",
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#9BA8B0",
    marginBottom: 24,
    margin: "0 0 24px 0",
  },
  playerList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  playerInputRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  playerDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
  },
  playerInput: {
    flex: 1,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: "11px 14px",
    color: "#E8E0D0",
    fontSize: 15,
    outline: "none",
    fontFamily: "'Georgia', serif",
  },
  removeBtn: {
    background: "rgba(255,80,80,0.1)",
    border: "none",
    color: "#FF6B6B",
    borderRadius: 8,
    padding: "8px 10px",
    cursor: "pointer",
    fontSize: 13,
  },
  suggestionsDropdown: {
    position: "absolute",
    top: "100%",
    left: 20,
    right: 0,
    background: "#1A2B3C",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 10,
    zIndex: 100,
    overflow: "hidden",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    marginTop: 4,
  },
  suggestionItem: {
    padding: "11px 14px",
    fontSize: 14,
    color: "#E8E0D0",
    cursor: "pointer",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
  },

  // Score Entry
  roundHeader: {
    textAlign: "center",
    padding: "16px 0 20px",
  },
  roundBadge: {
    display: "inline-block",
    background: "rgba(244,211,94,0.1)",
    border: "1px solid rgba(244,211,94,0.25)",
    color: "#F4D35E",
    borderRadius: 20,
    padding: "4px 14px",
    fontSize: 12,
    letterSpacing: "0.1em",
    marginBottom: 8,
  },
  roundTitle: {
    fontSize: 36,
    fontWeight: 700,
    color: "#F4D35E",
    margin: "0 0 2px",
    textShadow: "0 2px 16px rgba(244,211,94,0.3)",
  },
  roundSub: {
    fontSize: 13,
    color: "#6B7C8A",
    margin: 0,
  },
  scoreboardCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
  },
  scoreboardHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 60px 90px",
    padding: "10px 14px",
    fontSize: 11,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#6B7C8A",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.03)",
  },
  scoreRow: {
    display: "grid",
    gridTemplateColumns: "1fr 60px 90px",
    padding: "12px 14px",
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    gap: 8,
  },
  scorePlayerName: {
    fontSize: 15,
    fontWeight: 500,
    color: "#E8E0D0",
  },
  crownIcon: {
    color: "#F4D35E",
    fontSize: 13,
  },
  scoreTotal: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: "center",
  },
  scoreInput: {
    width: "100%",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 8,
    padding: "8px 10px",
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "'Georgia', serif",
  },

  // Modal
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  modalCard: {
    background: "#162330",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    width: "100%",
    maxWidth: 360,
    maxHeight: "80vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 18px",
  },
  modalPlayerName: {
    fontSize: 20,
    fontWeight: 700,
    fontFamily: "'Georgia', serif",
  },
  modalTotal: {
    fontSize: 13,
    color: "#9BA8B0",
    marginTop: 2,
  },
  modalClose: {
    background: "rgba(255,255,255,0.08)",
    border: "none",
    color: "#9BA8B0",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 14,
  },
  modalBody: {
    overflowY: "auto",
    padding: "8px 0",
  },
  modalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 18px",
  },
  modalRoundLabel: {
    fontSize: 14,
    color: "#9BA8B0",
    width: 56,
  },
  modalRoundScore: {
    fontSize: 16,
    fontWeight: 600,
    fontFamily: "'Georgia', serif",
  },

  // Results
  winnerBanner: {
    textAlign: "center",
    padding: "28px 0 24px",
  },
  winnerCrown: {
    fontSize: 48,
    color: "#F4D35E",
    textShadow: "0 0 30px rgba(244,211,94,0.6)",
    marginBottom: 8,
    display: "block",
  },
  winnerName: {
    fontSize: 32,
    fontWeight: 700,
    color: "#F4D35E",
    margin: "0 0 4px",
  },
  winnerLabel: {
    fontSize: 15,
    color: "#9BA8B0",
    margin: 0,
  },

  scorecard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 20,
  },
  scorecardHeader: {
    display: "flex",
    padding: "10px 12px",
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#6B7C8A",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
  },
  scorecardRow: {
    display: "flex",
    padding: "8px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  scorecardTotals: {
    display: "flex",
    padding: "12px 12px",
    background: "rgba(255,255,255,0.05)",
    borderTop: "1px solid rgba(255,255,255,0.1)",
  },
  scorecardRound: {
    width: 52,
    flexShrink: 0,
    fontSize: 13,
    color: "#9BA8B0",
  },
  scorecardPlayer: {
    flex: 1,
    fontSize: 12,
    fontWeight: 600,
    textAlign: "center",
    letterSpacing: "0.05em",
  },
  scorecardCell: {
    flex: 1,
    fontSize: 13,
    textAlign: "center",
    color: "#C8C0B0",
  },
};
