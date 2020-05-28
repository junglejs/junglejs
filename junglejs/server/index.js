const express = require('express');
const debug = require('debug')('express:server');
const path = require('path');
const rollup = require('rollup');
const fs = require('fs-extra');
const cors = require('cors');
const graphqlPlayround = require('graphql-playground-middleware-express').default;
const graphqlRouter = require('express-graphql');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const http = require('http');

const { schema } = require('./dumbyschema.js');

const jungleGraphql = () => {
	const app = express();

	app.use(logger('dev'));
	app.use(express.json());
	app.use(express.urlencoded({ extended: false }));
	app.use(cookieParser());
	app.use(cors());

	app.use('/graphql', graphqlRouter({ schema: schema, graphiql: false }));
	app.get('/playground', graphqlPlayround({ endpoint: '/graphql' }));


	return app;
}

let graphqlServer;

module.exports = {
	startGraphqlServer: (callback) => {
		const port = normalizePort(process.env.PORT || '3000');

		const jGraphql = jungleGraphql();

		jGraphql.set('port', port);

		graphqlServer = http.createServer(jGraphql);

		graphqlServer.listen(port);
		graphqlServer.on('error', (err) => onError(err, port));
		graphqlServer.on('listening', () => { console.log('Started GraphQL Server'); callback() });
	},
	stopGraphqlServer: (callback) => {
		graphqlServer.close();
		graphqlServer.on('close', () => { console.log('Stopped GraphQL Server'); callback() });
	},
	startAppServer: (app) => {
		const port = normalizePort(process.env.PORT || '3000');

		app.use(logger('dev'));
		app.use(express.json());
		app.use(express.urlencoded({ extended: false }));
		app.use(cookieParser());

		app.set('port', port);

		const server = http.createServer(app);

		server.listen(port);
		server.on('error', (err) => onError(err, port));
		server.on('listening', () => onListening(server));
	},
	readRoutes: async (jungleConfig, app, dirname) => {
		if (!fs.existsSync(`jungle`)) fs.mkdirSync(`jungle`);
		if (!fs.existsSync(`jungle/build`)) fs.mkdirSync(`jungle/build`);

		await fs.copy('static', 'jungle/build');

		await asyncForEach(fs.readdirSync('src/routes'), async (file) => {
			const fileParts = file.split('.');
			const isSvelteFile = fileParts[fileParts.length - 1] === 'svelte' && fileParts.length == 2;

			if (isSvelteFile) {
				const filename = fileParts[0] != 'Index' ? fileParts[0].toLowerCase() : '.';

				if (!fs.existsSync(`jungle/build/${filename}`)) fs.mkdirSync(`jungle/build/${filename}`);

				const mainJs = `import ${fileParts[0]} from '${path.join(dirname, `src/routes/${file}`)}'; export default new ${fileParts[0]}({target: document.body});`;
				const indexHtml = fs.readFileSync('src/template.html', { encoding: 'utf8', flag: 'r' });

				fs.writeFileSync(`jungle/build/${filename}/main.js`, mainJs);
				fs.writeFileSync(`jungle/build/${filename}/index.html`, indexHtml);

				const bundle = await rollup.rollup(jungleConfig.inputOptions(filename));
				await bundle.write(jungleConfig.outputOptions(filename));

				await fs.remove(`jungle/build/${filename}/main.js`);
			}
		});

		console.log("Preprocessed Queries");

		app.use(express.static(path.join(dirname, 'jungle/build/')));
	},
};



async function asyncForEach(array, callback) {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
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

function onListening(server) {
	const addr = server.address();
	const bind = typeof addr === 'string'
	  ? 'pipe ' + addr
	  : 'port ' + addr.port;
	debug('Listening on ' + bind);
	console.log('Server listening on ' + bind + '\n');
  }