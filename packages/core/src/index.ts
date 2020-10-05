export let port = 3000;
export let graphqlPort = 3001;
export let queryName = process.env.QUERY || "QUERY";
export let resName = process.env.QUERYRES || "QUERYRES";

import { graphqlServer } from "./graphql";
import { appServer } from "./server";
import { stop } from "./utils";

process.on("SIGTERM", () => {
  stop({ server: appServer, name: "app" });
  stop({ server: graphqlServer, name: "graphql" });
});
