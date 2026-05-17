import { createSignal, onMount, onCleanup } from "solid-js";
import styles from "./CropOverlay.module.css";

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropOverlayProps {
  containerRef: HTMLElement;
  onCropChange: (rect: CropRect) => void;
}

/**
 * A draggable/resizable crop rectangle overlay.
 * The user can drag the edges to define the capture area.
 */
export default function CropOverlay(props: CropOverlayProps) {
  let overlayRef!: HTMLDivElement;

  const [rect, setRect] = createSignal<CropRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const [dragging, setDragging] = createSignal<string | null>(null);
  const [dragStart, setDragStart] = createSignal({ x: 0, y: 0 });
  const [rectStart, setRectStart] = createSignal<CropRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  onMount(() => {
    // Initialize crop to 80% of container, centered
    const container = props.containerRef;
    const padding = 0.1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    const initial: CropRect = {
      x: w * padding,
      y: h * padding,
      width: w * (1 - 2 * padding),
      height: h * (1 - 2 * padding),
    };
    setRect(initial);
    props.onCropChange(initial);
  });

  const handleMouseDown = (edge: string, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(edge);
    setDragStart({ x: e.clientX, y: e.clientY });
    setRectStart(rect());

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart().x;
      const dy = e.clientY - dragStart().y;
      const start = rectStart();
      const container = props.containerRef;
      const maxW = container.clientWidth;
      const maxH = container.clientHeight;

      let newRect = { ...start };

      switch (dragging()) {
        case "move":
          newRect.x = Math.max(0, Math.min(maxW - start.width, start.x + dx));
          newRect.y = Math.max(0, Math.min(maxH - start.height, start.y + dy));
          break;
        case "top":
          newRect.y = Math.max(0, Math.min(start.y + start.height - 50, start.y + dy));
          newRect.height = start.height - (newRect.y - start.y);
          break;
        case "bottom":
          newRect.height = Math.max(50, Math.min(maxH - start.y, start.height + dy));
          break;
        case "left":
          newRect.x = Math.max(0, Math.min(start.x + start.width - 50, start.x + dx));
          newRect.width = start.width - (newRect.x - start.x);
          break;
        case "right":
          newRect.width = Math.max(50, Math.min(maxW - start.x, start.width + dx));
          break;
      }

      setRect(newRect);
      props.onCropChange(newRect);
    };

    const handleMouseUp = () => {
      setDragging(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Touch support
  const handleTouchStart = (edge: string, e: TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    setDragging(edge);
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setRectStart(rect());

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStart().x;
      const dy = touch.clientY - dragStart().y;
      const start = rectStart();
      const container = props.containerRef;
      const maxW = container.clientWidth;
      const maxH = container.clientHeight;

      let newRect = { ...start };

      switch (dragging()) {
        case "move":
          newRect.x = Math.max(0, Math.min(maxW - start.width, start.x + dx));
          newRect.y = Math.max(0, Math.min(maxH - start.height, start.y + dy));
          break;
        case "top":
          newRect.y = Math.max(0, Math.min(start.y + start.height - 50, start.y + dy));
          newRect.height = start.height - (newRect.y - start.y);
          break;
        case "bottom":
          newRect.height = Math.max(50, Math.min(maxH - start.y, start.height + dy));
          break;
        case "left":
          newRect.x = Math.max(0, Math.min(start.x + start.width - 50, start.x + dx));
          newRect.width = start.width - (newRect.x - start.x);
          break;
        case "right":
          newRect.width = Math.max(50, Math.min(maxW - start.x, start.width + dx));
          break;
      }

      setRect(newRect);
      props.onCropChange(newRect);
    };

    const handleTouchEnd = () => {
      setDragging(null);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };

    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
  };

  return (
    <div ref={overlayRef} class={styles.overlay}>
      {/* Darkened areas outside crop */}
      <div
        class={styles.dimTop}
        style={{ height: `${rect().y}px` }}
      />
      <div
        class={styles.dimBottom}
        style={{ top: `${rect().y + rect().height}px` }}
      />
      <div
        class={styles.dimLeft}
        style={{
          top: `${rect().y}px`,
          height: `${rect().height}px`,
          width: `${rect().x}px`,
        }}
      />
      <div
        class={styles.dimRight}
        style={{
          top: `${rect().y}px`,
          height: `${rect().height}px`,
          left: `${rect().x + rect().width}px`,
        }}
      />

      {/* Crop rectangle */}
      <div
        class={styles.cropRect}
        style={{
          left: `${rect().x}px`,
          top: `${rect().y}px`,
          width: `${rect().width}px`,
          height: `${rect().height}px`,
        }}
        onMouseDown={(e) => handleMouseDown("move", e)}
        onTouchStart={(e) => handleTouchStart("move", e)}
      >
        {/* Edge handles */}
        <div
          class={`${styles.handle} ${styles.handleTop}`}
          onMouseDown={(e) => handleMouseDown("top", e)}
          onTouchStart={(e) => handleTouchStart("top", e)}
        />
        <div
          class={`${styles.handle} ${styles.handleBottom}`}
          onMouseDown={(e) => handleMouseDown("bottom", e)}
          onTouchStart={(e) => handleTouchStart("bottom", e)}
        />
        <div
          class={`${styles.handle} ${styles.handleLeft}`}
          onMouseDown={(e) => handleMouseDown("left", e)}
          onTouchStart={(e) => handleTouchStart("left", e)}
        />
        <div
          class={`${styles.handle} ${styles.handleRight}`}
          onMouseDown={(e) => handleMouseDown("right", e)}
          onTouchStart={(e) => handleTouchStart("right", e)}
        />
      </div>
    </div>
  );
}
