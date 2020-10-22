import {Parser} from 'acorn';
import * as walk from 'acorn-walk';
import fetch from "node-fetch";
import ApolloClient, { gql } from 'apollo-boost';

export default async function preprocess({
  queryName = "QUERY",
  resName = "QUERYRES",
  graphqlPort = 3001,
}: {
  queryName: string;
  resName: string;
  graphqlPort: number;
}) {
  return {
    script: async ({ content }) => {
      let queryStart;
      let queryEnd;
      let resStart;
      let resEnd;

      const tree = Parser.parse(content, {
        sourceType: "module",
        ecmaVersion: "latest",
      });

      walk.simple(tree, {
        VariableDeclaration(node) {
          // @ts-ignore
          node.declarations.forEach((declaration) => {
            if (declaration.id.name === queryName) {
              queryStart = declaration.init.start + 1;
              queryEnd = declaration.init.end + 1;
            } else if (declaration.id.name === resName) {
              resStart = declaration.start;
              resEnd = declaration.end;
            }
          });
        },
      });

      if (!queryStart || !resStart) return { code: content };

      const query = content.slice(queryStart, queryEnd);
      const client = new ApolloClient({
        uri: `http://localhost:${graphqlPort}/graphql`,
        fetch,
      });
      const result = await client.query({
        query: gql`
          ${query}
        `,
      });
      const data = JSON.stringify(result.data);
      const final =
        content.slice(0, resStart) +
        resName +
        " = " +
        data +
        content.slice(resEnd, content.length);
      return { code: final };
    },
  };
}
