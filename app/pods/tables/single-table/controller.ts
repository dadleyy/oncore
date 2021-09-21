import Controller from '@ember/controller';
import * as State from 'oncore/pods/components/table-view/state';
import * as Seidr from 'seidr';

class TableController extends Controller {
  public declare model: Seidr.Result<Error, State.State>;
}

export default TableController;
