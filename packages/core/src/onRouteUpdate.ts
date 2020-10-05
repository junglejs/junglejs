import fs from "fs-extra";
import { isSvelteFile, isFileParameters } from "./utils";
import { processFile, processFileForParameters } from "./processing";

export default async function onRouteUpdate({
  ssgdir = "junglejs",
  event,
  path,
  source,
  config,
  dirname,
  liveReloadServer,
}: {
  ssgdir?: string;
  event: string;
  path: string;
  source: string;
  config: any;
  dirname: string;
  liveReloadServer?: any;
}) {
  if (event == "change" || event == "add" || event == "unlink") {
    const splitPath = path.replace(source, "").split("/");
    const pathNoFile = splitPath.slice(0, splitPath.length - 1).join("/");
    const fileName = splitPath[splitPath.length - 1];

    if (isSvelteFile(fileName)) {
      if (event == "unlink") {
        const fileParts = fileName.split(".");
        if (fileParts[0] == "Index") {
          console.log(
            `Route "${pathNoFile}/${fileName}" won't be removed till after rerunning the build process`
          );
        } else {
          const routeDir = fileParts[0]
            .match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/g)
            .join("-")
            .toLowerCase();

          await fs.remove(`${ssgdir}/build${pathNoFile}/${routeDir}/`);
          console.log(`Removed route "${pathNoFile}/${fileName}"`);
        }
      } else {
        if (isFileParameters(fileName))
          await processFileForParameters({
            file: fileName,
            dirname,
            source,
            extension: pathNoFile,
          });
        else
          await processFile({
            file: fileName,
            config,
            dirname,
            source,
            extension: pathNoFile,
          });
      }
    }
  }

  if (liveReloadServer) liveReloadServer.refresh("/");
}
