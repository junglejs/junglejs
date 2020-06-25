const svelte = require('rollup-plugin-svelte');
const { terser } = require('rollup-plugin-terser');
const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs');
const ssr = require('rollup-plugin-svelte-ssr');

const { junglePreprocess } = require('junglejs');

const production = !!process.env.PRODUCTION;

const fs = require('fs');
const templateHtml = fs.readFileSync('src/template.html', { encoding: 'utf8', flag: 'r' });

module.exports = {
    inputOptions: (filename, extension) => {
        const processedFilename = filename == "." ? "Index" : filename.split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("");
        
        return {
            input: `src/routes${extension}/${processedFilename}.svelte`,
            plugins: [
                svelte({
                    dev: !production,
                    preprocess: [
                        junglePreprocess,
                    ],
                    generate: "ssr",
                    hydratable: true,
                }),
                        
                ssr({
                    fileName: 'index.html',
                    configureExport: function(html, css) {
                        return templateHtml.replace('{jungle.export.style}', `<style>${css}</style>`).replace('{jungle.export.html}', html);
                    },
                }),

                resolve(),
                commonjs(),

                production && terser(),
            ],
        }
    },
    outputOptions: (filename, extension) => {
        return {
            sourcemap: true,
            format: 'cjs',
            name: 'app',
            file: `jungle/build${extension}/${filename}/bundle.js`,
        }
    },
    dataSources: [
        {
            format: "json", name: "author", items: [
                { id: 1, firstName: 'Tom', lastName: 'Coleman' },
                { id: 2, firstName: 'Sashko', lastName: 'Stubailo' },
                { id: 3, firstName: 'Mikhail', lastName: 'Novikov' },
            ], queryArgs: { id: 'Int!' },
        },
        {
            format: "dir/markdown", name: "post", items: 'static/posts/', queryArgs: { slug: 'String!' },
        }
    ]
};