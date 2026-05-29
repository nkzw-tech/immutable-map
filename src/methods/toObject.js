import assertNotInfinite from '../utils/assertNotInfinite.ts';
import { isProtoKey } from '../utils/protoInjection.ts';

export function toObject() {
  assertNotInfinite(this.size);
  const object = {};
  this.__iterate((v, k) => {
    if (isProtoKey(k)) {
      return;
    }

    object[k] = v;
  });
  return object;
}
