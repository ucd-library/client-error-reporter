import { SourceMapConsumer } from 'source-map';

class Cache {
  constructor() {
    this._cache = new Map();
    this.TIMEOUT = 1000 * 60;
  }

  set(url, sourceMap) {
    this._cache.set(url, sourceMap);
    setTimeout(() => {
      this._cache.delete(url);
    }, this.TIMEOUT);
  }

  get(url) {
    return this._cache.get(url);
  }

  has(url) {
    return this._cache.has(url);
  }
}
const cache = new Cache();


async function loadSourceMap(url) {
  let hostname = new URL(url).hostname;
  if( hostname === 'localhost' ) return null;

  if( cache.has(url) ) {
    return cache.get(url);
  } 

  let sourceMap;
  try {
    let resp = await fetch(url);
    sourceMap = await resp.text();
    cache.set(url, sourceMap);
  } catch (e) {
    console.error(`Failed to fetch source map from (${url}):`, e);
    return null;
  }

  return sourceMap;
}

// Function to map the stack trace
async function mapStackTrace(stack, opts={}) {
  if( !opts.urlMap ) opts.urlMap = {}; 

  const stackLines = stack.split('\n');

  stackLines.forEach(line => {
    const match = line.match(/at (.+) \((http(s)?:\/\/.*):(\d+):(\d+)\)/);

    if( !match ) return;
    const [_, functionName, url, l, column] = match;
    opts.urlMap[url] = null;
  });
  
  for( let url in opts.urlMap ) {
    if( opts.ext ) url += opts.ext;

    let sourceMap = await loadSourceMap(url);
    if( !sourceMap ) continue;
    opts.urlMap[url] = await new SourceMapConsumer(sourceMap);
  }

  const mappedStack = stackLines.map(line => {
    const match = line.match(/at (.+) \((http(s)?:\/\/.*):(\d+):(\d+)\)/);
    if (match) {
      const [_, functionName, url, line, column] = match;

      const consumer = opts.urlMap[url];
      if( !consumer ) return line;

      const originalPosition = consumer.originalPositionFor({
        line: parseInt(line, 10),
        column: parseInt(column, 10),
      });

      if (originalPosition.source) {
        return `  at ${functionName} (${originalPosition.source}:${originalPosition.line}:${originalPosition.column})`;
      }
    }
    return line;
  });

  for( let url in opts.urlMap ) {
    if( !opts.urlMap[url] ) continue;
    opts.urlMap[url].destroy();
  }
  
  return mappedStack.join('\n');
}

export { mapStackTrace };