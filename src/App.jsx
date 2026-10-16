import { useState, useEffect, useRef, useCallback } from "react";

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
// Suit colors: black suits, red suits, gold star
const SUIT_COLORS = ["#E8E0D0", "#E85555", "#E85555", "#E8E0D0", "#E8C84A"];
// Float offsets for staggered animation
const SUIT_OFFSETS = [0, 0.4, 0.8, 1.2, 0.6];

const PLAYER_COLORS = [
  { bg: "#1A5C35", light: "#4EC97A", glow: "rgba(78,201,122,0.35)" },
  { bg: "#5C1A6A", light: "#C06ADE", glow: "rgba(192,106,222,0.35)" },
  { bg: "#6A3C1A", light: "#E8913A", glow: "rgba(232,145,58,0.35)" },
  { bg: "#1A3F6A", light: "#3AA8E8", glow: "rgba(58,168,232,0.35)" },
  { bg: "#6A1A1A", light: "#E85555", glow: "rgba(232,85,85,0.35)" },
  { bg: "#1A5C5C", light: "#3ADCD9", glow: "rgba(58,220,217,0.35)" },
];

// Inject keyframes once
if (typeof document !== "undefined" && !document.getElementById("fc-keyframes")) {
  const style = document.createElement("style");
  style.id = "fc-keyframes";
  style.textContent = `
    @keyframes fc-float-0 { 0%,100% { transform: translateY(0px) rotate(-3deg); } 50% { transform: translateY(-10px) rotate(3deg); } }
    @keyframes fc-float-1 { 0%,100% { transform: translateY(-5px) rotate(2deg); } 50% { transform: translateY(5px) rotate(-4deg); } }
    @keyframes fc-float-2 { 0%,100% { transform: translateY(3px) rotate(4deg); } 50% { transform: translateY(-8px) rotate(-2deg); } }
    @keyframes fc-float-3 { 0%,100% { transform: translateY(-2px) rotate(-2deg); } 50% { transform: translateY(8px) rotate(5deg); } }
    @keyframes fc-float-4 { 0%,100% { transform: translateY(4px) rotate(1deg); } 50% { transform: translateY(-6px) rotate(-3deg); } }
    @keyframes fc-crown-pulse { 0%,100% { text-shadow: 0 0 30px rgba(232,200,74,0.6), 0 0 60px rgba(232,200,74,0.2); transform: scale(1); } 50% { text-shadow: 0 0 50px rgba(232,200,74,0.9), 0 0 100px rgba(232,200,74,0.4); transform: scale(1.08); } }
    @keyframes fc-winner-in { 0% { opacity:0; transform: scale(0.7); } 60% { transform: scale(1.05); } 100% { opacity:1; transform: scale(1); } }
    @keyframes fc-burst { 0% { opacity:0; transform: scale(0.5) rotate(0deg); } 60% { opacity:0.25; } 100% { opacity:0; transform: scale(1.4) rotate(15deg); } }
    @keyframes fc-leader-glow { 0%,100% { opacity:0.8; } 50% { opacity:1; filter: brightness(1.3); } }
    @keyframes fc-input-focus { 0% { box-shadow: inset 0 2px 8px rgba(0,0,0,0.4); } 100% { box-shadow: inset 0 2px 8px rgba(0,0,0,0.4), 0 0 0 2px rgba(232,200,74,0.4); } }
  `;
  document.head.appendChild(style);
}

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
            <span
              key={i}
              style={{
                ...styles.heroSuit,
                color: SUIT_COLORS[i],
                animation: `fc-float-${i} ${2.8 + i * 0.3}s ease-in-out infinite`,
                animationDelay: `${SUIT_OFFSETS[i]}s`,
                textShadow: i === 4 ? "0 0 16px rgba(232,200,74,0.6)" : "none",
              }}
            >
              {s}
            </span>
          ))}
        </div>
        <h1 style={styles.heroTitle}>Five Crowns</h1>
        <p style={styles.heroSub}>score tracker</p>
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
              <span style={{ ...styles.modalRoundScore, color: player.scores[ri] === 0 ? "#4EC97A" : "#E8E0D0" }}>
                {player.scores[ri] !== undefined ? player.scores[ri] : "—"}
                {player.scores[ri] === 0 && <span style={{ fontSize: 11, color: "#4EC97A", marginLeft: 4 }}>✓ out</span>}
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

function ScorecardScreen({ game, onBack, onEditScore }) {
  const totals = game.players.map((p) => getTotal(p.scores));
  const minTotal = Math.min(...totals.filter((t) => t > 0));
  const [editing, setEditing] = useState(null); // { roundIndex, playerIndex }
  const [editVal, setEditVal] = useState("");

  const startEdit = (ri, pi) => {
    setEditing({ ri, pi });
    setEditVal(String(game.players[pi].scores[ri]));
  };

  const commitEdit = () => {
    if (!editing) return;
    const val = parseInt(editVal);
    if (!isNaN(val) && val >= 0) {
      onEditScore(editing.ri, editing.pi, val);
    }
    setEditing(null);
  };

  return (
    <div style={styles.screen}>
      <button style={styles.backBtn} onClick={onBack}>← Back to Game</button>
      <h2 style={{ ...styles.pageTitle, marginBottom: 4 }}>Scorecard</h2>
      <p style={{ ...styles.pageSubtitle, marginBottom: 16 }}>
        Tap any score to correct it
      </p>

      <div style={styles.scorecard}>
        {/* Header row */}
        <div style={styles.scorecardHeader}>
          <div style={styles.scorecardRound}>Round</div>
          {game.players.map((p, i) => (
            <div key={i} style={{ ...styles.scorecardPlayer, color: PLAYER_COLORS[i % PLAYER_COLORS.length].light }}>
              {p.name}
            </div>
          ))}
        </div>

        {/* Round rows — only rounds that have been played */}
        {ROUNDS.slice(0, game.currentRound).map((r, ri) => (
          <div key={ri} style={{ ...styles.scorecardRow, background: ri % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent" }}>
            <div style={styles.scorecardRound}>{r.label}</div>
            {game.players.map((p, pi) => {
              const isEditing = editing && editing.ri === ri && editing.pi === pi;
              const score = p.scores[ri];
              return (
                <div key={pi} style={{ flex: 1, textAlign: "center" }}>
                  {isEditing ? (
                    <input
                      autoFocus
                      style={styles.editInput}
                      type="number"
                      inputMode="numeric"
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value.replace(/[^0-9]/g, ""))}
                      onBlur={commitEdit}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(null); }}
                    />
                  ) : (
                    <span
                      style={{
                        ...styles.scorecardCell,
                        display: "inline-block",
                        width: "100%",
                        cursor: "pointer",
                        color: score === 0 ? "#4EC97A" : "#C8C0B0",
                        borderRadius: 4,
                        padding: "2px 0",
                      }}
                      onClick={() => startEdit(ri, pi)}
                    >
                      {score === 0 ? "✓" : score}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {game.currentRound === 0 && (
          <div style={{ textAlign: "center", color: "#6B7C8A", padding: "20px 0", fontSize: 13 }}>
            No rounds played yet
          </div>
        )}

        {/* Totals row */}
        {game.currentRound > 0 && (
          <div style={styles.scorecardTotals}>
            <div style={styles.scorecardRound}>Total</div>
            {totals.map((t, i) => (
              <div key={i} style={{
                ...styles.scorecardCell,
                fontWeight: 700,
                color: t === minTotal && t > 0 ? "#E8C84A" : "#fff",
              }}>{t}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreEntryScreen({ game, onSaveRound, onFinishGame, onBack, onViewScorecard }) {
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

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        {game.currentRound > 0 && (
          <button style={styles.scorecardBtn} onClick={onViewScorecard}>
            📋 Scorecard
          </button>
        )}
      </div>

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
            <div key={i} style={{
              ...styles.scoreRow,
              borderLeft: `3px solid ${color.light}`,
              boxShadow: isLeading ? `inset 4px 0 24px ${color.glow}` : "none",
              background: isLeading ? `rgba(232,200,74,0.04)` : (i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent"),
            }}>
              <div
                style={{ ...styles.scorePlayerName, cursor: "pointer" }}
                onClick={() => setModalPlayer(i)}
              >
                {isLeading && (
                  <span style={{
                    ...styles.crownIcon,
                    animation: "fc-leader-glow 1.6s ease-in-out infinite",
                    display: "inline-block",
                    marginRight: 4,
                  }}>♛</span>
                )}
                {player.name} <span style={{ fontSize: 12, opacity: 0.35, marginLeft: 2 }}>›</span>
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
        <button style={{
          ...styles.primaryBtn,
          marginTop: 8,
          background: "linear-gradient(160deg, #8B0F1A 0%, #C1121F 100%)",
          borderColor: "rgba(193,18,31,0.5)",
          textShadow: "0 1px 6px rgba(193,18,31,0.4)",
        }} onClick={() => { handleSave(); }}>
          ♛ Finish Game
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
        {/* Radial burst behind crown */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <div style={{
            position: "absolute",
            inset: "-40px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(232,200,74,0.25) 0%, rgba(232,200,74,0.08) 40%, transparent 70%)",
            animation: "fc-burst 2.5s ease-out forwards",
            pointerEvents: "none",
          }} />
          <div style={{
            ...styles.winnerCrown,
            animation: "fc-crown-pulse 2s ease-in-out infinite, fc-winner-in 0.6s cubic-bezier(.34,1.56,.64,1) both",
          }}>♛</div>
        </div>
        <h2 style={{
          ...styles.winnerName,
          animation: "fc-winner-in 0.5s 0.2s cubic-bezier(.34,1.56,.64,1) both",
          opacity: 0,
        }}>{winner.name}</h2>
        <p style={{
          ...styles.winnerLabel,
          animation: "fc-winner-in 0.5s 0.35s ease-out both",
          opacity: 0,
        }}>wins · {winner.total} points</p>
      </div>

      {/* Podium ranking */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        marginBottom: 20,
      }}>
        {sorted.map((p, place) => {
          const color = PLAYER_COLORS[p.index % PLAYER_COLORS.length];
          const medals = ["🥇", "🥈", "🥉"];
          return (
            <div key={p.name} style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: place === 0
                ? "linear-gradient(135deg, rgba(232,200,74,0.12) 0%, rgba(232,200,74,0.04) 100%)"
                : "rgba(0,0,0,0.2)",
              border: place === 0 ? "1px solid rgba(232,200,74,0.25)" : "1px solid rgba(255,255,255,0.05)",
              borderRadius: 10,
              borderLeft: `3px solid ${color.light}`,
              animation: `fc-winner-in 0.4s ${0.4 + place * 0.1}s both`,
              opacity: 0,
            }}>
              <span style={{ fontSize: 18, width: 28 }}>{medals[place] || `${place + 1}.`}</span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: place === 0 ? 700 : 500, color: place === 0 ? "#E8C84A" : "#E8E0D0" }}>
                {p.name}
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: color.light, fontVariantNumeric: "tabular-nums" }}>
                {p.total}
              </span>
            </div>
          );
        })}
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
              color: t === minTotal ? "#E8C84A" : "#fff"
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
  const [screen, setScreen] = useState("home"); // home | setup | game | results | scorecard
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

  const editScore = (roundIndex, playerIndex, newScore) => {
    setGames((prev) =>
      prev.map((g) => {
        if (g.id !== activeGameId) return g;
        const updatedPlayers = g.players.map((p, pi) => {
          if (pi !== playerIndex) return p;
          const newScores = [...p.scores];
          newScores[roundIndex] = newScore;
          return { ...p, scores: newScores };
        });
        return { ...g, players: updatedPlayers };
      })
    );
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
        {screen === "scorecard" && activeGame && (
          <ScorecardScreen
            game={activeGame}
            onBack={() => setScreen("game")}
            onEditScore={editScore}
          />
        )}
        {screen === "game" && activeGame && !activeGame.finished && (
          <ScoreEntryScreen
            game={activeGame}
            onSaveRound={saveRound}
            onFinishGame={() => setScreen("results")}
            onBack={() => setScreen("home")}
            onViewScorecard={() => setScreen("scorecard")}
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
    background: "#071A0F",
    backgroundImage: `
      radial-gradient(ellipse 80% 50% at 50% -10%, rgba(20,80,45,0.6) 0%, transparent 70%),
      repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.018) 39px, rgba(255,255,255,0.018) 40px),
      repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.018) 39px, rgba(255,255,255,0.018) 40px)
    `,
    fontFamily: "'Georgia', 'Times New Roman', serif",
    color: "#E8E0D0",
    padding: "0 0 60px 0",
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
    padding: "40px 0 28px",
    position: "relative",
  },
  suitRow: {
    display: "flex",
    justifyContent: "center",
    gap: 18,
    marginBottom: 20,
  },
  heroSuit: {
    fontSize: 32,
    display: "inline-block",
  },
  heroTitle: {
    fontSize: 52,
    fontWeight: 700,
    margin: 0,
    letterSpacing: "0.04em",
    color: "#E8C84A",
    textShadow: "0 0 40px rgba(232,200,74,0.5), 0 2px 0 rgba(0,0,0,0.5)",
    lineHeight: 1,
  },
  heroSub: {
    fontSize: 12,
    color: "rgba(232,200,74,0.5)",
    letterSpacing: "0.35em",
    margin: "10px 0 0",
    fontStyle: "italic",
  },

  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: "0.2em",
    color: "rgba(232,200,74,0.45)",
    marginBottom: 10,
    fontStyle: "italic",
  },
  gameCard: {
    background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
    border: "1px solid rgba(232,200,74,0.15)",
    borderRadius: 12,
    padding: "14px 16px",
    marginBottom: 8,
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    boxShadow: "0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
  },
  gameCardTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#E8E0D0",
    marginBottom: 3,
  },
  gameCardMeta: {
    fontSize: 12,
    color: "rgba(232,200,74,0.5)",
    fontStyle: "italic",
  },
  resumeBtn: {
    background: "rgba(232,200,74,0.12)",
    border: "1px solid rgba(232,200,74,0.35)",
    color: "#E8C84A",
    borderRadius: 8,
    padding: "7px 14px",
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "'Georgia', serif",
  },
  deleteBtn: {
    background: "rgba(180,40,40,0.12)",
    border: "1px solid rgba(180,40,40,0.25)",
    color: "#C06060",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 13,
    cursor: "pointer",
  },

  // Buttons
  primaryBtn: {
    width: "100%",
    padding: "16px",
    background: "linear-gradient(160deg, #1A5C35 0%, #0E3D22 100%)",
    border: "1px solid rgba(232,200,74,0.3)",
    borderRadius: 10,
    color: "#E8C84A",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.05em",
    boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
    fontFamily: "'Georgia', serif",
    textShadow: "0 1px 6px rgba(232,200,74,0.3)",
  },
  ghostBtn: {
    width: "100%",
    padding: "13px",
    background: "transparent",
    border: "1px dashed rgba(232,200,74,0.2)",
    borderRadius: 10,
    color: "rgba(232,200,74,0.45)",
    fontSize: 14,
    cursor: "pointer",
    marginTop: 8,
    fontFamily: "'Georgia', serif",
    fontStyle: "italic",
  },
  backBtn: {
    background: "transparent",
    border: "none",
    color: "rgba(232,200,74,0.45)",
    fontSize: 13,
    cursor: "pointer",
    padding: "4px 0",
    marginBottom: 8,
    fontFamily: "'Georgia', serif",
    fontStyle: "italic",
  },

  // Setup
  pageTitle: {
    fontSize: 30,
    fontWeight: 700,
    color: "#E8C84A",
    margin: "8px 0 4px",
    textShadow: "0 0 20px rgba(232,200,74,0.3)",
  },
  pageSubtitle: {
    fontSize: 14,
    color: "rgba(232,200,74,0.45)",
    marginBottom: 24,
    margin: "0 0 24px 0",
    fontStyle: "italic",
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
    boxShadow: "0 0 8px currentColor",
  },
  playerInput: {
    flex: 1,
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(232,200,74,0.2)",
    borderRadius: 10,
    padding: "12px 14px",
    color: "#E8E0D0",
    fontSize: 15,
    outline: "none",
    fontFamily: "'Georgia', serif",
    boxShadow: "inset 0 2px 6px rgba(0,0,0,0.3)",
  },
  removeBtn: {
    background: "rgba(180,40,40,0.12)",
    border: "none",
    color: "#C06060",
    borderRadius: 8,
    padding: "9px 10px",
    cursor: "pointer",
    fontSize: 13,
  },
  suggestionsDropdown: {
    position: "absolute",
    top: "100%",
    left: 20,
    right: 0,
    background: "#0C2818",
    border: "1px solid rgba(232,200,74,0.25)",
    borderRadius: 10,
    zIndex: 100,
    overflow: "hidden",
    boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
    marginTop: 4,
  },
  suggestionItem: {
    padding: "11px 14px",
    fontSize: 14,
    color: "#E8E0D0",
    cursor: "pointer",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    display: "flex",
    alignItems: "center",
  },

  // Score Entry
  roundHeader: {
    textAlign: "center",
    padding: "12px 0 20px",
    position: "relative",
  },
  roundBadge: {
    display: "inline-block",
    background: "rgba(232,200,74,0.08)",
    border: "1px solid rgba(232,200,74,0.2)",
    color: "rgba(232,200,74,0.6)",
    borderRadius: 20,
    padding: "4px 16px",
    fontSize: 11,
    letterSpacing: "0.15em",
    marginBottom: 10,
    fontStyle: "italic",
  },
  roundTitle: {
    fontSize: 64,
    fontWeight: 700,
    color: "#E8C84A",
    margin: "0 0 2px",
    lineHeight: 1,
    textShadow: "0 0 60px rgba(232,200,74,0.4), 0 4px 0 rgba(0,0,0,0.5)",
    letterSpacing: "-0.02em",
  },
  roundSub: {
    fontSize: 13,
    color: "rgba(232,200,74,0.4)",
    margin: 0,
    fontStyle: "italic",
  },
  scoreboardCard: {
    background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.35) 100%)",
    border: "1px solid rgba(232,200,74,0.18)",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
    boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
  },
  scoreboardHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 60px 90px",
    padding: "10px 16px",
    fontSize: 10,
    letterSpacing: "0.15em",
    color: "rgba(232,200,74,0.4)",
    borderBottom: "1px solid rgba(232,200,74,0.1)",
    background: "rgba(0,0,0,0.2)",
    fontStyle: "italic",
  },
  scoreRow: {
    display: "grid",
    gridTemplateColumns: "1fr 60px 90px",
    padding: "13px 16px",
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    gap: 8,
  },
  scorePlayerName: {
    fontSize: 15,
    fontWeight: 600,
    color: "#E8E0D0",
  },
  crownIcon: {
    color: "#E8C84A",
    fontSize: 13,
  },
  scoreTotal: {
    fontSize: 20,
    fontWeight: 700,
    textAlign: "center",
    fontVariantNumeric: "tabular-nums",
  },
  scoreInput: {
    width: "100%",
    background: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(232,200,74,0.25)",
    borderRadius: 8,
    padding: "9px 8px",
    color: "#E8C84A",
    fontSize: 18,
    textAlign: "center",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "'Georgia', serif",
    fontWeight: 700,
    boxShadow: "inset 0 2px 8px rgba(0,0,0,0.4)",
  },

  // Modal
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.8)",
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    backdropFilter: "blur(4px)",
  },
  modalCard: {
    background: "linear-gradient(160deg, #0C2416 0%, #071A0F 100%)",
    border: "1px solid rgba(232,200,74,0.25)",
    borderRadius: 16,
    width: "100%",
    maxWidth: 360,
    maxHeight: "80vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 30px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(232,200,74,0.1)",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 20px",
  },
  modalPlayerName: {
    fontSize: 22,
    fontWeight: 700,
    fontFamily: "'Georgia', serif",
  },
  modalTotal: {
    fontSize: 13,
    color: "rgba(232,200,74,0.5)",
    marginTop: 3,
    fontStyle: "italic",
  },
  modalClose: {
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(232,200,74,0.5)",
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
    padding: "11px 20px",
  },
  modalRoundLabel: {
    fontSize: 14,
    color: "rgba(232,200,74,0.5)",
    width: 56,
    fontStyle: "italic",
  },
  modalRoundScore: {
    fontSize: 17,
    fontWeight: 700,
    fontFamily: "'Georgia', serif",
    fontVariantNumeric: "tabular-nums",
  },

  // Results
  winnerBanner: {
    textAlign: "center",
    padding: "32px 0 28px",
  },
  winnerCrown: {
    fontSize: 56,
    color: "#E8C84A",
    textShadow: "0 0 40px rgba(232,200,74,0.7), 0 0 80px rgba(232,200,74,0.3)",
    marginBottom: 10,
    display: "block",
    animation: "pulse-crown 2s ease-in-out infinite",
  },
  winnerName: {
    fontSize: 36,
    fontWeight: 700,
    color: "#E8C84A",
    margin: "0 0 6px",
    textShadow: "0 0 30px rgba(232,200,74,0.4)",
  },
  winnerLabel: {
    fontSize: 15,
    color: "rgba(232,200,74,0.55)",
    margin: 0,
    fontStyle: "italic",
  },

  scorecard: {
    background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.35) 100%)",
    border: "1px solid rgba(232,200,74,0.15)",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 20,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
  scorecardHeader: {
    display: "flex",
    padding: "10px 14px",
    fontSize: 10,
    letterSpacing: "0.15em",
    color: "rgba(232,200,74,0.4)",
    borderBottom: "1px solid rgba(232,200,74,0.12)",
    background: "rgba(0,0,0,0.25)",
    fontStyle: "italic",
  },
  scorecardRow: {
    display: "flex",
    padding: "9px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  scorecardTotals: {
    display: "flex",
    padding: "13px 14px",
    background: "rgba(232,200,74,0.05)",
    borderTop: "1px solid rgba(232,200,74,0.15)",
  },
  scorecardRound: {
    width: 52,
    flexShrink: 0,
    fontSize: 13,
    color: "rgba(232,200,74,0.45)",
    fontStyle: "italic",
  },
  scorecardPlayer: {
    flex: 1,
    fontSize: 11,
    fontWeight: 700,
    textAlign: "center",
    letterSpacing: "0.06em",
  },
  scorecardCell: {
    flex: 1,
    fontSize: 13,
    textAlign: "center",
    color: "#C8C0B0",
    fontVariantNumeric: "tabular-nums",
  },
  scorecardBtn: {
    background: "rgba(232,200,74,0.08)",
    border: "1px solid rgba(232,200,74,0.25)",
    color: "#E8C84A",
    borderRadius: 8,
    padding: "5px 12px",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'Georgia', serif",
    fontStyle: "italic",
  },
  editInput: {
    width: "90%",
    background: "rgba(0,0,0,0.5)",
    border: "1px solid rgba(232,200,74,0.6)",
    borderRadius: 4,
    padding: "3px 4px",
    color: "#E8C84A",
    fontSize: 14,
    textAlign: "center",
    outline: "none",
    fontFamily: "'Georgia', serif",
    fontWeight: 700,
  },
};
