<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import type { PageData } from './$types';
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

  export let data: PageData;
  const { sharedTile } = data;

  const GRID_COUNT = 60;
  const TILE_BODY_SIZE = 150;
  const TILE_MARGIN = 20;
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

  let dDayNodes: Konva.Group[] = [];
  let sparkleAnimation: Konva.Animation | null = null;
  let intervalId: ReturnType<typeof setInterval>;

  let minimapViewport: { width: number; height: number; top: number; left: number } = { width: 0, height: 0, top: 0, left: 0 };

  let showHelpText = true;
  let inactivityTimer: ReturnType<typeof setTimeout>;
  let headerElement: HTMLElement;
  let showControls = true; // Added for controls visibility toggle

  let title = '';
  let target_date = '';

  let minScale = 0.1;
  const MAX_SCALE = 2;
function clampPos(pos: { x: number; y: number }, overrideScale?: number) {
    if (!stage) return pos;
    
    const scale = overrideScale ?? stage.scaleX(); 
    
    const width = stage.width();
    const height = stage.height();
    const wallW = WALL_WIDTH * scale;
    const wallH = WALL_HEIGHT * scale;
    const headerHeight = headerElement ? headerElement.offsetHeight : 60;
    const availableHeight = height - headerHeight;

    let x, y;

    if (wallW < width) {
      x = Math.max(0, Math.min(pos.x, width - wallW));
    } else {
      x = Math.max(width - wallW, Math.min(pos.x, 0));
    }

    if (wallH < availableHeight) {
      y = Math.max(headerHeight, Math.min(pos.y, height - wallH));
    } else {
      y = Math.max(height - wallH, Math.min(pos.y, headerHeight));
    }
    
    return { x, y };
  }

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
    
    const newScaleAttempt = isZoomIn ? oldScale * SCALE_BY : oldScale / SCALE_BY;
    const newScale = Math.max(minScale, Math.min(newScaleAttempt, MAX_SCALE));

    if (newScale === oldScale) return;

    stage.scale({ x: newScale, y: newScale });

    const newPos = { x: center.x - mousePointTo.x * newScale, y: center.y - mousePointTo.y * newScale };
    stage.position(clampPos(newPos));
    stage.batchDraw();
    updateMinimapViewport();
  }

  const zoomIn = () => zoomStage(true);
  const zoomOut = () => zoomStage(false);

  const SHARED_ZOOM_SCALE = 0.5;
function focusOnTile(tile: DDayTile) {
    if (!stage || !tile) return;

    const targetScale = Math.max(minScale, Math.min(SHARED_ZOOM_SCALE, MAX_SCALE));

    const tileX = tile.coord_x * TILE_CELL_SIZE + TILE_CELL_SIZE / 2;
    const tileY = tile.coord_y * TILE_CELL_SIZE + TILE_CELL_SIZE / 2;

    const targetPos = {
      x: -tileX * targetScale + stage.width() / 2,
      y: -tileY * targetScale + stage.height() / 2,
    };

    const clampedPos = clampPos(targetPos, targetScale);

    stage.to({
      x: clampedPos.x,
      y: clampedPos.y,
      scaleX: targetScale,
      scaleY: targetScale,
      duration: 0.8,
      easing: Konva.Easings.EaseInOut,
      onFinish: () => {
        updateMinimapViewport();
      }
    });
  }
function jumpToTile(tile: DDayTile) {
    if (!stage || !tile) return;
    const targetScale = Math.max(minScale, Math.min(SHARED_ZOOM_SCALE, MAX_SCALE));

    stage.scale({ x: targetScale, y: targetScale });

    const tileX = tile.coord_x * TILE_CELL_SIZE + TILE_CELL_SIZE / 2;
    const tileY = tile.coord_y * TILE_CELL_SIZE + TILE_CELL_SIZE / 2;

    const targetPos = {
      x: -tileX * targetScale + stage.width() / 2,
      y: -tileY * targetScale + stage.height() / 2,
    };

    console.log(JSON.stringify(targetPos, null, 2));

    const clampedPos = clampPos(targetPos);

    stage.position(clampedPos);
    stage.batchDraw();
    updateMinimapViewport();
  }

  function isToday(someDate: Date) {
    const today = new Date();
    return someDate.getDate() == today.getDate() && someDate.getMonth() == today.getMonth() && someDate.getFullYear() == today.getFullYear();
  }

  function updateDDayTiles() {
    const newDDayNodes: Konva.Group[] = [];
    tiles.forEach(tile => {
      const node = tileNodes.get(tile.id);
      if (node) {
        const group = node.getParent();
        const diffDays = calculateDday(tile.target_date);
        const wasDDay = group.getAttr('isDDay');
        const isDDay = diffDays === 0;

        if (isDDay) {
          newDDayNodes.push(group);
        }
        
        if (wasDDay && !isDDay) {
          group.scale({ x: 1, y: 1 });
          group.opacity(1);
          const tileRect = node as Konva.Rect;
          tileRect.shadowBlur(10);
          tileRect.shadowColor('rgba(0,0,0,0.1)');
        }
        
        group.setAttr('isDDay', isDDay);
      }
    });
    dDayNodes = newDDayNodes;
  }

  function drawTile(tile: DDayTile) {
    const diffDays = calculateDday(tile.target_date);
    const isDDay = diffDays === 0;
    const isPast = diffDays < 0;

    const group = new Konva.Group({
      x: tile.coord_x * TILE_CELL_SIZE + TILE_MARGIN / 2,
      y: tile.coord_y * TILE_CELL_SIZE + TILE_MARGIN / 2,
      opacity: 1
    });

    group.setAttr('isDDay', isDDay);

        const tileRect = new Konva.Rect({
          width: TILE_BODY_SIZE,
          height: TILE_BODY_SIZE,
          fill: isPast ? '#f1f3f5' : tile.color,
          cornerRadius: 12,
          shadowColor: 'rgba(0,0,0,0.1)',
          shadowBlur: 10,
          shadowOffset: { x: 0, y: 4 },
          shadowOpacity: 1
        });
        tileNodes.set(tile.id, tileRect);
    
        const titleText = new Konva.Text({
          text: tile.title,
          fontSize: 14,
          fontFamily: 'Noto Sans KR, sans-serif',
          fontStyle: '700',
          fill: isPast ? '#868e96' : '#555',
          width: TILE_BODY_SIZE - 24,
          height: 14 * 1.4 * 3, // 3 lines truncation
          x: 12,
          y: 12,
          lineHeight: 1.4,
          ellipsis: true,
        });
    
        const dDayString = isDDay ? 'D-Day' : diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`;
        let dDayColor = '#007bff';
        if (isDDay) dDayColor = '#e74c3c';
        if (diffDays < 0) dDayColor = '#868e96';
    
        const dDayText = new Konva.Text({
          text: dDayString,
          fontSize: 36,
          fontFamily: 'Noto Sans KR, sans-serif',
          fontStyle: '900',
          fill: dDayColor,
          width: TILE_BODY_SIZE - 24,
          x: 12,
          y: titleText.y() + titleText.height() + 4
        });
    
        const likeButtonGroup = new Konva.Group({
          x: TILE_BODY_SIZE - 60 - 12,
          y: TILE_BODY_SIZE - 24 - 12,
        });
    
        const liked = JSON.parse(localStorage.getItem('likedTiles') || '[]').includes(tile.id);
    
        const likeButtonRect = new Konva.Rect({
          width: 60,
          height: 24,
          fill: liked ? '#fff0f0' : '#f1f3f5',
          cornerRadius: 20,
        });
    
        const heartIcon = new Konva.Path({
          data: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
          scale: { x: 0.5, y: 0.5 },
          x: 8,
          y: 5,
          fill: liked ? '#e74c3c' : 'none',
          stroke: liked ? '#e74c3c' : '#868e96',
          strokeWidth: 2.5,
        });
    
        const likeCount = new Konva.Text({
          text: String(tile.likes),
          fontSize: 13,
          fontFamily: 'Noto Sans KR, sans-serif',
          fontStyle: '700',
          fill: liked ? '#e74c3c' : '#555',
          x: 8 + 14 + 4,
          y: 5,
        });
    likeButtonGroup.add(likeButtonRect, heartIcon, likeCount);
    likeButtonGroup.on('click tap', (e) => {
      e.cancelBubble = true;
      handleLike(tile, likeCount, heartIcon, likeButtonRect);
    });

    const shareButtonGroup = new Konva.Group({
        x: 12,
        y: TILE_BODY_SIZE - 24 - 12,
    });

    const shareButtonRect = new Konva.Rect({
        width: 48,
        height: 24,
        fill: '#f1f3f5',
        cornerRadius: 20,
    });

    const shareText = new Konva.Text({
        text: '공유',
        fontSize: 13,
        fontFamily: 'Noto Sans KR, sans-serif',
        fontStyle: '700',
        fill: '#555',
        width: 48,
        height: 24,
        align: 'center',
        verticalAlign: 'middle',
    });

    shareButtonGroup.add(shareButtonRect, shareText);
    shareButtonGroup.on('click tap', (e) => {
        e.cancelBubble = true;
        const shareUrl = `${window.location.origin}${window.location.pathname}?tile=${tile.id}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            infoModalTitle = '공유';
            infoModalMessage = '타일 주소가 클립보드에 복사되었습니다!';
            showInfoModal = true;
        }, () => {
            infoModalTitle = '오류';
            infoModalMessage = '주소 복사에 실패했습니다.';
            showInfoModal = true;
        });
    });

    group.add(tileRect, titleText, dDayText, likeButtonGroup, shareButtonGroup);
    layer.add(group);

    group.on('mouseover', (e) => {
      stage.container().style.cursor = 'pointer';
      group.to({
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 0.2
      });
      tileRect.to({
        shadowBlur: 20,
        duration: 0.2
      });

      e.cancelBubble = true;
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
      stage.container().style.cursor = 'grab';
      group.to({
        scaleX: 1,
        scaleY: 1,
        duration: 0.2
      });
      tileRect.to({
        shadowBlur: 10,
        duration: 0.2
      });

      if (e.type === 'mouseout' && !isTooltipVisibleByTouch) {
        tooltip = { ...tooltip, visible: false, dummy: Math.random() };
      }
    });

    group.on('tap', (e) => {
      e.cancelBubble = true;
      const containerRect = container.getBoundingClientRect();
      const touch = e.evt.changedTouches ? e.evt.changedTouches[0] : null;
      if (!touch) return;

      resetInactivityTimer();
      tooltip = {
        visible: true,
        content: tile.title,
        x: touch.clientX - containerRect.left + 5,
        y: touch.clientY - containerRect.top + 5,
        dummy: Math.random(),
      };
      isTooltipVisibleByTouch = true;
    });
  }

  async function handleLike(tile: DDayTile, likeCount: Konva.Text, heartIcon: Konva.Path, likeButtonRect: Konva.Rect) {
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
      
      const newLikedTiles = [...likedTiles, tile.id];
      localStorage.setItem('likedTiles', JSON.stringify(newLikedTiles));

      likeButtonRect.fill('#fff0f0');
      heartIcon.fill('#e74c3c');
      heartIcon.stroke('#e74c3c');
      likeCount.fill('#e74c3c');

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

      title = '';
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      target_date = `${yyyy}-${mm}-${dd}`;
      closeModal();

    } catch (error: any) {
      infoModalTitle = '오류';
      infoModalMessage = error.message;
      showInfoModal = true;
    } finally {
      isSubmitting = false;
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
    const minimapWidth = 192;
    const minimapHeight = 192;

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

  let isDraggingMinimap = false;
  let lastMinimapDragPos = { x: 0, y: 0 };

  function onMinimapDragStart(e: MouseEvent | TouchEvent) {
    isDraggingMinimap = true;
    const pos = 'touches' in e ? e.touches[0] : e;
    lastMinimapDragPos = { x: pos.clientX, y: pos.clientY };

    window.addEventListener('mousemove', onMinimapDragMove);
    window.addEventListener('mouseup', onMinimapDragEnd, { once: true });
    window.addEventListener('touchmove', onMinimapDragMove, { passive: false });
    window.addEventListener('touchend', onMinimapDragEnd, { once: true });
  }

  function onMinimapDragMove(e: MouseEvent | TouchEvent) {
    if (!isDraggingMinimap || !stage) return;
    e.preventDefault();

    const pos = 'touches' in e ? e.touches[0] : e;
    const dx = pos.clientX - lastMinimapDragPos.x;
    const dy = pos.clientY - lastMinimapDragPos.y;
    lastMinimapDragPos = { x: pos.clientX, y: pos.clientY };

    const minimapWidth = 192;
    const minimapHeight = 192;
    const scale = stage.scaleX();

    const stageDx = -(dx / minimapWidth) * WALL_WIDTH * scale;
    const stageDy = -(dy / minimapHeight) * WALL_HEIGHT * scale;

    const newPos = {
        x: stage.x() + stageDx,
        y: stage.y() + stageDy
    };
    stage.position(clampPos(newPos));
    
    stage.batchDraw();
    updateMinimapViewport();
  }

  function onMinimapDragEnd() {
    isDraggingMinimap = false;
    window.removeEventListener('mousemove', onMinimapDragMove);
    window.removeEventListener('touchmove', onMinimapDragMove);
  }

  onMount(async () => {
    if (!container) return;
    stage = new Konva.Stage({
      container,
      width: window.innerWidth,
      height: window.innerHeight,
      draggable: true,
    });
    layer = new Konva.Layer();
    stage.add(layer);

    const wallBackground = new Konva.Rect({ x: 0, y: 0, width: WALL_WIDTH, height: WALL_HEIGHT, fill: 'white' });
    layer.add(wallBackground);
    wallBackground.on('click tap', handleWallClick);

    stage.on('dragmove', () => {
      stage.position(clampPos(stage.position()));
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
      const center = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };

      const dist = getDist(t1, t2);
      if (lastDist === 0) {
        lastDist = dist;
        return;
      }
      
      const oldScale = stage.scaleX();
      const pointTo = { x: (center.x - stage.x()) / oldScale, y: (center.y - stage.y()) / oldScale };
      
      const newScaleAttempt = oldScale * (dist / lastDist);
      const newScale = Math.max(minScale, Math.min(newScaleAttempt, MAX_SCALE));

      if (newScale === oldScale) {
        lastDist = dist;
        return;
      }

      stage.scale({ x: newScale, y: newScale });
      
      const newPos = { x: center.x - pointTo.x * newScale, y: center.y - pointTo.y * newScale };
      stage.position(clampPos(newPos));
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
      if (sharedTile && !tiles.some(t => t.id === sharedTile.id)) {
        tiles.push(sharedTile);
      }
      tiles.forEach(drawTile);
      layer.draw();
    } catch (error) {
      console.error('Error loading tiles:', error);
    }

    const headerHeight = headerElement ? headerElement.offsetHeight : 60;
    const availableHeight = window.innerHeight - headerHeight;
    const initialScale = Math.min(window.innerWidth / WALL_WIDTH, availableHeight / WALL_HEIGHT);
    
    minScale = initialScale;
    stage.scale({ x: initialScale, y: initialScale });
    
    const centerX = (window.innerWidth - WALL_WIDTH * initialScale) / 2;
    const centerY = headerHeight + (availableHeight - WALL_HEIGHT * initialScale) / 2;
    stage.position({ x: centerX, y: centerY });
    stage.batchDraw();

    if (sharedTile) {
      await tick();
      focusOnTile(sharedTile);
    }

    updateDDayTiles();
    updateMinimapViewport();
    updateMinimapViewport();

    sparkleAnimation = new Konva.Animation(frame => {
      if (!frame) return;
      dDayNodes.forEach(group => {
        if (group.getAttr('isDDay')) {
          const scale = 1 + 0.05 * Math.sin(frame.time * Math.PI / 1500);
          group.scale({ x: scale, y: scale });
          group.opacity(0.5 + 0.5 * Math.sin(frame.time * Math.PI / 1000));
          
          const rect = group.findOne('Rect');
          if (rect) {
            rect.shadowColor('rgba(231, 76, 60, 0.5)');
            rect.shadowBlur(20);
          }
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

<svelte:head>
  {#if sharedTile}
    {@const dday = calculateDday(sharedTile.target_date)}
    {@const dDayString = dday === 0 ? 'D-Day' : dday > 0 ? `D-${dday}` : `D+${Math.abs(dday)}`}
    {@const description = `${dDayString} | ${sharedTile.target_date.split('T')[0]} | ❤️ ${sharedTile.likes}`}
    <title>{sharedTile.title} | D-Day Wall</title>
    <meta property="og:title" content={sharedTile.title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={`https://dday.day/?tile=${sharedTile.id}`} />
    <meta property="og:type" content="website" />
  {/if}
</svelte:head>

<main class="relative flex h-screen w-full flex-col overflow-hidden font-display text-gray-800 antialiased">
  <header bind:this={headerElement} class="absolute top-0 left-0 right-0 z-20 flex items-center justify-between whitespace-nowrap border-b border-solid border-gray-200 px-6 py-3 bg-white/80 backdrop-blur-sm md:px-10">
    <div class="flex items-center gap-4 text-gray-900">
      <div class="size-8 text-primary">
        <img src="/ci.png" alt="D-Day Pixel Wall" />
      </div>
      <h2 class="text-gray-900 text-lg font-bold leading-tight tracking-[-0.015em]">Wall</h2>
    </div>
    <div class="flex items-center gap-2">
      <button class="flex size-10 items-center justify-center rounded-lg bg-white/50 text-gray-800 backdrop-blur-sm transition-colors hover:bg-white/70" on:click={() => showControls = !showControls}>
        <span class="material-symbols-outlined">{showControls ? 'visibility' : 'visibility_off'}</span>
      </button>
      <button class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-blue-600 text-white text-sm font-bold leading-normal tracking-[0.015em] transition hover:bg-blue-700" on:click={handleAddDDayClick}>
        <span class="truncate">D-Day 등록</span>
      </button>
    </div>
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

  {#if showControls}
    <div class="absolute bottom-6 right-6 z-20 flex flex-col items-end gap-4">
      <div bind:this={minimapElement} class="w-48 h-48 bg-white/50 border border-gray-300 rounded-lg p-1 backdrop-blur-sm">
        <div class="relative w-full h-full grid grid-cols-30 grid-rows-30 gap-px">
          {#each tiles as tile}
            {@const dday = calculateDday(tile.target_date)}
            <div
              class="rounded-full {dday === 0 ? 'd-day-minimap-tile' : ''}"
              style="grid-column: {Math.floor(tile.coord_x / 2) + 1}; grid-row: {Math.floor(tile.coord_y / 2) + 1}; background-color: {dday < 0 ? '#f1f3f5' : dday === 0 ? '#e74c3c' : tile.color};"
            ></div>
          {/each}
          <div 
            class="absolute border-2 border-primary bg-primary/20 cursor-move" 
            style="width: {minimapViewport.width}px; height: {minimapViewport.height}px; top: {minimapViewport.top}px; left: {minimapViewport.left}px;"
            on:mousedown={onMinimapDragStart}
            on:touchstart={onMinimapDragStart}
          ></div>
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
  {/if}

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
  @keyframes blink {
    50% {
      opacity: 0.2;
    }
  }
  .d-day-minimap-tile {
    animation: blink 1.5s infinite;
  }
</style>