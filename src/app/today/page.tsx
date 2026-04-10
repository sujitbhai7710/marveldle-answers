"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import CharacterCard from "@/components/CharacterCard";
import { fetchAnswers, getTodayKey, formatDateLong } from "@/lib/data";
import type { DailyAnswer, AnswersData } from "@/lib/data";

export default function TodayPage() {
  const [answer, setAnswer] = useState<DailyAnswer | null>(null);
  const [loading, setLoading] = useState(true);
  const todayKey = getTodayKey();

  useEffect(() => {
    fetchAnswers().then((data: AnswersData) => {
      setAnswer(data[todayKey] || null);
      setLoading(false);
    });
  }, [todayKey]);

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6 pt-2">
          <span className="text-xs font-bold bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded border border-yellow-500/30">
            TODAY
          </span>
          <h2 className="text-sm text-gray-400">{formatDateLong(todayKey)}</h2>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-700 border-t-yellow-500" />
          </div>
        )}

        {!loading && answer && (answer.comics || answer.mcu) && (
          <div className="space-y-6">
            {/* Comics */}
            {answer.comics && (
              <section>
                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-6 h-0.5 bg-purple-500" />
                  Comics Mode
                </h3>
                <div className="max-w-lg">
                  <CharacterCard character={answer.comics} mode="Comics" />
                </div>
              </section>
            )}

            {/* MCU */}
            {answer.mcu && (
              <section>
                <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-6 h-0.5 bg-red-500" />
                  MCU Mode
                </h3>
                <div className="max-w-lg">
                  <CharacterCard character={answer.mcu} mode="MCU" />
                </div>
              </section>
            )}

            <p className="text-[10px] text-gray-600 pt-4">
              Solved at {new Date(answer.solvedAt).toLocaleString("en-US", { timeZone: "Asia/Kolkata" })} IST
            </p>
          </div>
        )}

        {!loading && (!answer || (!answer.comics && !answer.mcu)) && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🦸</div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Not solved yet</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Today&apos;s Marveldle answers haven&apos;t been fetched yet. The cron job runs at midnight IST,
              or you can use the <a href="/solver" className="text-purple-400 hover:underline">live solver</a>.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
