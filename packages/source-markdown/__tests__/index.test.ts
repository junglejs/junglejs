import plugin, {write, read, init, records} from "../src/index";
import { SchemaComposer } from "graphql-compose";
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

describe("init", () => {
  it("should generate correct graphql queries", () => {
    mock({
      "/test": {
        "blog": {
          "post-1.md": `
---
title: Title for Post 1
slug: /title-1
description: Description 1
---
Content 1
`,
          "post-2.md": `
---
title: Title for Post 2
slug: /title-2
description: Description 2
---
Content 2
`,
        }
      }
    });

    const schemaComposer = new SchemaComposer();
    const fn = expect.any(Function);

    const i = init({
      folder: "/test",
      typename: "blog",
      queryArgs: {},
      createArgs: {},
      updateArgs: {},
      schemaComposer
    });

    const expected = {
      graphql: {
        queries: {
          blog: {
            args: {},
            resolve: fn
          },
          blogs: {
            type: "[Blog]",
            resolve: fn
          },
          createBlog: {
            args: {},
            type: "Blog",
            resolve: fn
          },
          removeBlog: {
            args: {
              "_id": "String!"
            },
            type: "Boolean!",
            resolve: fn
          },
          updateBlog: {
            args: {
              "_id": "String!"
            },
            type: "Blog",
            resolve: fn
          }
        }
      }
    };

    expect(i).toEqual(expected);
  });
});

describe("plugin", () => {
  it("should give the following meta information", (done) => {
    const expected = {
      type: "source",
      name: "source-markdown",
      description: "Markdown data source",
      init
    };

    expect(plugin).toMatchObject(expected);
    done();
  });
});
