import {processDirectory, processDirectoryForParameters, processFile} from "../src/processing";
import mock from "mock-fs";

describe("processFile", () => {
  test("should do something", async () => {
    mock({
      "test": {
      }
    });

    const pf = await processFile({
      file: "",
      config: {},
      dirname: "",
      source: "",
      extension: ""
    });

    mock.restore();
  });
});

/*
describe("processDirectory", () => {
  mock({

  });

  test("should do something", async () => {
    const pd = await processDirectory({
      config: {},
      dirname: "",
      source: "",
      extension: ""
    });
  });
});


describe("processDirectoryForParameters", () => {
  test("should do something", async () => {
    const pdfp = await processDirectoryForParameters({
      config: {},
      dirname: "",
      source: "",
      extension: "",
      paramGeneratedFiles: []
    });
  });
});
*/
