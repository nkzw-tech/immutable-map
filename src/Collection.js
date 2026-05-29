import { IndexedSeq, KeyedSeq, Seq, SetSeq } from './Seq';
import { isAssociative } from './predicates/isAssociative.ts';
import { isCollection } from './predicates/isCollection.ts';
import { isIndexed } from './predicates/isIndexed.ts';
import { isKeyed } from './predicates/isKeyed.ts';

export class Collection {
  constructor(value) {
    // eslint-disable-next-line no-constructor-return
    return isCollection(value) ? value : Seq(value);
  }
}

export class KeyedCollection extends Collection {
  constructor(value) {
    // eslint-disable-next-line no-constructor-return
    return isKeyed(value) ? value : KeyedSeq(value);
  }
}

export class IndexedCollection extends Collection {
  constructor(value) {
    // eslint-disable-next-line no-constructor-return
    return isIndexed(value) ? value : IndexedSeq(value);
  }
}

export class SetCollection extends Collection {
  constructor(value) {
    // eslint-disable-next-line no-constructor-return
    return isCollection(value) && !isAssociative(value) ? value : SetSeq(value);
  }
}

Collection.Keyed = KeyedCollection;
Collection.Indexed = IndexedCollection;
Collection.Set = SetCollection;
