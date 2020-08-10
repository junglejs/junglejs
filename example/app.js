const express = require('express');

const { startGraphqlServer, startAppServer } = require('junglejs');

const jungleConfig = require('./jungle.config');

const app = express();

startGraphqlServer(jungleConfig, __dirname, () => startAppServer(jungleConfig, app, __dirname));