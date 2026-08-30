import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { getResult } from "@/lib/workflow-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { nodeId, prompt } = body;

    if (!nodeId || !prompt) {
      return NextResponse.json(
        {
          error: "nodeId and prompt are required",
        },
        { status: 400 }
      );
    }

    const eventId = crypto.randomUUID();

    await inngest.send({
      name: "workflow/decision",
      data: {
        nodeId,
        prompt,
        eventId,
      },
    });

    return NextResponse.json({
      success: true,
      eventId,
    });
  } catch (error) {
    console.error("Workflow error:", error);

    return NextResponse.json(
      {
        error: "Failed to start workflow",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json(
      {
        error: "Missing eventId",
      },
      { status: 400 }
    );
  }

  const decision = getResult(eventId);

  if (!decision) {
    return NextResponse.json(
      {
        completed: false,
      },
      { status: 202 }
    );
  }

  return NextResponse.json({
    completed: true,
    decision,
  });
}