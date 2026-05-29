import { hasIn as _hasIn } from '../functional/hasIn.ts';

export function hasIn(searchKeyPath) {
  return _hasIn(this, searchKeyPath);
}
