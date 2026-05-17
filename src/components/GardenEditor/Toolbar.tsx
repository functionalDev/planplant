import styles from "./Toolbar.module.css";

export type EditorTool =
  | "select"
  | "plant"
  | "ground"
  | "note";

export type GroundViewMode = "filled" | "outline";

interface ToolbarProps {
  activeTool: () => EditorTool;
  onToolChange: (tool: EditorTool) => void;
  onToggleBackground: () => void;
  backgroundVisible: () => boolean;
  onToggleFullscreen?: () => void;
  fullscreen?: () => boolean;
  groundViewMode?: () => GroundViewMode;
  onToggleGroundView?: () => void;
}

const TOOLS: { id: EditorTool; icon: string; label: string }[] = [
  { id: "select", icon: "👆", label: "Select" },
  { id: "plant", icon: "🌱", label: "Plant" },
  { id: "ground", icon: "🗺️", label: "Ground" },
  { id: "note", icon: "📝", label: "Note" },
];

export default function Toolbar(props: ToolbarProps) {
  return (
    <div class={styles.toolbar}>
      <div class={styles.tools}>
        {TOOLS.map((tool) => (
          <button
            class={`${styles.toolButton} ${props.activeTool() === tool.id ? styles.active : ""}`}
            onClick={() => props.onToolChange(tool.id)}
            title={tool.label}
          >
            <span class={styles.toolIcon}>{tool.icon}</span>
            <span class={styles.toolLabel}>{tool.label}</span>
          </button>
        ))}
      </div>
      <div class={styles.separator} />
      {/* Ground view mode toggle */}
      {props.onToggleGroundView && (
        <button
          class={styles.toolButton}
          onClick={props.onToggleGroundView}
          title={
            props.groundViewMode?.() === "outline"
              ? "Show filled ground"
              : "Show outline only"
          }
        >
          <span class={styles.toolIcon}>
            {props.groundViewMode?.() === "outline" ? "⬡" : "🎨"}
          </span>
          <span class={styles.toolLabel}>
            {props.groundViewMode?.() === "outline" ? "Outline" : "Fill"}
          </span>
        </button>
      )}
      <button
        class={`${styles.toolButton} ${props.backgroundVisible() ? styles.active : ""}`}
        onClick={props.onToggleBackground}
        title="Toggle satellite background"
      >
        <span class={styles.toolIcon}>🛰️</span>
        <span class={styles.toolLabel}>BG</span>
      </button>
      {props.onToggleFullscreen && (
        <button
          class={`${styles.toolButton} ${props.fullscreen?.() ? styles.active : ""}`}
          onClick={props.onToggleFullscreen}
          title={props.fullscreen?.() ? "Exit fullscreen" : "Fullscreen"}
        >
          <span class={styles.toolIcon}>{props.fullscreen?.() ? "✕" : "⛶"}</span>
          <span class={styles.toolLabel}>{props.fullscreen?.() ? "Exit" : "Full"}</span>
        </button>
      )}
    </div>
  );
}
