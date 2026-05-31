import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    staff: {
      username: session.username,
      name: session.name,
      role: session.role,
    },
  });
}
