import { SchemaComposer } from "graphql-compose";

export default function schema(sources: any[]) {
  const schemaComposer = new SchemaComposer();

  sources.forEach(async source => {
    try {
      const ids = await import(source.name);
      console.log("Loaded source: " + source.name);
      ids.init(__dirname, source.options);
    }
    catch(err) {
      console.error(err);
    }
  });

  return schemaComposer.buildSchema();
}
