import { NextResponse } from "next/server";
import { solveToday } from "@/lib/solver";
import { loadAnswers } from "@/lib/store";

export async function POST() {
  try {
    const result = await solveToday();
    const today = new Date().toISOString().split("T")[0];
    const stored = loadAnswers();
    const todayAnswer = stored[today];

    return NextResponse.json({
      success: true,
      date: today,
      comics: todayAnswer?.comics || (result.comics ? { id: result.comics.id, name: result.comics.name, gender: result.comics.gender, type: result.comics.type, species: result.comics.species, origin: result.comics.origin } : null),
      mcu: todayAnswer?.mcu || (result.mcu ? { id: result.mcu.id, name: result.mcu.name, gender: result.mcu.gender, type: result.mcu.type, species: result.mcu.species, origin: result.mcu.origin, actorName: (result.mcu as any)?.actorName, appearanceTypes: (result.mcu as any)?.appearanceTypes, affiliations: (result.mcu as any)?.affiliations } : null),
      solvedAt: todayAnswer?.solvedAt || new Date().toISOString(),
    });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
