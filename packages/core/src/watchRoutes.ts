import fs from "fs-extra";
import path from "path";
import express from "express";
import chokidar from "chokidar";

async function watchRoutes({
  ssgdir = "junglejs",
  app,
  config,
  dirname
}: {
  ssgdir?: string;
  config: any;
  app: express.Router;
  dirname: string;
}) {
  await fs.remove(ssgdir);
  await fs.ensureDir(`${ssgdir}/build`);
  await fs.ensureDir(`${ssgdir}/.cache`);

  app.use(
    require("connect-livereload")({
      port: 35729,
      rules: [
        {
          match: /<\/head>(?![\s\S]*<\/head>)/i,
          fn: (w, s) => s + w,
        },
        {
          match: /<\/html>(?![\s\S]*<\/html>)/i,
          fn: (w, s) => s + w,
        },
        {
          match: /<\!DOCTYPE.+?>/i,
          fn: (w, s) => w + s,
        },
      ],
    })
  );
  app.use(express.static(path.join(dirname, `${ssgdir}/build/`)));

  //TODO: Make sure all these changes work on Windows !!!

  //TODO: Add in a service worker or make it stop throwing an error somehow

  //TODO: Rebuild routes that rely on components
  await chokidar
    .watch("src/components")
    .on("all", (e, p) =>
      copyStaticFiles(e, p, "src/components", `${ssgdir}/.cache/components`)
    );
  await chokidar
    .watch("static")
    .on("all", (e, p) => copyStaticFiles(e, p, "static", `${ssgdir}/build`));

  await chokidar
    .watch("src/routes")
    .on("all", (e, p) =>
      onRouteUpdate(e, p, "src/routes", config, dirname)
    );
  await chokidar
    .watch(`${ssgdir}/.cache/routes`)
    .on("all", (e, p) =>
      onRouteUpdate(e, p, `${ssgdir}/.cache/routes`, config, dirname)
    );
}
