import { NextResponse } from "next/server";
import { inventory } from "@/lib/inventory";

export async function GET() {
  return NextResponse.json({
    totalItems: inventory.length,
    availableItems: inventory.filter((i) => i.quantity > 0).length,
    outOfStockItems: inventory.filter((i) => i.quantity === 0).length,
    products: inventory,
  });
}
