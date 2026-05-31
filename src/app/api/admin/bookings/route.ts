import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { WhatsAppClient } from "@/lib/whatsapp/client";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/bookings — Fetch all table bookings for the admin workspace
 */
export async function GET(req: Request) {
  try {
    const auth = requireAdmin(req);
    if (auth.response) return auth.response;

    const bookings = await prisma.tableBooking.findMany({
      include: {
        customer: true,
      },
      orderBy: {
        bookingDate: "asc", // Show upcoming bookings first
      },
    });

    return NextResponse.json({ success: true, bookings }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Admin fetch bookings API failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/bookings — Approve or Reject table reservations
 */
export async function PATCH(req: Request) {
  try {
    const auth = requireAdmin(req);
    if (auth.response) return auth.response;

    const body = await req.json();
    const { bookingId, action, tableNo, note } = body;

    if (!bookingId || !action) {
      return NextResponse.json({ error: "Missing required fields (Booking ID, Action)." }, { status: 400 });
    }

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ error: "Invalid action. Must be APPROVE or REJECT." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.tableBooking.findUnique({
        where: { id: bookingId },
        include: { customer: true },
      });

      if (!booking) {
        throw new Error(`Booking with ID ${bookingId} not found.`);
      }

      const isApproved = action === "APPROVE";

      const updated = await tx.tableBooking.update({
        where: { id: bookingId },
        data: {
          status: isApproved ? "APPROVED" : "REJECTED",
          tableNo: isApproved ? tableNo || null : null,
          notes: note || booking.notes,
        },
        include: { customer: true },
      });

      return updated;
    });

    console.log(`📅 [Admin Bookings API] Table Reservation Ref: #${result.bookingNo} processed as ${action}`);

    // Dynamic date parsing for display
    const formattedDate = new Date(result.bookingDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    // Dispatch real-time WhatsApp alert to customer
    if (action === "APPROVE") {
      const confirmMsg = `🟢 *Booking Confirmed!* (Ref: #${result.bookingNo})\n\nNamaste! Restaurant manager ne aapki table reservation accept kar li hai. \n\n*Details*:\nGuests: *${result.guestCount} Guests*\nDate: *${formattedDate}*\nTime Slot: *${result.bookingTime}*\nAssigned: *Table #${tableNo || "1"}* 🍽️\n\nSee you at the restaurant! ✨`;
      await WhatsAppClient.sendTextMessage(result.customer.whatsappNumber, confirmMsg);
    } else {
      const rejectMsg = `🔴 *Booking Declined* (Ref: #${result.bookingNo})\n\nNamaste. Restaurant manager ne aapki reservation request decline kar di hai.\nReason: *"${note || "Restaurant fully occupied"}."*\n\nKripya start over karne ke liye *MENU* type karein.`;
      await WhatsAppClient.sendTextMessage(result.customer.whatsappNumber, rejectMsg);
    }

    return NextResponse.json({ success: true, booking: result }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Admin table reservation update failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
