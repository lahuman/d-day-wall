<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Konva from 'konva';
  import RegistrationModal from '$lib/components/RegistrationModal.svelte';

  type DDayTile = {
    id: string;
    title: string;
    target_date: string;
    coord_x: number;
    coord_y: number;
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
  let tiles: DDayTile[] = [];
  let tileNodes = new Map<string, Konva.Rect>();
  let stage: Konva.Stage;
  let layer: Konva.Layer;

  // --- Final, Working HTML Tooltip State ---
  let tooltip = { visible: false, content: '', x: 0, y: 0, dummy: 0 };

  let isTooltipVisibleByTouch = false;

  

  let showModal = false;
  let isSubmitting = false;
  let selectedCoords: { x: number; y: number } | null = null;

  let dDayNodes: Konva.Rect[] = [];
  let sparkleAnimation: Konva.Animation | null = null;
  let intervalId: ReturnType<typeof setInterval>;

  function calculateDday(targetDateStr: string): string {
    const targetDate = new Date(targetDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'D-Day';
    if (diffDays > 0) return `D-${diffDays}`;
    return `D+${Math.abs(diffDays)}`;
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
      if (isToday(new Date(tile.target_date))) {
        const node = tileNodes.get(tile.id);
        if (node) dDayNodes.push(node);
      }
    });
  }

  function drawTile(tile: DDayTile) {
    console.log(`Attaching listeners for tile: ${tile.title}`);
    const group = new Konva.Group({ 
      x: tile.coord_x * TILE_CELL_SIZE + TILE_MARGIN / 2,
      y: tile.coord_y * TILE_CELL_SIZE + TILE_MARGIN / 2,
    });
    const tileRect = new Konva.Rect({ width: TILE_BODY_SIZE, height: TILE_BODY_SIZE, fill: 'lightblue', stroke: '#ddd', strokeWidth: 1, cornerRadius: 4 });
    tileNodes.set(tile.id, tileRect);

    const titleFontSize = 14;
    const titleLineHeight = 1.2;
    const maxLines = 3;
    const maxHeight = maxLines * titleFontSize * titleLineHeight;

    const titleText = new Konva.Text({ 
      text: tile.title,
      fontSize: titleFontSize, 
      fontStyle: 'bold', 
      fill: '#000', 
      width: TILE_BODY_SIZE - 10,
      x: 5,
      y: 10,
      align: 'center',
      lineHeight: titleLineHeight,
      height: maxHeight,
      ellipsis: true,
    });

    const dDayText = new Konva.Text({ text: calculateDday(tile.target_date), fontSize: 20, fontStyle: 'bold', fill: '#333', width: TILE_BODY_SIZE, y: 65, align: 'center' });

    group.add(tileRect, titleText, dDayText);
    layer.add(group);

    // --- Final Working Tooltip Logic ---
    group.on('mouseover click tap', (e) => {
      console.log(`Tooltip shown for tile: ${tile.title}`, e.type);
      e.cancelBubble = true;
      if (e.type === 'tap') {
        isTooltipVisibleByTouch = true;
      }

      const containerRect = container.getBoundingClientRect();
      const pos = e.evt.touches && e.evt.touches.length > 0 ? e.evt.touches[0] : e.evt;

      tooltip = {
        visible: true,
        content: tile.title,
        x: pos.clientX - containerRect.left + 5,
        y: pos.clientY - containerRect.top + 5,
        dummy: Math.random(),
      };
    });

    group.on('mouseout', (e) => {
      console.log(`Tooltip hidden for tile: ${tile.title}`, e.type);
      if (e.type === 'mouseout' && !isTooltipVisibleByTouch) {
        tooltip = { ...tooltip, visible: false, dummy: Math.random() };
      }
    });
  }

  function handleWallClick(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    console.log('Wall clicked', e.target.getClassName());

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
    selectedCoords = { x: coord_x, y: coord_y };
    showModal = true;
  }



  async function handleModalSubmit(event: CustomEvent<{ title: string; target_date: string }>) {
    if (!selectedCoords) return;
    isSubmitting = true;
    alert('A rewarded ad will now play. Please wait a few seconds.');
    await new Promise(resolve => setTimeout(resolve, 3000));
    try {
      const response = await fetch('/api/tiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...event.detail, coord_x: selectedCoords.x, coord_y: selectedCoords.y }),
      });
      if (response.status === 409) throw new Error('Whoops! Someone else just took that spot.');
      if (!response.ok) {
        const { message } = await response.json();
        throw new Error(message || 'Failed to register D-Day.');
      }
      const newTile: DDayTile = await response.json();
      tiles.push(newTile);
      drawTile(newTile);
      updateDDayTiles();
      layer.batchDraw();
      alert('Successfully registered your D-Day!');
      closeModal();
    } catch (error: any) {
      alert(error.message);
    } finally {
      isSubmitting = false;
    }
  }

  function closeModal() {
    showModal = false;
    selectedCoords = null;
  }

  onMount(async () => {
    if (!container) return;
    stage = new Konva.Stage({ container, width: window.innerWidth, height: window.innerHeight, draggable: true });
    layer = new Konva.Layer();
    stage.add(layer);

    const wallBackground = new Konva.Rect({ x: 0, y: 0, width: WALL_WIDTH, height: WALL_HEIGHT, fill: '#f0f0f0' });
    layer.add(wallBackground);
    wallBackground.on('click tap', handleWallClick);

    stage.on('wheel', (e) => {
      e.evt.preventDefault();
      zoomStage(e.evt.deltaY < 0, e.target.getStage()?.getPointerPosition());
    });

    let lastDist = 0;
    function getDist(p1: {x: number, y: number}, p2: {x: number, y: number}) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }
    stage.on('touchmove', (e) => {
        e.evt.preventDefault();
        const t1 = e.evt.touches[0];
        const t2 = e.evt.touches[1];
        if (t1 && t2) {
            const dist = getDist({x: t1.clientX, y: t1.clientY}, {x: t2.clientX, y: t2.clientY});
            if (lastDist === 0) lastDist = dist;
            const scale = stage.scaleX() * (dist / lastDist);
            const center = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
            const pointTo = { x: (center.x - stage.x()) / stage.scaleX(), y: (center.y - stage.y()) / stage.scaleX() };
            stage.scale({ x: scale, y: scale });
            stage.position({ x: center.x - pointTo.x * scale, y: center.y - pointTo.y * scale });
            stage.batchDraw();
            lastDist = dist;
        }
    });
    stage.on('touchend', () => { lastDist = 0; });

    try {
      const response = await fetch('/api/tiles');
      if (!response.ok) throw new Error('Failed to fetch tiles');
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
    sparkleAnimation = new Konva.Animation(frame => {
      if (!frame) return;
      const brightness = 0.15 * Math.sin(frame.time * 2 * Math.PI / 2000) + 0.85;
      const r = Math.round(173 * brightness);
      const g = Math.round(216 * brightness);
      const b = Math.round(230 * brightness);
      const newColor = `rgb(${r}, ${g}, ${b})`;
      dDayNodes.forEach(node => {
        node.fill(newColor);
      });
    }, layer);
    sparkleAnimation.start();
    intervalId = setInterval(updateDDayTiles, 60000);
  });

  onDestroy(() => {
    sparkleAnimation?.stop();
    clearInterval(intervalId);
  });
</script>

<main>
  <div bind:this={container} class="konva-container" />

  <!-- HTML Tooltip -->
  {#if tooltip.visible}
    <div 
      class="absolute bg-black text-white text-sm rounded py-1 px-2 shadow-lg pointer-events-none z-50"
      style="top: {tooltip.y}px; left: {tooltip.x}px;"
    >
      {tooltip.content}
    </div>
  {/if}


  
  <div class="fixed top-4 right-4 flex flex-col space-y-2 z-10">
    <button on:click={zoomIn} class="w-10 h-10 bg-gray-700 text-white text-xl font-bold rounded-full shadow-lg hover:bg-gray-600">+</button>
    <button on:click={zoomOut} class="w-10 h-10 bg-gray-700 text-white text-xl font-bold rounded-full shadow-lg hover:bg-gray-600">-</button>
  </div>

  <RegistrationModal 
    bind:show={showModal} 
    bind:isSubmitting 
    coord_x={selectedCoords?.x} 
    coord_y={selectedCoords?.y} 
    on:close={closeModal} 
    on:submit={handleModalSubmit} 
  />
</main>

<style>
  main, .konva-container {
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background-color: #ccc;
  }
</style>