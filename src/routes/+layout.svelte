<script>
  import "../app.css";
  import { locale } from 'svelte-i18n';
</script>

{#if $locale}
  <slot />
{/if}

