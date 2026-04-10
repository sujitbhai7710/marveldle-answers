import { NextResponse } from "next/server";
import { loadAnswers, getAllAnswersSorted } from "@/lib/store";

export async function GET() {
  try {
    const allAnswers = getAllAnswersSorted();
    return NextResponse.json({ answers: allAnswers });
  } catch (error) {
    console.error("Answers error:", error);
    return NextResponse.json(
      { error: "Failed to load answers" },
      { status: 500 }
    );
  }
}
