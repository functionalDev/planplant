import { createSignal, Show } from "solid-js";
import type { GroundType } from "~/models";
import type { DrawStyle } from "./GroundDrawing";
import { GROUND_TYPES } from "./ground-types";
import styles from "./GroundToolbar.module.css";

export interface GroundToolbarProps {
  activeType: () => GroundType;
  onTypeChange: (type: GroundType) => void;
  brushSize: () => number;
  onBrushSizeChange: (size: number) => void;
  drawStyle: () => DrawStyle;
  onDrawStyleChange: (style: DrawStyle) => void;
}

export default function GroundToolbar(props: GroundToolbarProps) {
  const [showBrushPopover, setShowBrushPopover] = createSignal(false);

  return (
    <div class={styles.groundToolbar}>
      <span class={styles.sectionLabel}>Surface</span>
      <div class={styles.buttonGroup}>
        {GROUND_TYPES.map((gt) => (
          <button
            class={`${styles.typeButton} ${props.activeType() === gt.id ? styles.typeActive : ""}`}
            onClick={() => props.onTypeChange(gt.id)}
            title={gt.label}
            style={{ "--ground-color": gt.color } as any}
          >
            <span class={styles.typeIcon}>{gt.icon}</span>
            <span class={styles.typeLabel}>{gt.label}</span>
          </button>
        ))}
      </div>

      <div class={styles.separator} />

      <span class={styles.sectionLabel}>Style</span>
      <div class={styles.buttonGroup}>
        <button
          class={`${styles.styleButton} ${props.drawStyle() === "paint" ? styles.styleActive : ""}`}
          onClick={() => props.onDrawStyleChange("paint")}
          title="Paint brush — thick stroke"
        >
          <span class={styles.styleIcon}>🖌️</span>
          <span class={styles.typeLabel}>Paint</span>
        </button>
        <button
          class={`${styles.styleButton} ${props.drawStyle() === "region" ? styles.styleActive : ""}`}
          onClick={() => props.onDrawStyleChange("region")}
          title="Region — outline connects start to end"
        >
          <span class={styles.styleIcon}>⭕</span>
          <span class={styles.typeLabel}>Region</span>
        </button>
      </div>

      <div class={styles.separator} />

      <span class={styles.sectionLabel}>Brush</span>
      <div class={styles.brushGroup}>
        <button
          class={`${styles.brushButton} ${showBrushPopover() ? styles.brushButtonActive : ""}`}
          onClick={() => setShowBrushPopover(!showBrushPopover())}
          title={`Brush size: ${props.brushSize()}px`}
        >
          <span class={styles.brushPreview} style={{ width: `${Math.min(props.brushSize() * 0.6, 18)}px`, height: `${Math.min(props.brushSize() * 0.6, 18)}px` }} />
          <span class={styles.brushLabel}>{props.brushSize()}</span>
        </button>

        <Show when={showBrushPopover()}>
          <div class={styles.brushPopover}>
            <input
              type="range"
              class={styles.brushSlider}
              min="3"
              max="60"
              step="1"
              value={props.brushSize()}
              onInput={(e) => props.onBrushSizeChange(parseInt(e.currentTarget.value, 10))}
            />
            <span class={styles.brushValue}>{props.brushSize()}px</span>
          </div>
        </Show>
      </div>
    </div>
  );
}
