let cache = new Set();

class ErrorCache {

  constructor() {
    this.TIMEOUT = 1000 * 60;
  }

  getKey(payload) {
    let e = payload.error;

    if( Array.isArray(payload.error) ) {
      if( payload.error.length >= 2 ) {
        e = payload.error[1];
      } else if( payload.error.length === 1 ) {
        e = payload.error[0];
      } else {
        e = '';
      }
    }

    if( e instanceof Object ) {
      e = e.message;
    }

    return payload.loggerName + ':' + e + ':' + payload.domain;
  }

  add(payload) {
    let key = this.getKey(payload);
    cache.add(key);

    setTimeout(() => {
      cache.delete(key);
    }, this.TIMEOUT);
  }

  has(payload) {
    let key = this.getKey(payload);
    return cache.has(key);
  }

}

export default ErrorCache;