<script>
	const QUERY = `
		query {
			posts {
				title
				slug
			}
		}
	`;
	const QUERYRES = {};

	import Nav from "../../components/Nav.svelte";
</script>

<Nav page="/blog/"/>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
    }
    
	ul {
		margin: 0 0 1em 0;
		line-height: 1.5;
    }

</style>

<svelte:head>
	<title>blog</title>
</svelte:head>

<main>
    <h1>recent posts</h1>
	<h3><a href="/blog/about-blog/">About</a></h3>
    <ul>
        {#each QUERYRES.posts as post}
            <li><a href='/blog/{post.slug}/'>{post.title}</a></li>
        {/each}
    </ul>
</main>
