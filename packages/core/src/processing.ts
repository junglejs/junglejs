import fs from "fs-extra";
import path from "path";
import rollup from "rollup";
import ApolloClient, { gql } from "apollo-boost";
import { asyncForEach, isSvelteFile, isFileParameters } from "./utils";

export async function processDirectory({
  config,
  dirname,
  source,
  extension = "",
}: {
  config: any;
  dirname: string;
  source: string;
  extension?: string;
}) {
  await asyncForEach(fs.readdirSync(source + extension), async (file) => {
    if (fs.statSync(source + extension + "/" + file).isDirectory()) {
      await processDirectory({
        config,
        dirname,
        source,
        extension: `${extension}/${file}`,
      });
    } else {
      await processFile({ config, file, dirname, source, extension });
    }
  });
}

export async function processDirectoryForParameters({
  config,
  dirname,
  source,
  extension = "",
  paramGeneratedFiles = [],
}: {
  config: any;
  dirname: string;
  source: string;
  extension?: string;
  paramGeneratedFiles?: any[];
}) {
  await asyncForEach(fs.readdirSync(source + extension), async (file) => {
    if (fs.statSync(source + extension + "/" + file).isDirectory()) {
      await processDirectoryForParameters({
        config,
        dirname,
        source,
        extension: `${extension}/${file}`,
        paramGeneratedFiles,
      });
    } else {
      await processFileForParameters({ file, dirname, source, extension });
    }
  });

  return paramGeneratedFiles;
}

export async function processFile({
  file,
  config,
  dirname,
  source,
  extension,
  ssgdir = "junglejs",
}: {
  file: string;
  config: any;
  dirname: string;
  source: string;
  extension: string;
  ssgdir?: string;
}) {
  const fileParts = file.split(".");

  if (/\s|_|-/.test(fileParts[0])) {
    console.log(`File "${extension}/${file}" doesn't follow UpperCamelCase`);
  } else {
    if (isSvelteFile(file) && !isFileParameters(file)) {
      //If Index, set to be root of the built folder, else join a multiword into hyphen seperated lowercase words
      const filename =
        fileParts[0] != "Index"
          ? fileParts[0]
              .match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/g)
              .join("-")
              .toLowerCase()
          : ".";

      await fs.ensureDir(`${ssgdir}/build${extension}/${filename}/`);

      const mainJs = `import SFile from ${JSON.stringify(
        path.join(dirname, `${source}${extension}/${file}`)
      )}; export default new SFile({target: document.body, hydrate: true});`;

      if (await fs.pathExists(`${source}${extension}/${file}`)) {
        await fs.writeFile(
          `${ssgdir}/build${extension}/${filename}/main.js`,
          mainJs
        );

        const clientBundle = await rollup.rollup(
          config.clientInputOptions(filename, extension)
        );
        await clientBundle.write(
          config.clientOutputOptions(filename, extension)
        );

        const ssrBundle = await rollup.rollup(
          config.ssrInputOptions(filename, extension, source)
        );
        await ssrBundle.write(config.ssrOutputOptions(filename, extension));

        await fs.remove(`${ssgdir}/build${extension}/${filename}/main.js`);
        await fs.remove(`${ssgdir}/build${extension}/${filename}/ssr.js`);

        console.log(`Preprocessed route "${extension}/${file}"`);
      }
    }
  }
}

export async function processFileForParameters({
  graphqlPort = 3001,
  ssgdir = "junglejs",
  file,
  dirname,
  source,
  extension,
}: {
  graphqlPort?: number;
  ssgdir?: string;
  file: string;
  dirname: string;
  source: string;
  extension: string;
}) {
  const fileParts = file.split(".");
  const fileParameters = isFileParameters(file)
    ? fileParts[0].substring(1, fileParts[0].length - 1).split(",")
    : [];

  if (isSvelteFile(file) && isFileParameters(file)) {
    const rawSvelteFile = fs.readFileSync(
      path.join(dirname, `${source}${extension}/${file}`),
      "utf8"
    );
    const queryParamOpts = RegExp(/const QUERYPARAMOPTS = `([^]*?)`;/gm).exec(
      rawSvelteFile
    )[1];

    const client = new ApolloClient({
      uri: `http://localhost:${graphqlPort}/graphql`,
      fetch: fetch,
    });
    const data: any = Object.values(
      (
        await client.query({
          query: gql`
            ${queryParamOpts}
          `,
        })
      ).data
    )[0];

    const parameterOptions = {};
    // ts-ignore
    parameterOptions[Object.keys(data[0])[0]] = data.map(
      (m) => Object.values(m)[0]
    );

    fileParameters.forEach((fileParameter) => {
      parameterOptions[fileParameter].forEach((paramOption) => {
        const pFilename = paramOption
          .split("-")
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join("");
        const processedFile = rawSvelteFile
          .replace("${" + `QUERYPARAMS['${fileParameter}']` + "}", paramOption)
          .replace("${" + `QUERYPARAMS["${fileParameter}"]` + "}", paramOption);

        fs.ensureDirSync(
          path.join(dirname, `jungle/.cache/routes${extension}`)
        );
        fs.writeFileSync(
          path.join(
            dirname,
            `${ssgdir}/.cache/routes${extension}/${pFilename}.svelte`
          ),
          processedFile
        );
      });
    });
  }
}
