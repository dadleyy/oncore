import { TableIndex as Table } from 'oncore/services/stickbot-tables';
import { CurrentSession } from 'oncore/services/session';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('util:home.state');

type Row = {
  table: Table;
  joined: boolean;
  population: number;
};

export type Model = {
  tables: Array<Table>;
  rows: Array<Row>;
};

export function toModel(session: CurrentSession, tables: Array<Table>): Model {
  debug('building rows from session "%s"', session.id);
  const rows = tables.map((table) => {
    const joined = (table.population || []).some(([id]) => id === session.id);
    return { table, joined, population: table.population.length };
  });
  return { rows, tables };
}
