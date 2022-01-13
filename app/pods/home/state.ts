import * as Seidr from 'seidr';
import { TableIndex as Table } from 'oncore/services/stickbot-tables';
import { CurrentSession } from 'oncore/services/session';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('util:home.state');

export type RowOperation = 'LEAVING' | 'JOINING';

export type Row = {
  table: Table;
  joined: boolean;
  population: number;
  busy?: RowOperation;
};

export type Model = {
  tables: Array<Table>;
  rows: Array<Row>;
};

export type ModelResult = Seidr.Result<Error, Model>;

export function toModel(session: CurrentSession, tables: Array<Table>): Model {
  debug('building rows from session "%s"', session.id);
  const rows = tables.map((table) => {
    const joined = (table.population || []).some(([id]) => id === session.id);
    return { table, joined, population: table.population.length };
  });
  return { rows, tables };
}
