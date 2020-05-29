const express = require('express');

const { startGraphqlServer, stopGraphqlServer, startAppServer, readRoutes } = require('@junglejs/server');

const jungleConfig = require('./jungle.config');

const app = express();

//startGraphqlServer(jungleConfig, __dirname, () => {});
startGraphqlServer(jungleConfig, __dirname, () => readRoutes(jungleConfig, app, __dirname).then(() => stopGraphqlServer(() => startAppServer(app))));