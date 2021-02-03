<script>
    const QUERY = `
        query @api(name: "spacex") {
            launches(limit: 2) {
                id
                mission_name
            }
        }
    `;

    const QUERYRES = {};

	import Nav from "../../components/Nav.svelte";
</script>

<Nav page="/launches/"/>

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
	<title>launches</title>
</svelte:head>

<main>
    <h1>recent Spacex launches</h1>
    <ul>
        {#each QUERYRES.launches as launch}
            <li><a href="./{launch.id}">{launch.mission_name}</a></li>
        {/each}
    </ul>
</main>
