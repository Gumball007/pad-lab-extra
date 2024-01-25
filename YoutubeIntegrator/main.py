from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
import httpx
import os

load_dotenv()
API_KEY = os.getenv("API_KEY")

app = FastAPI()

# Search for youtube video
@app.get("/search")
async def youtube_search(query: str, next: str = None):

    url = 'https://youtube-search-and-download.p.rapidapi.com/search'

    params = {
        'query': query,
        'hl': 'en',
        'type': 'v',
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
async def youtube_search(video_id: str):

    url = 'https://youtube-search-and-download.p.rapidapi.com/video'

    params = {
        'id': video_id,
    }

    headers = {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'youtube-search-and-download.p.rapidapi.com'
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, params=params)

    return response.json()

# Get video related
@app.get("/video/related")
async def youtube_search(video_id: str, next: str = None):

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

# Get video comments
@app.get("/video/comments")
async def youtube_search(video_id: str, next: str = None):

    url = 'https://youtube-search-and-download.p.rapidapi.com/video/comments'

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

@app.get("/status")
def read_status():
    return {"status": "OK"}