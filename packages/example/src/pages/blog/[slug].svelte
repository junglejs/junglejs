<script>
  const QUERY = `
        query {
            post(slug: "${QUERYPARAMS["slug"]}") {
                title
                slug
                html
            }
        }
    `;

  import Nav from "../../components/Nav.svelte";
</script>

<svelte:head>
  <title>Blog</title>
</svelte:head>

<Nav page={`/page/${QUERYRES.post.slug}/`} />
<main>
  {@html QUERIES.post.html}
</main>
