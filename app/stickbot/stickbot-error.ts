import SumType from 'sums-up';
import { always } from 'oncore/utility/fp-helpers';
import { underscore } from '@ember/string';

export type StickbotErrorVariants = {
  MissingResource: [];
  UserError: [string];
  Unknown: [Error];
};

class StickbotError extends SumType<StickbotErrorVariants> {}

export function UserError(message: string): StickbotError {
  return new StickbotError('UserError', message);
}

export function MissingResource(): StickbotError {
  return new StickbotError('MissingResource');
}

export function Unknown(original: Error): StickbotError {
  return new StickbotError('Unknown', original);
}

export function translate(error: StickbotError): string {
  return error.caseOf({
    MissingResource: always('stickbot_errors.missing_resource'),
    UserError: (inner) => `stickbot_errors.${underscore(inner)}`,
    Unknown: always('stickbot_errors.unknown_error'),
  });
}

export default StickbotError;
