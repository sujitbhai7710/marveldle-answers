"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import CharacterCard from "@/components/CharacterCard";
import { fetchAnswers, getSortedAnswers, formatDate } from "@/lib/data";
import type { DailyAnswer, AnswersData } from "@/lib/data";

export default function ArchivePage() {
  const [answers, setAnswers] = useState<DailyAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "comics" | "mcu">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAnswers().then((data: AnswersData) => {
      setAnswers(getSortedAnswers(data));
      setLoading(false);
    });
  }, []);

  const filtered = answers.filter((a) => {
    if (filter === "comics" && !a.comics) return false;
    if (filter === "mcu" && !a.mcu) return false;
    if (search) {
      const q = search.toLowerCase();
      const match = (c: typeof a.comics) =>
        c && (c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || (c.keywords || []).some((k) => k.includes(q)));
      return match(a.comics) || match(a.mcu);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-white mb-1 pt-2">Archive</h2>
        <p className="text-xs text-gray-500 mb-5">{answers.length} days of answers</p>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-5">
          <div className="flex gap-1">
            {(["all", "comics", "mcu"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === f
                    ? f === "comics" ? "bg-purple-500/20 text-purple-300" : f === "mcu" ? "bg-red-500/20 text-red-300" : "bg-white/10 text-white"
                    : "text-gray-500 hover:text-gray-300 bg-white/5"
                }`}
              >
                {f === "all" ? "All" : f === "comics" ? "📚 Comics" : "🎬 MCU"}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search characters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-gray-800/50 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-700 border-t-purple-500" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-gray-500">No answers found matching your criteria.</p>
          </div>
        )}

        {!loading && (
          <div className="space-y-3">
            {filtered.map((answer) => (
              <div
                key={answer.date}
                className="rounded-xl border border-gray-800/40 bg-gray-900/40 p-4 hover:border-gray-700/50 transition-colors"
              >
                <p className="text-xs text-gray-500 mb-3 font-medium">{formatDate(answer.date)}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {answer.comics && <CharacterCard character={answer.comics} mode="Comics" />}
                  {answer.mcu && <CharacterCard character={answer.mcu} mode="MCU" />}
                </div>
              </div>
            ))}
          </div>
        )}

        <footer className="mt-12 mb-6 text-center">
          <p className="text-[10px] text-gray-700">Fan-made tool. Not affiliated with Marveldle or Marvel.</p>
        </footer>
      </main>
    </div>
  );
}
