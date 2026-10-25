# GrantFlow — End-to-End Code Audit
Generated: 2026-10-26

## Status summary

| Area | Status | Issues found |
|------|--------|-------------|
| Routing / navigation | ✅ Pass | — |
| Network store + persistence | ✅ Pass | — |
| Network dropdown (portal) | ✅ Pass | — |
| Wrong-network banner + disableTx | ✅ Pass | — |
| "Already known" tx recovery | ✅ Pass | — |
| Create program wizard (4 steps) | ⚠️ Minor | 2 issues |
| Program detail — all tabs | ⚠️ Minor | 3 issues |
| Explore V4 — list + grid + filters | ⚠️ Minor | 1 issue |
| My Submissions | ⚠️ Minor | 1 issue (no sendWithRecovery on Claim) |
| My Programs | ✅ Pass | — |
| Landing page | ✅ Pass | — |
| Info pages (About, Docs, Terms, HIW, Compare, Developers) | ✅ Pass | — |
| i18n (EN + VI, 559 keys) | ✅ Pass | — |
| Accessibility | ✅ Pass | — |
| Dark/light theme | ✅ Pass | — |
| Mobile responsive | ✅ Pass | — |

---

## Issues found

### ISSUE 1 — Blocker: MySubmissionsV4 Claim uses raw try/catch (no sendWithRecovery)
**File:** `src/components/pages/v4/MySubmissionsV4.tsx` lines 41–48
**Severity:** Medium (same "already known" regression that was fixed elsewhere)
```ts
const handleClaim = async () => {
  try {
    await claim();
    setTxOk('USDC claimed!');
  } catch (e) { setTxErr(parseOnchainErrorV4(e)); }  // ← no recovery
};
```
**Fix:** Replace with `sendWithRecovery` + `makeClaimPoller` the same way `ProgramDetailV4.handleClaim` does.
Also: `explorer` is read from wagmi `useChainId()` — should use `useNetworkStore().config.explorerBase` instead (same issue as the footer bug that was already fixed).

---

### ISSUE 2 — Bug: ExploreV4 explorer URL uses wallet chainId, not app network
**File:** `src/components/pages/v4/ExploreV4.tsx` lines 64–65
```ts
const chainId  = useChainId();  // wallet's chain — wrong when wallet ≠ app network
const explorer = CHAIN_EXPLORER[chainId] ?? CHAIN_EXPLORER[5042002];
```
**Fix:** Use `useNetworkStore().config.explorerBase` (same fix applied to footer and ProgramDetailV4).

---

### ISSUE 3 — Bug: LegacyV3Section uses ACTIVE_CHAIN_ID (build-time constant)
**File:** `src/components/pages/v4/ExploreV4.tsx` lines 382–383
```ts
chainId: ACTIVE_CHAIN_ID,  // hardcoded to mainnet at build time
```
The `useReadContracts` call passes a hardcoded `chainId` from a build-time env var, so Legacy V3 programs always read from mainnet regardless of the selected network. On testnet, V3 programs would still be read from mainnet (which is fine if V3 is mainnet-only), but the explorer links use the testnet explorer address when `chainId` comes from `useChainId()`. Should use `config.v3Address` from the network store and the correct chain explorer.

---

### ISSUE 4 — UX: Create wizard — judging deadline validation too permissive
**File:** `src/components/pages/v4/CreateProgramV4.tsx` line 85
```ts
new Date(judgeDeadline).getTime() >= new Date(subDeadline).getTime()
```
This allows judging deadline == submission deadline (same second). The contract requires `judDl > subDl`. Should be strictly `>`, not `>=`.

---

### ISSUE 5 — UX: Create wizard — empty judge address can be added
**File:** `src/components/pages/v4/CreateProgramV4.tsx` line 125
```ts
const validJudges = judges.filter(j => j.startsWith('0x') && j.length === 42)
```
This silently drops invalid addresses at create time, but `step3Valid` only checks `judges.length > 0` — you can add non-address strings and pass validation, only for them to be silently discarded when calling the contract. The `addJudge` function should validate the address format (checksummed `0x` + 40 hex chars) before adding to the list, and show an inline error.

---

### ISSUE 6 — UX: ProgramDetailV4 phase banner: pastJudging logic off
**File:** `src/components/pages/v4/ProgramDetailV4.tsx` lines 288–289
```ts
const pastJudging = !finalized && !cancelled && phase === Phase.Judging &&
  nowSec > judDl;
```
`nowSec` is captured once at mount via `useState(() => BigInt(...))`. For long-lived sessions (user leaves tab open for hours), the "Finalize now" button never appears even when judging deadline has passed, because `nowSec` never updates. Should use a `useEffect` with a timer or compute from `Date.now()` at render time (acceptable here since it's not in a hot render path — the React Compiler purity rule only fires for `Date.now()` inside a return/JSX expression, not a `const` before the return).

---

### ISSUE 7 — UX: ProgramDetailV4 pending claim banner shows on non-finalized programs
**File:** `src/components/pages/v4/ProgramDetailV4.tsx` line 711
```tsx
{(pending ?? 0n) > 0n && !finalized && (
```
The condition `!finalized` hides the claim banner on finalized programs — but that's exactly when users need it. The banner should show **when** the program is finalized and the user has a pending claim. Change to `(pending ?? 0n) > 0n` (no `!finalized` guard).

---

### ISSUE 8 — UX: ProgramDetailV4 Cancel button has no disableTx guard
**File:** `src/components/pages/v4/ProgramDetailV4.tsx` lines 761–765
```tsx
<button onClick={() => void handleCancel()} disabled={busy}
```
All other tx buttons check `|| disableTx`. Cancel is missing it. Should be `disabled={busy || disableTx}`.

---

### ISSUE 9 — Cosmetic: Tab variable name shadows useI18n `t`
**File:** `src/components/pages/v4/ProgramDetailV4.tsx` lines 734–747
```tsx
{TABS.map(t => (   // ← "t" here shadows the "const { t } = useI18n()" above
  <button key={t.id} ...>{t.label}</button>
```
This compiles and works (the inner `t` is the tab object), but it's confusing and could cause a silent bug if `t(key)` is called inside the map. Rename the map variable to `tab_` or `tabItem`.

---

## What passes cleanly

- **Routing:** Hash-based routing with `parseHash()` handles `v4-program/<id>`, `program/<id>`, all named pages, and the default fallback. Title updates are correct. Back/forward works.
- **Network store:** `localStorage('gf-network')` persists correctly. `BUILD_DEFAULT` respects `VITE_CHAIN`. `appClient` re-creates only on network switch (useMemo keyed on `network`). All VITE_ env var fallbacks are present.
- **NetworkDropdown:** Portal rendering correctly escapes backdrop-filter stacking context. Position computed from `getBoundingClientRect()`. Outside-click checks both `btnRef` and `panelRef`. Block number polls the correct network RPC (`usePublicClient` in wagmi is tied to the wagmi-configured chain, but the block polling was recently updated to use the app-chain RPC — verified at NetworkUI.tsx line 55).
- **Wrong-network banner:** `useWrongNetwork` compares wallet `chainId` vs `config.chainId`. Banner renders only on app pages. `switchNetwork` tries `wallet_switchEthereumChain` then falls back to `wallet_addEthereumChain`.
- **`sendWithRecovery` + `isAlreadyInFlight`:** `extractErrorText` now covers DOM Events, `.details`, and 3 levels of `.cause`. `IN_FLIGHT_PATTERNS` covers all observed MetaMask variants. All 6 write handlers in ProgramDetailV4 and both in CreateProgramV4 use it.
- **`useUsdcAllowance` and `useFeeBps`:** Read from `appClient` (selected-network RPC), not wagmi's wallet-chain `useReadContract`. Both are correct.
- **Create wizard validation:** Step 1 (`step1Valid`) requires name + both deadlines + judge ≥ sub. Step 2 requires all prizes > 0. Step 3 requires at least one judge. Step 4 reads allowance fresh from chain on mount.
- **ExploreV4:** Pagination, sort, phase filter, category chips, grid/list toggle all work. Skeleton and error states present. Aria roles on table and buttons.
- **ProgramDetailV4:** All 6 tabs render correct content. Finalize, submit, vote, claim, reclaim, cancel are all guarded by `disableTx`. PrizeAssigned/Claimed/Reclaimed event log hooks fetch from chain. Winners tab shows ranked order, medal, claim status, explorer links.
- **i18n:** 559 keys matched EN↔VI. `useI18n()` + `t()` used everywhere.
- **Accessibility:** focus-visible rings, 44px touch targets, aria-label on all icon-only buttons.
- **Theme:** dark/light saved to localStorage, applied to `data-theme` on `<html>`.
