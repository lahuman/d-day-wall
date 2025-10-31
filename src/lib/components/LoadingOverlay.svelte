<script lang="ts">
  export let visible = false;
</script>

{#if visible}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" aria-label="처리 중">
    <div class="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-24 w-24"></div>
  </div>
{/if}

<style>
  .loader {
    border-top-color: #3b82f6; /* blue-500 */
    animation: spinner 1.2s linear infinite;
  }

  @keyframes spinner {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
