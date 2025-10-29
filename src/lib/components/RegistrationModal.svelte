<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let show = false;
  export let coord_x: number | null = null;
  export let coord_y: number | null = null;
  export let isSubmitting = false;

  let title = '';
  let target_date = '';

  const dispatch = createEventDispatcher();

  function handleSubmit() {
    if (!title || !target_date) {
      alert('Please fill out all fields.');
      return;
    }
    dispatch('submit', { title, target_date });
  }

  function handleClose() {
    if (isSubmitting) return; // Don't close while submitting
    dispatch('close');
  }
</script>

{#if show}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="fixed inset-0 bg-black bg-opacity-50 z-40" on:click={handleClose}></div>
  <div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md z-50">
    <h2 class="text-xl font-bold mb-4">Register a new D-Day</h2>
    <p class="text-sm text-gray-600 mb-4">Location: ({coord_x}, {coord_y})</p>
    
    <form on:submit|preventDefault={handleSubmit}>
      <div class="mb-4">
        <label for="title" class="block text-gray-700 text-sm font-bold mb-2">Title</label>
        <input type="text" id="title" bind:value={title} maxlength="50" required class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
      </div>
      <div class="mb-6">
        <label for="date" class="block text-gray-700 text-sm font-bold mb-2">Target Date</label>
        <input type="date" id="date" bind:value={target_date} required class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
      </div>
      
      <div class="flex items-center justify-end">
        <button type="button" on:click={handleClose} disabled={isSubmitting} class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2 disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus_shadow-outline disabled:opacity-50">
          {#if isSubmitting}
            <span>Processing...</span>
          {:else}
            <span>Register</span>
          {/if}
        </button>
      </div>
    </form>
  </div>
{/if}
