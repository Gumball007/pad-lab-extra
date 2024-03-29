from fastapi import FastAPI, HTTPException, Depends
from starlette import status
from dotenv import load_dotenv
from models import Base, Video
from sqlalchemy.orm import Session
from session import get_db, engine
from prometheus_fastapi_instrumentator import Instrumentator
import httpx
import os
import logging

load_dotenv()
API_KEY = os.getenv("API_KEY")
SELF_PORT = os.getenv('SELF_PORT') or '4000'

class EndpointFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        return record.getMessage().find("/metrics") == -1

# Filter out /metrics
logging.getLogger("uvicorn.access").addFilter(EndpointFilter())

def create_tables():
    Base.metadata.create_all(bind=engine)

def start_application():
    app = FastAPI()
    create_tables()
    return app

app = start_application()

Instrumentator().instrument(app).expose(app)

# Search for youtube video
@app.get("/search")
async def youtube_search(query: str, next: str = None, type: str = None):

    url = 'https://youtube-search-and-download.p.rapidapi.com/search'

    params = {
        'query': query,
        'hl': 'en',
        'type': type,
        'features': 'hd',
        'sort': 'r'
    }

    if next:
        params['next'] = next

    headers = {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'youtube-search-and-download.p.rapidapi.com'
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, params=params)

    return response.json()

# Get video info
@app.get("/video")
async def get_video_info(video_id: str, db: Session = Depends(get_db)):

    url = 'https://youtube-search-and-download.p.rapidapi.com/video'

    params = {'id': video_id}
    
    headers = {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'youtube-search-and-download.p.rapidapi.com'
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, params=params)

    video_data = response.json()

    try:
        existing_video = db.query(Video).filter(Video.videoId == video_id).first()
        if existing_video:
            return video_data

        video_details = video_data.get("videoDetails", {})
        highest_res_thumbnail = max(video_details.get("thumbnail", {}).get("thumbnails", []), 
                                    key=lambda x: x.get('width', 0))

        video = Video(
            videoId=video_details.get("videoId"),
            title=video_details.get("title"),
            length_seconds=int(video_details.get("lengthSeconds", 0)),
            channel_id=video_details.get("channelId"),
            short_description=video_details.get("shortDescription"),
            view_count=int(video_details.get("viewCount", 0)),
            thumbnail_url=highest_res_thumbnail.get("url"),
            author=video_details.get("author")
        )

        db.add(video)
        db.commit()
        db.refresh(video)

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Something went wrong")

    return video_data

# Get video related
@app.get("/video/related")
async def get_video_related(video_id: str, next: str = None):

    url = 'https://youtube-search-and-download.p.rapidapi.com/video/related'

    params = {
        'id': video_id,
    }

    if next:
        params['next'] = next

    headers = {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'youtube-search-and-download.p.rapidapi.com'
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, params=params)

    return response.json()

# Get channel info
@app.get("/channel")
async def get_channel_info(channel_id: str):

    url = 'https://youtube-search-and-download.p.rapidapi.com/channel/about'

    params = {
        'id': channel_id,
    }

    headers = {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'youtube-search-and-download.p.rapidapi.com'
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, params=params)

    return response.json()

@app.get("/status")
def read_status():
    return {"status": "OK"}