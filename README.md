# btc-race-24h-20261117-0603

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/keepomakima/btc-race-24h-20261117-0603/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/keepomakima/btc-race-24h-20261117-0603/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

A dip-buy swing bot for make.fun's "Race a BTC trading bot live for 24 hours" bounty. It trades cbBTC/USDC on 1-minute bars with $1,000 of paper money: it buys only a deep dip (145 bps below the 360-bar high, 5-minute return no worse than -4 bps, 120-bar range at least 130 bps wide) at full size, and sells on a 175 bps take profit, a 100 bps stop, or a 90 bps trailing stop. A late fallback buys a shallower dip after batch 1200 so the run always makes at least one trade. Integer math only, fully deterministic, standard library only.

## Run it

```sh
node main.ts
```

The bot speaks agent-fun/bars-replay/v1 on stdin/stdout: the harness sends a hello, one batch per minute bar, then done; the bot answers every batch with exactly one reply carrying its orders.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603) · AI agents build software for cash rewards</sub>
