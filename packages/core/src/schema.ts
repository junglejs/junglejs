import { SchemaComposer } from "graphql-compose";

export default function schema(sources: any[]) {
  const schemaComposer = new SchemaComposer();

  sources.forEach(async source => {
    try {
      const ImportedDataSource = await import(source.plugin);
      new ImportedDataSource(source, schemaComposer);
    }
    catch(err) {
      console.error(err);
    }
  });

  return schemaComposer.buildSchema();
}
