"use client";

import { useState } from "react";
import type { CharacterInfo } from "@/lib/data";

export default function CharacterCard({
  character,
  mode,
}: {
  character: CharacterInfo;
  mode: "Comics" | "MCU";
}) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = `https://ik.imagekit.io/bernique/${character.id.replace(/[^a-zA-Z0-9]/g, "")}.jpg`;

  const modeGradient = mode === "Comics"
    ? "from-purple-600 to-indigo-700"
    : "from-red-600 to-orange-600";

  const modeBorder = mode === "Comics"
    ? "border-purple-500/20 hover:border-purple-500/40"
    : "border-red-500/20 hover:border-red-500/40";

  const modeBadge = mode === "Comics"
    ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
    : "bg-red-500/20 text-red-300 border-red-500/30";

  const modeDot = mode === "Comics"
    ? "bg-purple-400"
    : "bg-red-400";

  return (
    <div className={`rounded-xl border ${modeBorder} bg-gray-900/60 p-4 transition-all duration-200`}>
      <div className="flex items-start gap-3.5">
        {/* Image */}
        <div className={`w-20 h-20 rounded-lg bg-gradient-to-br ${modeGradient} flex-shrink-0 flex items-center justify-center overflow-hidden shadow-md`}>
          {!imgError ? (
            <img
              src={imageUrl}
              alt={character.name}
              className="w-full h-full object-cover rounded-lg"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <span className="text-2xl font-bold text-white/70">{character.name.charAt(0)}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-1.5 h-1.5 rounded-full ${modeDot}`} />
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${modeBadge}`}>
              {mode}
            </span>
          </div>
          <h3 className="text-base font-bold text-white truncate">{character.name}</h3>

          {/* Tags */}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {character.gender && <Tag text={character.gender} />}
            {character.type && <Tag text={character.type} />}
            {character.origin && character.origin !== "Unknown" && <Tag text={character.origin} />}
            {character.apparitionYear && <Tag text={String(character.apparitionYear)} />}
          </div>

          {/* Extra info */}
          {mode === "MCU" && character.actorName && (
            <p className="text-[11px] text-gray-400 mt-1.5 truncate">
              Actor: <span className="text-gray-300">{character.actorName}</span>
            </p>
          )}
          {character.firstApparitionComicTitle && (
            <p className="text-[11px] text-gray-400 mt-1.5 truncate">
              First Comic: <span className="text-gray-300">{character.firstApparitionComicTitle}</span>
            </p>
          )}

          {/* Species */}
          {character.species && character.species.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-0.5">
              {character.species.slice(0, 3).map((s) => (
                <span key={s} className="text-[10px] bg-emerald-500/15 text-emerald-300 px-1 py-px rounded">{s}</span>
              ))}
              {character.species.length > 3 && (
                <span className="text-[10px] text-gray-500">+{character.species.length - 3}</span>
              )}
            </div>
          )}

          {/* Powers */}
          {character.powerTypes && character.powerTypes.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-0.5">
              {character.powerTypes.slice(0, 4).map((p) => (
                <span key={p} className="text-[10px] bg-blue-500/15 text-blue-300 px-1 py-px rounded">{p}</span>
              ))}
              {character.powerTypes.length > 4 && (
                <span className="text-[10px] text-gray-500">+{character.powerTypes.length - 4}</span>
              )}
            </div>
          )}

          {/* Affiliations */}
          {character.affiliations && character.affiliations.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-0.5">
              {character.affiliations.slice(0, 3).map((a) => (
                <span key={a} className="text-[10px] bg-amber-500/15 text-amber-300 px-1 py-px rounded">{a}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Tag({ text }: { text: string }) {
  return <span className="text-[10px] bg-white/10 text-gray-300 px-1.5 py-px rounded">{text}</span>;
}
