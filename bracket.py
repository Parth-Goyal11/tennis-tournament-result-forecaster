from predictor import calculate_match_probability, elo_probability_bO5
import pandas as pd
import json

with open("tennis_elos_pretty.json") as f:
    players = json.load(f)

draw = sorted(players.keys(), key=lambda p: players[p]["rank"])[:128]


_prob_cache: dict = {}

def safe_match_probability(player1, player2):
    key = (player1, player2)
    if key not in _prob_cache:
        try:
            _prob_cache[key] = calculate_match_probability(player1, player2)
        except KeyError:
            _prob_cache[key] = 0.5
    return _prob_cache[key]

def simulate_tournament(draw):
    _prob_cache.clear()
    probabilities = {player: [1.0] for player in draw}

    group_size = 2
    stage = 1
    while(group_size <= len(draw)):
        newProbabilities = {}

        for j in range(0, len(draw), group_size):
            midpoint = j + group_size//2

            for i in range(j, j+group_size):
                if i < midpoint:
                    opponentStart = midpoint
                    opponentEnd = j + group_size
                else:
                    opponentStart = j
                    opponentEnd = midpoint

                opponentProbability = 0

                for k in range(opponentStart, opponentEnd):
                    opponentProbability += probabilities[draw[k]][-1] * safe_match_probability(draw[i], draw[k])

                newProbabilities[draw[i]] = probabilities[draw[i]][-1] * opponentProbability

        for player, probability in newProbabilities.items():
            probabilities[player].append(probability)

        stage+=1
        group_size*=2
    return probabilities



#table = pd.DataFrame.from_dict(
   # simulate_tournament(draw),
   # orient="index",
   # columns=["QF", "SF", "F", "Champion"]
#)
#table = round(table*100, 2)
#table = table.sort_values(by = table.columns[-1], ascending=False)
#print(table)
