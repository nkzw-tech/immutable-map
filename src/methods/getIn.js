import { getIn as _getIn } from '../functional/getIn.ts';

export function getIn(searchKeyPath, notSetValue) {
  return _getIn(this, searchKeyPath, notSetValue);
}
