import pandas as pd
from datetime import datetime

df = pd.read_csv("atp_tennis.csv")
df["Date"] = pd.to_datetime(df["Date"])

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

    return matches

print(head_to_head("Alcaraz C.", "Sinner J.")["Winner"])


    