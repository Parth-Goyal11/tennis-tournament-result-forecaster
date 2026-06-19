import pandas as pd
import json
from predictor import elo_probability_bO5, head_to_head, recency_probability, ranking_probability, ranking_probability_from_csv, head_to_head_train, elo_probability_surface, recency_probability_train
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from datetime import datetime

df = pd.read_csv("atp_tennis.csv")
df["Date"] = pd.to_datetime(df["Date"])

with open("tennis_elos_pretty.json") as f:
    players = json.load(f)

df_filtered = df[
    (df["Player_1"].isin(players)) &
    (df["Player_2"].isin(players)) & 
    (df["Date"].dt.year >= 2010)
]

X = []  # features
y = []  # outcomes

for _, match in df_filtered.iterrows():
    player1 = match["Player_1"]
    player2 = match["Player_2"]
    
    try:
        surface_elos = {
            "Grass": "gelo", 
            "Hard" : "helo",
            "Clay": "celo"
        }

        elo_type = surface_elos.get(match["Surface"], "elo")
        best_of = int(match["Best of"])

        elo = elo_probability_surface(player1, player2, elo_type, best_of)
        if elo is None: 
            continue
        match_date = pd.Timestamp(match["Date"])
        h2h = head_to_head_train(player1, player2, match_date)
        recency = recency_probability(player1, player2)
        ranking = ranking_probability_from_csv(match["Rank_1"], match["Rank_2"])
        
        X.append([elo, h2h, recency, ranking])
        y.append(1 if match["Winner"] == player1 else 0)
    except Exception as e:
        print(e)
        continue

X_train, X_test, Y_train, Y_test = train_test_split(X, y, test_size=0.2, random_state=38)

model = LogisticRegression()
model.fit(X_train, Y_train)

print("Accuracy: ", model.score(X_test, Y_test))
print("Coefficients:", model.coef_)
print("X_test sample:", X_test[:3])
print("Y_test sample:", Y_test[:3])
print("len X_test:", len(X_test))
correct = 0
for i in range(len(X_test)):
    elo, h2h, recency, ranking = X_test[i]
    prob = (elo*0.60) + (h2h*0.15) + (recency*0.2) + (ranking*0.05)
    prediction = 1 if prob > 0.5 else 0
    if prediction == Y_test[i]:
        correct+=1

print("Hard-Coded Accuracy: ", correct/len(Y_test))