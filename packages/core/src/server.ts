import express from "express";
import http from "http";
import cookieParser from "cookie-parser";
import cors from "cors";

import { error, listen } from "./utils";

export async function appServer({
  app,
  callback,
  port = 3000,
  liveReload
}: {
  app: express.Application;
  callback?: Function;
  port?: number;
  liveReload?: any;
}) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(cors());
  app.set("port", port);

  const server = http.createServer(app);
  if (liveReload) liveReload.createServer();

  server.on("error", (err) => error(err, port));
  server.on("listening", () => {
    listen({ server, name: "app" });
    callback();
  });
}
