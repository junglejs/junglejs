<script>
    const QUERY = `
        query @api(name: "spacex") {
            launch(id: ${QUERYPARAMS["id"]}) {
                id
                mission_name
                launch_year
            }
        }
    `;

    const QUERYRES = {};

    const QUERYPARAMOPTS = `
        query @api(name: "spacex") {
            launches(limit: 2) {
                id
            }
        }
    `;

    import Nav from "../../components/Nav.svelte";
</script>

<Nav page="/launches/" />

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

<main>
    <h1>{QUERYRES.launch.mission_name}</h1>
    <p>Launch year: {QUERYRES.launch.launch_year}</p>
</main>

