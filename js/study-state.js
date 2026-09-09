// Serializable study state; independent of Three.js and browser storage.
export const VIEW_STORAGE_KEY = "aslp.study-views.v1";
export const MAX_VIEWS = 24;

export function emptyStudy() {
  return { selected: null, mode: "all", hidden: [] };
}

export function selectPart(state, name) {
  return { ...state, selected: name, hidden: state.hidden.filter((item) => item !== name) };
}

export function hidePart(state) {
  if (!state.selected) return state;
  return { selected: null, mode: "all", hidden: [...new Set([...state.hidden, state.selected])] };
}

export function partDisplay(state, name, layerVisible) {
  return {
    visible: layerVisible && !state.hidden.includes(name) &&
      (state.mode !== "isolate" || !state.selected || state.selected === name),
    faded: state.mode === "fade" && !!state.selected && state.selected !== name,
    selected: state.selected === name
  };
}

export function readViews(raw, moduleIds) {
  const vector = (v) => Array.isArray(v) && v.length === 3 &&
    v.every((n) => typeof n === "number" && Number.isFinite(n) && Math.abs(n) < 10000);
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v) => v && v.version === 1 && typeof v.id === "string" &&
      typeof v.name === "string" && v.name.length > 0 && v.name.length <= 80 &&
      moduleIds.includes(v.moduleId) && ["l", "r"].includes(v.side) &&
      ["photoreal", "atlas"].includes(v.appearance) && vector(v.camera) && vector(v.target) &&
      v.camera.some((n, i) => Math.abs(n - v.target[i]) > 0.001) &&
      v.layers && typeof v.layers === "object" && !Array.isArray(v.layers) &&
      Object.values(v.layers).every((on) => typeof on === "boolean") &&
      v.study && (v.study.selected === null || typeof v.study.selected === "string") &&
      ["all", "fade", "isolate"].includes(v.study.mode) && Array.isArray(v.study.hidden) &&
      v.study.hidden.length <= 1000 && v.study.hidden.every((name) => typeof name === "string")
    ).slice(0, MAX_VIEWS);
  } catch {
    return [];
  }
}
