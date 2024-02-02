from fastapi import FastAPI, Depends, HTTPException
from starlette import status
from dotenv import load_dotenv
from models import Event
from sqlalchemy.orm import Session
from session import get_db, engine
from models import Base
from prometheus_fastapi_instrumentator import Instrumentator
import httpx
import os

load_dotenv()
API_KEY = os.getenv("API_KEY")
SELF_PORT = os.getenv('SELF_PORT') or '4000'

def create_tables():
    Base.metadata.create_all(bind=engine)

def start_application():
    app = FastAPI()
    create_tables()
    return app

app = start_application()

Instrumentator().instrument(app).expose(app)

# Get sports
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

# Get markets
@app.get("/markets/{sport_id}")
async def get_markets(sport_id: int, event_type: str = 'prematch', league_ids: int = None):

    url = 'https://pinnacle-odds.p.rapidapi.com/kit/v1/markets'
    
    params = {
        'sport_id': sport_id,
        'is_have_odds': 'true',
        'event_type': event_type,
    }

    if league_ids:
        params['league_ids'] = league_ids
    
    headers = {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'pinnacle-odds.p.rapidapi.com'
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, headers=headers)
    
    return response.json()

# Get leagues
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

# Get event details
@app.get("/event/{event_id}")
async def get_event_details(event_id: str, db: Session = Depends(get_db)):

    url = 'https://pinnacle-odds.p.rapidapi.com/kit/v1/details'
    
    params = {'event_id': event_id}
    
    headers = {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'pinnacle-odds.p.rapidapi.com'
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, headers=headers)

    events_data = response.json().get('events', [])

    try:
        for event_data in events_data:

            existing_event = db.query(Event).filter(Event.id == event_data['event_id']).first()
            if existing_event:            
                continue 

            event = Event(
                id=event_data['event_id'],
                sport_id=event_data['sport_id'],
                league_id=event_data['league_id'],
                league_name=event_data['league_name'],
                starts=event_data['starts'],
                home=event_data['home'],
                away=event_data['away'],
                event_type=event_data['event_type'],
                resulting_unit=event_data['resulting_unit'],
                money_line_home=event_data['periods']['num_0']['money_line']['home'],
                money_line_draw=event_data['periods']['num_0']['money_line']['draw'],
                money_line_away=event_data['periods']['num_0']['money_line']['away'],
            )

            db.add(event)
            db.commit()
            db.refresh(event)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Something is wrong with the transaction")

    return response.json()

@app.get("/status")
def read_status():
    return {"status": "OK"}