const svelte = require('rollup-plugin-svelte');
const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs');

const junglePreprocess = require('@junglejs/preprocess').default;

const production = !process.env.PRODUCTION;

module.exports = {
    inputOptions: (filename) => {return {
        input: `jungle/build/${filename}/main.js`,
        plugins: [
            svelte({
                dev: !production,
                css: css => {
                    css.write(`jungle/build/${filename}/bundle.css`);
                },
                preprocess: [
                    junglePreprocess(),
                ]
            }),

            resolve(),
            commonjs(),
        ],
    }},
    outputOptions: (filename) => {return {
        sourcemap: true,
        format: 'iife',
        name: 'app',
        file: `jungle/build/${filename}/bundle.js`
    }},
};