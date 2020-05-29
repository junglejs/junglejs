const { schemaComposer } = require('graphql-compose');
const { composeWithJson } = require('graphql-compose-json');
const find = require('lodash.find');;

const { authors, posts } = require('./dumbydata');

const AuthorTC = composeWithJson('Author', authors[0]);

const PostTC = composeWithJson('Post', posts[0]);

PostTC.addFields({
  author: {
    type: AuthorTC,
    resolve: post => find(authors, { id: post.authorId }),
  },
});

AuthorTC.addFields({
  posts: {
    type: [PostTC],
    resolve: author => filter(posts, { authorId: author.id }),
  },
  postCount: {
    type: 'Int',
    description: 'Number of Posts written by Author',
    resolve: author => filter(posts, { authorId: author.id }).length,
  },
});

schemaComposer.Query.addFields({
  posts: {
    type: '[Post]',
    resolve: () => posts,
  },
  post: {
    type: 'Post',
    args: { slug: 'String!' },
    resolve: (_, { slug }) => find(posts, { slug }),
  },
  authors: {
    type: '[Author]',
    resolve: () => authors,
  },
  author: {
    type: 'Author',
    args: { id: 'Int!' },
    resolve: (_, { id }) => find(authors, { id }),
  },
});



module.exports.schema = schemaComposer.buildSchema();