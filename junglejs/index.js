const express = require('express');
const debug = require('debug')('express:server');
const path = require('path');
const rollup = require('rollup');
const fs = require('fs-extra');
const grayMatter = require('gray-matter');
const marked = require('marked');
const cors = require('cors');
const graphqlRouter = require('express-graphql');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const http = require('http');

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

	return app;
}

let graphqlServer;

const acorn = require("acorn");
const walk = require("acorn-walk");

const gql = require('graphql-tag');
const fetch = require("node-fetch");
const ApolloClient = require('apollo-boost').default;

const port = process.env.PORT || '3000';

module.exports = {
	junglePreprocess: {
		script: async ({ content, filename }) => {
			const queryName = "QUERY";
			const resVarName = "QUERYRES";

			const tree = acorn.parse(content, { sourceType: "module" });
			let resVarStart, resVarEnd, queryVarStart, queryVarEnd;

			walk.simple(tree, {
				VariableDeclaration(node) {
					node.declarations.forEach((declaration) => {
						if (declaration.id.name === queryName) {
							queryVarStart = declaration.init.start + 1;
							queryVarEnd = declaration.init.end - 1;
						} else if (declaration.id.name === resVarName) {
							resVarStart = declaration.start;
							resVarEnd = declaration.end;
						}
					});
				},
			});

			if (!resVarStart || !queryVarStart) return { code: content };

			const query = content.slice(queryVarStart, queryVarEnd);

			const client = new ApolloClient({
				uri: `http://localhost:${port}/graphql`,
				fetch: fetch,
			});

			const data = JSON.stringify((await client.query({ query: gql`${query}` })).data);

			const finalCode = content.slice(0, resVarStart) + resVarName + " = " + data + content.slice(resVarEnd, content.length);

			return { code: finalCode };
		},
	},
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
		await fs.remove(`jungle/build`);
		await fs.ensureDir(`jungle/build`);
		await fs.copy('static', 'jungle/build');

		const paramGeneratedFiles = await processDirectoryForParameters(jungleConfig, dirname, 'src/routes');
		await processDirectory(jungleConfig, dirname, 'src/routes');
		paramGeneratedFiles.forEach(path => fs.removeSync(path))

		console.log("Preprocessed Queries");

		app.use(express.static(path.join(dirname, 'jungle/build/')));
	},
};

async function processDirectoryForParameters(jungleConfig, dirname, src, extension = '', paramGeneratedFiles = []) {
	await asyncForEach(fs.readdirSync(src+extension), async (file) => {
		if (fs.statSync(src+extension+'/'+file).isDirectory()) {
			await processDirectoryForParameters(jungleConfig, dirname, src, `${extension}/${file}`, paramGeneratedFiles);
		} else {
			const fileParts = file.split('.');
			const isSvelteFile = fileParts[fileParts.length - 1] === 'svelte' && fileParts.length == 2;
			const isFileParameters = fileParts[0][0] == "[" && fileParts[0][fileParts[0].length-1] == "]";
			const fileParameters = isFileParameters ? fileParts[0].substring(1, fileParts[0].length-1).split(',') : [];

			if (isSvelteFile && isFileParameters) {
				const rawSvelteFile = fs.readFileSync(path.join(dirname, `${src}${extension}/${file}`), "utf8");
				const queryParamOpts =  RegExp(/const QUERYPARAMOPTS = `([^]*?)`;/gm).exec(rawSvelteFile)[1];
				
				const client = new ApolloClient({uri: `http://localhost:${port}/graphql`, fetch: fetch});
				const data = Object.values((await client.query({ query: gql`${queryParamOpts}` })).data)[0];

				const parameterOptions = {};
				parameterOptions[Object.keys(data[0])[0]] = data.map(m => Object.values(m)[0]);

				fileParameters.forEach(fileParameter => {
					parameterOptions[fileParameter].forEach(paramOption => {
						const pFilename = paramOption.split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("");
						const processedFile = rawSvelteFile.replace('${'+`QUERYPARAMS['${fileParameter}']`+'}', paramOption).replace('${'+`QUERYPARAMS["${fileParameter}"]`+'}', paramOption);

						fs.writeFileSync(path.join(dirname, `${src}${extension}/${pFilename}.svelte`), processedFile);
						paramGeneratedFiles.push(`${src}${extension}/${pFilename}.svelte`);
					});
				});
			}
		}
	});

	return paramGeneratedFiles;
}

async function processDirectory(jungleConfig, dirname, src, extension = '') {
	await asyncForEach(fs.readdirSync(src+extension), async (file) => {
		if (fs.statSync(src+extension+'/'+file).isDirectory()) {
			await processDirectory(jungleConfig, dirname, src, `${extension}/${file}`);
		} else {
			const fileParts = file.split('.');
			const isSvelteFile = fileParts[fileParts.length - 1] === 'svelte' && fileParts.length == 2;
			const isFileParameters = fileParts[0][0] == "[" && fileParts[0][fileParts[0].length-1] == "]";

			if (isSvelteFile && !isFileParameters) {
				//If Index, set to be root of the built folder, else join a multiword into hyphen seperated lowercase words
				const filename = fileParts[0] != 'Index' ? fileParts[0].match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/g).join('-').toLowerCase() : '.';
				
				await fs.ensureDir(`jungle/build${extension}/${filename}/`);

				const mainJs = `import SFile from '${path.join(dirname, `${src}${extension}/${file}`)}'; export default new SFile({target: document.body});`;
				const indexHtml = fs.readFileSync('src/template.html', { encoding: 'utf8', flag: 'r' });

				fs.writeFileSync(`jungle/build${extension}/${filename}/main.js`, mainJs);
				fs.writeFileSync(`jungle/build${extension}/${filename}/index.html`, indexHtml);

				const bundle = await rollup.rollup(jungleConfig.inputOptions(filename, extension));
				await bundle.write(jungleConfig.outputOptions(filename, extension));

				await fs.remove(`jungle/build${extension}/${filename}/bundle.css.map`);
				await fs.remove(`jungle/build${extension}/${filename}/bundle.js.map`);
				await fs.remove(`jungle/build${extension}/${filename}/main.js`);
			}
		}
	});
}

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
		: 'http://localhost:' + addr.port;
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