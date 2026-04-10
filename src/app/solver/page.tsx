"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import {
  loadCharacters,
  getComicsTiles,
  getMCUTiles,
  cycleTileColor,
  TILE_COLORS,
  type CharacterData,
  type TileState,
  type GuessEntry,
  type TileColor,
} from "@/lib/solver-types";
import { filterCharacters, getSuggestions, getMatchInfo } from "@/lib/suggestion-engine";

function ColorTile({ tile, onTap }: { tile: TileState; onTap: () => void }) {
  const colorConf = TILE_COLORS.find((c) => c.value === tile.color) || TILE_COLORS[0];
  const displayValue = Array.isArray(tile.value)
    ? tile.value.length > 0 ? tile.value.slice(0, 2).join(", ") + (tile.value.length > 2 ? ` (+${tile.value.length - 2})` : "") : "None"
    : String(tile.value);

  return (
    <button
      onClick={onTap}
      className={`flex flex-col items-center justify-center rounded-lg border-2 px-2 py-2 min-w-[80px] transition-all duration-150 hover:scale-105 active:scale-95 select-none ${colorConf.bg} ${colorConf.border}`}
    >
      <span className={`text-[10px] uppercase tracking-wider ${colorConf.text} opacity-70`}>
        {tile.label}
      </span>
      <span className={`text-xs font-bold mt-0.5 ${colorConf.text} text-center leading-tight`}>
        {displayValue}
      </span>
      <span className={`text-[10px] mt-1 font-mono font-bold ${colorConf.text}`}>
        {colorConf.symbol}
      </span>
    </button>
  );
}

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
    <div className="rounded-xl border border-gray-800/50 bg-gray-900/50 p-3 animate-fadeIn">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-600 to-gray-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
          <img
            src={imageUrl}
            alt={c.name}
            className="w-full h-full object-cover rounded-lg"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-sm font-bold text-white/60">${c.name.charAt(0)}</span>`;
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{c.name}</p>
          <p className="text-[10px] text-gray-500">Guess #{index + 1}</p>
        </div>
        <button
          onClick={onRemove}
          className="text-gray-600 hover:text-red-400 transition-colors p-1"
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
      <p className="text-[10px] text-gray-600 mt-2">Tap tiles to set: gray = none, green = exact, yellow = partial, blue arrow = upper/lower</p>
    </div>
  );
}

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
      className="flex items-center gap-2.5 p-2 rounded-lg bg-gray-800/40 border border-gray-700/40 hover:bg-gray-800/70 hover:border-purple-500/30 transition-all text-left w-full"
    >
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gray-600 to-gray-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
        <img
          src={imageUrl}
          alt={item.char.name}
          className="w-full h-full object-cover rounded-lg"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
            (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-xs font-bold text-white/60">${item.char.name.charAt(0)}</span>`;
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{item.char.name}</p>
        <p className="text-[10px] text-gray-500 truncate">
          {item.char.gender} · {item.char.type} · {item.char.origin}
        </p>
      </div>
      {item.reason.length > 0 && (
        <div className="flex flex-wrap gap-0.5 max-w-[80px]">
          {item.reason.slice(0, 2).map((r) => (
            <span key={r} className="text-[8px] bg-purple-500/20 text-purple-300 px-1 py-px rounded">{r}</span>
          ))}
        </div>
      )}
    </button>
  );
}

export default function SolverPage() {
  const [mode, setMode] = useState<"comics" | "mcu">("comics");
  const [allChars, setAllChars] = useState<CharacterData[]>([]);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [candidates, setCandidates] = useState<CharacterData[]>([]);
  const [suggestions, setSuggestions] = useState<{ char: CharacterData; score: number; reason: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCharacters(mode).then((chars) => {
      setAllChars(chars);
      setCandidates(chars);
      setLoading(false);
      setGuesses([]);
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
          c.keywords?.some((k) => k.includes(q))
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

      // Re-filter candidates
      const guessedIds = newGuesses.map((g) => g.character.id);
      const filtered = filterCharacters(allChars, newGuesses, guessedIds);
      setCandidates(filtered);

      // Get suggestions
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
        tiles[tileIdx] = { ...tiles[tileIdx], color: cycleTileColor(tiles[tileIdx]) };
        updated[guessIdx] = { ...updated[guessIdx], tiles };

        // Re-filter
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
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pt-2">
          <div>
            <h2 className="text-xl font-bold text-white">Interactive Solver</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Type a character name, mark the tile colors from your game, get suggestions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode("comics")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === "comics" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "bg-white/5 text-gray-500"
              }`}
            >
              📚 Comics
            </button>
            <button
              onClick={() => setMode("mcu")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === "mcu" ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-white/5 text-gray-500"
              }`}
            >
              🎬 MCU
            </button>
            {guesses.length > 0 && (
              <button onClick={resetAll} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-500 hover:text-white hover:bg-white/10">
                Reset
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-700 border-t-purple-500" />
          </div>
        )}

        {!loading && (
          <>
            {/* Search */}
            <div className="relative mb-4" ref={dropdownRef}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder={`Search ${mode === "comics" ? "Comics" : "MCU"} character...`}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-900 border border-gray-700/50 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              </div>

              {/* Dropdown */}
              {showDropdown && filtered.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700/50 rounded-xl shadow-2xl max-h-[240px] overflow-y-auto">
                  {filtered.slice(0, 30).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => addGuess(c)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-800 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        <img
                          src={`https://ik.imagekit.io/bernique/${c.id.replace(/[^a-zA-Z0-9]/g, "")}.jpg`}
                          alt=""
                          className="w-full h-full object-cover rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{c.name}</p>
                        <p className="text-[10px] text-gray-500">
                          {c.gender} · {c.type} · {c.origin}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Color Legend */}
            <div className="flex items-center gap-3 mb-4 px-1">
              <span className="text-[10px] text-gray-500">Tap tiles to set color:</span>
              {TILE_COLORS.filter((c) => c.value !== "none").map((c) => (
                <span key={c.value} className="flex items-center gap-1">
                  <span className={`inline-block w-3 h-3 rounded ${c.bg} ${c.border} border`} />
                  <span className="text-[10px] text-gray-400">{c.label}</span>
                </span>
              ))}
            </div>

            {/* Guesses Grid */}
            {guesses.length > 0 && (
              <div className="space-y-3 mb-6">
                {guesses.map((entry, gi) => (
                  <GuessRow
                    key={entry.character.id}
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
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="font-bold text-white">{candidates.length}</span>
                  <span>characters remaining</span>
                  {hasAnyColor && (
                    <span className="text-gray-600">(after applying filters)</span>
                  )}
                </div>
                <div className="flex-1 h-px bg-gray-800" />
              </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
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
              <div className="text-center py-10 rounded-xl border border-dashed border-gray-800/50 bg-gray-900/20">
                <div className="text-4xl mb-3">🔍</div>
                <h3 className="text-sm font-semibold text-gray-300 mb-1">Start Solving</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                  Type a character name above and select it. Then tap the attribute tiles to match
                  the colors shown in your Marveldle game. The solver will suggest the best next
                  characters to guess.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 max-w-xs mx-auto text-left">
                  <div className="rounded-lg bg-green-600/20 border border-green-500/30 p-2">
                    <p className="text-[10px] text-green-300 font-bold">Green = Exact</p>
                    <p className="text-[10px] text-gray-500">Attribute matches perfectly</p>
                  </div>
                  <div className="rounded-lg bg-yellow-600/20 border border-yellow-500/30 p-2">
                    <p className="text-[10px] text-yellow-300 font-bold">Yellow = Partial</p>
                    <p className="text-[10px] text-gray-500">Some items match</p>
                  </div>
                  <div className="rounded-lg bg-blue-600/20 border border-blue-500/30 p-2">
                    <p className="text-[10px] text-blue-300 font-bold">Blue ↑ = Higher</p>
                    <p className="text-[10px] text-gray-500">Answer has higher value</p>
                  </div>
                  <div className="rounded-lg bg-gray-600/20 border border-gray-500/30 p-2">
                    <p className="text-[10px] text-gray-300 font-bold">Gray = None</p>
                    <p className="text-[10px] text-gray-500">No match at all</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <footer className="mt-12 mb-6 text-center">
          <p className="text-[10px] text-gray-700">Fan-made helper tool. Not affiliated with Marveldle or Marvel.</p>
        </footer>
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
