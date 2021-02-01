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

const colorLog = (color, message) => {
	const Reset = "\x1b[0m";
	const Bright = "\x1b[1m";
	const Dim = "\x1b[2m";
	const Underscore = "\x1b[4m";
	const Blink = "\x1b[5m";
	const Reverse = "\x1b[7m";
	const Hidden = "\x1b[8m";

	const FgBlack = "\x1b[30m";
	const FgRed = "\x1b[91m";
	const FgGreen = "\x1b[92m";
	const FgYellow = "\x1b[93m";
	const FgBlue = "\x1b[94m";
	const FgMagenta = "\x1b[95m";
	const FgCyan = "\x1b[96m";
	const FgWhite = "\x1b[97m";

	switch (color) {
		case "green":
			console.log(Bright + FgGreen + message + Reset);
			break;
		case "red":
			console.log(Bright + FgRed + message + Reset);
			break;
	}
}

const jungleGraphql = (jungleConfig, dirname) => {
	const app = express();

	//app.use(logger('dev'));
	app.use(express.json());
	app.use(express.urlencoded({ extended: false }));
	app.use(cookieParser());
	app.use(cors());

	app.use('/graphql', graphqlRouter({ schema: generateSchema(jungleConfig.dataSources, dirname), graphiql: false }));

	return app;
}

let graphqlServer;
let appServer;
let liveReloadServer;

const liveReload = require("livereload");
const chokidar = require('chokidar');

const acorn = require("acorn");
const walk = require("acorn-walk");

const gql = require('graphql-tag');
const fetch = require("node-fetch");
const ApolloClient = require('apollo-boost').default;

const port = process.env.GQLPORT || '3001';

process.on('SIGTERM', () => {
	stopGraphqlServer();
	stopAppServer();
})

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
		const port = normalizePort(process.env.GQLPORT || '3001');

		const jGraphql = jungleGraphql(jungleConfig, dirname);

		jGraphql.set('port', port);

		graphqlServer = http.createServer(jGraphql);

		graphqlServer.listen(port);
		graphqlServer.on('error', (err) => onError(err, port));
		graphqlServer.on('listening', () => { onListeningGraphQL(graphqlServer); callback() });
	},
	startAppServer: (jungleConfig, app, __dirname, callback = () => { }) => {
		const port = normalizePort(process.env.PORT || '3000');

		//app.use(logger('dev'));
		app.use(express.json());
		app.use(express.urlencoded({ extended: false }));
		app.use(cookieParser());

		app.set('port', port);

		appServer = http.createServer(app);
		liveReloadServer = liveReload.createServer();

		appServer.listen(port);
		appServer.on('error', (err) => onError(err, port));
		appServer.on('listening', () => {
			onListening(appServer);
			callback();
		});
	},
	buildRoutes: async (jungleConfig, dirname, callback = () => { }) => {
		await fs.remove(`jungle`);
		await fs.ensureDir(`jungle/build`);
		await fs.ensureDir(`jungle/.cache`);

		await fs.copy('src/components', 'jungle/.cache/components');
		await fs.copy('static', 'jungle/build');

		await processDirectory(jungleConfig, dirname, 'src/routes');
		await processDirectoryForParameters(jungleConfig, dirname, 'src/routes');
		await processDirectory(jungleConfig, dirname, 'jungle/.cache/routes');

		callback();
	},
	watchRoutes,
};

async function stopGraphqlServer(callback = () => { }) {
	graphqlServer.close();
	graphqlServer.on('close', () => { colorLog('green', 'Stopped GraphQL Server'); callback() });
};

async function stopAppServer(callback = () => { }) {
	appServer.close();
	appServer.on('close', () => { colorLog('green', 'Stopped App Server'); callback() });
};

async function watchRoutes(jungleConfig, app, dirname) {
	await fs.remove(`jungle`);
	await fs.ensureDir(`jungle/build`);
	await fs.ensureDir(`jungle/.cache`);

	app.use(require('connect-livereload')({
		port: 35729,
		rules: [{
			match: /<\/head>(?![\s\S]*<\/head>)/i,
			fn: (w, s) => s + w,
		  }, {
			match: /<\/html>(?![\s\S]*<\/html>)/i,
			fn: (w, s) => s + w,
		  }, {
			match: /<\!DOCTYPE.+?>/i,
			fn: (w, s) => w + s,
		  }],		
	}));
	app.use(express.static(path.join(dirname, 'jungle/build/')));

	//TODO: Make sure all these changes work on Windows !!!

	//TODO: Add in a service worker or make it stop throwing an error somehow

	//TODO: Rebuild routes that rely on components
	await chokidar.watch('src/components').on('all', (e, p) => copyStaticFiles(e, p, 'src/components', 'jungle/.cache/components'));
	await chokidar.watch('static').on('all', (e, p) => copyStaticFiles(e, p, 'static', 'jungle/build'));

	await chokidar.watch('src/routes').on('all', (e, p) => onRouteUpdate(e, p, 'src/routes', jungleConfig, dirname));
	await chokidar.watch('jungle/.cache/routes').on('all', (e, p) => onRouteUpdate(e, p, 'jungle/.cache/routes', jungleConfig, dirname));
}

async function copyStaticFiles(event, path, input, output) {
	if (event == "change" || event == "add") {
		const subPath = path.replace(input, '');
		await fs.copy(path, output + subPath);
	} else if (event == "unlink") {
		const subPath = path.replace(input, '');
		fs.remove(output + subPath);
	}
}

async function onRouteUpdate(event, path, src, jungleConfig, dirname) {
	//console.log("EVENT: " + event + " " + path)
	if (event == "change" || event == "add" || event == "unlink") {
		const splitPath = path.replace(src, '').split('/');
		const pathNoFile = splitPath.slice(0, splitPath.length - 1).join('/');
		const fileName = splitPath[splitPath.length - 1];

		if (isSvelteFile(fileName)) {
			if (event == "unlink") {
				const fileParts = fileName.split('.');
				if (fileParts[0] == "Index") {
					colorLog("red", `Route "${pathNoFile}/${fileName}" won't be removed till after rerunning the build process`)
				} else {
					const routeDir = fileParts[0].match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/g).join('-').toLowerCase();

					await fs.remove(`jungle/build${pathNoFile}/${routeDir}/`);
					console.log(`Removed route "${pathNoFile}/${fileName}"`);
				}
			} else {
				if (isFileParameters(fileName)) await processFileForParameters(fileName, dirname, src, pathNoFile);
				else await processFile(fileName, jungleConfig, dirname, src, pathNoFile);
			}
		}
	}

	liveReloadServer.refresh("/");
}

async function processDirectoryForParameters(jungleConfig, dirname, src, extension = '', paramGeneratedFiles = []) {
	await asyncForEach(fs.readdirSync(src + extension), async (file) => {
		if (fs.statSync(src + extension + '/' + file).isDirectory()) {
			await processDirectoryForParameters(jungleConfig, dirname, src, `${extension}/${file}`, paramGeneratedFiles);
		} else {
			await processFileForParameters(file, dirname, src, extension);
		}
	});

	return paramGeneratedFiles;
}

async function processDirectory(jungleConfig, dirname, src, extension = '') {
	await asyncForEach(fs.readdirSync(src + extension), async (file) => {
		if (fs.statSync(src + extension + '/' + file).isDirectory()) {
			await processDirectory(jungleConfig, dirname, src, `${extension}/${file}`);
		} else {
			await processFile(file, jungleConfig, dirname, src, extension);
		}
	});
}


async function processFileForParameters(file, dirname, src, extension) {
	const fileParts = file.split('.');
	const fileParameters = isFileParameters(file) ? fileParts[0].substring(1, fileParts[0].length - 1).split(',') : [];

	if (isSvelteFile(file) && isFileParameters(file)) {
		const rawSvelteFile = fs.readFileSync(path.join(dirname, `${src}${extension}/${file}`), "utf8");
		const queryParamOpts = RegExp(/const QUERYPARAMOPTS = `([^]*?)`;/gm).exec(rawSvelteFile)[1];

		const client = new ApolloClient({ uri: `http://localhost:${port}/graphql`, fetch: fetch });
		const data = Object.values((await client.query({ query: gql`${queryParamOpts}` })).data)[0];

		const parameterOptions = {};
        const keys = Object.keys(data[0]).filter(k => k !== "_typename");

        keys.forEach(key => {
            parameterOptions[key] = data.map(m => m[key])
        });

        data.forEach(d => {
            const pFilename = fileParameters.map(k => d[k].split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(""));
            let processedFile = rawSvelteFile;

            keys.forEach(k => {
                processedFile = processedFile
                    .replace('${' + `QUERYPARAMS['${k}']` + '}', d[k])
                    .replace('${' + `QUERYPARAMS["${k}"]` + '}', d[k]);
            });

            fs.ensureDirSync(path.join(dirname, `jungle/.cache/routes${extension}`));
            fs.writeFileSync(path.join(dirname, `jungle/.cache/routes${extension}/${pFilename}.svelte`), processedFile);
        });
	}
}

async function processFile(file, jungleConfig, dirname, src, extension) {
	const fileParts = file.split('.');

	if (/\s|_|-/.test(fileParts[0])) {
		colorLog('red', `File "${extension}/${file}" doesn't follow UpperCamelCase`)
	} else {
		if (isSvelteFile(file) && !isFileParameters(file)) {
			//If Index, set to be root of the built folder, else join a multiword into hyphen seperated lowercase words
			const filename = fileParts[0] != 'Index' ? fileParts[0].match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/g).join('-').toLowerCase() : '.';

			await fs.ensureDir(`jungle/build${extension}/${filename}/`);

			const mainJs = `import SFile from ${JSON.stringify(path.join(dirname, `${src}${extension}/${file}`))}; export default new SFile({target: document.body, hydrate: true});`;

			if (await fs.pathExists(`${src}${extension}/${file}`)) {
				await fs.writeFile(`jungle/build${extension}/${filename}/main.js`, mainJs);

				const clientBundle = await rollup.rollup(jungleConfig.clientInputOptions(filename, extension));
				await clientBundle.write(jungleConfig.clientOutputOptions(filename, extension));

				const ssrBundle = await rollup.rollup(jungleConfig.ssrInputOptions(filename, extension, src));
				await ssrBundle.write(jungleConfig.ssrOutputOptions(filename, extension));

				await fs.remove(`jungle/build${extension}/${filename}/main.js`);
				await fs.remove(`jungle/build${extension}/${filename}/ssr.js`);

				console.log(`Preprocessed route "${extension}/${file}"`);
			}
		}
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
	colorLog('green', 'Started App on ' + bind + '\n');
}

function onListeningGraphQL(server) {
	const addr = server.address();
	const bind = typeof addr === 'string'
		? 'pipe ' + addr
		: 'http://localhost:' + addr.port;
	debug('Listening on ' + bind);
	colorLog('green', 'Started GraphQL on ' + bind);
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

function isFileParameters(file) {
	const fileParts = file.split('.');
	return fileParts[0][0] == "[" && fileParts[0][fileParts[0].length - 1] == "]";
}

function isSvelteFile(file) {
	const fileParts = file.split('.');
	return fileParts[fileParts.length - 1] === 'svelte' && fileParts.length == 2;
}

async function asyncForEach(array, callback) {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
}
