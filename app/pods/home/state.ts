import { Table } from 'oncore/services/stickbot';
import { CurrentSession } from 'oncore/services/session';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('util:home.state');

type Row = {
  table: Table;
  joined: boolean;
};

export type Model = {
  tables: Array<Table>;
  rows: Array<Row>;
};

export function toModel(session: CurrentSession, tables: Array<Table>): Model {
  debug('building rows from session "%s"', session.id);
  const rows = tables.map((table) => {
    const joined = table.seats && table.seats[session.id] !== undefined;
    return { table, joined };
  });
  return { rows, tables };
}
