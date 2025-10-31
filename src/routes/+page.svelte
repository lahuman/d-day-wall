<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Konva from 'konva';
  import RegistrationModal from '$lib/components/RegistrationModal.svelte';
  import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
  import InfoModal from '$lib/components/InfoModal.svelte';
  import '../app.css';

  type DDayTile = {
    id: string;
    title: string;
    target_date: string;
    coord_x: number;
    coord_y: number;
    color: string;
    likes: number;
    created_at: string;
  };

  const GRID_COUNT = 60;
  const TILE_BODY_SIZE = 100;
  const TILE_MARGIN = 2;
  const TILE_CELL_SIZE = TILE_BODY_SIZE + TILE_MARGIN;
  const WALL_WIDTH = GRID_COUNT * TILE_CELL_SIZE;
  const WALL_HEIGHT = GRID_COUNT * TILE_CELL_SIZE;
  const SCALE_BY = 1.1;

  let container: HTMLDivElement;
  let minimapElement: HTMLDivElement;
  let tiles: DDayTile[] = [];
  let tileNodes = new Map<string, Konva.Rect>();
  let stage: Konva.Stage;
  let layer: Konva.Layer;

  let tooltip = { visible: false, content: '', x: 0, y: 0, dummy: 0 };
  let isTooltipVisibleByTouch = false;

  let showModal = false;
  let isSubmitting = false;
  let selectedCoords: { x: number; y: number } | null = null;

  let showInfoModal = false;
  let infoModalTitle = '';
  let infoModalMessage = '';

  let dDayNodes: Konva.Rect[] = [];
  let sparkleAnimation: Konva.Animation | null = null;
  let intervalId: ReturnType<typeof setInterval>;

  let minimapViewport: { width: number; height: number; top: number; left: number } = { width: 0, height: 0, top: 0, left: 0 };

  let showHelpText = true;
  let inactivityTimer: ReturnType<typeof setTimeout>;

  function calculateDday(targetDateStr: string): number {
    const targetDate = new Date(targetDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  function zoomStage(isZoomIn: boolean, pointerPos?: { x: number; y: number }) {
    if (!stage) return;
    const oldScale = stage.scaleX();
    const center = pointerPos || { x: stage.width() / 2, y: stage.height() / 2 };
    const mousePointTo = { x: (center.x - stage.x()) / oldScale, y: (center.y - stage.y()) / oldScale };
    const newScale = isZoomIn ? oldScale * SCALE_BY : oldScale / SCALE_BY;
    stage.scale({ x: newScale, y: newScale });
    const newPos = { x: center.x - mousePointTo.x * newScale, y: center.y - mousePointTo.y * newScale };
    stage.position(newPos);
    stage.batchDraw();
    updateMinimapViewport();
  }

  const zoomIn = () => zoomStage(true);
  const zoomOut = () => zoomStage(false);

  function isToday(someDate: Date) {
    const today = new Date();
    return someDate.getDate() == today.getDate() && someDate.getMonth() == today.getMonth() && someDate.getFullYear() == today.getFullYear();
  }

  function updateDDayTiles() {
    dDayNodes = [];
    tiles.forEach(tile => {
      const node = tileNodes.get(tile.id);
      if (node) {
        const diffDays = calculateDday(tile.target_date);
        if (diffDays === 0) {
          dDayNodes.push(node);
          node.setAttr('isDDay', true);
        } else {
          node.setAttr('isDDay', false);
        }
      }
    });
  }

  function drawTile(tile: DDayTile) {
    const group = new Konva.Group({ 
      x: tile.coord_x * TILE_CELL_SIZE + TILE_MARGIN / 2,
      y: tile.coord_y * TILE_CELL_SIZE + TILE_MARGIN / 2,
    });

    const diffDays = calculateDday(tile.target_date);
    const tileColor = diffDays < 0 ? '#E5E7EB' : tile.color;
    const isDDay = diffDays === 0;

    const tileRect = new Konva.Rect({ width: TILE_BODY_SIZE, height: TILE_BODY_SIZE, fill: tileColor, stroke: isDDay ? '#fde047' : '#ddd', strokeWidth: isDDay ? 2 : 1, cornerRadius: 4 });
    tileNodes.set(tile.id, tileRect);

    const titleFontSize = 14;
    const titleLineHeight = 1.2;
    const maxLines = 3;
    const maxHeight = maxLines * titleFontSize * titleLineHeight;

    const titleText = new Konva.Text({ 
      text: tile.title,
      fontSize: titleFontSize, 
      fontStyle: 'bold', 
      fill: isDDay || diffDays < 0 ? '#000' : '#fff', 
      width: TILE_BODY_SIZE - 10,
      x: 5,
      y: 10,
      align: 'center',
      lineHeight: titleLineHeight,
      height: maxHeight,
      ellipsis: true,
    });

    const dDayString = isDDay ? 'D-Day!' : diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`;
    const dDayText = new Konva.Text({ text: dDayString, fontSize: 16, fontStyle: 'bold', fill: isDDay || diffDays < 0 ? '#000' : '#fff', width: TILE_BODY_SIZE - 10, x: 5, y: TILE_BODY_SIZE - 45, align: 'left' });

    const likeIcon = new Konva.Text({ text: '❤', fontSize: 16, fill: '#ff0000', x: TILE_BODY_SIZE - 55, y: TILE_BODY_SIZE - 5 });
    const likeCount = new Konva.Text({ text: String(tile.likes), fontSize: 16, fontStyle: 'bold', fill: isDDay || diffDays < 0 ? '#000' : '#fff', x: TILE_BODY_SIZE - 35, y: TILE_BODY_SIZE - 5 });

    likeIcon.on('click tap', () => handleLike(tile, likeCount));

    group.add(tileRect, titleText, dDayText, likeIcon, likeCount);
    layer.add(group);

    group.on('mouseover click tap', (e) => {
      e.cancelBubble = true;
      if (e.type === 'tap') {
        isTooltipVisibleByTouch = true;
      }

      const containerRect = container.getBoundingClientRect();
      const pos = e.evt.changedTouches ? e.evt.changedTouches[0] : e.evt;

      resetInactivityTimer();
      tooltip = {
        visible: true,
        content: tile.title,
        x: pos.clientX - containerRect.left + 5,
        y: pos.clientY - containerRect.top + 5,
        dummy: Math.random(),
      };
    });

    group.on('mouseout', (e) => {
      if (e.type === 'mouseout' && !isTooltipVisibleByTouch) {
        tooltip = { ...tooltip, visible: false, dummy: Math.random() };
      }
    });
  }

  async function handleLike(tile: DDayTile, likeCount: Konva.Text) {
    const likedTiles = JSON.parse(localStorage.getItem('likedTiles') || '[]');
    if (likedTiles.includes(tile.id)) {
      infoModalTitle = '알림';
      infoModalMessage = '이미 좋아한 타일입니다.';
      showInfoModal = true;
      return;
    }

    try {
      const response = await fetch(`/api/tiles/${tile.id}/like`, { method: 'POST' });
      if (!response.ok) {
        throw new Error('좋아요에 실패했습니다.');
      }

      const updatedTile: DDayTile = await response.json();
      likeCount.text(String(updatedTile.likes));
      localStorage.setItem('likedTiles', JSON.stringify([...likedTiles, tile.id]));
    } catch (error: any) {
      infoModalTitle = '오류';
      infoModalMessage = error.message;
      showInfoModal = true;
    }
  }

  let isRandomPlacement = false;

  function findRandomEmptyCell() {
    const occupiedCoords = new Set(tiles.map(t => `${t.coord_x},${t.coord_y}`));
    let x, y;
    do {
      x = Math.floor(Math.random() * GRID_COUNT);
      y = Math.floor(Math.random() * GRID_COUNT);
    } while (occupiedCoords.has(`${x},${y}`));
    return { x, y };
  }

  function handleAddDDayClick() {
    resetInactivityTimer();
    isRandomPlacement = true;
    selectedCoords = findRandomEmptyCell();
    showModal = true;
  }

  function handleWallClick(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (isTooltipVisibleByTouch) {
      isTooltipVisibleByTouch = false;
      tooltip = { ...tooltip, visible: false, dummy: Math.random() };
      return;
    }

    if (e.target.getClassName() === 'Group') {
      return;
    }

    if (showModal) return;

    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    const transform = e.target.getStage()?.getAbsoluteTransform().copy()?.invert();
    if (!transform) return;
    const { x, y } = transform.point(pos);
    const coord_x = Math.floor(x / TILE_CELL_SIZE);
    const coord_y = Math.floor(y / TILE_CELL_SIZE);
    if (coord_x < 0 || coord_x >= GRID_COUNT || coord_y < 0 || coord_y >= GRID_COUNT) return;
    if (tiles.some(t => t.coord_x === coord_x && t.coord_y === coord_y)) {
      return;
    }
    resetInactivityTimer();
    isRandomPlacement = false;
    selectedCoords = { x: coord_x, y: coord_y };
    showModal = true;
  }

  let title = '';
  let target_date = '';

  async function handleModalSubmit(event: CustomEvent<{ title: string; target_date: string; color: string }>) {
    if (!selectedCoords) return;
    isSubmitting = true;
    await new Promise(resolve => setTimeout(resolve, 3000));
    try {
      const response = await fetch('/api/tiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...event.detail, coord_x: selectedCoords.x, coord_y: selectedCoords.y }),
      });
      if (response.status === 409) throw new Error('앗! 다른 사람이 먼저 자리를 차지했어요.');
      if (!response.ok) {
        const { message } = await response.json();
        throw new Error(message || 'D-Day 등록에 실패했습니다.');
      }
      const newTile: DDayTile = await response.json();
      tiles = [...tiles, newTile];
      drawTile(newTile);
      updateDDayTiles();
      layer.batchDraw();
      infoModalTitle = '성공';
      infoModalMessage = 'D-Day가 성공적으로 등록되었습니다!';
      showInfoModal = true;
    } catch (error: any) {
      infoModalTitle = '오류';
      infoModalMessage = error.message;
      showInfoModal = true;
    } finally {
      isSubmitting = false;
      title = '';
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      target_date = `${yyyy}-${mm}-${dd}`;
      closeModal();
    }
  }

  function closeModal() {
    showModal = false;
    selectedCoords = null;
  }

  function updateMinimapViewport() {
    if (!stage) return;
    const scale = stage.scaleX();
    const stagePos = stage.position();
    const minimapWidth = 192; // w-48
    const minimapHeight = 192; // h-48

    minimapViewport = {
      width: (window.innerWidth / WALL_WIDTH / scale) * minimapWidth,
      height: (window.innerHeight / WALL_HEIGHT / scale) * minimapHeight,
      left: (-stagePos.x / WALL_WIDTH / scale) * minimapWidth,
      top: (-stagePos.y / WALL_HEIGHT / scale) * minimapHeight,
    };
  }

  function resetInactivityTimer() {
    showHelpText = false;
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      showHelpText = true;
    }, 30000);
  }

  onMount(async () => {
    if (!container) return;
    stage = new Konva.Stage({ container, width: window.innerWidth, height: window.innerHeight, draggable: true });
    layer = new Konva.Layer();
    stage.add(layer);

    const wallBackground = new Konva.Rect({ x: 0, y: 0, width: WALL_WIDTH, height: WALL_HEIGHT, fill: 'white' });
    layer.add(wallBackground);
    wallBackground.on('click tap', handleWallClick);

    stage.on('dragmove', () => {
      resetInactivityTimer();
      updateMinimapViewport();
    });

    const containerEl = stage.container();
    containerEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      resetInactivityTimer();
      zoomStage(e.deltaY < 0, stage.getPointerPosition());
    }, { passive: false });

    let lastDist = 0;
    function getDist(p1: Touch, p2: Touch) {
        return Math.sqrt(Math.pow(p2.clientX - p1.clientX, 2) + Math.pow(p2.clientY - p1.clientY, 2));
    }

    containerEl.addEventListener('touchmove', (e) => {
      if (e.touches.length < 2) return;
      e.preventDefault();
      resetInactivityTimer();
      const t1 = e.touches[0];
      const t2 = e.touches[1];

      const dist = getDist(t1, t2);
      if (lastDist === 0) lastDist = dist;
      const scale = stage.scaleX() * (dist / lastDist);
      const center = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
      const pointTo = { x: (center.x - stage.x()) / stage.scaleX(), y: (center.y - stage.y()) / stage.scaleX() };
      stage.scale({ x: scale, y: scale });
      stage.position({ x: center.x - pointTo.x * scale, y: center.y - pointTo.y * scale });
      stage.batchDraw();
      lastDist = dist;
      updateMinimapViewport();
    }, { passive: false });

    containerEl.addEventListener('touchend', () => {
      lastDist = 0;
    });

    if (minimapElement) {
      minimapElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        resetInactivityTimer();
        zoomStage(e.deltaY < 0, stage.getPointerPosition());
      }, { passive: false });
    }

    try {
      const response = await fetch('/api/tiles');
      if (!response.ok) throw new Error('타일을 불러오는데 실패했습니다.');
      tiles = await response.json();
      tiles.forEach(drawTile);
      layer.draw();
    } catch (error) {
      console.error('Error loading tiles:', error);
    }

    const scale = Math.min(window.innerWidth / WALL_WIDTH, window.innerHeight / WALL_HEIGHT) * 0.9;
    stage.scale({ x: scale, y: scale });
    const centerX = (window.innerWidth - WALL_WIDTH * scale) / 2;
    const centerY = (window.innerHeight - WALL_HEIGHT * scale) / 2;
    stage.position({ x: centerX, y: centerY });
    stage.batchDraw();

    updateDDayTiles();
    updateMinimapViewport();

    sparkleAnimation = new Konva.Animation(frame => {
      if (!frame) return;
      dDayNodes.forEach(node => {
        if (node.getAttr('isDDay')) {
          const scale = 1 + 0.02 * Math.sin(frame.time * 2 * Math.PI / 1000);
          node.scale({ x: scale, y: scale });
          node.shadowColor('#fde047');
          node.shadowBlur(10 + 10 * Math.sin(frame.time * 2 * Math.PI / 1500));
          node.shadowOpacity(0.6 + 0.4 * Math.sin(frame.time * 2 * Math.PI / 1500));
        }
      });
    }, layer);
    sparkleAnimation.start();
    intervalId = setInterval(updateDDayTiles, 60000);

    setTimeout(() => {
      showHelpText = false;
    }, 5000);
    resetInactivityTimer();
  });

  onDestroy(() => {
    sparkleAnimation?.stop();
    clearInterval(intervalId);
    clearTimeout(inactivityTimer);
  });
</script>

<main class="relative flex h-screen w-full flex-col overflow-hidden font-display text-gray-800 antialiased">
  <header class="absolute top-0 left-0 right-0 z-20 flex items-center justify-between whitespace-nowrap border-b border-solid border-gray-200 px-6 py-3 bg-white/80 backdrop-blur-sm md:px-10">
    <div class="flex items-center gap-4 text-gray-900">
      <div class="size-8 text-primary">
        <img src="/ci.png" alt="D-Day Pixel Wall" />
      </div>
      <h2 class="text-gray-900 text-lg font-bold leading-tight tracking-[-0.015em]">D-Day Pixel Wall</h2>
    </div>
    <button class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-blue-600 text-white text-sm font-bold leading-normal tracking-[0.015em] transition hover:bg-blue-700" on:click={handleAddDDayClick}>
      <span class="truncate">D-Day 등록</span>
    </button>
  </header>

  <div bind:this={container} class="konva-container flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing" >
  </div>

  {#if tooltip.visible}
    <div 
      class="absolute bg-black text-white text-sm rounded py-1 px-2 shadow-lg pointer-events-none z-50"
      style="top: {tooltip.y}px; left: {tooltip.x}px;"
    >
      {tooltip.content}
    </div>
  {/if}

  {#if showHelpText}
    <div class="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-gray-900/70 text-white px-4 py-2 rounded-full text-sm animate-pulse">
      드래그하여 탐색하고, 빈 공간을 클릭하여 D-Day를 추가하세요.
    </div>
  {/if}

  <div class="absolute bottom-6 right-6 z-20 flex flex-col items-end gap-4">
    <div bind:this={minimapElement} class="w-48 h-48 bg-white/50 border border-gray-300 rounded-lg p-1 backdrop-blur-sm">
      <div class="relative w-full h-full grid grid-cols-30 grid-rows-30 gap-px">
        {#each tiles as tile}
          <div class="rounded-full" style="grid-column: {Math.floor(tile.coord_x / 2) + 1} / span 1; grid-row: {Math.floor(tile.coord_y / 2) + 1} / span 1; background-color: {tile.color};"></div>
        {/each}
        <div class="absolute border-2 border-primary bg-primary/20" style="width: {minimapViewport.width}px; height: {minimapViewport.height}px; top: {minimapViewport.top}px; left: {minimapViewport.left}px;"></div>
      </div>
    </div>
    <div class="flex flex-col gap-0.5">
      <button on:click={zoomIn} class="flex size-10 items-center justify-center rounded-t-lg bg-white/50 text-gray-800 backdrop-blur-sm transition-colors hover:bg-white/70">
        <span class="material-symbols-outlined">add</span>
      </button>
      <button on:click={zoomOut} class="flex size-10 items-center justify-center rounded-b-lg bg-white/50 text-gray-800 backdrop-blur-sm transition-colors hover:bg-white/70">
        <span class="material-symbols-outlined">remove</span>
      </button>
    </div>
  </div>

  <RegistrationModal 
    bind:show={showModal} 
    bind:isSubmitting 
    bind:title
    bind:target_date
    coord_x={selectedCoords?.x} 
    coord_y={selectedCoords?.y} 
    on:close={closeModal} 
    on:submit={handleModalSubmit} 
  />

  <LoadingOverlay visible={isSubmitting} />

  <InfoModal 
    bind:show={showInfoModal}
    title={infoModalTitle}
    message={infoModalMessage}
    on:close={() => showInfoModal = false} 
  />
</main>

<style>
  .konva-container {
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
</style>