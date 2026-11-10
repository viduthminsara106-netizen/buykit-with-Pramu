import React, { useState } from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, ExternalLink, Search, CheckCircle2, X, Loader2 } from 'lucide-react';

export interface GroundedPlace {
  title: string;
  uri: string;
  placeId: string;
  reviewSnippets: string[];
}

interface PickupMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedHubName: string;
  onSelectHub: (hubName: string) => void;
}

const MAPS_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

export const PickupMapModal: React.FC<PickupMapModalProps> = ({
  isOpen,
  onClose,
  selectedHubName,
  onSelectHub,
}) => {
  const [searchQuery, setSearchQuery] = useState(
    'Courier pickup points and electronics stores in Colombo, Sri Lanka'
  );
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [groundingSummary, setGroundingSummary] = useState<string>('');
  const [places, setPlaces] = useState<GroundedPlace[]>([]);

  if (!isOpen) return null;

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserCoords(coords);
        runMapsGroundingSearch(
          'Nearby parcel pickup hubs, shopping centers, and electronics stores',
          coords.lat,
          coords.lng
        );
      },
      (err) => {
        setLoading(false);
        setErrorMessage(`Location access declined: ${err.message}. You can still search by city.`);
      }
    );
  };

  const runMapsGroundingSearch = async (queryText: string, lat?: number, lng?: number) => {
    if (!queryText.trim()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/ai/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryText,
          latitude: lat ?? userCoords?.lat,
          longitude: lng ?? userCoords?.lng,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to load Google Maps grounding data.');
      }
      setGroundingSummary(data.text || '');
      setPlaces(Array.isArray(data.places) ? data.places : []);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runMapsGroundingSearch(searchQuery);
  };

  const mapCenter = userCoords || { lat: 6.9271, lng: 79.8612 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-900">
              BuyKit Pickup Hubs & Live Google Maps Locator
            </h2>
            <p className="text-xs text-slate-500">
              Search verified pickup points, logistics centers, and retail partner hubs using live Google Maps data
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close pickup map modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-12">
          {/* Left Column: Search & Grounded Google Maps Places */}
          <div className="flex flex-col gap-4 lg:col-span-6">
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-2.5">
              <label className="text-xs font-medium text-slate-700">
                Find Pickup Locations or Electronics Stores (Google Maps Grounding)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g., Courier pickup hubs in Colombo or Kandy..."
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-amber-600 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium whitespace-nowrap text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search Maps
                </button>
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-800"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  Use My Current GPS Location
                </button>
                <span className="text-xs text-slate-500">
                  Selected Hub: <strong className="text-slate-900">{selectedHubName}</strong>
                </span>
              </div>
            </form>

            {errorMessage && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {errorMessage}
              </div>
            )}

            {/* Grounded Results */}
            <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Loader2 className="mb-2 h-6 w-6 animate-spin text-amber-600" />
                  <p className="text-xs">Querying live Google Maps grounding data...</p>
                </div>
              ) : places.length > 0 || groundingSummary ? (
                <>
                  {groundingSummary && (
                    <div className="rounded-lg border border-slate-200 bg-white p-3.5 text-xs leading-relaxed whitespace-pre-line text-slate-700">
                      {groundingSummary}
                    </div>
                  )}
                  {places.length > 0 && (
                    <div className="space-y-2.5">
                      <p className="text-xs font-semibold text-slate-800">
                        Verified Google Maps Places ({places.length})
                      </p>
                      {places.map((place, idx) => {
                        const isSelected = selectedHubName === place.title;
                        return (
                          <div
                            key={`${place.uri}-${idx}`}
                            className="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{place.title}</p>
                                <a
                                  href={place.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-amber-700 underline hover:text-amber-800"
                                >
                                  View on Google Maps
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                              <button
                                type="button"
                                onClick={() => onSelectHub(place.title)}
                                className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                                  isSelected
                                    ? 'bg-emerald-700 text-white'
                                    : 'bg-slate-900 text-white hover:bg-slate-800'
                                }`}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {isSelected ? 'Selected Hub' : 'Select for Pickup'}
                              </button>
                            </div>
                            {place.reviewSnippets.length > 0 && (
                              <div className="mt-1 space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
                                {place.reviewSnippets.slice(0, 2).map((snippet, sIdx) => (
                                  <p key={sIdx} className="italic">
                                    "{snippet}"
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <MapPin className="mb-2 h-7 w-7 text-slate-400" />
                  <p className="text-sm font-medium text-slate-800">
                    Search Live Pickup Hubs on Google Maps
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-slate-500">
                    Click "Search Maps" or "Use My Current GPS Location" to fetch live, verified Google Maps locations and review links.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Interactive Google Map (@vis.gl/react-google-maps) */}
          <div className="flex flex-col gap-3 lg:col-span-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">
                Interactive Delivery Map Viewport
              </span>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}
              </span>
            </div>

            <div className="relative h-80 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 lg:h-96">
              {MAPS_API_KEY ? (
                <APIProvider apiKey={MAPS_API_KEY} libraries={['marker']}>
                  <GoogleMap
                    mapId="DEMO_MAP_ID"
                    defaultZoom={12}
                    defaultCenter={mapCenter}
                    gestureHandling="greedy"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <AdvancedMarker
                      position={mapCenter}
                      title="Active Delivery Search Center"
                    >
                      <Pin
                        background="#D97706"
                        borderColor="#78350F"
                        glyphColor="#FFFFFF"
                      />
                    </AdvancedMarker>
                  </GoogleMap>
                </APIProvider>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <MapPin className="h-8 w-8 text-amber-600" />
                  <div className="max-w-sm space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      Google Maps Grounding Active
                    </p>
                    <p className="text-xs leading-relaxed text-slate-600">
                      Use the Google Maps Grounding search on the left to discover real-time verified pickup locations and direct Google Maps links. To also render the interactive vector map canvas, add <code className="rounded bg-slate-200 px-1 py-0.5 font-mono text-[11px]">VITE_GOOGLE_MAPS_API_KEY</code> in your environment settings.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-slate-500">
              All place names, links, and review snippets are retrieved live via Google Maps Grounding in Gemini API. Subject to the{' '}
              <a
                href="https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-slate-800"
              >
                Google Maps Platform Terms of Service
              </a>
              .
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
