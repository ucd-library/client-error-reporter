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

// Load the source map
const sourceMapPath = path.resolve(__dirname, '../../services/client/dev/js/bundle.js.map');
const sourceMap = JSON.parse(fs.readFileSync(sourceMapPath, 'utf8'));

// Function to map the stack trace
async function mapStackTrace(stack, url) {
  let sourceMap;
  
  if( cache.has(url) ) {
    sourceMap = cache.get(url);
  } else {
    try {
    let resp = await fetch(url);
    sourceMap = await resp.text();
    cache.set(url, sourceMap);
    } catch (e) {
      console.error(`Failed to fetch source map from (${url}):`, e);
      return stack;
    }
  }

  const consumer = await new SourceMapConsumer(sourceMap);

  const stackLines = stack.split('\n');
  const mappedStack = stackLines.map(line => {
    const match = line.match(/at (.+) \(.*\/(.*):(\d+):(\d+)\)/);
    if (match) {
      const [_, functionName, file, line, column] = match;
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

  consumer.destroy();
  return mappedStack.join('\n');
}

export default { mapStackTrace };