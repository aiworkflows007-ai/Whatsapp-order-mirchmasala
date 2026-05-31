import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { createAdminSessionToken, setAdminSessionCookie } from "@/lib/auth";

const loginSchema = z.object({
  username: z.string().trim().min(2),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const validation = loginSchema.safeParse(await req.json());
    if (!validation.success) {
      return NextResponse.json({ error: "Please enter username and password." }, { status: 400 });
    }

    const { username, password } = validation.data;
    const staff = await prisma.staffUser.findUnique({ where: { username } });
    if (!staff) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    const isBcryptHash = staff.passwordHash.startsWith("$2a$") || staff.passwordHash.startsWith("$2b$");
    const passwordOk = isBcryptHash
      ? await bcrypt.compare(password, staff.passwordHash)
      : password === staff.passwordHash;

    if (!passwordOk) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    if (!isBcryptHash) {
      await prisma.staffUser.update({
        where: { id: staff.id },
        data: { passwordHash: await bcrypt.hash(password, 12) },
      });
    }

    const response = NextResponse.json({
      success: true,
      staff: {
        username: staff.username,
        name: staff.name,
        role: staff.role,
      },
    });
    setAdminSessionCookie(response, createAdminSessionToken(staff));
    return response;
  } catch (error) {
    console.error("Admin login failed:", error);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
