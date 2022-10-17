import { AaveUser, mapLoans, minBonus, parseUnhealthyLoans } from './aave.js';
import {
  knownTokens,
  LiquidationParams,
  liquidationProfits,
  mostProfitableLoan,
} from './liquidations.js';
import { safeStringify } from './utils/bigintUtils.js';

export async function findProfitableLoan(
  loans: AaveUser[],
): Promise<LiquidationParams> {
  const mappedLoans = mapLoans(loans);
  const unhealthyLoans = await parseUnhealthyLoans(mappedLoans);
  const minBonusLoans = minBonus(unhealthyLoans);
  const knownTokenLoans = knownTokens(minBonusLoans);
  const profitableLoans = await liquidationProfits(knownTokenLoans);
  const loan = await mostProfitableLoan(profitableLoans);
  if (loan) {
    console.log(`most profitable loan: ' + ${safeStringify(loan)}`);
  }
  return loan;
}
