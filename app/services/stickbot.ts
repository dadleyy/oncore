import Service from '@ember/service';
import config from 'oncore/config/environment';
import fetchApi from 'fetch';
import * as Seidr from 'seidr';
import * as promises from 'oncore/utility/promise-helpers';

export type TableIndex = {
  id: string;
};

class Stickbot extends Service {
  public async tables(): Promise<Seidr.Result<Error, Array<TableIndex>>> {
    const result = await promises.awaitResult(
      fetchApi(`${config.apiUrl}/tables`)
    );
    const tables = await promises.asyncMap(result, response => response.json());
    return tables;
  }
}

export default Stickbot;
