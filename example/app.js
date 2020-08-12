const express = require('express');

const { startGraphqlServer, startAppServer, watchRoutes } = require('junglejs');

const jungleConfig = require('./jungle.config');

const app = express();

startGraphqlServer(jungleConfig, __dirname, () => startAppServer(jungleConfig, app, __dirname, () => watchRoutes(jungleConfig, app, __dirname)));