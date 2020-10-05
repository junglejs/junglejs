const svelte = require('rollup-plugin-svelte');
const { terser } = require('rollup-plugin-terser');
const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs');
const ssr = require('rollup-plugin-svelte-ssr');
const preprocess = require("@junglejs/core/preprocess");
const fs = require("fs");

const templateHtml = fs.readFileSync('src/template.html', { encoding: 'utf-8', flag: 'r' });
const dirname = "junglejs";

module.exports = {
    clientInputOptions: (filename, extension) => {
        return {
            input: `${dirname}/build${extension}/${filename}/main.js`,
            plugins: [
                svelte({
                    dev: false,
                    hydratable: true,
                    preprocess: [
                        preprocess
                    ]
                }),
                resolve({
                    browser: true,
                    dedupe: ["svelte"]
                }),
                commonjs(),
                terser()
            ]
        }
    },
    clientOutputOptions: (filename, extension) => {
        return {
            sourcemap: false,
            format: "iife",
            name: "app",
            file: `${dirname}/build${extension}/${filename}/bundle.js`
        }
    },
    ssrInputOptions: (filename, extension, source) => {
        const processedFilename = filename == "." ? "Index" : filename.split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("");

        return {
            input: `${source}${extension}/${processedFilename}.svelte`,
            plugins: [
                svelte({
                    dev: !production,
                    preprocess: [
                        junglePreprocess,
                    ],
                    generate: "ssr",
                    hydratable: true,
                    css: (css) => {
                        css.write(`${dirname}/build${extension}/${filename}/bundle.css`);
                    },
                }),

                resolve({
                    browser: true,
                    dedupe: ["svelte"],
                }),
                commonjs(),

                production && terser(),

                ssr({
                    fileName: 'index.html',
                    configureExport: function (html, css) {
                        return templateHtml.replace(`{${dirname}.export.html}`, html);
                    },
                }),
            ],
        }
    },
    ssrOutputOptions: (filename, extension) => {
        return {
            sourcemap: false,
            format: 'cjs',
            file: `${dirname}/build${extension}/${filename}/ssr.js`,
        }
    },
    junglejsOptions: {
        appServerPort: 3000,
        graphqlServerPort: 3001,
        queryName: "QUERY",
        resName: "QUERYRES"
    },
    junglejsPlugins: [
        {
            name: "@junglejs/source-markdown",
            options: {
                typename: "Post",
                folder: "static/posts",
                queryArgs: { slug: "String!" },
                updateArgs: {},
                createArgs: {}
            }
        }
    ]
}
