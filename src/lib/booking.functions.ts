import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY!;

function createPublicClient() {
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

const OPENING_HOUR = 9;
const CLOSING_HOUR = 18;
const CLOSING_MINUTE = 30;
const SLOT_MINUTES = 30;

function getSlotsForDay(): string[] {
  const slots: string[] = [];
  let h = OPENING_HOUR;
  let m = 0;
  while (h < CLOSING_HOUR || (h === CLOSING_HOUR && m <= CLOSING_MINUTE)) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += SLOT_MINUTES;
    if (m >= 60) {
      m = 0;
      h += 1;
    }
  }
  return slots;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addMinutes(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes);
}

export const getServices = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("services").select("*").order("price_euros");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getAvailableSlots = createServerFn({ method: "POST" })
  .inputValidator((data: { date: string; serviceId: string }) => {
    return z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      serviceId: z.string().uuid(),
    }).parse(data);
  })
  .handler(async ({ data }) => {
    const supabase = createPublicClient();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get service duration
    const { data: serviceData, error: serviceError } = await supabase
      .from("services")
      .select("duration_minutes")
      .eq("id", data.serviceId)
      .single();

    if (serviceError || !serviceData) throw new Error("Serviço não encontrado");

    const duration = serviceData.duration_minutes;
    const slotsNeeded = Math.ceil(duration / SLOT_MINUTES);

    // Get existing bookings for that date
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from("bookings")
      .select("start_time, end_time")
      .eq("booking_date", data.date)
      .neq("status", "cancelled");

    if (bookingsError) throw new Error(bookingsError.message);

    const allSlots = getSlotsForDay();
    const occupiedRanges = (bookings ?? []).map((b) => ({
      start: timeToMinutes(b.start_time),
      end: timeToMinutes(b.end_time),
    }));

    const available: string[] = [];

    for (let i = 0; i < allSlots.length; i++) {
      const slotTime = allSlots[i];
      const slotStart = timeToMinutes(slotTime);
      const slotEnd = slotStart + duration;

      // Check if it fits within opening hours
      if (slotEnd > timeToMinutes(`${CLOSING_HOUR}:${CLOSING_MINUTE}`)) continue;

      // Check if all required slots are free
      let isAvailable = true;
      for (const range of occupiedRanges) {
        // Overlap check: [slotStart, slotEnd) overlaps with [range.start, range.end)
        if (slotStart < range.end && slotEnd > range.start) {
          isAvailable = false;
          break;
        }
      }

      if (isAvailable) {
        available.push(slotTime);
      }
    }

    return available;
  });

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((data: {
    clientName: string;
    clientPhone: string;
    serviceId: string;
    bookingDate: string;
    startTime: string;
    notes?: string;
  }) => {
    return z.object({
      clientName: z.string().min(2).max(100),
      clientPhone: z.string().min(5).max(20),
      serviceId: z.string().uuid(),
      bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      notes: z.string().max(500).optional(),
    }).parse(data);
  })
  .handler(async ({ data }) => {
    const supabase = createPublicClient();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get service duration
    const { data: serviceData, error: serviceError } = await supabase
      .from("services")
      .select("duration_minutes")
      .eq("id", data.serviceId)
      .single();

    if (serviceError || !serviceData) throw new Error("Serviço não encontrado");

    const duration = serviceData.duration_minutes;
    const endTime = addMinutes(data.startTime, duration);

    const slotStart = timeToMinutes(data.startTime);
    const slotEnd = slotStart + duration;

    // Fetch existing bookings to check overlap
    const { data: existingBookings, error: existingError } = await supabaseAdmin
      .from("bookings")
      .select("start_time, end_time")
      .eq("booking_date", data.bookingDate)
      .neq("status", "cancelled");

    if (existingError) throw new Error(existingError.message);

    for (const b of (existingBookings ?? [])) {
      const rangeStart = timeToMinutes(b.start_time);
      const rangeEnd = timeToMinutes(b.end_time);
      if (slotStart < rangeEnd && slotEnd > rangeStart) {
        throw new Error("Este horário já foi reservado. Por favor escolha outro.");
      }
    }

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        client_name: data.clientName,
        client_phone: data.clientPhone,
        service_id: data.serviceId,
        booking_date: data.bookingDate,
        start_time: data.startTime,
        end_time: endTime,
        notes: data.notes ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return booking;
  });

export const getBooking = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    return z.object({ id: z.string().uuid() }).parse(data);
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select("*, services(name, price_euros, duration_minutes)")
      .eq("id", data.id)
      .single();

    if (error) throw new Error(error.message);
    return booking;
  });
