import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/menu — Fetch all active food categories and their menu items.
 * Ordered by category position and item position.
 */
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        menuItems: {
          where: { isAvailable: true },
          orderBy: { position: "asc" },
        },
      },
      orderBy: { position: "asc" },
    });

    return NextResponse.json({ success: true, categories }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Fetch menu API failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu items." },
      { status: 500 }
    );
  }
}
