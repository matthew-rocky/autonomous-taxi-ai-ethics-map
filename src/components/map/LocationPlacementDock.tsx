import { Crosshair, Loader2, LocateFixed, MapPin, RotateCcw, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { MapInteractionMode, RoutePoint } from "@/types";
import { cn } from "@/lib/utils";

type SearchTarget = "pickup" | "dropoff";

interface LocationPlacementDockProps {
  pickup: RoutePoint | null;
  dropoff: RoutePoint | null;
  mapInteractionMode: MapInteractionMode;
  onStartPickupPlacement: () => void;
  onStartDropoffPlacement: () => void;
  onCancelPlacement: () => void;
  onUseCurrentLocation: () => void;
  onResetRoute: () => void;
  onPickupChange: (point: RoutePoint) => void;
  onDropoffChange: (point: RoutePoint) => void;
  onStatus: (message: string) => void;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

export function LocationPlacementDock({
  pickup,
  dropoff,
  mapInteractionMode,
  onStartPickupPlacement,
  onStartDropoffPlacement,
  onCancelPlacement,
  onUseCurrentLocation,
  onResetRoute,
  onPickupChange,
  onDropoffChange,
  onStatus,
}: LocationPlacementDockProps) {
  const [searchTarget, setSearchTarget] = useState<SearchTarget | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const placingPickup = mapInteractionMode === "set-pickup";
  const placingDropoff = mapInteractionMode === "set-dropoff";
  const instruction = placingPickup ? "Click map to place pickup" : placingDropoff ? "Click map to place drop-off" : "";

  useEffect(() => {
    if (mapInteractionMode === "explore") {
      setSearchTarget(null);
      setQuery("");
    }
  }, [mapInteractionMode]);

  const startPickup = () => {
    setSearchTarget("pickup");
    setQuery("");
    onStartPickupPlacement();
  };

  const startDropoff = () => {
    setSearchTarget("dropoff");
    setQuery("");
    onStartDropoffPlacement();
  };

  const searchLocation = async () => {
    if (!searchTarget) return;
    const trimmed = query.trim();
    if (!trimmed) {
      onStatus(`Enter a ${searchTarget === "pickup" ? "pickup" : "drop-off"} address or click the map.`);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: `${trimmed}, Ottawa, Ontario`,
        format: "jsonv2",
        limit: "1",
        addressdetails: "0",
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Location search failed.");
      const results = (await response.json()) as NominatimResult[];
      const result = results[0];
      if (!result) {
        onStatus(`No match found for "${trimmed}". Click the map to place it manually.`);
        return;
      }

      const point: RoutePoint = {
        label: result.display_name.split(",").slice(0, 3).join(", "),
        latitude: Number(result.lat),
        longitude: Number(result.lon),
        source: "search",
      };

      if (searchTarget === "pickup") onPickupChange(point);
      else onDropoffChange(point);
      onStatus(`${searchTarget === "pickup" ? "Pickup" : "Drop-off"} placed from search.`);
      setSearchTarget(null);
      setQuery("");
    } catch {
      onStatus("Location search is unavailable right now. Click the map to place it manually.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="pointer-events-auto mx-auto flex w-fit max-w-full flex-col items-center gap-2"
      data-tour="pickup-dropoff-controls"
      onMouseDown={stopDockEvent}
      onClick={stopDockEvent}
    >
      <div className="map-dock map-dock-strong flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-white/[0.12] bg-slate-950/78 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.38),0_0_42px_rgba(34,211,238,0.10)] backdrop-blur-2xl">
        <DockButton
          icon={MapPin}
          label="Pickup"
          active={placingPickup}
          set={Boolean(pickup)}
          onClick={startPickup}
        />
        <DockButton
          icon={Crosshair}
          label="Drop-off"
          active={placingDropoff}
          set={Boolean(dropoff)}
          onClick={startDropoff}
        />
        <DockButton icon={LocateFixed} label="Current" active={false} set={Boolean(pickup)} onClick={onUseCurrentLocation} />
        <DockButton icon={RotateCcw} label="Reset" active={false} set={false} onClick={onResetRoute} />
        {mapInteractionMode !== "explore" ? (
          <button
            type="button"
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] text-slate-200 transition hover:border-cyan-200/25 hover:bg-white/[0.10] hover:text-white"
            onClick={onCancelPlacement}
            aria-label="Cancel placement"
            title="Cancel"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {instruction ? (
        <div className="map-dock map-dock-strong flex max-w-[min(420px,calc(100vw-24px))] items-center gap-2 rounded-full border border-cyan-200/30 bg-slate-950/88 px-3 py-2 text-xs font-bold text-cyan-50 shadow-[0_14px_44px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
          <span className="truncate">{instruction}</span>
          <button type="button" className="rounded-full border border-white/10 px-2 py-0.5 text-[0.68rem] text-slate-200 hover:bg-white/[0.08]" onClick={onCancelPlacement}>
            Cancel
          </button>
        </div>
      ) : null}

      {searchTarget ? (
        <div className="map-dock map-dock-strong grid w-[min(420px,calc(100vw-24px))] grid-cols-[1fr_auto] gap-2 rounded-2xl border border-white/[0.12] bg-slate-950/86 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void searchLocation();
              }
            }}
            placeholder={searchTarget === "pickup" ? "Search pickup address" : "Search drop-off address"}
            className="min-h-9 min-w-0 rounded-xl border border-white/10 bg-slate-950/75 px-3 text-xs font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/40"
          />
          <button
            type="button"
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-cyan-200/25 bg-cyan-300/[0.14] px-3 text-xs font-bold text-cyan-50 transition hover:bg-cyan-300/[0.2] disabled:cursor-not-allowed disabled:opacity-55"
            onClick={() => void searchLocation()}
            disabled={loading}
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Search className="size-3.5" aria-hidden="true" />}
            Search
          </button>
        </div>
      ) : null}
    </div>
  );
}

function stopDockEvent(event: { stopPropagation?: () => void }) {
  event.stopPropagation?.();
}

function DockButton({
  icon: Icon,
  label,
  active,
  set,
  onClick,
}: {
  icon: typeof MapPin;
  label: string;
  active: boolean;
  set: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold transition",
        active
          ? "border-cyan-200/45 bg-cyan-300/[0.18] text-cyan-50 shadow-[0_0_28px_rgba(34,211,238,0.2)]"
          : "border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-200/25 hover:bg-white/[0.08] hover:text-white",
      )}
      onClick={onClick}
      aria-pressed={active}
      title={`${label}: ${set ? "Set" : "Not set"}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
      {(label === "Pickup" || label === "Drop-off") && (
        <span className={cn("ml-0.5 size-1.5 rounded-full", set ? "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.65)]" : "bg-slate-600")} />
      )}
    </button>
  );
}
