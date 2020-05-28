<script>
	import Nav from "../components/Nav.svelte";
</script>

<svelte:head>
	<title>Index - Example JungleJS App</title>
</svelte:head>

<Nav page="/"/>
<main>
	<h1>Welcome!</h1>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #859A00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>