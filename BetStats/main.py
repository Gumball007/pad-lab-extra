from fastapi import FastAPI
from dotenv import load_dotenv
import httpx
import os

load_dotenv()
API_KEY = os.getenv("API_KEY")

app = FastAPI()

# GET SPORTS
@app.get("/sports")
async def get_sports():

    url = 'https://pinnacle-odds.p.rapidapi.com/kit/v1/sports'

    headers = {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'pinnacle-odds.p.rapidapi.com'
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        
    return response.json()

# GET MARKETS
@app.get("/markets/{sport_id}")
async def get_markets(sport_id: int):

    url = 'https://pinnacle-odds.p.rapidapi.com/kit/v1/markets'
    
    params = {
        'sport_id': sport_id,
        'is_have_odds': 'true',
        'event_type': 'prematch'
    }
    
    headers = {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'pinnacle-odds.p.rapidapi.com'
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, headers=headers)
    
    return response.json()

# GET LIST OF LEAGUES
@app.get("/leagues/{sport_id}")
async def get_leagues(sport_id: int):

    url = 'https://pinnacle-odds.p.rapidapi.com/kit/v1/leagues'
    
    params = {'sport_id': sport_id}
    
    headers = {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'pinnacle-odds.p.rapidapi.com'
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, headers=headers)
        
    return response.json()

# GET EVENT DETAILS
@app.get("/event/{event_id}")
async def get_event_details(event_id: str):

    url = 'https://pinnacle-odds.p.rapidapi.com/kit/v1/details'
    
    params = {'event_id': event_id}
    
    headers = {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'pinnacle-odds.p.rapidapi.com'
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, headers=headers)
        
    return response.json()

@app.get("/status")
def read_status():
    return {"status": "OK"}