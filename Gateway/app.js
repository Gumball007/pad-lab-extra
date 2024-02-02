import axios from "axios";
import express from "express";
import { rateLimiterUsingThirdParty } from "./middlewares/rateLimiter.js";
import timeout from "connect-timeout";
import Redis from "ioredis";
import promBundle from 'express-prom-bundle'

const requestTimeout = process.env.REQUEST_TIMEOUT || "4s";
const gatewayPort = process.env.GATEWAY_PORT || 6000;
const redisHost = process.env.REDIS_HOST || "localhost";
const app = express();

const metricsMiddleware = promBundle({
  includeMethod: true, 
  includePath: true, 
  includeStatusCode: true, 
  includeUp: true,
  promClient: {
      collectDefaultMetrics: {
      }
    }
});

app.use(rateLimiterUsingThirdParty);
app.use(metricsMiddleware);

const redis = new Redis(6379, redisHost);

class LoadBalancer {
  constructor(services) {
    this.services = services;
    this.currentIndex = new Map(services.map((service) => [service.name, 0]));
  }

  getNextServer(serviceName) {
    const serviceUrls = this.services.find(
      (service) => service.name === serviceName
    ).urls;
    const index = this.currentIndex.get(serviceName);
    const server = serviceUrls[index % serviceUrls.length];
    this.currentIndex.set(serviceName, (index + 1) % serviceUrls.length);
    console.info(`Server : ${server}`)
    return server;
  }
}

const loadBalancer = new LoadBalancer([
  { name: "youtubeIntegratorService", urls: ["http://youtubeservice-1:5000"] },
  { name: "betStatsService", urls: ["http://betstats-1:4000"] },
]);

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

// Bet Stats

app.get("/sports", timeout(requestTimeout), async (req, res) => {
  const endpoint = "/sports";
  let isCached = false;
  let results;

  try {
    const cacheResults = await redis.get(endpoint);
    if (cacheResults) {
      isCached = true;
      results = JSON.parse(cacheResults);
    } else {
      const response = await axios.get(
        loadBalancer.getNextServer("betStatsService") + endpoint
      );
      results = response.data;
      await redis.setex(endpoint, 120, JSON.stringify(results));
    }

    if (!req.timedout) {
      res.send({
        fromCache: isCached,
        data: results,
      });
    }
  } catch (error) {
    if (!req.timedout) {
      res.status(500).send("Error fetching sports data");
    }
  }
});

app.get("/markets/:sport_id", timeout(requestTimeout), async (req, res) => {
  const sportId = req.params.sport_id;
  const endpoint = "/markets";
  let isCached = false;
  let results;

  try {
    const cacheResults = await redis.get(`${endpoint}:${sportId}`);
    if (cacheResults) {
      isCached = true;
      results = JSON.parse(cacheResults);
    } else {
      const response = await axios.get(
        loadBalancer.getNextServer("betStatsService") + endpoint + "/" + sportId
      );
      results = response.data;
      await redis.setex(`${endpoint}:${sportId}`, 120, JSON.stringify(results));
    }

    if (!req.timedout) {
      res.send({
        fromCache: isCached,
        data: results,
      });
    }
  } catch (error) {
    if (!req.timedout) {
      res.status(500).send("Error fetching market data");
    }
  }
});

app.get("/leagues/:sport_id", timeout(requestTimeout), async (req, res) => {
  const sportId = req.params.sport_id;
  const endpoint = "/leagues";
  let isCached = false;
  let results;

  try {
    const cacheResults = await redis.get(`${endpoint}:${sportId}`);
    if (cacheResults) {
      isCached = true;
      results = JSON.parse(cacheResults);
    } else {
      const response = await axios.get(
        loadBalancer.getNextServer("betStatsService") + endpoint + "/" + sportId
      );
      results = response.data;
      await redis.setex(`${endpoint}:${sportId}`, 120, JSON.stringify(results));
    }

    if (!req.timedout) {
      res.send({
        fromCache: isCached,
        data: results,
      });
    }
  } catch (error) {
    if (!req.timedout) {
      res.status(500).send("Error fetching league data");
    }
  }
});

app.get("/event/:event_id", timeout(requestTimeout), async (req, res) => {
  const eventId = req.params.event_id;
  const endpoint = "/event";
  let isCached = false;
  let results;

  try {
    const cacheResults = await redis.get(`${endpoint}:${eventId}`);
    if (cacheResults) {
      isCached = true;
      results = JSON.parse(cacheResults);
    } else {
      const response = await axios.get(
        loadBalancer.getNextServer("betStatsService") + endpoint + "/" + eventId
      );
      results = response.data;
      await redis.setex(`${endpoint}:${eventId}`, 120, JSON.stringify(results));
    }

    if (!req.timedout) {
      res.send({
        fromCache: isCached,
        data: results,
      });
    }
  } catch (error) {
    if (!req.timedout) {
      res.status(500).send("Error fetching event details");
    }
  }
});

// Youtube Integrator

app.get("/search", timeout(requestTimeout), async (req, res) => {
  const query = req.query.query;
  const next = req.query.next;
  const endpoint = "/search";
  let isCached = false;
  let results;

  const params = {
    query: query,
  };

  if (next) {
    params["next"] = next;
  }

  try {
    const cacheResults = await redis.get(`${endpoint}:${query}`);
    if (cacheResults) {
      isCached = true;
      results = JSON.parse(cacheResults);
    } else {
      const response = await axios.get(
        loadBalancer.getNextServer("youtubeIntegratorService") + endpoint,
        {
          params: params,
        }
      );

      results = response.data;
      await redis.setex(`${endpoint}:${query}`, 120, JSON.stringify(results));
    }

    if (!req.timedout) {
      res.send({
        fromCache: isCached,
        data: results,
      });
    }
  } catch (error) {
    if (!req.timedout) {
      res.status(500).send("Error performing YouTube search");
    }
  }
});

app.get("/video", timeout(requestTimeout), async (req, res) => {
  const videoId = req.query.id;
  const endpoint = "/video";
  let isCached = false;
  let results;

  try {
    const cacheResults = await redis.get(`${endpoint}:${videoId}`);
    if (cacheResults) {
      isCached = true;
      results = JSON.parse(cacheResults);
    } else {
      const response = await axios.get(
        loadBalancer.getNextServer("youtubeIntegratorService") + endpoint,
        {
          params: { id: videoId },
        }
      );

      results = response.data;
      await redis.setex(`${endpoint}:${videoId}`, 120, JSON.stringify(results));
    }

    if (!req.timedout) {
      res.send({
        fromCache: isCached,
        data: results,
      });
    }
  } catch (error) {
    if (!req.timedout) {
      res.status(500).send("Error fetching video details");
    }
  }
});

app.get("/video/related", timeout(requestTimeout), async (req, res) => {
  const videoId = req.query.id;
  const next = req.query.next;
  const endpoint = "/video/related";
  let isCached = false;
  let results;

  const params = { id: videoId };

  if (next) {
    params["next"] = next;
  }

  try {
    const cacheResults = await redis.get(`${endpoint}:${videoId}`);
    if (cacheResults) {
      isCached = true;
      results = JSON.parse(cacheResults);
    } else {
      const response = await axios.get(
        loadBalancer.getNextServer("youtubeIntegratorService") + endpoint,
        {
          params: params,
        }
      );

      results = response.data;
      await redis.setex(`${endpoint}:${videoId}`, 120, JSON.stringify(results));
    }

    if (!req.timedout) {
      res.send({
        fromCache: isCached,
        data: results,
      });
    }
  } catch (error) {
    if (!req.timedout) {
      res.status(500).send("Error fetching related video details");
    }
  }
});

app.get("/channel", timeout(requestTimeout), async (req, res) => {
  const channelId = req.query.id;
  const endpoint = "/channel";
  let isCached = false;
  let results;

  const params = { id: channelId };

  try {
    const cacheResults = await redis.get(`${endpoint}:${channelId}`);
    if (cacheResults) {
      isCached = true;
      results = JSON.parse(cacheResults);
    } else {
      const response = await axios.get(
        loadBalancer.getNextServer("youtubeIntegratorService") + endpoint,
        {
          params: params,
        }
      );

      results = response.data;
      await redis.setex(
        `${endpoint}:${channelId}`,
        120,
        JSON.stringify(results)
      );
    }

    if (!req.timedout) {
      res.send({
        fromCache: isCached,
        data: results,
      });
    }
  } catch (error) {
    if (!req.timedout) {
      res.status(500).send("Error fetching channel info");
    }
  }
});

app.get(
  "/searchPrematchOdds/:eventId",
  timeout(requestTimeout),
  async (req, res) => {
    const { eventId } = req.params;
    let isCached = false;
    let results;

    try {
      const cacheResults = await redis.get(`prematch-odds:${eventId}`);
      if (cacheResults) {
        isCached = true;
        results = JSON.parse(cacheResults);
      } else {
        // Fetch event details from BetStats service
        const eventDetailsResponse = await axios.get(
          `${loadBalancer.getNextServer("betStatsService")}/event/${eventId}`
        );
        const event = eventDetailsResponse.data.events[0];
        const searchQuery = `${event.home} vs ${event.away} betting odds`;

        // Fetch related videos from YouTubeIntegrator service
        const videosResponse = await axios.get(
          `${loadBalancer.getNextServer("youtubeIntegratorService")}/search`,
          { params: { query: searchQuery } }
        );
        const videos = videosResponse.data.contents;

        // Extract titles and videoIds
        results = videos.map(({ video }) => {
          return {
            title: video.title,
            videoId: video.videoId,
          };
        });
        await redis.setex(
          `prematch-odds:${eventId}`,
          120,
          JSON.stringify(results)
        );
      }

      if (!req.timedout) {
        res.send({
          fromCache: isCached,
          data: results,
        });
      }
    } catch (error) {
      console.error("Error:", error.message);
      if (!req.timedout) {
        res.status(500).send("Internal Server Error");
      }
    }
  }
);

app.get(
  "/marketsWithVideos/:leagueId",
  timeout(requestTimeout),
  async (req, res) => {
    const { leagueId } = req.params;
    let isCached = false;
    let results;

    // Fetch markets from the BetStats service
    try {
      const cacheResults = await redis.get(`markets-videos:${leagueId}`);
      if (cacheResults) {
        isCached = true;
        results = JSON.parse(cacheResults);
      } else {
        const marketResponse = await axios.get(
          `${loadBalancer.getNextServer("betStatsService")}/markets/1`,
          {
            params: {
              league_ids: leagueId,
              event_type: "prematch",
            },
          }
        );

        const markets = marketResponse.data.events;
        const videoPromises = markets.map(async (market) => {
          const searchQuery = `${market.home} vs ${market.away} in UEFA Champions League predictions`;
          const youtubeServer = loadBalancer.getNextServer(
            "youtubeIntegratorService"
          );

          // Fetch videos from YouTubeIntegrator service
          const videosResponse = await axios.get(`${youtubeServer}/search`, {
            params: { query: searchQuery },
          });
          const videos = videosResponse.data.contents.slice(0, 3); // Limit to first 3 videos

          // Map to the desired format
          return {
            event_id: market.event_id,
            league_name: market.league_name,
            starts: market.starts,
            home: market.home,
            away: market.away,
            videos: videos.map(({ video }) => ({
              title: video.title,
              videoId: video.videoId,
            })),
          };
        });

        // Wait for all video fetches to resolve
        results = await Promise.all(videoPromises);

        await redis.setex(
          `markets-videos:${leagueId}`,
          120,
          JSON.stringify(results)
        );
      }

      if (!req.timedout) {
        res.send({
          fromCache: isCached,
          data: results,
        });
      }
    } catch (error) {
      console.error("Error fetching markets with videos:", error.message);
      if (!req.timedout) {
        res.status(500).send("Error fetching market data and related videos");
      }
    }
  }
);

app.get("/bettingChannels", timeout(requestTimeout), async (req, res) => {
  let isCached = false;
  let results;

  try {
    const cacheResults = await redis.get(`betting-channels`);
    if (cacheResults) {
      isCached = true;
      results = JSON.parse(cacheResults);
    } else {
      const betStatsServer = loadBalancer.getNextServer("betStatsService");
      const sportsResponse = await axios.get(`${betStatsServer}/sports`);
      const sports = sportsResponse.data;

      const sportsPromises = sports.map(async (sport) => {
        const searchQuery = `${sport.name} betting picks & tips`;
        const youtubeServer = loadBalancer.getNextServer(
          "youtubeIntegratorService"
        );

        const channelsResponse = await axios.get(`${youtubeServer}/search`, {
          params: { query: searchQuery },
        });

        if (channelsResponse.data.contents.length > 0) {
          const firstChannel = channelsResponse.data.contents[0].video;
          const channelId = firstChannel.channelId;

          const channelDetailsResponse = await axios.get(
            `${youtubeServer}/channel`,
            {
              params: { channel_id: channelId },
            }
          );

          const channelDetails = channelDetailsResponse.data;

          return {
            sport: sport.name,
            channel: {
              title: channelDetails.title,
              channelId: channelId,
              channelUrl: channelDetails.vanityChannelUrl,
              subscriberCount: channelDetails.subscriberCountText,
              viewCount: channelDetails.viewCountText,
              joinedDate: channelDetails.joinedDateText,
            },
          };
        }
      });

      results = await Promise.all(sportsPromises);

      await redis.setex(`betting-channels`, 120, JSON.stringify(results));
    }

    if (!req.timedout) {
      res.send({
        fromCache: isCached,
        data: results,
      });
    }
  } catch (error) {
    console.error("Error fetching channels for sports:", error.message);
    if (!req.timedout) {
      res.status(500).send("Error fetching channels for sports");
    }
  }
});

app.get("/status", (req, res) => {
  res.json({ status: "OK" });
});

app.listen(gatewayPort, () => {
  console.log(`Server running at http://localhost:${gatewayPort}`);
});
