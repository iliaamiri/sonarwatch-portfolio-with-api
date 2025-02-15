import express from 'express';
import {
  fetchers,
  getCache,
  getLlamaProtocolsJob,
  jobs, platforms, runFetcher
} from '@sonarwatch/portfolio-plugins';
import { isAddress, networks } from '@sonarwatch/portfolio-core';
import util from 'node:util';
import durationForHumans from "packages/plugins/src/utils/misc/durationForHumans";
import sleep from "packages/plugins/src/utils/misc/sleep";
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { consoleLog } from 'packages/plugins/src/utils/misc/smartConsoleMethods';
import { json } from './utils';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
    },
  },
  apis: ['./packages/api/src/*.ts'], // Path to API routes
};

const specs = swaggerJsdoc(options);

const host = process.env['HOST'] ?? '0.0.0.0';
const port = process.env['PORT'] ? Number(process.env['PORT']) : 8080;

const app = express();


const api = express.Router();

const allJobs = [...jobs, getLlamaProtocolsJob(platforms)];

api.use('/api', swaggerUi.serve, swaggerUi.setup(specs));

/**
 * @openapi
 * tags:
 *   - name: API Status
 *     description: Endpoints for checking API status
 *   - name: Fetchers and Jobs
 *     description: Endpoints for running Fetchers and Jobs generically
 */

/**
 * @openapi
 * /v1/ping:
 *   get:
 *     tags: [API Status]
 *     description: Ping
 *     responses:
 *       200:
 *         description: Returns pong on successful ping
 */
api.get('/ping', (req, res) => json(res, {
    status: 200,
    message: 'Pong!',
  }));

/**
 * @openapi
 * /v1/health:
 *   get:
 *     tags: [API Healthcheck]
 *     description: Healthcheck endpoint
 *     responses:
 *       200:
 *         description: Server is healthy.
 *       500:
 *         description: Server is unhealthy. The reason will be specified under data.
 */
api.get('/health', (req, res) => {
  const missingEnvs: string[] = [];

  const solanaRpcEnv = process.env['PORTFOLIO_SOLANA_RPC']
  if (!solanaRpcEnv) {
    missingEnvs.push("PORTFOLIO_SOLANA_RPC")
  }
  const cacheConfigTypeEnv = process.env['CACHE_CONFIG_TYPE']
  if (!cacheConfigTypeEnv) {
    missingEnvs.push("CACHE_CONFIG_TYPE")
  }

  if (missingEnvs.length > 0) {
    return json(res, {
      status: 500,
      message: 'API server is unhealthy. Missing ENV variables',
      data: { missingEnvs }
    })
  }

  return json(res, {
    status: 200,
    message: 'API server is healthy.',
    data: {
      env: {
        CACHE_CONFIG_HTTP_BASE: process.env['CACHE_CONFIG_HTTP_BASE'],
        CACHE_CONFIG_TYPE: process.env['CACHE_CONFIG_TYPE']
      }
    }
  })
});

/**
 * @openapi
 * /v1/run/jobs/{id}:
 *   get:
 *     tags: [Fetchers and Jobs]
 *     description: Runs a Job
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The Job ID
 *     responses:
 *       200:
 *         description: Runs a Job
 */
api.get('/run/jobs/:id', async (req, res) => {
  try {
    const jobId = req.params.id;

    const job = allJobs.find((f) => f.id === jobId);
    if (!job) {
      return json(res, {
        status: 404,
        message: `Job cannot be found: ${jobId}`
      })
    }

    const cache = getCache();

    const startDate = Date.now();
    consoleLog(`Running job: ${jobId}`);
    await job.executor(cache);

    const duration = ((Date.now() - startDate) / 1000).toFixed(2);
    return json(res, {
      status: 200,
      message: `Finished (${duration}s)`
    })
  } catch (exception) {
    return json(res, {
      status: 500,
      message: 'Internal Server Error',
      exception
    })
  }
});

/**
 * @openapi
 * /v1/run/fetchers/{id}/{wallet}:
 *   get:
 *     tags: [Fetchers and Jobs]
 *     description: Runs a Fetcher
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The Feathers ID
 *       - in: path
 *         name: wallet
 *         required: true
 *         schema:
 *           type: string
 *         description: The wallet (owner)
 *     responses:
 *       200:
 *         description: Runs a Fetcher
 */
api.get('/run/fetchers/:id/:wallet', async (req, res) => {
  try {
    const fetcherId = req.params.id;
    let owner = req.params.wallet;

    const fetcher = fetchers.find((f) => f.id === fetcherId);
    if (!fetcher) {
      return json(res, {
        status: 404,
        message: `Fetcher cannot be found: ${fetcherId}`
      })
    }

    const network = networks[fetcher.networkId];
    if (!isAddress(owner, network.addressSystem)) {
      owner = `0x${owner}`;
    }
    if (!isAddress(owner, network.addressSystem)) {
      return json(res, {
        status: 404,
        message: `Owner address is not valid: ${owner}`
      })
    }

    consoleLog('PORTFOLIO_SOLANA_RPC', process.env['PORTFOLIO_SOLANA_RPC'])

    const cache = getCache();

    consoleLog('Fetching...');
    const fetcherResult = await runFetcher(owner, fetcher, cache);
    consoleLog(util.inspect(fetcherResult.elements, false, null, true));
    const message = `Finished in: ${durationForHumans(fetcherResult.duration)}s`

    await cache.dispose();
    await sleep(100);

    return json(res, {
      status: 200,
      message,
      data: {
        fetcherResult
      }
    })
  } catch (exception) {
    return json(res, {
      status: 500,
      message: 'Internal Server Error',
      exception
    })
  }
});

app.use('/v1', api);

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
