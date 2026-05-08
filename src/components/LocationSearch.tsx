import { Loader2, Search } from "lucide-react";
import { useState } from "react";
import type { RoutePoint } from "@/types";

interface LocationSearchProps {
  id: string;
  label: string;
  placeholder: string;
  point: RoutePoint | null;
  onSelect: (point: RoutePoint) => void;
  onStatus: (message: string) => void;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

export function LocationSearch({ id, label, placeholder, point, onSelect, onStatus }: LocationSearchProps) {
  const [value, setValue] = useState(point?.label ?? "");
  const [loading, setLoading] = useState(false);

  const search = async () => {
    const query = value.trim();
    if (!query) {
      onStatus(`Enter a ${label.toLowerCase()} location or use the map placement button before placing it manually.`);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: `${query}, Ottawa, Ontario`,
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
        onStatus(`No match found for "${query}". Use the map placement button before placing it manually.`);
        return;
      }

      onSelect({
        label: result.display_name.split(",").slice(0, 3).join(", "),
        latitude: Number(result.lat),
        longitude: Number(result.lon),
        source: "search",
      });
      onStatus(`${label} placed from search.`);
    } catch {
      onStatus("Location search is unavailable right now. Use the map placement button before placing it manually.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void search();
            }
          }}
          placeholder={placeholder}
          className="map-input min-h-11"
        />
        <button type="button" className="secondary-button min-w-11 px-3" onClick={() => void search()} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Search className="size-4" aria-hidden="true" />}
          <span className="sr-only">Search {label}</span>
        </button>
      </div>
      {point ? (
        <p className="mt-2 truncate text-xs text-slate-500" title={`${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`}>
          {point.label} - {point.source}
        </p>
      ) : null}
    </div>
  );
}
