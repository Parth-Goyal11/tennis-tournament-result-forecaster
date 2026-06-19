const API_URL = "http://localhost:8000/simulate";

const draw = Array.from({ length: 128 }, (_, index) => {
  return `Player ${String(index + 1).padStart(3, "0")}`;
});

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
      className: `matchup-card ${matchup.isFinal ? "final-match" : ""} ${selected ? "selected" : ""}`,
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
  function centerRound(roundOffset) {
    const column = document.querySelector(`[data-round-index="${roundOffset}"]`);

    if (column) {
      column.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });

      const columnBounds = column.getBoundingClientRect();
      const columnMiddle = window.scrollY + columnBounds.top + columnBounds.height / 2;
      const viewportMiddle = window.innerHeight / 2;

      window.scrollTo({
        top: Math.max(0, columnMiddle - viewportMiddle),
        behavior: "smooth",
      });
    }
  }

  return React.createElement(
    "section",
    { className: "bracket-section" },
    React.createElement(MatchupDetail, { matchup: selectedMatchup }),
    React.createElement(
      "div",
      { className: "bracket-scroll" },
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
                className: "round-label",
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
        React.createElement("p", { className: "eyebrow" }, "Wimbledon 2026"),
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
          )
        ),
        activeTab === "bracket"
          ? React.createElement(BracketView, {
              rounds: bracketRounds,
              selectedMatchup,
              onSelectMatchup: setSelectedMatchup,
            })
          : React.createElement(LeaderboardView, { rows })
      )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
