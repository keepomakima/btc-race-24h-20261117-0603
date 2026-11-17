// Dip-buy swing bot for make.fun btc-race-24h-20261117-0603.
//
// Strategy (long only, one position, full size, few trades):
// - The bot watches the 1-minute bars of CBBTC (cbBTC/USDC) that the hello
//   message and every batch carry. It buys only a deep dip: the latest close
//   at least 145 bps below the highest close of the previous 360 bars, while
//   the 5-minute return is no worse than -4 bps (the fall is stalling, not
//   accelerating) and the 120-bar range is at least 130 bps wide (the market
//   is moving, not flat chop). One buy spends all the cash it holds.
// - It sells the whole position when the close is 175 bps above its average
//   entry price, or 100 bps below it (hard stop), or 90 bps below the highest
//   close since entry while still above the entry price (trailing stop), or
//   after 600 bars held. Everything still held when the window ends is sold
//   by the replay itself at the last close.
// - Late fallback: if it still holds nothing by batch 1200, it buys a
//   shallower dip (60 bps below the 360-bar high, same 5-minute gate) so the
//   run always makes at least one trade; the same exits apply.
// - A momentum-breakout entry (buy a new 90-bar high on a 10-minute burst)
//   was tested on the same dev window and lost money, so it is deliberately
//   not here: this bot only buys dips.
// - All comparisons are integer math on the bar closes (BigInt, floored
//   division where a value can go negative), so the same bars always give
//   the same orders. No clock, no environment, no randomness, no files,
//   no network: the orders depend only on the hello and the bars.

import { runBars, type Bar, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const MAX_SLIPPAGE_BPS = 100;

// Entry: dip below the 360-bar high, 5-minute momentum gate, 120-bar span.
const DIP_BPS = 145n;
const GATE_BPS = -4n;
const SPAN_BARS = 120;
const MIN_SPAN_BPS = 130n;
const REF_BARS = 360;
// Exits: take profit / hard stop / trailing stop from the peak, max hold.
const TP_BPS = 175n;
const STOP_BPS = 100n;
const TRAIL_BPS = 90n;
const MAX_HOLD_BARS = 600;
// Late fallback so the run always trades at least once.
const FALLBACK_BAR = 1200;
const FALLBACK_DIP_BPS = 60n;

const BPS = 10000n;

/** Floored division for BigInt (BigInt / truncates toward zero; Python // floors). */
function divFloor(a: bigint, b: bigint): bigint {
  if (a >= 0n) return a / b;
  return -((-a + b - 1n) / b);
}

const closes: bigint[] = [];
let entrySeq = -1;
let peak = 0n;

function buy(state: BarsState): BuyInput {
  entrySeq = state.seq;
  peak = closes[closes.length - 1];
  return { side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS };
}

function sell(qty: bigint): SellInput {
  return { side: 'sell', symbol: SYMBOL, qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
}

await runBars({
  onBatch(state: BarsState, batch: { bars: Bar[]; seq: number }) {
    // Only the bar this batch carries extends the history; a batch with
    // no CBBTC bar (a gap) adds nothing.
    for (const bar of batch.bars) {
      if (bar.symbol === SYMBOL) closes.push(BigInt(bar.c));
    }
    if (state.warmingUp) return [];
    if (closes.length < REF_BARS + 1) return [];
    const close = closes[closes.length - 1];
    const held = state.positions.get(SYMBOL);
    // The 360-bar high before this bar, and this bar's dip below it.
    let high = 0n;
    for (let i = closes.length - REF_BARS - 1; i < closes.length - 1; i++) {
      if (closes[i] > high) high = closes[i];
    }
    const dipBps = divFloor((high - close) * BPS, high);
    // The 5-minute return, for the momentum gate.
    const ret5Bps = divFloor((close - closes[closes.length - 6]) * BPS, closes[closes.length - 6]);
    if (held !== undefined) {
      const avg = (held.cost * 10n ** 7n) / held.qty;
      if (close * BPS >= avg * (BPS + TP_BPS)) return [sell(held.qty)];
      if (close * BPS <= avg * (BPS - STOP_BPS)) return [sell(held.qty)];
      if (close * BPS <= peak * (BPS - TRAIL_BPS) && close > avg) return [sell(held.qty)];
      if (state.seq - entrySeq >= MAX_HOLD_BARS) return [sell(held.qty)];
      if (close > peak) peak = close;
      return [];
    }
    // Flat: no dip, no trade.
    if (close >= high) return [];
    const fallback = state.seq >= FALLBACK_BAR;
    if (fallback) {
      if (dipBps >= FALLBACK_DIP_BPS && ret5Bps >= GATE_BPS) return [buy(state)];
      return [];
    }
    // The 120-bar range must be wide enough to trade at all.
    let spanHigh = 0n;
    let spanLow = closes[closes.length - 1];
    for (let i = Math.max(0, closes.length - SPAN_BARS); i < closes.length; i++) {
      if (closes[i] > spanHigh) spanHigh = closes[i];
      if (closes[i] < spanLow) spanLow = closes[i];
    }
    const spanBps = divFloor((spanHigh - spanLow) * BPS, spanLow);
    if (dipBps >= DIP_BPS && ret5Bps >= GATE_BPS && spanBps >= MIN_SPAN_BPS) return [buy(state)];
    return [];
  },
});
