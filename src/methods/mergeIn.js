import { emptyMap } from '../Map';
import { mergeWithSources } from '../functional/merge';
import { updateIn } from '../functional/updateIn.ts';

export function mergeIn(keyPath, ...iters) {
  return updateIn(this, keyPath, emptyMap(), (m) => mergeWithSources(m, iters));
}
