import pandas as pd
from datetime import datetime
import json

df = pd.read_csv("atp_tennis.csv")
df["Date"] = pd.to_datetime(df["Date"])

with open("players.json") as f:
    players = json.load(f)

#print(df["Winner"])


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


firstPlayer = input("Enter the First Player: ")
secondPlayer = input("Enter the Second Player: ")

fPlayerFirst, fPlayerLast = firstPlayer.split(" ", 1)
sPlayerFirst, sPlayerLast = secondPlayer.split(" ", 1)

feedFirst = fPlayerLast + " " + fPlayerFirst[0] + "."
feedSecond = sPlayerLast + " " + sPlayerFirst[0] + "."

#print(head_to_head(feedFirst, feedSecond)[["Tournament", "Winner", "Score"]])

print(head_to_head(feedFirst, feedSecond), end="")
print(" for " + firstPlayer) 

print("Elo Based", end="")
print(elo_probability(feedFirst, feedSecond))
 



    