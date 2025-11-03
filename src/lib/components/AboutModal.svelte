<script lang="ts">
  import { fly } from 'svelte/transition';

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
      <h2 class="text-lg font-bold text-gray-800">D-Day 픽셀 월</h2>
      <button on:click={handleClose} class="-m-2 p-2 rounded-full hover:bg-gray-100">
        <span class="material-symbols-outlined text-gray-600">close</span>
      </button>
    </div>
    <div class="space-y-4 p-6 text-gray-600">
        <p>
            당신의 목표가 하나의 픽셀이 되어,
            모두의 꿈을 완성하는 거대한 D-Day 픽셀 월을 만들어갑니다.
        </p>
        <p>
            시험 준비, 여행, 기념일처럼 반드시 이루고 싶은 순간부터  
            운동 시작, 책 읽기 같은 작은 도전까지—  
            여기서 당신의 D-Day를 기록하고 세상과 공유해보세요.
        </p>
        <p>
            다른 사람들의 목표에 '좋아요'를 보내고,
            응원과 영감의 에너지가 모여 거대한 디지털 아트가 완성됩니다.  
        </p>
        <p>
            각자의 여정은 다르지만, 우리는 함께 앞으로 갑니다.  
            당신의 하루가 이 벽을 채우는 하나의 빛이 됩니다.
        </p>
    </div>
    <div class="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 bg-gray-50">
        <button on:click={handleClose} class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700">
            확인
        </button>
    </div>
  </dialog>
{/if}
