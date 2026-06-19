from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from bracket import simulate_tournament
from predictor import players

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
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
