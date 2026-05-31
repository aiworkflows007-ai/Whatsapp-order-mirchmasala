import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const menuItemCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  price: z.coerce.number().positive().max(100000),
  description: z.string().trim().max(1000).optional().nullable(),
  categoryId: z.string().uuid(),
  isVegetarian: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  imageUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
});

const menuItemUpdateSchema = menuItemCreateSchema.partial().extend({
  id: z.string().uuid(),
});

/**
 * GET /api/admin/menu — Fetch all categories and ALL menu items (available & unavailable)
 */
export async function GET(req: Request) {
  try {
    const auth = requireAdmin(req, ["OWNER"]);
    if (auth.response) return auth.response;

    const categories = await prisma.category.findMany({
      include: {
        menuItems: {
          orderBy: { position: "asc" },
        },
      },
      orderBy: { position: "asc" },
    });

    return NextResponse.json({ success: true, categories }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Admin fetch menu failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/menu — Add a brand new dish
 */
export async function POST(req: Request) {
  try {
    const auth = requireAdmin(req, ["OWNER"]);
    if (auth.response) return auth.response;

    const validation = menuItemCreateSchema.safeParse(await req.json());
    if (!validation.success) {
      return NextResponse.json({ error: "Validation failed", details: validation.error.flatten() }, { status: 400 });
    }
    const { name, price, description, categoryId, isVegetarian, isAvailable, imageUrl } = validation.data;

    // Secure database insertion
    const menuItem = await prisma.menuItem.create({
      data: {
        name,
        price: new Prisma.Decimal(Number(price)),
        description: description || null,
        categoryId,
        isVegetarian: isVegetarian !== undefined ? Boolean(isVegetarian) : true,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
        imageUrl: imageUrl || null,
        position: 0,
      },
    });

    console.log(`🌿 [Admin Menu API] Added new dish: ${name} (₹${price})`);
    return NextResponse.json({ success: true, menuItem }, { status: 201 });
  } catch (error: any) {
    console.error("❌ Admin add menu item failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/menu — Edit properties or stock status of a dish
 */
export async function PATCH(req: Request) {
  try {
    const auth = requireAdmin(req, ["OWNER"]);
    if (auth.response) return auth.response;

    const validation = menuItemUpdateSchema.safeParse(await req.json());
    if (!validation.success) {
      return NextResponse.json({ error: "Validation failed", details: validation.error.flatten() }, { status: 400 });
    }
    const { id, name, price, description, categoryId, isVegetarian, isAvailable, imageUrl } = validation.data;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = new Prisma.Decimal(Number(price));
    if (description !== undefined) updateData.description = description || null;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (isVegetarian !== undefined) updateData.isVegetarian = Boolean(isVegetarian);
    if (isAvailable !== undefined) updateData.isAvailable = Boolean(isAvailable);
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;

    const menuItem = await prisma.menuItem.update({
      where: { id },
      data: updateData,
    });

    console.log(`🌿 [Admin Menu API] Updated dish details for: ${menuItem.name}`);
    return NextResponse.json({ success: true, menuItem }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Admin update menu item failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/menu — Delete a dish completely
 */
export async function DELETE(req: Request) {
  try {
    const auth = requireAdmin(req, ["OWNER"]);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing MenuItem ID parameter." }, { status: 400 });
    }

    await prisma.menuItem.delete({
      where: { id },
    });

    console.log(`🌿 [Admin Menu API] Deleted dish: ${id}`);
    return NextResponse.json({ success: true, message: "Item deleted successfully." }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Admin delete menu item failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
