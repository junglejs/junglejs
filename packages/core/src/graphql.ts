import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { graphqlHTTP } from "express-graphql";
import http from "http";

import { listen, error } from "./utils";

export async function graphqlServer({
  sources = [],
  port = 3001,
  schema = {},
  graphiql = process.env.NODE_ENV === "production",
}: {
  sources: any[];
  port?: number;
  schema: any;
  graphiql: boolean;
}) {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(cors());

  app.use("/graphql", graphqlHTTP({ schema, graphiql }));
  const server = http.createServer(app);
  server.listen(port);
  server.on("error", (err) => error(err, port));
  server.on("listening", () => {
    listen({ server, name: "GraphQL" });
  });
}

export function start({
  app,
  port = 3001,
  liveReload,
  callback,
}: {
  app: express.Application;
  port: number;
  liveReload?: any;
  callback?: Function;
}) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  app.set("port", port);

  const server = http.createServer(app);
  if (liveReload) liveReload.createServer();

  server.listen(port);
  server.on("error", (err) => error(err, port));
  server.on("listening", () => {
    listen({ server, name: "graphql" });
    if (callback) callback();
  });
}
