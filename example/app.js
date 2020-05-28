const express = require('express');

const { startGraphqlServer, stopGraphqlServer, startAppServer, readRoutes } = require('@junglejs/server');

const jungleConfig = require('./jungle.config');

const app = express();

startGraphqlServer(() => readRoutes(jungleConfig, app, __dirname).then(() => stopGraphqlServer(() => startAppServer(app))));