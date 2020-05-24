const express = require('express');
const graphqlPlayround = require('graphql-playground-middleware-express').default;
const graphqlRouter = require('express-graphql');

const gql = require('graphql-tag');
const fetch = require("node-fetch");
const ApolloClient = require('apollo-boost').default;

const { schema } = require('./dumbyschema.js');

module.exports = {
	middleware: () => {
		const app = express();

		app.use('/graphql', graphqlRouter({ schema: schema, graphiql: false }));
		app.get('/playground', graphqlPlayround({ endpoint: '/graphql' }));

		return app;
	},
	getQuery: async (query) => {
		const client = new ApolloClient({
			uri: `http://localhost:3000/graphql`,
			fetch: fetch,
		});

		const data = await client.query({query: gql`${query}`});

		return data.data;
	}
}