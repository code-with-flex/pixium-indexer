/**
 * Mirrors constants defined in the onchain contract
 * (`pixium-onchain/contracts/pixium/src/types.rs`: `CANVAS_WIDTH`,
 * `CANVAS_HEIGHT`, `PALETTE_SIZE`). There's no shared source of truth
 * across repos (Rust vs TypeScript), so these must be kept in sync by
 * hand if the contract's canvas dimensions or palette size ever change.
 */
export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 1000;
export const PALETTE_SIZE = 16;

/** Bits needed to represent a color index (log2(PALETTE_SIZE)). */
export const COLOR_BITS = Math.ceil(Math.log2(PALETTE_SIZE));
