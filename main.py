from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from bracket import simulate_tournament, draw
from predictor import *
from dotenv import load_dotenv
import os 

import anthropic

load_dotenv()

api_key = os.getenv("ANTHROPIC_API_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "null",
     ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/hello")
def hello():
    return {"message": "hello world"}


@app.post("/simulate")
def simulate(draw: list[str]):
    return simulate_tournament(draw)

@app.get("/players")
def get_players():
    return list(players.keys())

@app.get("/draw")
def load_draw():
    return draw

_summary_cache: dict[tuple[str, str], str] = {}

@app.post("/summary")
def match_summary(player1: str, player2: str):
    cache_key = (min(player1, player2), max(player1, player2))
    if cache_key in _summary_cache:
        return {"summary": _summary_cache[cache_key]}

    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    prob = calculate_match_probability(player1, player2)
    confidence = round(prob * 100, 1) if prob > 0.5 else round((1 - prob) * 100, 1)
    winner = player1 if prob > 0.5 else player2
    
    elo = elo_probability_bO5(player1, player2)
    h2h = head_to_head(player1, player2)
    recency = recency_probability(player1, player2)
    ranking = ranking_probability(player1, player2)

    favor_text = "heavily favors" if confidence > 70 else "favors" if confidence > 60 else "slightly favors" if confidence > 55 else "is a toss-up but leans toward" 
    prompt = f"""You are a tennis analyst. Write a 3-4 sentence Wimbledon match preview for {player1} vs {player2}.
    
    Model components:
    - Grass court ELO probability: {round(elo*100, 1)}% for {player1}
    - Head to head (last 2 years): {round(h2h*100, 1)}% for {player1}  
    - Recent form: {round(recency*100, 1)}% for {player1}
    - Final prediction: {winner} wins with {confidence}% confidence

    The model {favor_text} {winner} at {confidence}% confidence. Reflect this in your analysis. Highlight both players' grass court styles but make clear why {winner} is expected to win. Don't
    use percentages to describe the recent form metric or head to head metric, just use words for those'
    - Do not directly reference who is the defending champion or make specific claims about recent tournament history
    Don't include any header with the match or preview title, just go straight into the analysis
    Reference the players by their last names when you want to use the name"""

    message = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )
    
    result = message.content[0].text
    _summary_cache[cache_key] = result
    return {"summary": result}


@app.get("/probability")
def get_probability(player1: str, player2: str):
    prob = calculate_match_probability(player1, player2)
    return {"player1": player1, "player2": player2, "probability": round(prob, 4)}


@app.get("/prediction_interval")
def prediction_interval(player1: str, player2: str):
    lower, mean, upper = elo_probability_interval(player1, player2)
    if mean is None:
        return {"error": "Bayesian estimates not available for one or both players"}
    return {
        "player1": player1,
        "lower": round(lower * 100, 1),
        "mean": round(mean * 100, 1),
        "upper": round(upper * 100, 1)
    }
