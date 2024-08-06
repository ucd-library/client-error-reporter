import bunyan from 'bunyan';
import {LoggingBunyan} from '@google-cloud/logging-bunyan';

const streams = [];

if( process.env.LOCAL_DEV === 'true' ) {
  console.log('Setting up logging for local development');
  streams.push({ stream: process.stdout });
} else {
  console.log('Setting up logging for Google Cloud');
  let loggingBunyan = new LoggingBunyan({
    resource : {type: 'project'}
  });
  streams.push(loggingBunyan.stream());
}

let logger = bunyan.createLogger({
  name: 'client-error-logger',
  level: 'info',
  streams: streams
});

export default logger;