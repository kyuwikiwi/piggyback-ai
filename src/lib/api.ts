// src/lib/api.ts
import { orders as fixtureOrders } from "@/lib/fixtures";

export async function fetchOrders(apiUrl?: string) {
  if (!apiUrl) return fixtureOrders;
  
  try {
    const res = await fetch(`${apiUrl}/v1/scenarios`);
    if (!res.ok) throw new Error("API 실패");
    return await res.json();
  } catch {
    return fixtureOrders; // API 실패 시 fixture로 fallback
  }
}