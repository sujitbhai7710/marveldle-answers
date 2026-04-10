"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import CharacterCard from "@/components/CharacterCard";
import { fetchAnswers, getTodayKey, getSortedAnswers, formatDate } from "@/lib/data";
import type { DailyAnswer, AnswersData } from "@/lib/data";

function CountdownTimer() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
      const diff = new Date(ist).setHours(24, 0, 0, 0) - ist.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTime(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-center">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">Next update (IST)</p>
      <p className="text-xl font-mono font-bold text-yellow-400 tabular-nums">{time}</p>
    </div>
  );
}

export default function HomePage() {
  const [answers, setAnswers] = useState<DailyAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const todayKey = getTodayKey();
  const todayAnswer = answers.find((a) => a.date === todayKey);
  const recentAnswers = answers.filter((a) => a.date !== todayKey).slice(0, 5);

  useEffect(() => {
    fetchAnswers().then((data: AnswersData) => {
      setAnswers(getSortedAnswers(data));
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Hero */}
        <div className="text-center mb-8 pt-4">
          <h2 className="text-3xl font-extrabold bg-gradient-to-r from-red-400 via-purple-400 to-red-400 bg-clip-text text-transparent">
            Marveldle Daily Answers
          </h2>
          <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
            Daily answers for both <span className="text-purple-400">Comics</span> and{" "}
            <span className="text-red-400">MCU</span> modes. Updated automatically at midnight IST.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="rounded-xl bg-gray-900/60 border border-gray-800/50 p-3 text-center">
            <p className="text-2xl font-bold text-white">{answers.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Days</p>
          </div>
          <div className="rounded-xl bg-gray-900/60 border border-purple-500/20 p-3 text-center">
            <p className="text-2xl font-bold text-purple-400">{answers.filter((a) => a.comics).length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Comics Solved</p>
          </div>
          <div className="rounded-xl bg-gray-900/60 border border-red-500/20 p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{answers.filter((a) => a.mcu).length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">MCU Solved</p>
          </div>
          <div className="rounded-xl bg-gray-900/60 border border-yellow-500/20 p-3 text-center">
            <CountdownTimer />
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-700 border-t-purple-500" />
          </div>
        )}

        {!loading && (
          <>
            {/* Today */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Today&apos;s Answer
                </h3>
                <Link href="/today" className="text-xs text-purple-400 hover:text-purple-300">
                  View Details →
                </Link>
              </div>

              {todayAnswer && (todayAnswer.comics || todayAnswer.mcu) ? (
                <div className="rounded-2xl border border-yellow-500/30 bg-yellow-950/10 p-5">
                  <p className="text-xs text-gray-500 mb-3">{formatDate(todayAnswer.date)}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {todayAnswer.comics && <CharacterCard character={todayAnswer.comics} mode="Comics" />}
                    {todayAnswer.mcu && <CharacterCard character={todayAnswer.mcu} mode="MCU" />}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-700/50 bg-gray-900/30 p-10 text-center">
                  <p className="text-gray-400 text-sm">Today&apos;s answer hasn&apos;t been solved yet.</p>
                  <p className="text-gray-600 text-xs mt-1">It will be updated automatically via cron job.</p>
                  <Link href="/solver" className="inline-block mt-3 text-xs text-purple-400 hover:text-purple-300">
                    Try the Solver →
                  </Link>
                </div>
              )}
            </section>

            {/* Recent */}
            {recentAnswers.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Recent</h3>
                  <Link href="/archive" className="text-xs text-purple-400 hover:text-purple-300">
                    View All →
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentAnswers.map((answer) => (
                    <div key={answer.date} className="rounded-xl border border-gray-800/50 bg-gray-900/40 p-4">
                      <p className="text-xs text-gray-500 mb-2">{formatDate(answer.date)}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {answer.comics && <CharacterCard character={answer.comics} mode="Comics" />}
                        {answer.mcu && <CharacterCard character={answer.mcu} mode="MCU" />}
                        {!answer.comics && !answer.mcu && (
                          <p className="text-xs text-gray-600 col-span-2">No data available</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Quick Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/archive" className="rounded-xl border border-gray-800/50 bg-gray-900/40 p-5 hover:bg-gray-900/60 transition-colors group">
                <h4 className="text-sm font-bold text-gray-300 group-hover:text-white flex items-center gap-2">
                  <span className="text-base">📚</span> Full Archive
                </h4>
                <p className="text-xs text-gray-500 mt-1">Browse all {answers.length} solved days with Comics & MCU answers.</p>
              </Link>
              <Link href="/solver" className="rounded-xl border border-gray-800/50 bg-gray-900/40 p-5 hover:bg-gray-900/60 transition-colors group">
                <h4 className="text-sm font-bold text-gray-300 group-hover:text-white flex items-center gap-2">
                  <span className="text-base">🧠</span> Live Solver
                </h4>
                <p className="text-xs text-gray-500 mt-1">Try solving today&apos;s Marveldle in real-time using the guess API.</p>
              </Link>
            </div>

            {/* Footer */}
            <footer className="mt-12 mb-6 text-center">
              <p className="text-[10px] text-gray-700">Fan-made tool. Not affiliated with Marveldle or Marvel.</p>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
