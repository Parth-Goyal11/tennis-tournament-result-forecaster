import pandas as pd
from datetime import datetime
import numpy as np
import json

#Constants
ELO_WEIGHT = 0.65
RECENT_WEIGHT = 0.15
H2H_WEIGHT = 0.15
RANK_WEIGHT = 0.05
df = pd.read_csv("atp_tennis.csv")
df["Date"] = pd.to_datetime(df["Date"])

with open("tennis_elos_pretty.json") as f:
    players = json.load(f)

#print(df["Winner"])

def solve_q(p3):
    coeffs = [-2, 3, 0, -p3]
    roots = np.roots(coeffs)

    real_roots = [r for r in roots if abs(r.imag) < 1e-6 and 0<=r.real<=1]
    return real_roots[0]

def last_10_matches(player):
    matches = df[
    (df["Player_1"] == player) 
    |
    (df["Player_2"] == player)
    ]

    matches = matches.sort_values(
        by="Date",
        ascending=False
    )

    return matches.head(10)

def head_to_head(player1, player2):
    matches = df[
        (
            (   (df["Player_1"] == player1)
                &
                (df["Player_2"] == player2)
            )
            |
            (    
                (df["Player_1"] == player2)
                &
                (df["Player_2"] == player1)
            )
        )
        &
        (df["Date"].dt.year >= datetime.now().year - 2)
    ]

    matches = matches.sort_values(
        by="Date",
        ascending=False
    )

    

    oneWins = (matches["Winner"] == player1).sum()
    twoWins = (matches["Winner"] == player2).sum()

    return round(((oneWins+1)/(oneWins + twoWins + 2)), 4)

def elo_probability(player1, player2):


    eloOne = players[player1]["gelo"]
    eloTwo = players[player2]["gelo"]

    return 1 / (1 + 10 ** ((eloTwo - eloOne) / 400))

def elo_probability_bO5(player1, player2):
    
    set_prob = solve_q(elo_probability(player1, player2)).real
    
    return ((6*pow(set_prob, 5)) - (15*pow(set_prob, 4)) + (10*pow(set_prob, 3)))

def ranking_probability(player1, player2):
    rankOne = players[player1]["rank"]
    rankTwo = players[player2]["rank"]

    probability = 0.5 + ((rankTwo - rankOne) / 200)
    return max(0, min(1, probability))

def recency_score(player1):
    matches = last_10_matches(player1)

    if len(matches) == 0:
        return 0.5

    surface_elos = {
        "Grass": "gelo",
        "Hard": "helo",
        "Clay": "celo"
    }

    formScore = 0
    matchesChecked = 0

    for _, match in matches.iterrows():
        opponent = match["Player_2"] if match["Player_1"] == player1 else match["Player_1"]
        eloType = surface_elos.get(match["Surface"])

        if eloType is None or player1 not in players or opponent not in players:
            continue

        playerElo = players[player1].get(eloType)
        opponentElo = players[opponent].get(eloType)

        if playerElo is None or opponentElo is None:
            continue

        expectedProbability = 1 / (1 + 10 ** ((opponentElo - playerElo) / 400))
        actualResult = 1 if match["Winner"] == player1 else 0

        formScore += actualResult - expectedProbability
        matchesChecked += 1

    if matchesChecked == 0:
        return 0.5

    return formScore / matchesChecked

def recency_probability(player1, player2):
    score1 = recency_score(player1)
    score2 = recency_score(player2)

    probability = 0.5 + (score1 - score2)
    return max(0.25, min(0.75, probability))

def calculate_match_probability(player1, player2):


    #elo = elo_probability(player1, player2) #1
    elo = elo_probability_bO5(player1, player2)
    headToHead = head_to_head(player1, player2) #2
    recentPerf = recency_probability(player1, player2) #3
    ranking = ranking_probability(player1, player2) #4
    

    matchProb = ((elo*ELO_WEIGHT) + (headToHead*H2H_WEIGHT) 
                 + (recentPerf*RECENT_WEIGHT) + (ranking*RANK_WEIGHT))
    
    return matchProb



if __name__ == "__main__":
    firstPlayer = input("Enter the First Player: ")
    secondPlayer = input("Enter the Second Player: ")

    fPlayerFirst, fPlayerLast = firstPlayer.split(" ", 1)
    sPlayerFirst, sPlayerLast = secondPlayer.split(" ", 1)

    feedFirst = fPlayerLast + " " + fPlayerFirst[0] + "."
    feedSecond = sPlayerLast + " " + sPlayerFirst[0] + "."

    matchVal = calculate_match_probability(feedFirst, feedSecond)

    if(calculate_match_probability(feedFirst, feedSecond) < 0.5):
        winner = feedSecond
        confidence = 1 - matchVal
    else:
        winner = feedFirst
        confidence = matchVal

    print("Prediction:", end=" ")
    print(winner + " " + " Confidence: " + str(round(confidence*100, 2)) + "%")






    
