const acorn = require("acorn");
const walk = require("acorn-walk");

const express = require('express');
const graphqlPlayround = require('graphql-playground-middleware-express').default;
const graphqlRouter = require('express-graphql');

const gql = require('graphql-tag');
const fetch = require("node-fetch");
const ApolloClient = require('apollo-boost').default;

const { schema } = require('./dumbyschema');

module.exports.serveGraphql = async (port = 4000) => {
	const app = express();

	app.use('/graphql', graphqlRouter({ schema: schema, graphiql: false }));
	app.get('/playground', graphqlPlayround({ endpoint: '/graphql' }))
	
	app.listen(port);

	console.log("Initialized graphql server");
}

module.exports.preprocessQuery = (port = 4000) => {
	const functionName = "componentQuery";
	const variableName = "queryResponse";

	return {
		script: async ({ content }) => {
			const tree = acorn.parse(content, { sourceType: "module" });
			let funcStart, funcEnd, varStart, varEnd;
	  
			walk.simple(tree, {
			  FunctionDeclaration(node) {
				if (node.id.name === functionName) {
					funcStart = node.body.start;
					funcEnd = node.body.end;
				}
			  },
			  VariableDeclaration(node) {
					node.declarations.forEach((declaration) => {
						if (declaration.id.name === variableName) {
							varStart = declaration.start;
							varEnd = declaration.end;
						}
					});
				}
			});
	  
			if (!funcStart || !varStart) return { code: content };
	  
			const funcCode = content.slice(funcStart, funcEnd);
	  
			const query = await Function(funcCode)();

			const client = new ApolloClient({
				uri: `http://localhost:${port}/graphql`,
				fetch: fetch,
			});

			const data = JSON.stringify(await client.query({query: gql`${query}`}));

			const finalCode = content.slice(0, varStart)+variableName+" = "+data+content.slice(varEnd, content.length);
	  
			return { code: finalCode };
		},
	};
}