import bunyan from 'bunyan';
import {LoggingBunyan} from '@google-cloud/logging-bunyan';
import config from './config.js';

const streams = [];

if( config.output === 'stdout' ) {
  console.log('Setting up logging for local development');
  streams.push({ stream: process.stdout });
} else if( config.output === 'google-cloud' ) {
  console.log('Setting up logging for Google Cloud');
  let loggingBunyan = new LoggingBunyan({
    resource : {type: 'project'}
  });
  streams.push(loggingBunyan.stream());
} else {
  console.error('Unknown output type: '+config.output);
  process.exit(1);
}

let logger = bunyan.createLogger({
  name: 'client-error-logger',
  level: 'info',
  streams: streams
});

export default logger;