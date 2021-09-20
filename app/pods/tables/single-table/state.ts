import { Seat, Table } from 'oncore/services/stickbot';
import { CurrentSession } from 'oncore/services/session';
import * as helpers from 'oncore/utility/maybe-helpers';
import * as Seidr from 'seidr';

export type Model = {
  table: Table;
  playerPosition: Seidr.Maybe<Seat>;
};

export function fromTables(
  id: string,
  tables: Array<Table>,
  session: CurrentSession
): Seidr.Result<Error, Model> {
  const maybeTable = Seidr.Maybe.fromNullable(tables.find((t) => t.id === id));
  const model = maybeTable.map((table) => {
    const playerPosition = Seidr.Maybe.fromNullable(table.seats[session.id]);
    return { table, playerPosition };
  });
  return helpers.orErr(new Error('not-found'), model);
}
