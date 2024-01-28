import axios from "axios";
import express from "express";
import { rateLimiterUsingThirdParty } from "./middlewares/rateLimiter.js";

const app = express();
app.use(rateLimiterUsingThirdParty)

const port = 3000;

const logger = (options) => (req, res, next) => {
  const timestamp = new Date().toISOString();
  const { method, url, ip } = req;
  console.log(`
          ${timestamp} 
          ${options.level} 
          ${method} ${url} 
          ${ip}`);
  next();
};

app.use(logger({ level: "INFO" }));

const betStatsUrl = "http://localhost:4000";
const youtubeIntegratorUrl = "http://localhost:5000";

// Bet Stats

app.get("/sports", async (req, res) => {
  const endpoint = "/sports";

  try {
    const response = await axios.get(betStatsUrl + endpoint);

    res.json(response.data);
  } catch (error) {
    res.status(500).send("Error fetching sports data");
  }
});


app.get("/markets/:sport_id", async (req, res) => {
  const sportId = req.params.sport_id;
  const endpoint = "/markets";

  try {
    const response = await axios.get(betStatsUrl + endpoint + "/" + sportId);

    res.json(response.data);
  } catch (error) {
    res.status(500).send("Error fetching market data");
  }
});


app.get('/leagues/:sport_id', async (req, res) => {
  const sportId = req.params.sport_id;
  const endpoint = '/leagues';

  try {
      const response = await axios.get(betStatsUrl + endpoint + '/' + sportId)

      res.json(response.data);
  } catch (error) {
      res.status(500).send('Error fetching league data');
  }
});


app.get('/event/:event_id', async (req, res) => {
  const eventId = req.params.event_id;
  const endpoint = '/event';

  try {
      const response = await axios.get(betStatsUrl + endpoint + '/' + eventId)

      res.json(response.data);
  } catch (error) {
      res.status(500).send('Error fetching event details');
  }
});

// Youtube Integrator

app.get('/search', async (req, res) => {
  const query = req.query.query;
  const next = req.query.next;
  const endpoint = '/search';

  const params = {
      query: query,
  };

  if (next) {
      params['next'] = next;
  }

  try {
      const response = await axios.get(youtubeIntegratorUrl + endpoint, {
          params: params
      });

      res.json(response.data);
  } catch (error) {
      res.status(500).send('Error performing YouTube search');
  }
});


app.get('/video', async (req, res) => {
  const videoId = req.query.id;
  const endpoint = '/video';

  try {
      const response = await axios.get(youtubeIntegratorUrl + endpoint, {
          params: { id: videoId }
      });

      res.json(response.data);
  } catch (error) {
      res.status(500).send('Error fetching video details');
  }
});


app.get('/video/related', async (req, res) => {
  const videoId = req.query.id;
  const next = req.query.next;
  const endpoint = '/video/related'

  const params = { id: videoId };

  if (next) {
      params['next'] = next;
  }

  try {
      const response = await axios.get(youtubeIntegratorUrl + endpoint, {
          params: params
      });

      res.json(response.data);
  } catch (error) {
      res.status(500).send('Error fetching related video details');
  }
});


app.get('/video/comments', async (req, res) => {
  const videoId = req.query.id;
  const next = req.query.next;
  const endpoint = '/video/comments';

  const params = { id: videoId };

  if (next) {
      params['next'] = next;
  }

  try {
      const response = await axios.get(youtubeIntegratorUrl + endpoint, {
          params: params
      });

      res.json(response.data);
  } catch (error) {
      res.status(500).send('Error fetching video comments');
  }
});


app.get('/status', (req, res) => {
  res.json({ status: "OK" });
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
