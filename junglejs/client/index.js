const gql = require('graphql-tag');
const fetch = require("node-fetch");
//const ApolloClient = require('apollo-boost').default; //Importing from here causes weird bugs when its called by sapper client side

module.exports.getQuery = async (query, ApolloClient) => {
	const client = new ApolloClient({
		uri: `http://localhost:3000/graphql`,
		fetch: fetch,
	});

	const data = await client.query({query: gql`${query}`});

	return data.data;
};