# pad-lab-extra

## How to run

1. Clone the repository `git clone https://github.com/Gumball007/pad-lab-extra`
2. `cd pad-lab-extra`
3. Run in terminal `docker-compose up -d`

## How to test requirements

The project combines 2 external APIs : Youtube Search and Download (https://rapidapi.com/h0p3rwe/api/youtube-search-and-download/) and Pinnacle Odds (https://rapidapi.com/tipsters/api/pinnacle-odds), so there are 2 services :
- YoutubeIntegrator Service
- BetStats Service

Each service has 4 endpoints, that are calls to each external API from rapidapi. Those endpoints are pretty straightforward and are described in Swagger. The other 3 endpoints from gateway that aggregate from both services are the following :
- `/searchPrematchOdds` (find videos for betting tips that are related to an event)
- `/marketsWithVideos` (fetch market information and related YouTube video with betting tips for a specific league)
- `/bettingChannels` (fetch YouTube channel information relevant to betting for various sports)

### Separated Databases

Each service has its own database (postgres). YoutubeIntegrator stores video information from every fetch of a video details (`/video`) and this is how its model looks like :

```py
class Video(Base):
    __tablename__ = 'video_details'

    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    videoId = Column(String)
    title = Column(String)
    length_seconds = Column(Integer)
    channel_id = Column(String)
    short_description = Column(String)
    view_count = Column(BigInteger) 

    thumbnail_url = Column(String)

    author = Column(String)
    publish_date = Column(DateTime)
```

The same thing is for BetStats service, which stores info about every fetched event (`/event/${event_id}`) :

```py
class Event(Base):
    __tablename__ = 'events'

    # Primary key
    id = Column(Integer, primary_key=True)

    sport_id = Column(Integer)
    league_id = Column(Integer)
    league_name = Column(String)
    starts = Column(DateTime)
    home = Column(String)
    away = Column(String)
    event_type = Column(String)
    resulting_unit = Column(String)

    money_line_home = Column(Float)
    money_line_draw = Column(Float)
    money_line_away = Column(Float)
```

### Status Endpoint
Every service has its `/status` endpoint that returns `{"status": "OK"}` if of course everything is OKAY.

### Task Timeouts

In `docker-compose.yml` there is an env variable for gateway service called `REQUEST_TIMEOUT` that can changed.

```yml
  gateway:
    environment:
      - REQUEST_TIMEOUT=6s
```

### Concurrent tasks limit

Concurrent tasks limit is implemented using a rateLimiter, that has a bucket approach. The values can be changed in `docker-compose.yml` for gateway service :

```yml
  gateway:
    environment:
      - TIME_WINDOW=60
      - MAX_TASKS=100
```

### Redis Cache

Caching works by implemenation of Redis. It is clearly proven that it works by trying to fetch some data, see that there is a field called `isCached` which is a boolean type, so for the first request it should be `False`, but for the other requests it should be `True` for 120s (when the key expires). The difference between response times is also pretty big (sometimes 1000ms vs 20ms).

### Load Balancing: Round Robin

For every request it goes in a round-robin fashion through each service and that is seen from gateway logs. 

### Prometheus + Grafana

Prometheus works by scraping through every `/metrics` endpoint of each service. Targets can be seen by accessing this in browser - `http://localhost:9090/targets`. For grafana, datasource (which is prometheus) is provisioned by default, only dashboard should be created, but that's also pretty straightforward : New Dashboard, load template by ID's :
- 11159 (for gateway)
- 15834 (for betStats and youtubeIntegrator)

Be sure to select prometheus datasource before creating these dashboards.

### Swagger

API models are created using Swagger. Every service has its `/docs` endpoint :
    - YoutubeIntegrator : `localhost:5000/docs`
    - BetStats : `localhost:4000/docs`
    - Gateway : `localhost:7000/docs`
