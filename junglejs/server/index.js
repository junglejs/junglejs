const express = require('express');
const debug = require('debug')('express:server');
const path = require('path');
const rollup = require('rollup');
const fs = require('fs-extra');
const grayMatter = require('gray-matter');
const marked = require('marked');
const cors = require('cors');
const graphqlPlayround = require('graphql-playground-middleware-express').default;
const graphqlRouter = require('express-graphql');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const http = require('http');

const { schema } = require('./dumbyschema.js');

const { SchemaComposer } = require('graphql-compose');
const { composeWithJson } = require('graphql-compose-json');
const find = require('lodash.find');;

const jungleGraphql = (jungleConfig, dirname) => {
	const app = express();

	app.use(logger('dev'));
	app.use(express.json());
	app.use(express.urlencoded({ extended: false }));
	app.use(cookieParser());
	app.use(cors());

	app.use('/graphql', graphqlRouter({ schema: generateSchema(jungleConfig.dataSources, dirname), graphiql: false }));
	app.get('/playground', graphqlPlayround({ endpoint: '/graphql' }));

	return app;
}

let graphqlServer;

module.exports = {
	startGraphqlServer: (jungleConfig, dirname, callback) => {
		const port = normalizePort(process.env.PORT || '3000');

		const jGraphql = jungleGraphql(jungleConfig, dirname);

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

function generateSchema(dataSources, dirname) {
	const schemaComposer = new SchemaComposer();

	dataSources.forEach(source => {
		const typeName = source.name.charAt(0).toUpperCase() + source.name.slice(1);
		let newFields = {};

		switch (source.format) {
			case "json":
				composeWithJson(typeName, source.items[0], { schemaComposer });

				newFields[source.name] = {
					type: typeName,
					args: source.queryArgs,
					resolve: (_, args) => find(source.items, args),
				};

				newFields[source.name + "s"] = {
					type: `[${typeName}]`,
					resolve: () => source.items,
				};
				break;
			case "dir/markdown":
				const frontMatterData = fs.readdirSync(path.join(dirname, source.items)).map((fileName) => {
					const post = fs.readFileSync(
						path.resolve(path.join(dirname, source.items), fileName),
						"utf-8"
					);

					const renderer = new marked.Renderer();

					const { data, content } = grayMatter(post);
					const html = marked(content, { renderer });

					data['path'] = fileName.substring(0, fileName.length - 3);

					return { html, ...data };
				})

				composeWithJson(typeName, frontMatterData[0], { schemaComposer });

				newFields[source.name] = {
					type: typeName,
					args: source.queryArgs,
					resolve: (_, args) => find(frontMatterData, args),
				};

				newFields[source.name + "s"] = {
					type: `[${typeName}]`,
					resolve: () => frontMatterData,
				};
				break;
		}

		schemaComposer.Query.addFields(newFields);
	});

	return schemaComposer.buildSchema();
}