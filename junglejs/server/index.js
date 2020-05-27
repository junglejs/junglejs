const express = require('express');
const cors = require('cors');
const graphqlPlayround = require('graphql-playground-middleware-express').default;
const graphqlRouter = require('express-graphql');

const { schema } = require('./dumbyschema.js');

module.exports.default = () => {
	const app = express();

	app.use(cors());

	app.use('/graphql', graphqlRouter({ schema: schema, graphiql: false }));
	app.get('/playground', graphqlPlayround({ endpoint: '/graphql' }));

	return app;
}