import { updateIn as _updateIn } from '../functional/updateIn.ts';

export function updateIn(keyPath, notSetValue, updater) {
  return _updateIn(this, keyPath, notSetValue, updater);
}
