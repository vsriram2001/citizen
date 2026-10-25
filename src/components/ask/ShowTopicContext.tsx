"use client";

import { createContext, useContext } from "react";

/**
 * Lets an ask's info sheet hand a tapped topic back to whatever list owns
 * the filters (the search screen provides it). Where nothing provides it —
 * the design gallery, share pages — topic chips are plain labels.
 */
export const ShowTopicContext = createContext<((topic: string) => void) | null>(null);

export function useShowTopic() {
  return useContext(ShowTopicContext);
}
