import express from 'express';
import bodyParser from 'body-parser';
import uaParser from 'ua-parser-js';
import config from './config.js';
import cors from 'cors';
import ErrorCache from './cache.js';

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

app.post('/', (req, res) => {
  try {
    // check for key match
    let key = req.get('x-api-key') || req.query.key || '';
    if( key !== config.key ) {
      res.status(401).send('Unauthorized');
      return;
    }

    // check that a referer header is present
    let referer = req.get('referer');
    if( !referer ) {
      res.status(400).send('Referer header is required');
      return;
    }
    referer = new URL(referer).host;

    // check that the referer domain is allowed
    let allowed = config.allowedDomains.some(domain => domain.test(referer));
    if( !allowed ) {
      res.status(403).send('Domain not allowed');
      return;
    }

    // check for a request body
    if( !req.body ) {
      res.status(400).send('Request body is required');
      return;
    }

    let loggerName = req.body.name;
    let error = req.body.error;
    let pathname = req.body.pathname;
    let search = req.body.search;

    // check that the request body has a name and error
    if( !loggerName || !error || !pathname ) {
      res.status(400).send('Name, error and pathname are required in the request body');
      return;
    }

    // check and parse the User-Agent header
    let ua = req.get('user-agent');
    if( !ua ) {
      res.status(400).send('User-Agent header is required');
      return;
    }
    ua = uaParser(ua);

    let payload = {
      ip: req.get('x-forwarded-for') || req.ip,
      error,
      ua,
      domain: referer,
      pathname,
      search,
      loggerName
    };

    if( cache.has(payload) ) {
      res.status(200).send('Duplicate');
      return;
    }
    cache.add(payload);

    console.error(payload);

    res.status(200).send('OK');

  } catch (e) {
    sendError(res, e);
  }
});

function sendError(res, error) {
  res.status(500).json(error);
}

app.listen(port, () => {
  console.log(`${config.serverInfo.name} server started on port ${port}`);
});