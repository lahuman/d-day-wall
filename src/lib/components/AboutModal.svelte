<script lang="ts">
  import { fly } from 'svelte/transition';
  import { t } from 'svelte-i18n';

  export let show: boolean;

  let dialog: HTMLDialogElement;

  $: if (dialog && show) dialog.showModal();

  function handleClose() {
    show = false;
  }
</script>

{#if show}
  <div class="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" on:click={handleClose}></div>
  <dialog
    bind:this={dialog}
    class="fixed z-50 w-full max-w-md rounded-2xl bg-white p-0 shadow-2xl open:flex open:flex-col top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
    transition:fly={{ y: 20, duration: 300 }}
    on:close={handleClose}
    on:click|self={handleClose}
  >
    <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
      <h2 class="text-lg font-bold text-gray-800">{$t('about.title')}</h2>
      <button on:click={handleClose} class="-m-2 p-2 rounded-full hover:bg-gray-100">
        <span class="material-symbols-outlined text-gray-600">close</span>
      </button>
    </div>
    <div class="space-y-4 p-6 text-gray-600 whitespace-pre-wrap">
        <p>{$t('about.line1')}</p>
        <p>{$t('about.line2')}</p>
        <p>{$t('about.line3')}</p>
        <p>{$t('about.line4')}</p>
    </div>
    <div class="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 bg-gray-50">
        <button on:click={handleClose} class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700">
            {$t('about.close')}
        </button>
    </div>
  </dialog>
{/if}
