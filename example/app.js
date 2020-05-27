const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const debug = require('debug')('express:server');
const http = require('http');
const fs = require('fs-extra');

const svelte = require('rollup-plugin-svelte');
const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs');
const rollup = require('rollup');

const jungleServer = require('@junglejs/server').default;
const junglePreprocess = require('@junglejs/preprocess').default;

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const production = !process.env.ROLLUP_WATCH;

startGraphqlServer(server => readRoutes().then(() => stopGraphqlServer(server, startAppServer)));

async function readRoutes() {
  if (!fs.existsSync(`jungle`)) fs.mkdirSync(`jungle`);
  if (!fs.existsSync(`jungle/build`)) fs.mkdirSync(`jungle/build`);

  await fs.copy('static', 'jungle/build');

  await asyncForEach(fs.readdirSync('src/routes'), async (file) => {
    const fileParts = file.split('.');
    const isSvelteFile = fileParts[fileParts.length - 1] === 'svelte' && fileParts.length == 2;
    
    if (isSvelteFile) {
      const filename = fileParts[0] != 'Index' ? fileParts[0].toLowerCase() : '.';
        
      if (!fs.existsSync(`jungle/build/${filename}`)) fs.mkdirSync(`jungle/build/${filename}`);

      const mainJs = `import ${fileParts[0]} from '${path.join(__dirname, `src/routes/${file}`)}'; export default new ${fileParts[0]}({target: document.body});`;
      fs.writeFileSync(`jungle/build/${filename}/main.js`, mainJs);

      const indexHtml = fs.readFileSync('src/template.html', {encoding:'utf8', flag:'r'});
      fs.writeFileSync(`jungle/build/${filename}/index.html`, indexHtml);

      const inputOptions = {
        input: `jungle/build/${filename}/main.js`,
        plugins: [
          svelte({
            dev: !production,
            css: css => {
              css.write(`jungle/build/${filename}/bundle.css`);
            },
            preprocess: [
              junglePreprocess(),
            ]
          }),
      
          resolve(),
          commonjs(),
        ],
      };
      const outputOptions = {
        sourcemap: true,
        format: 'iife',
        name: 'app',
        file: `jungle/build/${filename}/bundle.js`
      };
      
      const bundle = await rollup.rollup(inputOptions);
      await bundle.write(outputOptions);

      await fs.remove(`jungle/build/${filename}/main.js`);
    }
  });

  app.use(express.static(path.join(__dirname, 'jungle/build/')));
}

function startAppServer() {
  const port = normalizePort(process.env.PORT || '3000');

  app.set('port', port);
  
  const server = http.createServer(app);
  
  server.listen(port);
  server.on('error', (err) => onError(err, port));
  server.on('listening', () => onListening(server));
}

function stopGraphqlServer(server, callback) {
  server.close();
  server.on('close', () => {console.log('Stopped GraphQL Server'); callback()});
}

function startGraphqlServer(callback) {
  const port = normalizePort(process.env.PORT || '3000');

  const jServer = jungleServer();

  jServer.use(logger('dev'));
  jServer.use(express.json());
  jServer.use(express.urlencoded({ extended: false }));
  jServer.use(cookieParser());

  jServer.set('port', port);
  
  const server = http.createServer(jServer);
  
  server.listen(port);
  server.on('error', onError);
  server.on('listening', () => {console.log('Started GraphQL Server'); callback(server)});
}

function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    return val;
  }

  if (port >= 0) {
    return port;
  }

  return false;
}

function onError(error, port) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening(server) {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
  console.log('Server listening on ' + bind + '\n');
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}