import express from 'express';
import bodyParser from 'body-parser';
import uaParser from 'ua-parser-js';
import config from './config.js';
import cors from 'cors';
import ErrorCache from './cache.js';
import logger from './logger.js';
import { mapStackTrace } from './source-map.js';

const app = express();
const port = process.env.PORT || 3000;
const cache = new ErrorCache();

app.use(cors());
app.use(bodyParser.json());

const info = {
  name: config.serverInfo.name,
  version: config.serverInfo.version,
  repo: config.repo,
  buildTime: config.buildTime
};

app.get('/', (req, res) => {
  try {
    res.json(info);
  } catch (e) {
    sendError(res, e);
  }
});

app.post('/', async (req, res) => {
  try {
    // check for key match
    let key = req.get('x-api-key') || req.query.key || '';
    if( key !== config.key ) {
      res.status(401).send('Unauthorized');
      return;
    }

    // check for a request body
    if( !req.body ) {
      res.status(400).send('Request body is required');
      return;
    }

    let payload = req.body;

    // check that a referer header is present
    let referer = req.get('referer');
    if( !referer ) {
      res.status(400).send('Referer header is required');
      return;
    }
    payload.domain = new URL(referer).host;

    // check that the referer domain is allowed
    let allowed = config.allowedDomains.some(domain => domain.test(referer));
    if( !allowed ) {
      res.status(403).send('Domain not allowed');
      return;
    }

    if( payload.name ) {
      payload.loggerName = payload.name;
      delete payload.name;
    }

    // check that the request body has a name and error
    if( !payload.loggerName || !payload.error || !payload.pathname ) {
      res.status(400).send('Name, error and pathname are required in the request body');
      return;
    }

    // check and parse the User-Agent header
    let ua = req.get('user-agent');
    if( !ua ) {
      res.status(400).send('User-Agent header is required');
      return;
    }

    payload.ua = uaParser(ua);
    payload.ip = req.get('x-forwarded-for') || req.ip;


    if( cache.has(payload) ) {
      res.status(200).send('Duplicate');
      return;
    }
    cache.add(payload);

    // map the stack trace via source maps
    if( (payload.sourceMapUrl || payload.sourceMapExtension) && 
          payload.error instanceof Object &&
          payload.error.stack ) {
      let opts = {
        ext: payload.sourceMapExtension, 
        urlMap: {}
      };
      if( payload.sourceMapUrl ) {
        opts.urlMap[payload.sourceMapUrl] = null;
      }

      payload.error.stack = await mapStackTrace(payload.error.stack, opts);
    }

    logger.error(payload); 

    res.status(200).send('OK');

  } catch (e) {
    sendError(res, e);
  }
});

function sendError(res, error) {
  res.status(500).json({
    message : error.message,
    stack : error.stack
  });
}

app.listen(port, () => {
  console.log(`${config.serverInfo.name} server started on port ${port}`);
});