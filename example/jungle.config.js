const svelte = require('rollup-plugin-svelte');
const { terser } = require('rollup-plugin-terser');
const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs');

const { junglePreprocess } = require('junglejs');

const production = !!process.env.PRODUCTION;

module.exports = {
    inputOptions: (filename, extension) => {
        return {
            input: `jungle/build${extension}/${filename}/main.js`,
            plugins: [
                svelte({
                    dev: !production,
                    css: css => {
                        css.write(`jungle/build${extension}/${filename}/bundle.css`);
                    },
                    preprocess: [
                        junglePreprocess,
                    ]
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
            format: 'iife',
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