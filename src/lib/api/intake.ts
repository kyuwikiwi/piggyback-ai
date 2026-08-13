import "server-only";

import { apiPost } from "./client";
import type { IntakeBatchResult, IntakeResult } from "./types";

/**
 * Turn one free-text shipping request into an order draft.
 *
 * The generative layer's only job here is reading a document; it does not
 * decide anything. Whatever it cannot find in the text comes back null and is
 * listed in `missing_fields`, and every value it did fill carries the phrase it
 * came from in `field_evidence` so an operator can check it against the
 * original. A null is a correct answer.
 *
 * `asOf` is what makes "내일 오전" resolvable at all. Without a reference
 * instant the model would have to invent a date, so the caller passes the
 * scenario's own `as_of` rather than the wall clock -- the demo scenario is
 * dated, and resolving against today would put every order outside it.
 *
 * The endpoint is a POST but stores nothing, so calling it while rendering is
 * safe and repeatable.
 */
export async function structureOrder(text: string, asOf: string): Promise<IntakeResult> {
  return apiPost<IntakeResult>("/v1/intake/orders", { text, as_of: asOf });
}

/**
 * The same, for a document that asks for more than one order.
 *
 * A real request is one message about five trailers. Reading it as a single
 * order keeps whichever one the model saw first and drops the rest silently,
 * which is the wrong answer to a document that plainly asks for more.
 *
 * Without a model key there is no split to make, so one draft comes back and
 * `source` says `RULE_BASED` rather than implying work that did not happen.
 */
export async function structureOrders(
  text: string,
  asOf: string,
): Promise<IntakeBatchResult> {
  return apiPost<IntakeBatchResult>("/v1/intake/order-batches", { text, as_of: asOf });
}
