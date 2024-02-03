import axios from "axios";
import express from "express";
import { rateLimiterUsingThirdParty } from "./middlewares/rateLimiter.js";
import timeout from "connect-timeout";
import Redis from "ioredis";
import promBundle from "express-prom-bundle"
import swaggerJsdoc from "swagger-jsdoc"
import swaggerUi from "swagger-ui-express"

const requestTimeout = process.env.REQUEST_TIMEOUT || "4s";
const gatewayPort = process.env.GATEWAY_PORT || 7000;
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

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Express API with Swagger',
      version: '1.0.0'
    }
  },
  apis: ['./app.js'] 
}
const specs = swaggerJsdoc(options);

app.use(rateLimiterUsingThirdParty);
app.use(metricsMiddleware);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs))

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

/**
 * @swagger
 * /sports:
 *   get:
 *     summary: Get list of sports
 *     responses:
 *       200:
 *         description: A list of sports, potentially served from cache.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fromCache:
 *                   type: boolean
 *                   description: Indicates if the data was served from cache.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Sport data object, structure may vary.
 *       500:
 *         description: Error fetching sports data.
 */
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

/**
 * @swagger
 * /markets/{sport_id}:
 *   get:
 *     summary: Get market data for a specific sport
 *     parameters:
 *       - in: path
 *         name: sport_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The unique identifier for the sport to fetch markets for.
 *     responses:
 *       200:
 *         description: Market data for the specified sport, potentially served from cache.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fromCache:
 *                   type: boolean
 *                   description: Indicates if the data was served from cache.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Market data object for the sport, structure may vary.
 *       500:
 *         description: Error fetching market data.
 */
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

/**
 * @swagger
 * /leagues/{sport_id}:
 *   get:
 *     summary: Get league data for a specific sport
 *     parameters:
 *       - in: path
 *         name: sport_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The unique identifier for the sport to fetch leagues for.
 *     responses:
 *       200:
 *         description: League data for the specified sport, potentially served from cache.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fromCache:
 *                   type: boolean
 *                   description: Indicates if the data was served from cache.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: League data object for the sport, structure may vary.
 *       500:
 *         description: Error fetching league data.
 */
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

/**
 * @swagger
 * /event/{event_id}:
 *   get:
 *     summary: Get details for a specific event
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier for the event to fetch details for.
 *     responses:
 *       200:
 *         description: Event details for the specified event, potentially served from cache.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fromCache:
 *                   type: boolean
 *                   description: Indicates if the data was served from cache.
 *                 data:
 *                   type: object
 *                   description: Event details object, structure may vary.
 *       500:
 *         description: Error fetching event details.
 */
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

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Perform a YouTube search
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: The search query to perform.
 *       - in: query
 *         name: next
 *         schema:
 *           type: string
 *         description: Token for fetching the next page of results.
 *     responses:
 *       200:
 *         description: Search results, potentially served from cache.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fromCache:
 *                   type: boolean
 *                   description: Indicates if the data was served from cache.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Search result item, structure may vary.
 *       500:
 *         description: Error performing YouTube search.
 */
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

/**
 * @swagger
 * /video:
 *   get:
 *     summary: Get details for a specific video
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier for the video to fetch details for.
 *     responses:
 *       200:
 *         description: Video details, potentially served from cache.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fromCache:
 *                   type: boolean
 *                   description: Indicates if the data was served from cache.
 *                 data:
 *                   type: object
 *                   description: Video details object, structure may vary.
 *       500:
 *         description: Error fetching video details.
 */
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

/**
 * @swagger
 * /video/related:
 *   get:
 *     summary: Get related videos for a specific video
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the video to fetch related videos for.
 *       - in: query
 *         name: next
 *         schema:
 *           type: string
 *         description: Token for fetching the next page of related videos.
 *     responses:
 *       200:
 *         description: Related videos, potentially served from cache.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fromCache:
 *                   type: boolean
 *                   description: Indicates if the data was served from cache.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Related video object, structure may vary.
 *       500:
 *         description: Error fetching related video details.
 */
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

/**
 * @swagger
 * /channel:
 *   get:
 *     summary: Get information for a specific YouTube channel
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the channel to fetch information for.
 *     responses:
 *       200:
 *         description: Channel information, potentially served from cache.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fromCache:
 *                   type: boolean
 *                   description: Indicates if the data was served from cache.
 *                 data:
 *                   type: object
 *                   description: Channel information object, structure may vary.
 *       500:
 *         description: Error fetching channel info.
 */
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

// Aggregation endpoints

/**
 * @swagger
 * /searchPrematchOdds/{eventId}:
 *   get:
 *     summary: Search for prematch odds and related YouTube videos for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the event to search for prematch odds and related videos.
 *     responses:
 *       200:
 *         description: Prematch odds and related videos, potentially served from cache.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fromCache:
 *                   type: boolean
 *                   description: Indicates if the data was served from cache.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                         description: The title of the video.
 *                       videoId:
 *                         type: string
 *                         description: The unique identifier for the video.
 *                   description: An array of objects, each representing a related video with title and videoId.
 *       500:
 *         description: Internal Server Error.
 */
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

/**
 * @swagger
 * /marketsWithVideos/{leagueId}:
 *   get:
 *     summary: Fetch market information and related YouTube videos for a specific league
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the league to fetch market information and related videos for.
 *       - in: query
 *         name: sportId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the sport to fetch market information for.
 *     responses:
 *       200:
 *         description: Market information and related videos, potentially served from cache.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fromCache:
 *                   type: boolean
 *                   description: Indicates if the data was served from cache.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       event_id:
 *                         type: string
 *                         description: The unique identifier of the event.
 *                       league_name:
 *                         type: string
 *                         description: The name of the league.
 *                       starts:
 *                         type: string
 *                         description: The start time of the event.
 *                       home:
 *                         type: string
 *                         description: The home team name.
 *                       away:
 *                         type: string
 *                         description: The away team name.
 *                       videos:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             title:
 *                               type: string
 *                               description: The title of the video.
 *                             videoId:
 *                               type: string
 *                               description: The unique identifier for the video.
 *                         description: A list of related videos.
 *       500:
 *         description: Error fetching market data and related videos.
 */
app.get(
  "/marketsWithVideos/:leagueId",
  timeout(requestTimeout),
  async (req, res) => {
    const { leagueId } = req.params;
    const { sportId } = req.query; // Retrieve sportId from query parameters
    let isCached = false;
    let results;

    // Fetch markets from the BetStats service
    try {
      const cacheResults = await redis.get(`markets-videos:${leagueId}:${sportId}`);
      if (cacheResults) {
        isCached = true;
        results = JSON.parse(cacheResults);
      } else {
        const marketResponse = await axios.get(
          `${loadBalancer.getNextServer("betStatsService")}/markets/${sportId}`,
          {
            params: {
              league_ids: leagueId,
              event_type: "prematch",
            },
          }
        );

        const markets = marketResponse.data.events;
        const videoPromises = markets.map(async (market) => {
          const searchQuery = `${market.home} vs ${market.away} predictions tips`;
          const youtubeServer = loadBalancer.getNextServer(
            "youtubeIntegratorService"
          );

          // Fetch videos from YouTubeIntegrator service
          const videosResponse = await axios.get(`${youtubeServer}/search`, {
            params: { query: searchQuery },
          });
          const videos = videosResponse.data.contents.slice(0, 3); // Limit to first 3 videos

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

        results = await Promise.all(videoPromises);

        await redis.setex(
          `markets-videos:${leagueId}:${sportId}`,
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
      console.error("Error fetching markets with videos:", error)
    }
});

/**
 * @swagger
 * /bettingChannels:
 *   get:
 *     summary: Fetch YouTube channel information relevant to betting for various sports
 *     responses:
 *       200:
 *         description: YouTube channel information for betting, potentially served from cache.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fromCache:
 *                   type: boolean
 *                   description: Indicates if the data was served from cache.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sport:
 *                         type: string
 *                         description: The name of the sport.
 *                       channel:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                             description: The title of the channel.
 *                           channelId:
 *                             type: string
 *                             description: The unique identifier for the channel.
 *                           channelUrl:
 *                             type: string
 *                             description: The URL to the channel.
 *                           subscriberCount:
 *                             type: string
 *                             description: Textual representation of the subscriber count.
 *                           viewCount:
 *                             type: string
 *                             description: Textual representation of the view count.
 *                           joinedDate:
 *                             type: string
 *                             description: Textual representation of the date the channel joined YouTube.
 *       500:
 *         description: Error fetching channels for sports.
 */
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

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Check the status of the service
 *     responses:
 *       200:
 *         description: The status of the service.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: The operational status of the service.
 *                   example: "OK"
 */
app.get("/status", (req, res) => {
  res.json({ status: "OK" });
});

app.listen(gatewayPort, () => {
  console.log(`Server running at http://localhost:${gatewayPort}`);
});
