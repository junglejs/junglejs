<script>
  export let page;
</script>

<style>
  .mainnav {
    overflow: hidden;
    background-color: #333;
  }

  .mainnav a {
    float: left;
    color: #f2f2f2;
    text-align: center;
    padding: 14px 16px;
    text-decoration: none;
    font-size: 17px;
  }

  .mainnav a.active {
    background-color: #4caf50;
    color: white;
  }
</style>

<div class="mainnav">
  <a class={page == '/' ? 'active' : ''} href="/">Welcome</a>
  <a class={page == '/hello/' ? 'active' : ''} href="/hello/">Hello</a>
  <a class={page == '/hi/' ? 'active' : ''} href="/hi/">Hi</a>
  <a class={page == '/blog/' ? 'active' : ''} href="/blog/">Blog</a>
  <a class={page == '/launches/' ? 'active' : ''} href="/launches/">Spacex Launches</a>
</div>
