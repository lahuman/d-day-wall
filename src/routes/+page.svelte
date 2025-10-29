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

  let container: HTMLDivElement;
  const WALL_WIDTH = 3000;
  const WALL_HEIGHT = 3000;
  const TILE_SIZE = 50;

  let tiles: DDayTile[] = [];
  let tileNodes = new Map<string, Konva.Rect>(); // Map tile ID to its Rect node
  let stage: Konva.Stage;
  let layer: Konva.Layer;

  let showModal = false;
  let isSubmitting = false;
  let selectedCoords: { x: number; y: number } | null = null;

  // --- Sparkling Effect Logic ---
  let dDayNodes: Konva.Rect[] = [];
  let sparkleAnimation: Konva.Animation | null = null;
  let intervalId: ReturnType<typeof setInterval>;

  function isToday(someDate: Date) {
    const today = new Date();
    return someDate.getDate() == today.getDate() &&
      someDate.getMonth() == today.getMonth() &&
      someDate.getFullYear() == today.getFullYear();
  }

  function updateDDayTiles() {
    dDayNodes = [];
    tiles.forEach(tile => {
      const targetDate = new Date(tile.target_date);
      if (isToday(targetDate)) {
        const node = tileNodes.get(tile.id);
        if (node) {
          dDayNodes.push(node);
        }
      }
    });
  }

  function drawTile(tile: DDayTile) {
    const group = new Konva.Group({
      x: tile.coord_x * TILE_SIZE,
      y: tile.coord_y * TILE_SIZE,
    });

    const tileRect = new Konva.Rect({
      width: TILE_SIZE,
      height: TILE_SIZE,
      fill: 'lightblue',
      stroke: '#ddd',
      strokeWidth: 1,
    });
    tileNodes.set(tile.id, tileRect); // Store the node

    const tileText = new Konva.Text({
      text: tile.title,
      fontSize: 10,
      fontFamily: 'Calibri',
      fill: '#000',
      width: TILE_SIZE,
      padding: 5,
      align: 'center',
    });

    group.add(tileRect);
    group.add(tileText);
    layer.add(group);
  }

  function handleWallClick(e: Konva.KonvaEventObject<MouseEvent>) {
    if (showModal) return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    const transform = e.target.getStage()?.getAbsoluteTransform().copy()?.invert();
    if (!transform) return;
    const transformedPos = transform.point(pos);

    const coord_x = Math.floor(transformedPos.x / TILE_SIZE);
    const coord_y = Math.floor(transformedPos.y / TILE_SIZE);

    if (coord_x < 0 || coord_x >= WALL_WIDTH / TILE_SIZE || coord_y < 0 || coord_y >= WALL_HEIGHT / TILE_SIZE) return;

    const isTaken = tiles.some(tile => tile.coord_x === coord_x && tile.coord_y === coord_y);
    if (isTaken) {
      alert('This spot is already taken!');
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
        const errorBody = await response.json();
        throw new Error(errorBody.message || 'Failed to register D-Day.');
      }

      const newTile: DDayTile = await response.json();
      tiles.push(newTile);
      drawTile(newTile);
      updateDDayTiles(); // Check if the new tile is a D-Day tile
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

    const scaleBy = 1.1;
    stage.on('wheel', (e) => {
      e.evt.preventDefault();
      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
      const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
      stage.scale({ x: newScale, y: newScale });
      const newPos = { x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale };
      stage.position(newPos);
      stage.batchDraw();
    });

    try {
      const response = await fetch('/api/tiles');
      if (!response.ok) throw new Error('Failed to fetch tiles');
      tiles = await response.json();
      tiles.forEach(drawTile);
      layer.draw();
    } catch (error) {
      console.error('Error loading tiles:', error);
    }

    const scale = Math.min(window.innerWidth / WALL_WIDTH, window.innerHeight / WALL_HEIGHT);
    stage.scale({ x: scale, y: scale });
    stage.position({ x: 0, y: 0 });
    stage.batchDraw();

    // --- Initialize and start sparkle effect ---
    updateDDayTiles();
    sparkleAnimation = new Konva.Animation(frame => {
      if (!frame) return;
      const amplitude = 0.15;
      const period = 2000; // 2 seconds for a full cycle
      const brightness = amplitude * Math.sin(frame.time * 2 * Math.PI / period) + (1 - amplitude);
      dDayNodes.forEach(node => {
        node.fillR(173 * brightness);
        node.fillG(216 * brightness);
        node.fillB(230 * brightness);
      });
    }, layer);
    sparkleAnimation.start();

    intervalId = setInterval(updateDDayTiles, 60000); // Check every minute
  });

  onDestroy(() => {
    sparkleAnimation?.stop();
    clearInterval(intervalId);
  });

</script>

<main>
  <div bind:this={container} class="konva-container" />
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