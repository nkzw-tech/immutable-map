import { OwnerID } from '../TrieUtils.ts';

export function asMutable() {
  return this.__ownerID ? this : this.__ensureOwner(new OwnerID());
}
