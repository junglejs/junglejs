<script>
  const QUERY = `
        query {
            posts {
                title
                slug
            }
        }
    `;

  import Nav from "../../components/Nav.svelte";
</script>

<svelte:head>
  <title>Blog</title>
</svelte:head>

<Nav page="/blog" />
<main>
  <ul>
    {#each QUERYRES.posts as post}
      <li><a href="/blog/{post.slug}">{post.title}</a></li>
    {/each}
  </ul>
</main>
