const acorn = require("acorn");
const walk = require("acorn-walk");

const gql = require('graphql-tag');
const fetch = require("node-fetch");
const ApolloClient = require('apollo-boost').default;

module.exports.default = () => {
	return {
		script: async ({ content }) => {
			const queryName = "QUERY";
			const resVarName = "QUERYRES";
			const port = process.env.PORT || '3000';

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

			const data = JSON.stringify(await client.query({ query: gql`${query}` }));

			const finalCode = content.slice(0, resVarStart) + resVarName + " = " + data + content.slice(resVarEnd, content.length);

			return { code: finalCode };
		},
	};
};