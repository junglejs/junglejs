<script context="module">
	import { getQuery } from '@junglejs/client';
	import ApolloClient from 'apollo-boost';

	const QUERY = `
		query {
			posts {
				title
				author {
					firstName
				}
			}
		} 
	`;

	export async function preload({ params }) {
		return { data: await getQuery(QUERY, ApolloClient) };
	}
</script>

<script>
	export let data = {posts: []};
</script>

<style>
	ul {
		margin: 0 0 1em 0;
		line-height: 1.5;
	}
</style>

<svelte:head>
	<title>Blog</title>
</svelte:head>

<h1>Recent posts</h1>

<ul>
	{#each data.posts as post}
		<li><a rel='prefetch' href='blog/{post.slug}'>{post.title}</a></li>
	{/each}
</ul>