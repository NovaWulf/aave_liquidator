import { AaveUser, mapLoans, minBonus, parseUnhealthyLoans } from './aave.js';
import {
  knownTokens,
  LiquidationParams,
  liquidationProfits,
  mostProfitableLoan,
} from './liquidations.js';

export async function findProfitableLoan(
  loans: AaveUser[],
): Promise<LiquidationParams> {
  const mappedLoans = mapLoans(loans);
  const unhealthyLoans = await parseUnhealthyLoans(mappedLoans);
  const minBonusLoans = minBonus(unhealthyLoans);
  const knownTokenLoans = knownTokens(minBonusLoans);
  const profitableLoans = await liquidationProfits(knownTokenLoans);
  const loan = mostProfitableLoan(profitableLoans);
  console.log('most profitable loan: ' + loan);
  return loan;
}
