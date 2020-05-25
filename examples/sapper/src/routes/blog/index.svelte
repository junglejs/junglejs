<script context="module">
	import { getQuery } from '@junglejs/client';
	import ApolloClient from 'apollo-boost';

	export async function preload({ params }) {
		const QUERY = `
			query {
				posts {
					title
					slug
				}
			} 
		`;

		return { data: await getQuery(QUERY, ApolloClient) };
	}
</script>

<script>
	export let data;
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