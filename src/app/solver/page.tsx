"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import {
  loadCharacters,
  getComicsTiles,
  getMCUTiles,
  cycleTileColor,
  TILE_COLORS,
  getColorHex,
  type CharacterData,
  type TileState,
  type GuessEntry,
} from "@/lib/solver-types";
import { filterCharacters, getSuggestions } from "@/lib/suggestion-engine";

/* ─── Shared tile styling constants (matching Marveldle exactly) ─── */
const TILE_BORDER = "1px solid rgba(255,255,255,0.35)";
const TILE_SHADOW = "inset 0 0 22px -5px rgba(255,255,255,0.35)";
const TILE_RADIUS = "4px";

function tileStyle(bgHex: string): React.CSSProperties {
  return {
    backgroundColor: bgHex,
    border: TILE_BORDER,
    boxShadow: TILE_SHADOW,
    borderRadius: TILE_RADIUS,
    color: "#FFFFFF",
  };
}

/* ─── Color Tile (tappable) ─── */
function ColorTile({ tile, onTap }: { tile: TileState; onTap: () => void }) {
  const bgHex = getColorHex(tile.color);
  const displayValue = Array.isArray(tile.value)
    ? tile.value.length > 0
      ? tile.value.slice(0, 2).join(", ") +
        (tile.value.length > 2 ? ` (+${tile.value.length - 2})` : "")
      : "None"
    : String(tile.value);

  const colorConf = TILE_COLORS.find((c) => c.value === tile.color);

  return (
    <button
      onClick={onTap}
      style={tileStyle(bgHex)}
      className="flex flex-col items-center justify-center px-2 py-2 min-w-[72px] transition-transform duration-100 hover:scale-105 active:scale-95 select-none cursor-pointer"
    >
      <span className="text-[9px] uppercase tracking-wider opacity-70 font-medium">
        {tile.label}
      </span>
      <span className="text-[11px] font-bold mt-0.5 text-center leading-tight">
        {displayValue}
      </span>
      <span className="text-[11px] mt-1 font-mono font-bold">
        {colorConf?.symbol || ""}
      </span>
    </button>
  );
}

/* ─── Guess Row ─── */
function GuessRow({
  entry,
  index,
  onTileTap,
  onRemove,
}: {
  entry: GuessEntry;
  index: number;
  onTileTap: (idx: number) => void;
  onRemove: () => void;
}) {
  const c = entry.character;
  const imageUrl = `https://ik.imagekit.io/bernique/${c.id.replace(/[^a-zA-Z0-9]/g, "")}.jpg`;

  return (
    <div className="rounded-lg p-3 animate-fadeIn" style={{ background: "rgba(15,15,25,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-3 mb-2.5">
        <div
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center overflow-hidden"
          style={{
            borderRadius: "6px",
            background: "linear-gradient(135deg, #3a2055 0%, #1a1040 100%)",
          }}
        >
          <img
            src={imageUrl}
            alt={c.name}
            className="w-full h-full object-cover"
            style={{ borderRadius: "6px" }}
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              el.style.display = "none";
              el.parentElement!.innerHTML = `<span style="font-size:14px;font-weight:700;color:rgba(255,255,255,0.5)">${c.name.charAt(0)}</span>`;
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{c.name}</p>
          <p className="text-[10px]" style={{ color: "#555" }}>
            Guess #{index + 1} &mdash; Tap tiles to match your game colors
          </p>
        </div>
        <button
          onClick={onRemove}
          className="transition-colors p-1 cursor-pointer"
          style={{ color: "#444" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
          title="Remove guess"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {entry.tiles.map((tile, i) => (
          <ColorTile key={tile.key} tile={tile} onTap={() => onTileTap(i)} />
        ))}
      </div>
    </div>
  );
}

/* ─── Suggestion Card ─── */
function SuggestionCard({
  item,
  onClick,
}: {
  item: { char: CharacterData; score: number; reason: string[] };
  onClick: () => void;
}) {
  const imageUrl = `https://ik.imagekit.io/bernique/${item.char.id.replace(/[^a-zA-Z0-9]/g, "")}.jpg`;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 p-2 rounded-lg transition-all text-left w-full cursor-pointer"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(139,92,246,0.1)";
        e.currentTarget.style.borderColor = "rgba(139,92,246,0.25)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
      }}
    >
      <div
        className="w-9 h-9 flex-shrink-0 flex items-center justify-center overflow-hidden"
        style={{
          borderRadius: "6px",
          background: "linear-gradient(135deg, #3a2055 0%, #1a1040 100%)",
        }}
      >
        <img
          src={imageUrl}
          alt={item.char.name}
          className="w-full h-full object-cover"
          style={{ borderRadius: "6px" }}
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.style.display = "none";
            el.parentElement!.innerHTML = `<span style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.5)">${item.char.name.charAt(0)}</span>`;
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{item.char.name}</p>
        <p className="text-[10px] truncate" style={{ color: "#555" }}>
          {item.char.gender} &middot; {item.char.type} &middot; {item.char.origin}
        </p>
      </div>
      {item.reason.length > 0 && (
        <div className="flex flex-wrap gap-0.5 max-w-[80px]">
          {item.reason.slice(0, 2).map((r) => (
            <span
              key={r}
              className="text-[8px] px-1 py-px rounded"
              style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd" }}
            >
              {r}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

/* ─── Legend Box ─── */
function ColorLegend({ mode }: { mode: "comics" | "mcu" }) {
  const showNumeric = mode === "comics";

  return (
    <div
      className="rounded-lg p-3 mb-5"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#666" }}>
        Tap tiles to cycle colors &mdash; match your Marveldle game exactly
      </p>
      <div className="flex flex-wrap gap-2">
        {/* None / Brown */}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-4 h-4 rounded-sm"
            style={{
              backgroundColor: "#A52A2A",
              border: "1px solid rgba(255,255,255,0.35)",
            }}
          />
          <span className="text-[10px]" style={{ color: "#888" }}>
            None
          </span>
        </div>
        {/* Exact / Green */}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-4 h-4 rounded-sm"
            style={{
              backgroundColor: "#008000",
              border: "1px solid rgba(255,255,255,0.35)",
            }}
          />
          <span className="text-[10px]" style={{ color: "#888" }}>
            Exact
          </span>
        </div>
        {/* Partial / Orange */}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-4 h-4 rounded-sm"
            style={{
              backgroundColor: "#FF8C00",
              border: "1px solid rgba(255,255,255,0.35)",
            }}
          />
          <span className="text-[10px]" style={{ color: "#888" }}>
            Partial
          </span>
        </div>
        {/* Upper / Purple (Comics only) */}
        {showNumeric && (
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold"
              style={{
                backgroundColor: "#800080",
                border: "1px solid rgba(255,255,255,0.35)",
                color: "#fff",
                lineHeight: "16px",
              }}
            >
              &#8593;
            </span>
            <span className="text-[10px]" style={{ color: "#888" }}>
              Higher
            </span>
          </div>
        )}
        {/* Lower / Blue (Comics only) */}
        {showNumeric && (
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold"
              style={{
                backgroundColor: "#4E5AFF",
                border: "1px solid rgba(255,255,255,0.35)",
                color: "#fff",
                lineHeight: "16px",
              }}
            >
              &#8595;
            </span>
            <span className="text-[10px]" style={{ color: "#888" }}>
              Lower
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Solver Page ─── */
export default function SolverPage() {
  const [mode, setMode] = useState<"comics" | "mcu">("comics");
  const [allChars, setAllChars] = useState<CharacterData[]>([]);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [candidates, setCandidates] = useState<CharacterData[]>([]);
  const [suggestions, setSuggestions] = useState<
    { char: CharacterData; score: number; reason: string[] }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    loadCharacters(mode).then((chars) => {
      setAllChars(chars);
      setCandidates(chars);
      setLoading(false);
      setGuesses([]);
      setSuggestions([]);
      setSearch("");
    });
  }, [mode]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = search.length > 1
    ? allChars.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.keywords?.some((k) => k.toLowerCase().includes(q))
        );
      })
    : allChars.slice(0, 20);

  const addGuess = useCallback(
    (char: CharacterData) => {
      const tiles = mode === "comics" ? getComicsTiles(char) : getMCUTiles(char);
      const newEntry: GuessEntry = { character: char, tiles };
      const newGuesses = [...guesses, newEntry];
      setGuesses(newGuesses);
      setSearch("");
      setShowDropdown(false);

      const guessedIds = newGuesses.map((g) => g.character.id);
      const filtered = filterCharacters(allChars, newGuesses, guessedIds);
      setCandidates(filtered);
      const sug = getSuggestions(filtered, newGuesses);
      setSuggestions(sug);
    },
    [guesses, allChars, mode]
  );

  const handleTileTap = useCallback(
    (guessIdx: number, tileIdx: number) => {
      setGuesses((prev) => {
        const updated = [...prev];
        const tiles = [...updated[guessIdx].tiles];
        tiles[tileIdx] = {
          ...tiles[tileIdx],
          color: cycleTileColor(tiles[tileIdx]),
        };
        updated[guessIdx] = { ...updated[guessIdx], tiles };

        const guessedIds = updated.map((g) => g.character.id);
        const filtered = filterCharacters(allChars, updated, guessedIds);
        setCandidates(filtered);
        const sug = getSuggestions(filtered, updated);
        setSuggestions(sug);

        return updated;
      });
    },
    [allChars]
  );

  const removeGuess = useCallback(
    (idx: number) => {
      setGuesses((prev) => {
        const updated = prev.filter((_, i) => i !== idx);
        const guessedIds = updated.map((g) => g.character.id);
        const filtered = filterCharacters(allChars, updated, guessedIds);
        setCandidates(filtered);
        const sug = getSuggestions(filtered, updated);
        setSuggestions(sug);
        return updated;
      });
    },
    [allChars]
  );

  const resetAll = () => {
    setGuesses([]);
    setCandidates(allChars);
    setSuggestions([]);
    setSearch("");
  };

  const hasAnyColor = guesses.some((g) => g.tiles.some((t) => t.color !== "none"));

  return (
    <div className="min-h-screen" style={{ background: "#0a0a14" }}>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 pt-2">
          <div>
            <h2 className="text-xl font-bold text-white">Solver Helper</h2>
            <p className="text-xs mt-0.5" style={{ color: "#555" }}>
              Type a character, mark tile colors from your game, get smart suggestions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode("comics")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              style={
                mode === "comics"
                  ? { background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }
                  : { background: "rgba(255,255,255,0.04)", color: "#555", border: "1px solid transparent" }
              }
            >
              Comics
            </button>
            <button
              onClick={() => setMode("mcu")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              style={
                mode === "mcu"
                  ? { background: "rgba(239,68,68,0.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }
                  : { background: "rgba(255,255,255,0.04)", color: "#555", border: "1px solid transparent" }
              }
            >
              MCU
            </button>
            {guesses.length > 0 && (
              <button
                onClick={resetAll}
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                style={{ background: "rgba(255,255,255,0.04)", color: "#555" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#fff";
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#555";
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div
              className="animate-spin rounded-full"
              style={{
                width: "40px",
                height: "40px",
                border: "4px solid rgba(255,255,255,0.08)",
                borderTopColor: "#8b5cf6",
              }}
            />
          </div>
        )}

        {!loading && (
          <>
            {/* Search */}
            <div className="relative mb-4" ref={dropdownRef}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: "#444" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder={`Search ${mode === "comics" ? "Comics" : "MCU"} character (${allChars.length} available)...`}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  />
                </div>
              </div>

              {/* Dropdown */}
              {showDropdown && filtered.length > 0 && (
                <div
                  className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl shadow-2xl max-h-[280px] overflow-y-auto"
                  style={{
                    background: "#12121e",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {filtered.slice(0, 40).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => addGuess(c)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left cursor-pointer"
                      style={{ color: "#fff" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div
                        className="w-7 h-7 flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={{
                          borderRadius: "4px",
                          background: "linear-gradient(135deg, #3a2055, #1a1040)",
                        }}
                      >
                        <img
                          src={`https://ik.imagekit.io/bernique/${c.id.replace(/[^a-zA-Z0-9]/g, "")}.jpg`}
                          alt=""
                          className="w-full h-full object-cover"
                          style={{ borderRadius: "4px" }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{c.name}</p>
                        <p className="text-[10px]" style={{ color: "#555" }}>
                          {c.gender} &middot; {c.type} &middot; {c.origin}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Color Legend */}
            <ColorLegend mode={mode} />

            {/* Guesses Grid */}
            {guesses.length > 0 && (
              <div className="space-y-3 mb-5">
                {guesses.map((entry, gi) => (
                  <GuessRow
                    key={`${entry.character.id}-${gi}`}
                    entry={entry}
                    index={gi}
                    onTileTap={(ti) => handleTileTap(gi, ti)}
                    onRemove={() => removeGuess(gi)}
                  />
                ))}
              </div>
            )}

            {/* Candidates Counter */}
            {guesses.length > 0 && (
              <div className="mb-4 flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs" style={{ color: "#666" }}>
                  <span className="font-bold text-white">{candidates.length}</span>
                  <span>possible characters remaining</span>
                  {hasAnyColor && (
                    <span style={{ color: "#444" }}>(after applying your filters)</span>
                  )}
                </div>
                <div className="flex-1" style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />
              </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="mb-8">
                <h3
                  className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
                  style={{ color: "#999" }}
                >
                  <span className="text-sm">💡</span>
                  Suggested Next Guesses
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {suggestions.map((item) => (
                    <SuggestionCard
                      key={item.char.id}
                      item={item}
                      onClick={() => addGuess(item.char)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {guesses.length === 0 && (
              <div
                className="text-center py-10 rounded-xl"
                style={{
                  border: "1px dashed rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.01)",
                }}
              >
                <div className="text-4xl mb-3">🔍</div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: "#aaa" }}>
                  Start Solving
                </h3>
                <p
                  className="text-xs max-w-sm mx-auto leading-relaxed"
                  style={{ color: "#555" }}
                >
                  Type a character name above and select it. Then tap the attribute tiles to match
                  the colors shown in your Marveldle game. The solver will suggest the best next
                  characters to guess.
                </p>

                {/* Visual color guide */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto text-left">
                  {/* Exact */}
                  <div className="rounded-lg p-2.5" style={{ background: "rgba(0,128,0,0.12)", border: "1px solid rgba(0,128,0,0.25)" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="inline-block w-4 h-4 rounded-sm"
                        style={{ backgroundColor: "#008000", border: "1px solid rgba(255,255,255,0.35)" }}
                      />
                      <p className="text-[10px] font-bold" style={{ color: "#4ade80" }}>
                        Green = Exact Match
                      </p>
                    </div>
                    <p className="text-[10px]" style={{ color: "#555" }}>
                      Attribute matches the answer perfectly
                    </p>
                  </div>
                  {/* Partial */}
                  <div className="rounded-lg p-2.5" style={{ background: "rgba(255,140,0,0.12)", border: "1px solid rgba(255,140,0,0.25)" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="inline-block w-4 h-4 rounded-sm"
                        style={{ backgroundColor: "#FF8C00", border: "1px solid rgba(255,255,255,0.35)" }}
                      />
                      <p className="text-[10px] font-bold" style={{ color: "#fdba74" }}>
                        Orange = Partial Match
                      </p>
                    </div>
                    <p className="text-[10px]" style={{ color: "#555" }}>
                      Some items match but not all (for list attributes)
                    </p>
                  </div>
                  {/* None */}
                  <div className="rounded-lg p-2.5" style={{ background: "rgba(165,42,42,0.12)", border: "1px solid rgba(165,42,42,0.25)" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="inline-block w-4 h-4 rounded-sm"
                        style={{ backgroundColor: "#A52A2A", border: "1px solid rgba(255,255,255,0.35)" }}
                      />
                      <p className="text-[10px] font-bold" style={{ color: "#fca5a5" }}>
                        Brown = No Match
                      </p>
                    </div>
                    <p className="text-[10px]" style={{ color: "#555" }}>
                      Nothing matches the answer at all
                    </p>
                  </div>
                  {/* Upper / Lower (Comics) */}
                  {mode === "comics" ? (
                    <div className="rounded-lg p-2.5" style={{ background: "rgba(128,0,128,0.12)", border: "1px solid rgba(128,0,128,0.25)" }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="inline-block w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold"
                          style={{ backgroundColor: "#800080", border: "1px solid rgba(255,255,255,0.35)", color: "#fff" }}
                        >
                          &#8593;
                        </span>
                        <span
                          className="inline-block w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold"
                          style={{ backgroundColor: "#4E5AFF", border: "1px solid rgba(255,255,255,0.35)", color: "#fff" }}
                        >
                          &#8595;
                        </span>
                        <p className="text-[10px] font-bold" style={{ color: "#d8b4fe" }}>
                          Year Direction
                        </p>
                      </div>
                      <p className="text-[10px]" style={{ color: "#555" }}>
                        Purple = answer year is higher. Blue = answer year is lower.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-[10px]" style={{ color: "#555" }}>
                        MCU mode has 3 colors: Green (exact), Orange (partial), Brown (none).
                        No year direction indicator.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <footer className="mt-12 mb-6 text-center">
          <p className="text-[10px]" style={{ color: "#333" }}>
            Fan-made helper tool. Not affiliated with Marveldle or Marvel.
          </p>
        </footer>
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
