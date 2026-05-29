import { removeIn } from '../functional/removeIn.ts';

export function deleteIn(keyPath) {
  return removeIn(this, keyPath);
}
