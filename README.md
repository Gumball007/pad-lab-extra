# pad-lab-extra

## How to run

1. Clone the repository `git clone https://github.com/Gumball007/pad-lab-extra`
2. `cd pad-lab-extra`
3. Open `docker-compose.yml` with a text editor and add `API_KEY` env variable with value from `rapidapi` to every betStats/youtubeIntegrator service :

    e.g. 
    ```dockerfile
    betstats-1:
        image: betstats
        container_name: betstats-1
        ports:
            - "4000:4000"
        environment:
            - SELF_PORT=4000
            - DB_URL=events_db
            - DB_PORT=5432
            - API_KEY={your_api_key} <--------
        depends_on:
            - events_db
            - redis
    ```

4. Run in terminal `docker-compose up -d`
5. API models are created using Swagger. Every service has its `/docs` endpoint :
    - YoutubeIntegrator : `localhost:5000/docs`
    - BetStats : `localhost:4000/docs`
    - Gateway : `localhost:7000/docs`