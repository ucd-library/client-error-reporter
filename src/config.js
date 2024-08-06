import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const serverInfo = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

let key = '';
if( process.env.SERVER_KEY ) {
  console.log('Reading server key from env');
  key = process.env.SERVER_KEY;
} else if( process.env.SERVER_KEY_PATH ) {
  console.log('Reading server key from file: '+process.env.SERVER_KEY_PATH);
  key = fs.readFileSync(process.env.SERVER_KEY_PATH, 'utf8');
} else {
  console.warn('No server key provided, this is not secure');
}

let allowedDomains = [];
if( process.env.ALLOWED_DOMAINS ) {
  console.log('Reading allowed domains from env');
  allowedDomains = process.env.ALLOWED_DOMAINS.split(',');
} else if( process.env.ALLOWED_DOMAINS_PATH ) {
  console.log('Reading allowed domains from file: '+process.env.ALLOWED_DOMAINS_PATH);
  allowedDomains = fs.readFileSync(process.env.ALLOWED_DOMAINS_PATH, 'utf8').split('\n');
}

allowedDomains = allowedDomains.map(domain => 
  new RegExp(domain.trim().replace(/^(https?:\/\/)/i, '').replace(/\/.*$/, ''))
);
console.log('Allowed domains: '+allowedDomains.map(d => d.toString()).join(', '));

const config = {
  serverInfo,

  repo : {
    sha : process.env.SHORT_SHA || '',
    branch : process.env.BRANCH_NAME || '',
    tag : process.env.TAG_NAME || ''
  },

  buildTime : process.env.BUILD_TIME || '',

  port: process.env.PORT || 3000,

  key,

  allowedDomains
};

export default config;