const express = require('express');

const { startGraphqlServer, startAppServer, buildRoutes } = require('junglejs');

const jungleConfig = require('./jungle.config');

const app = express();

startGraphqlServer(jungleConfig, __dirname, () => startAppServer(jungleConfig, app, __dirname, () => buildRoutes(jungleConfig, __dirname, () => process.kill(process.pid, 'SIGTERM'))));