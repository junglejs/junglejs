import plugin, {write, read, init, records} from "../src/index";
import mock from "mock-fs";

describe("write", () => {
  it("should write markdown file", () => {
    mock({
      "/test": {
        "blog": {}
      }
    });

    const w = write({
      record: {
        "_id": 1,
        "_data_source": "source-markdown",
        "_path": "filename",
        "_content": "Content",
        "_html": "<p>Content</p>",
        "title": "Title"
      },
      args: {
        "title": "String!"
      },
      dirname: "/test",
      items: "blog"
    });

    expect(w).toEqual(
`---
title: Title
---
Content`);
    mock.restore();
  });
});

describe("read", () => {
  it("should give item array", () => {
    mock({
      "/test": {
        "blog": {
          "simple-post.md": `
---
title: Title
slug: /title
---
Content
`
        }
      }
    });

    const r = read({
      dirname: "/test",
      item: "blog",
      pluginname: "Post"
    });

    const expected = {
      "html": "<p>Content</p>\n",
      "_content": r[0]._content,
      "_path": "simple-post",
      "_id": r[0]._id,
      "_data_source": "source-markdown",
      "title": "Title",
      "slug": "/title"
    };

    expect(r).toEqual([expected]);
    mock.restore();
  });
});

/*
describe("init", () => {
  it("should...", () => {
    const i = init({
      folder: "",
      typename: "",
      queryArgs: {},
      createArgs: {},
      updateArgs: {},
      schemaComposer: {}
    });
  });
});
*/

describe("plugin", () => {
  it("should give the following meta information", () => {
    const expected = {
      type: "source",
      name: "source-markdown",
      description: "Markdown data source",
      init
    };

    expect(plugin).toEqual(expected);
  });
});
