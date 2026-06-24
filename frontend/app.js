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

function getTopCandidates(result, players, roundIndex, count = 4) {
  return players
    .map((name) => ({
      name,
      previousProbability: getRoundValue(result, name, roundIndex - 1),
    }))
    .sort((a, b) => b.previousProbability - a.previousProbability)
    .slice(0, count);
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

      const matchTotal = (leftPlayer?.matchProbability ?? 0) + (rightPlayer?.matchProbability ?? 0);
      const leftProb = matchTotal > 0 ? leftPlayer.matchProbability / matchTotal : 0.5;

      matchups.push({
        id: `${roundIndex}-${start}`,
        round: ROUND_NAMES[roundOffset],
        roundIndex,
        isFinal: roundIndex === totalRounds,
        left: { ...leftPlayer, matchProbability: leftProb },
        right: { ...rightPlayer, matchProbability: 1 - leftProb },
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

function buildPreloadedBracketRounds(result) {
  if (!result) return [];
  const totalRounds = Math.log2(draw.length);
  return Array.from({ length: totalRounds }, (_, roundOffset) => {
    const roundIndex = roundOffset + 1;
    const groupSize = 2 ** roundIndex;
    const halfSize = groupSize / 2;
    const matchups = [];
    for (let start = 0; start < draw.length; start += groupSize) {
      if (roundIndex === 1) {
        const leftPlayers = draw.slice(start, start + halfSize);
        const rightPlayers = draw.slice(start + halfSize, start + groupSize);
        const leftPlayer = getBestPlayer(result, leftPlayers, roundIndex);
        const rightPlayer = getBestPlayer(result, rightPlayers, roundIndex);
        const matchTotal = (leftPlayer?.matchProbability ?? 0) + (rightPlayer?.matchProbability ?? 0);
        const leftProb = matchTotal > 0 ? leftPlayer.matchProbability / matchTotal : 0.5;
        matchups.push({
          id: `${roundIndex}-${start}`,
          round: ROUND_NAMES[roundOffset],
          roundIndex,
          isFinal: false,
          isPreloaded: true,
          left: { ...leftPlayer, matchProbability: leftProb },
          right: { ...rightPlayer, matchProbability: 1 - leftProb },
          leftCandidates: getTopCandidates(result, leftPlayers, roundIndex, 6),
          rightCandidates: getTopCandidates(result, rightPlayers, roundIndex, 6),
        });
      } else {
        const leftPlayers = draw.slice(start, start + halfSize);
        const rightPlayers = draw.slice(start + halfSize, start + groupSize);
        matchups.push({
          id: `${roundIndex}-${start}`,
          round: ROUND_NAMES[roundOffset],
          roundIndex,
          isFinal: roundIndex === totalRounds,
          isPreloaded: false,
          leftCandidates: getTopCandidates(result, leftPlayers, roundIndex, 6),
          rightCandidates: getTopCandidates(result, rightPlayers, roundIndex, 6),
        });
      }
    }
    return { name: ROUND_NAMES[roundOffset], matchups };
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

function PlaygroundMatchupCard({ matchup, onPick, leftProb, rightProb }) {
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
      leftName || "TBD",
      leftProb != null && React.createElement("span", { className: "pg-prob" }, `${(leftProb * 100).toFixed(1)}%`)
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
      rightName || "TBD",
      rightProb != null && React.createElement("span", { className: "pg-prob" }, `${(rightProb * 100).toFixed(1)}%`)
    )
  );
}

function TBDMatchupCard({ matchup, selected, onSelect }) {
  return React.createElement(
    "button",
    {
      className: `matchup-card tbd-card${matchup.isFinal ? " final-match" : ""}${selected ? " selected" : ""}`,
      type: "button",
      onClick: () => onSelect(matchup),
    },
    React.createElement("span", { className: "top-join-line" }),
    React.createElement("span", { className: "bottom-join-line" }),
    React.createElement("span", { className: "vertical-join-line" }),
    React.createElement("span", { className: "feed-line" }),
    React.createElement("div", { className: "matchup-player" },
      React.createElement("span", { className: "matchup-name tbd-name" }, "TBD")
    ),
    React.createElement("div", { className: "matchup-divider" }),
    React.createElement("div", { className: "matchup-player" },
      React.createElement("span", { className: "matchup-name tbd-name" }, "TBD")
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

function MatchupDetail({ matchup, summary, summaryLoading }) {
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
      matchup.left
        ? React.createElement("strong", null, `${matchup.left.name} vs ${matchup.right.name}`)
        : React.createElement("strong", null, "Most Likely Contenders")
    ),
    matchup.left && React.createElement(
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
      React.createElement(CandidateList, { title: "Most likely — left half", candidates: matchup.leftCandidates }),
      React.createElement(CandidateList, { title: "Most likely — right half", candidates: matchup.rightCandidates })
    ),
    matchup.left && (summaryLoading || summary) && React.createElement(
      "div",
      { className: "match-summary" },
      React.createElement("h3", null, "Match Preview"),
      summaryLoading
        ? React.createElement(
            "div",
            { className: "summary-loading" },
            React.createElement("div", { className: "loader loader-sm" }),
            React.createElement("span", null, "Generating preview…")
          )
        : React.createElement("p", { className: "summary-text" }, summary)
    )
  );
}

function BracketView({ rounds, selectedMatchup, onSelectMatchup }) {
  const [activeRound, setActiveRound] = React.useState(0);
  const detailRef = React.useRef(null);

  React.useEffect(() => {
    if (selectedMatchup && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedMatchup]);

  function scrollToRound(roundOffset) {
    const column = document.querySelector(`[data-round-index="${roundOffset}"]`);
    if (!column) return;
    column.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  function centerRound(roundOffset) {
    setActiveRound(roundOffset);
    requestAnimationFrame(() => scrollToRound(roundOffset));
  }

  const canGoPrev = activeRound > 0;
  const canGoNext = activeRound < rounds.length - 1;
  const prevLabel = canGoPrev ? ROUND_NAMES[activeRound - 1] : "";
  const nextLabel = canGoNext ? ROUND_NAMES[activeRound + 1] : "";

  return React.createElement(
    "section",
    { className: "bracket-section" },
    React.createElement("div", { ref: detailRef },
      React.createElement(MatchupDetail, { matchup: selectedMatchup })
    ),
    React.createElement(
      "div",
      { className: "round-nav" },
      React.createElement(
        "button",
        {
          className: "round-nav-arrow",
          type: "button",
          disabled: !canGoPrev,
          onClick: () => canGoPrev && centerRound(activeRound - 1),
        },
        "◀",
        React.createElement("span", null, prevLabel)
      ),
      React.createElement(
        "span",
        { className: "round-nav-label" },
        ROUND_NAMES[activeRound]
      ),
      React.createElement(
        "button",
        {
          className: "round-nav-arrow",
          type: "button",
          disabled: !canGoNext,
          onClick: () => canGoNext && centerRound(activeRound + 1),
        },
        React.createElement("span", null, nextLabel),
        "▶"
      )
    ),
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

function PreloadedBracketView({ rounds, selectedMatchup, onSelectMatchup }) {
  const [activeRound, setActiveRound] = React.useState(0);
  const [summary, setSummary] = React.useState(null);
  const [summaryLoading, setSummaryLoading] = React.useState(false);
  const summaryRequestRef = React.useRef(0);
  const detailRef = React.useRef(null);

  React.useEffect(() => {
    if (selectedMatchup && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedMatchup]);

  React.useEffect(() => {
    if (!selectedMatchup || !selectedMatchup.isPreloaded) {
      setSummary(null);
      setSummaryLoading(false);
      return;
    }
    const requestId = ++summaryRequestRef.current;
    setSummary(null);
    setSummaryLoading(true);
    const p1 = encodeURIComponent(selectedMatchup.left.name);
    const p2 = encodeURIComponent(selectedMatchup.right.name);
    fetch(`http://localhost:8000/summary?player1=${p1}&player2=${p2}`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (summaryRequestRef.current === requestId) {
          setSummary(data.summary);
          setSummaryLoading(false);
        }
      })
      .catch(() => {
        if (summaryRequestRef.current === requestId) {
          setSummaryLoading(false);
        }
      });
  }, [selectedMatchup]);

  function scrollToRound(roundOffset) {
    const column = document.querySelector(`[data-preloaded-round="${roundOffset}"]`);
    if (!column) return;
    column.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  function centerRound(roundOffset) {
    setActiveRound(roundOffset);
    requestAnimationFrame(() => scrollToRound(roundOffset));
  }

  const canGoPrev = activeRound > 0;
  const canGoNext = activeRound < rounds.length - 1;
  const prevLabel = canGoPrev ? ROUND_NAMES[activeRound - 1] : "";
  const nextLabel = canGoNext ? ROUND_NAMES[activeRound + 1] : "";

  return React.createElement(
    "section",
    { className: "bracket-section" },
    React.createElement("div", { ref: detailRef },
      React.createElement(MatchupDetail, { matchup: selectedMatchup, summary, summaryLoading })
    ),
    React.createElement(
      "div",
      { className: "round-nav" },
      React.createElement(
        "button",
        {
          className: "round-nav-arrow",
          type: "button",
          disabled: !canGoPrev,
          onClick: () => canGoPrev && centerRound(activeRound - 1),
        },
        "◀",
        React.createElement("span", null, prevLabel)
      ),
      React.createElement("span", { className: "round-nav-label" }, ROUND_NAMES[activeRound]),
      React.createElement(
        "button",
        {
          className: "round-nav-arrow",
          type: "button",
          disabled: !canGoNext,
          onClick: () => canGoNext && centerRound(activeRound + 1),
        },
        React.createElement("span", null, nextLabel),
        "▶"
      )
    ),
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
              "data-preloaded-round": roundOffset,
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
                matchup.isPreloaded
                  ? React.createElement(MatchupCard, {
                      key: matchup.id,
                      matchup,
                      selected: selectedMatchup && selectedMatchup.id === matchup.id,
                      onSelect: onSelectMatchup,
                    })
                  : React.createElement(TBDMatchupCard, {
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
  const [activeRound, setActiveRound] = React.useState(null);
  const [probCache, setProbCache] = React.useState({});
  const fetchedOrFetchingRef = React.useRef(new Set());
  const totalRounds = Math.log2(draw.length);

  const rounds = React.useMemo(() => buildPlaygroundRounds(picks), [picks]);

  React.useEffect(() => {
    rounds.forEach((round) => {
      round.matchups.forEach((matchup) => {
        if (!matchup.leftName || !matchup.rightName) return;
        const sorted = [matchup.leftName, matchup.rightName].sort();
        const key = sorted.join("|");
        if (fetchedOrFetchingRef.current.has(key)) return;
        fetchedOrFetchingRef.current.add(key);
        const p1 = encodeURIComponent(sorted[0]);
        const p2 = encodeURIComponent(sorted[1]);
        fetch(`http://localhost:8000/probability?player1=${p1}&player2=${p2}`)
          .then((res) => res.json())
          .then((data) => {
            setProbCache((prev) => ({ ...prev, [key]: data.probability }));
          })
          .catch(() => {
            fetchedOrFetchingRef.current.delete(key);
          });
      });
    });
  }, [rounds]);

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
  }

  function centerRound(roundOffset) {
    setActiveRound(roundOffset);
    requestAnimationFrame(() => scrollToRound(roundOffset));
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
              round.matchups.map((matchup) => {
                const sorted = matchup.leftName && matchup.rightName
                  ? [matchup.leftName, matchup.rightName].sort()
                  : null;
                const key = sorted ? sorted.join("|") : null;
                const storedProb = key != null ? probCache[key] : undefined;
                const leftIsFirst = sorted && matchup.leftName <= matchup.rightName;
                const leftProb = storedProb != null ? (leftIsFirst ? storedProb : 1 - storedProb) : null;
                const rightProb = leftProb != null ? 1 - leftProb : null;
                return React.createElement(PlaygroundMatchupCard, {
                  key: matchup.id,
                  matchup,
                  onPick: handlePick,
                  leftProb,
                  rightProb,
                });
              })
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
  const [selectedPreloadedMatchup, setSelectedPreloadedMatchup] = React.useState(null);
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
      const preloadedRounds = buildPreloadedBracketRounds(result);
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
      setSelectedPreloadedMatchup(preloadedRounds[0] ? preloadedRounds[0].matchups[0] : null);
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
  const preloadedBracketRounds = React.useMemo(() => buildPreloadedBracketRounds(simulationResult), [simulationResult]);

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
              className: activeTab === "odds-bracket" ? "active" : "",
              type: "button",
              onClick: () => setActiveTab("odds-bracket"),
            },
            "Odds-Simulated Bracket"
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
          ? React.createElement(PreloadedBracketView, {
              rounds: preloadedBracketRounds,
              selectedMatchup: selectedPreloadedMatchup,
              onSelectMatchup: setSelectedPreloadedMatchup,
            })
          : activeTab === "odds-bracket"
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
