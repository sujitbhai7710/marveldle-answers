import { NextResponse } from "next/server";
import { solveToday, solveForDate } from "@/lib/solver";
import { getLastPickId, getSession } from "@/lib/marveldle";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { dateKey, dateId } = body as { dateKey?: string; dateId?: string };

    if (dateKey && dateId) {
      const result = await solveForDate(dateId, dateKey);
      return NextResponse.json({
        success: true,
        date: dateKey,
        comics: result.comics ? { id: result.comics.id, name: result.comics.name } : null,
        mcu: result.mcu ? { id: result.mcu.id, name: result.mcu.name } : null,
      });
    }

    const result = await solveToday();
    return NextResponse.json({
      success: true,
      comics: result.comics ? { id: result.comics.id, name: result.comics.name } : null,
      mcu: result.mcu ? { id: result.mcu.id, name: result.mcu.name } : null,
    });
  } catch (error) {
    console.error("Solve error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getSession();
    const sessionId = session.id;
    const pickId = await getLastPickId(sessionId);
    return NextResponse.json({ dateId: pickId });
  } catch (error) {
    return NextResponse.json({ error: "Failed to get pick ID" }, { status: 500 });
  }
}
