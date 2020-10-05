import fs from "fs-extra";
import path from "path";
import { composeWithJson } from "graphql-compose-json";
import marked from "marked";
import grayMatter from "gray-matter";
import find from "lodash.find";
import { v1 } from "uuid";

const renderer = new marked.Renderer();

let fileextension = ".md";
let records = [];

export function findIndex(id: string) {
  return Object.keys(records).findIndex((x) => records[x]._id === id);
}

export function write({
  record,
  args,
  dirname,
  items,
}: {
  record;
  args;
  dirname;
  items;
}) {
  const index = findIndex(args._id);
  const origin = records[index];
  const data = { ...origin, ...record };

  if (index > -1) {
    records[index] = { ...data };
  } else {
    records.push({ ...data });
  }

  delete data.html;
  delete data._id;
  delete data._content;
  delete data._data_source;
  delete data._path;

  const fileStr = ["---"];
  Object.keys(args).forEach((key) => {
    let value: string;

    if (args[key] === "[JSON]") {
      value = data[key] && data[key].length > 0 ? `"${data[key]}"` : "[]";
      record[key] = data[key] || [];
    } else {
      value = data[key] || '""';
      record[key] = data[key] || "";
    }

    fileStr.push([key, value].join(": "));
  });
  fileStr.push("---");
  fileStr.push(record._content);

  fs.writeFileSync(
    path.resolve(path.join(dirname, items, record._path + fileextension)),
    fileStr.join("\n"),
    "utf-8"
  );
}

export function read({
  dirname,
  item,
  pluginname,
}: {
  dirname: string;
  item;
  pluginname: string;
}) {
  const records = [];

  fs.readdirSync(path.join(dirname, item)).map((fileName) => {
    const entry = fs.readFileSync(
      path.resolve(path.join(dirname, item), fileName),
      "utf-8"
    );
    const { data, content } = grayMatter(entry);
    const html = marked(content, { renderer });

    data._content = content;
    data._path = fileName.substring(0, fileName.length - fileextension.length);
    data._id = v1();
    data._data_source = pluginname;
    records.push({ html, ...data });
  });

  return records;
}

export function init({
  folder,
  typename,
  queryArgs,
  createArgs,
  updateArgs,
  schemaComposer,
}: {
  folder: string;
  typename: string;
  queryArgs?: any;
  createArgs?: any;
  updateArgs?: any;
  schemaComposer: any;
}) {
  const queries = {};

  records = read({
    dirname: folder,
    item: typename,
    pluginname: plugin.name,
  });
  composeWithJson(typename, records[0], { schemaComposer });

  queries[typename] = {
    args: queryArgs,
    resolve: (_, args) => find(records, args),
  };

  queries[typename + "s"] = {
    type: `[${typename}]`,
    resolve: (_) => records,
  };

  queries["create" + typename] = {
    type: typename,
    args: createArgs,
    resolve: (_, args) => {
      const record = args;
      record._id = v1();
      record._data_source = plugin.name;
      record._path = record._id; // TODO
      write({
        record,
        args: createArgs,
        dirname: folder,
        items: typename,
      });
      return record;
    },
  };

  const setUpdateArgs = { ...updateArgs, ...{ _id: "String!" } };
  queries["update" + typename] = {
    type: typename,
    args: setUpdateArgs,
    resolve: (_, args) => {
      const origin = find(records, { _id: args._id });
      const record = { ...origin, ...args };
      write({ record, args: setUpdateArgs, dirname: folder, items: typename });
      return record;
    },
  };

  queries["remove" + typename] = {
    type: "Boolean!",
    args: { _id: "String!" },
    resolve: (_, args) => {
      const index = findIndex(args._id);
      if (index < 0) return false;
      const filePath = path.resolve(
        path.join(folder, typename, records[index]._path + fileextension)
      );
      fs.unlinkSync(filePath);
      records.splice(index, 1);
      return true;
    },
  };

  return {
    graphql: {
      queries,
    },
  };
}

const plugin = {
  type: "source",
  name: "source-markdown",
  description: "Markdown data source",
  init,
};

export default plugin;
