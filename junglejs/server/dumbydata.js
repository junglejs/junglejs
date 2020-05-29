const authors = [
    { id: 1, firstName: 'Tom', lastName: 'Coleman' },
    { id: 2, firstName: 'Sashko', lastName: 'Stubailo' },
    { id: 3, firstName: 'Mikhail', lastName: 'Novikov' },
];

const posts = [
    { slug: 'introduction-to-graphql', authorId: 1, title: 'Introduction to GraphQL', html: `<p>Welcome, this is a GraphQL article!</p>` },
    { slug: 'welcome-to-apollo', authorId: 2, title: 'Welcome to Apollo', html: `<p>Welcome, this is an Apollo article!</p>` },
    { slug: 'advanced-graphql', authorId: 2, title: 'Advanced GraphQL', html: `<p>Welcome, this is an advanced GrapQL article!</p>` },
    { slug: 'launchpad-is-cool', authorId: 3, title: 'Launchpad is Cool', html: `<p>Welcome, this is an article about Launchpad!</p>` },
];

module.exports.authors = authors;
module.exports.posts = posts;