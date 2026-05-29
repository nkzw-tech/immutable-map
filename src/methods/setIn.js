import { setIn as _setIn } from '../functional/setIn.ts';

export function setIn(keyPath, v) {
  return _setIn(this, keyPath, v);
}
