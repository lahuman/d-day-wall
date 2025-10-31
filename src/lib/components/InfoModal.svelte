<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let show = false;
  export let title = '';
  export let message = '';

  const dispatch = createEventDispatcher();

  function handleClose() {
    dispatch('close');
  }
</script>

{#if show}
  <div class="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm" on:click={handleClose}>
    <div class="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-2xl p-8 m-4 text-center" on:click|stopPropagation>
      <h3 class="text-xl font-bold text-gray-900 mb-4">{title}</h3>
      <p class="text-gray-600 mb-6">{message}</p>
      <button 
        class="w-full flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-11 px-4 bg-blue-600 text-white text-base font-bold leading-normal tracking-[0.015em] transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        on:click={handleClose}
      >
        확인
      </button>
    </div>
  </div>
{/if}
