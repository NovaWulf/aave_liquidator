import {
  AaveUser,
  applyBlackList,
  mapLoans,
  minBonus,
  parseUnhealthyLoans,
} from './aave.js';
import {
  excludeRecentlyAttempted,
  knownTokens,
  LiquidationParams,
  liquidationProfits,
  mostProfitableLoan,
  sortLoansbyProfit,
} from './liquidations.js';
import { safeStringify } from './utils/bigintUtils.js';

export async function findProfitableLoan(
  loans: AaveUser[],
): Promise<LiquidationParams> {
  const mappedLoans = mapLoans(loans);
  const unhealthyLoans = await parseUnhealthyLoans(mappedLoans);
  const nonBlacklisted = applyBlackList(unhealthyLoans);
  const minBonusLoans = minBonus(nonBlacklisted);
  const knownTokenLoans = knownTokens(minBonusLoans);
  const profitableLoans = await liquidationProfits(knownTokenLoans);
  const sortedLoans = sortLoansbyProfit(profitableLoans);
  const newLoans = excludeRecentlyAttempted(sortedLoans);
  const loan = await mostProfitableLoan(newLoans);
  if (loan) {
    console.log(`most profitable loan: ' + ${safeStringify(loan)}`);
  }
  return loan;
}
