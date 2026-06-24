import pymc as pm
import numpy as np
import json
import pandas as pd

with open("tennis_elos_pretty.json") as f:
    players_data = json.load(f)

df = pd.read_csv("atp_tennis.csv")
df["Date"] = pd.to_datetime(df["Date"])

df_grass = df[
    (df["Surface"] == "Grass") &
    (df["Date"].dt.year >= 2021) &
    (df["Player_1"].isin(players_data)) &
    (df["Player_2"].isin(players_data))
].reset_index(drop=True)

print(f"Grass matches found: {len(df_grass)}")

grass_players = list(set(df_grass["Player_1"].tolist() + df_grass["Player_2"].tolist()))
player_idx = {p: i for i, p in enumerate(grass_players)}
n_players = len(grass_players)

print(f"Players: {n_players}")

p1_idx = np.array([player_idx[p] for p in df_grass["Player_1"]])
p2_idx = np.array([player_idx[p] for p in df_grass["Player_2"]])
outcomes = np.array([1 if df_grass.iloc[i]["Winner"] == df_grass.iloc[i]["Player_1"] else 0 
                     for i in range(len(df_grass))])

prior_means = np.array([players_data[p]["gelo"] for p in grass_players])

with pm.Model() as tennis_model:
    skill = pm.Normal(
        "skill",
        mu=prior_means,
        sigma=100,
        shape=n_players
    )
    
    skill_diff = skill[p1_idx] - skill[p2_idx]
    win_prob = pm.math.sigmoid(skill_diff / (400 / np.log(10)))
    
    result = pm.Bernoulli("result", p=win_prob, observed=outcomes)
    
    print("Sampling posterior...")
    trace = pm.sample(1000, tune=500, chains=2, progressbar=True, target_accept=0.9)

posterior_skills = trace.posterior["skill"].values.mean(axis=(0, 1))
posterior_stds = trace.posterior["skill"].values.std(axis=(0, 1))

updated_players = players_data.copy()
for i, player in enumerate(grass_players):
    updated_players[player]["gelo_bayesian"] = float(posterior_skills[i])
    updated_players[player]["gelo_uncertainty"] = float(posterior_stds[i])

with open("tennis_elos_bayesian.json", "w") as f:
    json.dump(updated_players, f, indent=2)

print("Done! Saved to tennis_elos_bayesian.json")
print("\nTop 10 by Bayesian grass skill:")
sorted_players = sorted(grass_players, key=lambda p: updated_players[p]["gelo_bayesian"], reverse=True)
for p in sorted_players[:10]:
    orig = players_data[p]["gelo"]
    bayes = updated_players[p]["gelo_bayesian"]
    std = updated_players[p]["gelo_uncertainty"]
    print(f"{p}: {orig:.0f} → {bayes:.0f} (±{std:.0f})")