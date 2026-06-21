const API_URL = "http://localhost:8000/simulate";


const draw = ["Sinner J.", "Alcaraz C.", "Zverev A.", "Aliassime F.", "Shelton B.", "Minaur A.", "Medvedev D.", "Djokovic N.", "Fritz T.", "Cobolli F.", "Bublik A.", "Lehecka J.", "Rublev A.", "Ruud C.", "Musetti L.", "Mensik J.", "Darderi L.", "Khachanov K.", "Tien L.", "Vacherot V.", "Fils A.", "Fokina A.", "Jodar R.", "Rinderknech A.", "Fonseca J.", "Tiafoe F.", "Cerundolo F.", "Paul T.", "Norrie C.", "Etcheverry T.", "Tabilo A.", "Nakashima B.", "Humbert U.", "Arnaldi M.", "Buse I.", "Moutet C.", "Blockx A.", "Michelsen A.", "Navone M.", "Griekspoor T.", "Shapovalov D.", "Machac T.", "Munar J.", "Mannarino A.", "Cerundolo J.", "Cilic M.", "Majchrzak K.", "Bergs Z.", "Berrettini M.", "Kecmanovic M.", "Collignon R.", "Tirante T.", "Atmane T.", "Borges N.", "Landaluce M.", "Zandschulp B.", "Baez S.", "Carabelli C.", "Hanfmann Y.", "Korda S.", "Marozsan F.", "Burruchaga R.", "Rune H.", "Kopriva V.", "Sonego L.", "Quinn E.", "Medjedovic H.", "Kovacevic A.", "Svajda Z.", "Busta P.", "Vallejo A.", "Jong J.", "Brooksby J.", "Bellucci M.", "Royer V.", "Fucsovics M.", "Struff J.", "Duckworth J.", "Cazaux A.", "Tsitsipas S.", "Altmaier D.", "Prizmic D.", "Aguilar D.", "Diallo G.", "Nava E.", "Giron M.", "Perricard G.", "Comesana F.", "Bonzi B.", "Popyrin A.", "Walton A.", "Trungelliti M.", "Faria J.", "Halys Q.", "Spizzirri E.", "Shevchenko A.", "Shimabukuro S.", "Vukic A.", "Wu Y.", "Assche L.", "Molcan A.", "Opelka R.", "Hurkacz H.", "Hijikata R.", "Dzumhur D.", "Choinski J.", "Yunchaokete B.", "Damm M.", "Wong C.", "Svrcina D.", "Wawrinka S.", "Droguet T.", "Draper J.", "Kypson P.", "Agut R.", "Riedi L.", "Gaston H.", "Basilashvili N.", "Garin C.", "Ruiz P.", "Kjaer N.", "Rocha H.", "Ofner S.", "Maestrelli F.", "Muller A.", "Sweeny D.", "Acosta F.", "Mcdonald M."];
const ROUND_NAMES = ["Round of 128", "Round of 64", "Round of 32", "Round of 16", "Quarterfinal", "Semifinal", "Final"];

function getRoundProbability(rounds, offsetFromEnd) {
  return rounds.length >= offsetFromEnd ? rounds[rounds.length - offsetFromEnd] : 0;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function getRoundValue(result, player, roundIndex) {
  return result[player] && result[player][roundIndex] !== undefined ? result[player][roundIndex] : 0;
}

function getConditionalWinProbability(result, player, roundIndex) {
  const previousProbability = getRoundValue(result, player, roundIndex - 1);
  const nextProbability = getRoundValue(result, player, roundIndex);

  if (previousProbability <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, nextProbability / previousProbability));
}

function getBestPlayer(result, players, roundIndex) {
  return players
    .map((name) => ({
      name,
      previousProbability: getRoundValue(result, name, roundIndex - 1),
      nextProbability: getRoundValue(result, name, roundIndex),
      matchProbability: getConditionalWinProbability(result, name, roundIndex),
    }))
    .sort((a, b) => b.previousProbability - a.previousProbability || b.nextProbability - a.nextProbability)[0];
}

function getTopCandidates(result, players, roundIndex) {
  return players
    .map((name) => ({
      name,
      previousProbability: getRoundValue(result, name, roundIndex - 1),
    }))
    .sort((a, b) => b.previousProbability - a.previousProbability)
    .slice(0, 4);
}

function buildBracketRounds(result) {
  if (!result) {
    return [];
  }

  const totalRounds = Math.log2(draw.length);

  return Array.from({ length: totalRounds }, (_, roundOffset) => {
    const roundIndex = roundOffset + 1;
    const groupSize = 2 ** roundIndex;
    const halfSize = groupSize / 2;

    const matchups = [];

    for (let start = 0; start < draw.length; start += groupSize) {
      const leftPlayers = draw.slice(start, start + halfSize);
      const rightPlayers = draw.slice(start + halfSize, start + groupSize);
      const leftPlayer = getBestPlayer(result, leftPlayers, roundIndex);
      const rightPlayer = getBestPlayer(result, rightPlayers, roundIndex);

      matchups.push({
        id: `${roundIndex}-${start}`,
        round: ROUND_NAMES[roundOffset],
        roundIndex,
        isFinal: roundIndex === totalRounds,
        left: leftPlayer,
        right: rightPlayer,
        leftCandidates: getTopCandidates(result, leftPlayers, roundIndex),
        rightCandidates: getTopCandidates(result, rightPlayers, roundIndex),
      });
    }

    return {
      name: ROUND_NAMES[roundOffset],
      matchups,
    };
  });
}

function getPlaygroundWinner(picks, roundIndex, start) {
  const matchId = `${roundIndex}-${start}`;
  const pick = picks[matchId];
  if (roundIndex === 1) {
    if (pick === "left") return draw[start];
    if (pick === "right") return draw[start + 1];
    return null;
  }
  const halfSize = 2 ** (roundIndex - 1);
  if (pick === "left") return getPlaygroundWinner(picks, roundIndex - 1, start);
  if (pick === "right") return getPlaygroundWinner(picks, roundIndex - 1, start + halfSize);
  return null;
}

function buildPlaygroundRounds(picks) {
  const totalRounds = Math.log2(draw.length);
  return Array.from({ length: totalRounds }, (_, roundOffset) => {
    const roundIndex = roundOffset + 1;
    const groupSize = 2 ** roundIndex;
    const halfSize = groupSize / 2;
    const matchups = [];
    for (let start = 0; start < draw.length; start += groupSize) {
      let leftName, rightName;
      if (roundIndex === 1) {
        leftName = draw[start];
        rightName = draw[start + 1];
      } else {
        leftName = getPlaygroundWinner(picks, roundIndex - 1, start);
        rightName = getPlaygroundWinner(picks, roundIndex - 1, start + halfSize);
      }
      matchups.push({
        id: `${roundIndex}-${start}`,
        round: ROUND_NAMES[roundOffset],
        roundIndex,
        isFinal: roundIndex === totalRounds,
        leftName,
        rightName,
        pick: picks[`${roundIndex}-${start}`],
      });
    }
    return { name: ROUND_NAMES[roundOffset], matchups };
  });
}

function LeaderboardRow({ player, index }) {
  return React.createElement(
    "tr",
    null,
    React.createElement("td", { className: "rank-cell" }, index + 1),
    React.createElement(
      "td",
      { className: "player-cell" },
      React.createElement("span", { className: "player-name" }, player.name),
      React.createElement("span", { className: "seed-label" }, player.seed)
    ),
    React.createElement("td", { className: "metric-cell champion" }, formatPercent(player.champion)),
    React.createElement("td", { className: "metric-cell" }, formatPercent(player.final)),
    React.createElement("td", { className: "metric-cell" }, formatPercent(player.semis)),
    React.createElement("td", { className: "metric-cell" }, formatPercent(player.quarters))
  );
}

function MatchupPlayer({ player }) {
  return React.createElement(
    "div",
    { className: "matchup-player" },
    React.createElement("span", { className: "matchup-name" }, player ? player.name : "TBD"),
    React.createElement("strong", null, formatPercent(player ? player.matchProbability : 0))
  );
}

function MatchupCard({ matchup, selected, onSelect }) {
  return React.createElement(
    "button",
    {
      className: `matchup-card${matchup.isFinal ? " final-match" : ""}${selected ? " selected" : ""}${matchup.roundIndex === 1 ? " first-round" : ""}`,
      type: "button",
      onClick: () => onSelect(matchup),
    },
    React.createElement("span", { className: "top-join-line" }),
    React.createElement("span", { className: "bottom-join-line" }),
    React.createElement("span", { className: "vertical-join-line" }),
    React.createElement("span", { className: "feed-line" }),
    React.createElement(MatchupPlayer, { player: matchup.left }),
    React.createElement("div", { className: "matchup-divider" }),
    React.createElement(MatchupPlayer, { player: matchup.right })
  );
}

function PlaygroundMatchupCard({ matchup, onPick }) {
  const { id, leftName, rightName, pick, isFinal, roundIndex } = matchup;
  return React.createElement(
    "div",
    {
      className: `matchup-card pg-card${isFinal ? " final-match" : ""}${roundIndex === 1 ? " first-round" : ""}${pick !== undefined ? " pg-completed" : ""}`,
    },
    React.createElement("span", { className: "top-join-line" }),
    React.createElement("span", { className: "bottom-join-line" }),
    React.createElement("span", { className: "vertical-join-line" }),
    React.createElement("span", { className: "feed-line" }),
    React.createElement(
      "button",
      {
        className: `pg-player${pick === "left" ? " pg-winner" : ""}`,
        type: "button",
        disabled: !leftName,
        onClick: () => onPick(id, "left"),
      },
      leftName || "TBD"
    ),
    React.createElement("div", { className: "matchup-divider" }),
    React.createElement(
      "button",
      {
        className: `pg-player${pick === "right" ? " pg-winner" : ""}`,
        type: "button",
        disabled: !rightName,
        onClick: () => onPick(id, "right"),
      },
      rightName || "TBD"
    )
  );
}

function CandidateList({ title, candidates }) {
  return React.createElement(
    "div",
    { className: "candidate-block" },
    React.createElement("h3", null, title),
    React.createElement(
      "ul",
      null,
      candidates.map((candidate) =>
        React.createElement(
          "li",
          { key: candidate.name },
          React.createElement("span", null, candidate.name),
          React.createElement("strong", null, formatPercent(candidate.previousProbability))
        )
      )
    )
  );
}

function MatchupDetail({ matchup }) {
  if (!matchup) {
    return React.createElement(
      "section",
      { className: "matchup-detail empty" },
      React.createElement("p", null, "Select a matchup to inspect projected win probabilities.")
    );
  }

  return React.createElement(
    "section",
    { className: "matchup-detail" },
    React.createElement(
      "div",
      { className: "detail-heading" },
      React.createElement("span", null, matchup.round),
      React.createElement("strong", null, `${matchup.left.name} vs ${matchup.right.name}`)
    ),
    React.createElement(
      "div",
      { className: "detail-grid" },
      React.createElement(
        "div",
        { className: "detail-player" },
        React.createElement("span", null, matchup.left.name),
        React.createElement("strong", null, formatPercent(matchup.left.matchProbability)),
        React.createElement("small", null, `Reach this round: ${formatPercent(matchup.left.previousProbability)}`)
      ),
      React.createElement(
        "div",
        { className: "detail-player" },
        React.createElement("span", null, matchup.right.name),
        React.createElement("strong", null, formatPercent(matchup.right.matchProbability)),
        React.createElement("small", null, `Reach this round: ${formatPercent(matchup.right.previousProbability)}`)
      )
    ),
    React.createElement(
      "div",
      { className: "candidate-grid" },
      React.createElement(CandidateList, { title: "Left side contenders", candidates: matchup.leftCandidates }),
      React.createElement(CandidateList, { title: "Right side contenders", candidates: matchup.rightCandidates })
    )
  );
}

function BracketView({ rounds, selectedMatchup, onSelectMatchup }) {
  // Zoom out progressively for later rounds so the compact structure is visible.
  // R128–R32 stay at 1:1; QF/SF/Final compress to give context without losing cards entirely.
  const ROUND_ZOOMS = [1, 1, 1, 0.85, 0.7, 0.55, 1];
  const [bracketZoom, setBracketZoom] = React.useState(1);
  const [activeRound, setActiveRound] = React.useState(null);

  function scrollToRound(roundOffset) {
    const column = document.querySelector(`[data-round-index="${roundOffset}"]`);
    if (!column) return;

    // Center the column horizontally in the scroll container
    column.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });

    // Measure the ACTUAL card bounds — not the full column (which includes empty gap space)
    const cards = Array.from(column.querySelectorAll(".matchup-card"));
    if (!cards.length) return;

    const firstRect = cards[0].getBoundingClientRect();
    const lastRect = cards[cards.length - 1].getBoundingClientRect();
    const contentTop = window.scrollY + firstRect.top;
    const contentBottom = window.scrollY + lastRect.bottom;
    const contentHeight = contentBottom - contentTop;
    const contentMid = (contentTop + contentBottom) / 2;
    const vh = window.innerHeight;

    // If all cards in this round fit in the viewport, center them.
    // Otherwise, snap to the first card (avoids landing on an empty gap for SF/QF/Final).
    const targetY =
      contentHeight <= vh * 0.85
        ? Math.max(0, contentMid - vh / 2)
        : Math.max(0, contentTop - 80);

    window.scrollTo({ top: targetY, behavior: "smooth" });
  }

  function centerRound(roundOffset) {
    setActiveRound(roundOffset);
    setBracketZoom(ROUND_ZOOMS[roundOffset] ?? 1);
    // Wait for React to re-render with the new zoom before measuring card positions
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToRound(roundOffset)));
  }

  return React.createElement(
    "section",
    { className: "bracket-section" },
    React.createElement(MatchupDetail, { matchup: selectedMatchup }),
    React.createElement(
      "div",
      { className: "bracket-scroll", style: { zoom: bracketZoom } },
      React.createElement(
        "div",
        { className: "bracket-grid" },
        rounds.map((round, roundOffset) =>
          React.createElement(
            "div",
            {
              className: "round-column",
              key: round.name,
              "data-round-index": roundOffset,
              style: {
                "--round-gap": `${(86 + 10) * 2 ** roundOffset - 86}px`,
                "--round-offset": `${((86 + 10) * (2 ** roundOffset - 1)) / 2}px`,
              },
            },
            React.createElement(
              "button",
              {
                className: `round-label${activeRound === roundOffset ? " active" : ""}`,
                type: "button",
                onClick: () => centerRound(roundOffset),
                title: `Center ${round.name}`,
              },
              round.name
            ),
            React.createElement(
              "div",
              { className: "round-matchups" },
              round.matchups.map((matchup) =>
                React.createElement(MatchupCard, {
                  key: matchup.id,
                  matchup,
                  selected: selectedMatchup && selectedMatchup.id === matchup.id,
                  onSelect: onSelectMatchup,
                })
              )
            )
          )
        )
      )
    )
  );
}

function PlaygroundView() {
  const [picks, setPicks] = React.useState({});
  const ROUND_ZOOMS = [1, 1, 1, 0.85, 0.7, 0.55, 1];
  const [bracketZoom, setBracketZoom] = React.useState(1);
  const [activeRound, setActiveRound] = React.useState(null);
  const totalRounds = Math.log2(draw.length);

  const rounds = React.useMemo(() => buildPlaygroundRounds(picks), [picks]);

  function handlePick(matchId, side) {
    setPicks((prev) => {
      const [roundStr, startStr] = matchId.split("-");
      const roundIndex = parseInt(roundStr);
      const start = parseInt(startStr);
      const newPicks = { ...prev };
      if (newPicks[matchId] === side) {
        delete newPicks[matchId];
      } else {
        newPicks[matchId] = side;
      }
      for (let r = roundIndex + 1; r <= totalRounds; r++) {
        const groupSize = 2 ** r;
        const s = Math.floor(start / groupSize) * groupSize;
        delete newPicks[`${r}-${s}`];
      }
      return newPicks;
    });
  }

  function scrollToRound(roundOffset) {
    const column = document.querySelector(`[data-pg-round="${roundOffset}"]`);
    if (!column) return;
    column.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    const cards = Array.from(column.querySelectorAll(".matchup-card"));
    if (!cards.length) return;
    const firstRect = cards[0].getBoundingClientRect();
    const lastRect = cards[cards.length - 1].getBoundingClientRect();
    const contentTop = window.scrollY + firstRect.top;
    const contentBottom = window.scrollY + lastRect.bottom;
    const contentHeight = contentBottom - contentTop;
    const contentMid = (contentTop + contentBottom) / 2;
    const vh = window.innerHeight;
    const targetY =
      contentHeight <= vh * 0.85
        ? Math.max(0, contentMid - vh / 2)
        : Math.max(0, contentTop - 80);
    window.scrollTo({ top: targetY, behavior: "smooth" });
  }

  function centerRound(roundOffset) {
    setActiveRound(roundOffset);
    setBracketZoom(ROUND_ZOOMS[roundOffset] ?? 1);
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToRound(roundOffset)));
  }

  return React.createElement(
    "section",
    { className: "bracket-section" },
    React.createElement(
      "div",
      { className: "pg-toolbar" },
      React.createElement("p", { className: "pg-hint" }, "Click a player to advance them through the bracket. Click again to deselect."),
      React.createElement(
        "button",
        { className: "pg-reset", type: "button", onClick: () => setPicks({}) },
        "Reset"
      )
    ),
    React.createElement(
      "div",
      { className: "bracket-scroll", style: { zoom: bracketZoom } },
      React.createElement(
        "div",
        { className: "bracket-grid" },
        rounds.map((round, roundOffset) =>
          React.createElement(
            "div",
            {
              className: "round-column",
              key: round.name,
              "data-pg-round": roundOffset,
              style: {
                "--round-gap": `${(86 + 10) * 2 ** roundOffset - 86}px`,
                "--round-offset": `${((86 + 10) * (2 ** roundOffset - 1)) / 2}px`,
              },
            },
            React.createElement(
              "button",
              {
                className: `round-label${activeRound === roundOffset ? " active" : ""}`,
                type: "button",
                onClick: () => centerRound(roundOffset),
              },
              round.name
            ),
            React.createElement(
              "div",
              { className: "round-matchups" },
              round.matchups.map((matchup) =>
                React.createElement(PlaygroundMatchupCard, {
                  key: matchup.id,
                  matchup,
                  onPick: handlePick,
                })
              )
            )
          )
        )
      )
    )
  );
}

function LeaderboardView({ rows }) {
  return React.createElement(
    "section",
    { className: "table-wrap" },
    React.createElement(
      "table",
      null,
      React.createElement(
        "thead",
        null,
        React.createElement(
          "tr",
          null,
          React.createElement("th", null, "#"),
          React.createElement("th", null, "Player"),
          React.createElement("th", null, "Win"),
          React.createElement("th", null, "Final"),
          React.createElement("th", null, "Semi"),
          React.createElement("th", null, "Quarter")
        )
      ),
      React.createElement(
        "tbody",
        null,
        rows.map((player, index) =>
          React.createElement(LeaderboardRow, {
            key: player.name,
            player,
            index,
          })
        )
      )
    )
  );
}

function App() {
  const [rows, setRows] = React.useState([]);
  const [simulationResult, setSimulationResult] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState("bracket");
  const [selectedMatchup, setSelectedMatchup] = React.useState(null);
  const [status, setStatus] = React.useState("loading");
  const [error, setError] = React.useState("");

  async function runSimulation() {
    setStatus("loading");
    setError("");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draw),
      });

      if (!response.ok) {
        throw new Error(`Simulation failed with status ${response.status}`);
      }

      const result = await response.json();
      const bracketRounds = buildBracketRounds(result);
      const leaderboardRows = Object.entries(result)
        .map(([name, rounds], index) => ({
          name,
          seed: `Seed ${index + 1}`,
          quarters: getRoundProbability(rounds, 4),
          semis: getRoundProbability(rounds, 3),
          final: getRoundProbability(rounds, 2),
          champion: getRoundProbability(rounds, 1),
        }))
        .sort((a, b) => b.champion - a.champion);

      setSimulationResult(result);
      setSelectedMatchup(bracketRounds[0] ? bracketRounds[0].matchups[0] : null);
      setRows(leaderboardRows);
      setStatus("ready");
    } catch (requestError) {
      setError(
        `${requestError.message}. Make sure FastAPI is running at http://localhost:8000.`
      );
      setStatus("error");
    }
  }

  React.useEffect(() => {
    runSimulation();
  }, []);

  const bracketRounds = React.useMemo(() => buildBracketRounds(simulationResult), [simulationResult]);

  return React.createElement(
    "main",
    { className: "app-shell" },
    React.createElement(
      "header",
      { className: "topbar" },
      React.createElement(
        "div",
        null,
        React.createElement("p", { className: "eyebrow" }, "Currently Analyzing: Wimbledon 2026"),
        React.createElement("h1", null, "Tournament Predictor")
      ),
      React.createElement(
        "button",
        {
          className: `status-pill ${status}`,
          type: "button",
          onClick: runSimulation,
          disabled: status === "loading",
          title: "Run simulation",
        },
        status === "loading" ? "Running" : status === "error" ? "Offline" : "Ready"
      ),
      React.createElement(
        "button",
        {
          className: "run-button",
          type: "button",
          onClick: runSimulation,
          disabled: status === "loading",
        },
        status === "loading" ? "Running..." : "Run simulation"
      )
    ),
    React.createElement(
      "section",
      { className: "summary-strip" },
      React.createElement(
        "div",
        null,
        React.createElement("span", null, "Draw"),
        React.createElement("strong", null, draw.length)
      ),
      React.createElement(
        "div",
        null,
        React.createElement("span", null, "Rounds"),
        React.createElement("strong", null, "7")
      ),
      React.createElement(
        "div",
        null,
        React.createElement("span", null, "Surface"),
        React.createElement("strong", null, "Grass")
      )
    ),
    status === "loading" &&
      React.createElement(
        "section",
        { className: "loading-panel" },
        React.createElement("div", { className: "loader" }),
        React.createElement("p", null, "Running simulation")
      ),
    status === "error" &&
      React.createElement(
        "section",
        { className: "error-panel" },
        React.createElement("h2", null, "Simulation unavailable"),
        React.createElement("p", null, error)
      ),
    status === "ready" &&
      React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "nav",
          { className: "view-tabs", "aria-label": "Tournament views" },
          React.createElement(
            "button",
            {
              className: activeTab === "bracket" ? "active" : "",
              type: "button",
              onClick: () => setActiveTab("bracket"),
            },
            "Bracket"
          ),
          React.createElement(
            "button",
            {
              className: activeTab === "leaderboard" ? "active" : "",
              type: "button",
              onClick: () => setActiveTab("leaderboard"),
            },
            "Leaderboard"
          ),
          React.createElement(
            "button",
            {
              className: activeTab === "playground" ? "active" : "",
              type: "button",
              onClick: () => setActiveTab("playground"),
            },
            "Playground"
          )
        ),
        activeTab === "bracket"
          ? React.createElement(BracketView, {
              rounds: bracketRounds,
              selectedMatchup,
              onSelectMatchup: setSelectedMatchup,
            })
          : activeTab === "leaderboard"
          ? React.createElement(LeaderboardView, { rows })
          : React.createElement(PlaygroundView)
      )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
