import SumType from 'sums-up';

export type BetAttemptVariants = {
  Pass: [number];
  PassOdds: [number];
  Field: [number];
  Come: [number];
  ComeOdds: [number, number];
  Hardway: [number, number];
  Place: [number, number];
};

class BetAttempt extends SumType<BetAttemptVariants> {}

export function Field(amount: number): BetAttempt {
  return new BetAttempt('Field', amount);
}

export function Pass(amount: number): BetAttempt {
  return new BetAttempt('Pass', amount);
}

export function PassOdds(amount: number): BetAttempt {
  return new BetAttempt('PassOdds', amount);
}

export function Come(amount: number): BetAttempt {
  return new BetAttempt('Come', amount);
}

export function Hardway(target: number, amount: number): BetAttempt {
  return new BetAttempt('Hardway', target, amount);
}

export function Place(target: number, amount: number): BetAttempt {
  return new BetAttempt('Place', target, amount);
}

export function ComeOdds(target: number, amount: number): BetAttempt {
  return new BetAttempt('ComeOdds', target, amount);
}

export default BetAttempt;
