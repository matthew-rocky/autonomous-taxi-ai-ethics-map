import L from "leaflet";

export function stopLeafletEvent(event: L.LeafletEvent) {
  const originalEvent = (event as L.LeafletMouseEvent).originalEvent;
  if (!originalEvent) return;

  L.DomEvent.stopPropagation(originalEvent);
  L.DomEvent.preventDefault(originalEvent);
}

export function stopDomEvent(event: { stopPropagation?: () => void; preventDefault?: () => void }) {
  event.stopPropagation?.();
  event.preventDefault?.();
}
