import {isSvelteFile, isFileParameters} from "../src/utils";

describe("isSvelteFile", () => {
  it("should detect svelte extension", () => {
    const filename = "my.svelte";
    const result = isSvelteFile(filename);
    expect(result).toBe(true);
  });

  it("should not detect svelte test files", () => {
    const filename = "my.test.svelte";
    const result = isSvelteFile(filename);
    expect(result).toBe(false);
  });

  it("should only detect files with .svelte extension", () => {
    const filename = "my.other_extension";
    const result = isSvelteFile(filename);
    expect(result).toBe(false);
  });
});

describe("isFileParameters", () => {
  it("should detect parameters in file names", () => {
    const filename = "[parameters].svelte";
    const result = isFileParameters(filename);
    expect(result).toBe(true);
  });

  it("should only accept one parameter list", () => {
    const filename = "[parametersA][parametersB].svelte";
    const result = isFileParameters(filename);
    expect(result).toBe(false);
  });
});
