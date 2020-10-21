import fs from "fs-extra";

import { processDirectory, processDirectoryForParameters } from "./processing";

export default async function buildRoutes({
  config,
  dirname,
  ssgdir = "junglejs",
}: {
  config: any;
  dirname: string;
  ssgdir: string;
}) {
  await fs.remove(ssgdir);
  await fs.ensureDir(ssgdir + "/build");
  await fs.ensureDir(ssgdir + "/.cache");

  await fs.copy("src/components", ssgdir + "/.cache/components");
  await fs.copy("static", ssgdir + "/build");

  await processDirectory({ config, dirname, source: "src/routes" });
  await processDirectoryForParameters({
    config,
    dirname,
    source: "src/routes",
  });

  await processDirectory({
    config,
    dirname,
    source: ssgdir + "/.cache/routes",
  });

  // callback..?
}
