import sirv from 'sirv';
import express from 'express';
import compression from 'compression';
import * as sapper from '@sapper/server';
import * as jungle from '@junglejs/server';

const { PORT, NODE_ENV } = process.env;
const dev = NODE_ENV === 'development';

express() // You can also use Express
	.use(
		compression({ threshold: 0 }),
		sirv('static', { dev }),
		sapper.middleware({ignore: ['/playground', '/graphql']}),
		jungle.middleware(),
	)
	.listen(PORT, err => {
		if (err) console.log('error', err);
	});
