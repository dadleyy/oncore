import SumType from 'sums-up';

export type BetAttemptVariants = {
  Pass: [number];
  PassOdds: [number];
  Come: [number];
};

class BetAttempt extends SumType<BetAttemptVariants> {}

export function Pass(amount: number): BetAttempt {
  return new BetAttempt('Pass', amount);
}

export function PassOdds(amount: number): BetAttempt {
  return new BetAttempt('PassOdds', amount);
}

export function Come(amount: number): BetAttempt {
  return new BetAttempt('Come', amount);
}

export default BetAttempt;
