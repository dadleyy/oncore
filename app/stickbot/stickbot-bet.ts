import SumType from 'sums-up';
import * as Seidr from 'seidr';
import { yes, no } from 'oncore/utility/fp-helpers';

export type PlacedBetVariants = {
  Pass: [number, Seidr.Maybe<number>];
  PassOdds: [number, number];
  Come: [number, Seidr.Maybe<number>];
  ComeOdds: [number, number];
  Field: [number];
  Place: [number, number];
  Hardway: [number, number];
};

export class PlacedBed extends SumType<PlacedBetVariants> {
}

export function PlacedHardwayBet(amount: number, target: number): PlacedBed {
  return new PlacedBed('Hardway', amount, target);
}

export function PlacedPlaceBet(amount: number, target: number): PlacedBed {
  return new PlacedBed('Place', amount, target);
}

export function PlacedPassBet(amount: number, target: Seidr.Maybe<number>): PlacedBed {
  return new PlacedBed('Pass', amount, target);
}

export function PlacedComeBet(amount: number, target: Seidr.Maybe<number>): PlacedBed {
  return new PlacedBed('Come', amount, target);
}

export function PlacedComeOddsBet(amount: number, target: number): PlacedBed {
  return new PlacedBed('ComeOdds', amount, target);
}

export function PlacedPassOddsBet(amount: number, target: number): PlacedBed {
  return new PlacedBed('PassOdds', amount, target);
}

export function PlacedFieldBet(amount: number): PlacedBed {
  return new PlacedBed('Field', amount);
}

export function getComeTarget(bet: PlacedBed): Seidr.Maybe<number> {
  return bet.caseOf({
    Come: (_, target) => target,
    _: Seidr.Nothing,
  });
}


export function isPass(bet: PlacedBed): boolean {
  return bet.caseOf({
    Pass: yes,
    _: no,
  });
}

export type BetResult = {
  winnings: number,
  bet: PlacedBed;
};
