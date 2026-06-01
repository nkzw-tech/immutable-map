import { Collection, KeyedCollection } from './Collection';
import { hash } from './Hash.ts';
import {
  Iterator,
  hasIterator,
  iteratorDone,
  iteratorValue,
} from './Iterator.ts';
import { imul, smi } from './Math.ts';
import {
  DELETE,
  MASK,
  MakeRef,
  NOT_SET,
  OwnerID,
  SHIFT,
  SIZE,
  SetRef,
} from './TrieUtils.ts';
import { get as getValue } from './functional/get.ts';
import { getIn as getInValue } from './functional/getIn.ts';
import { is } from './is.ts';
import { asImmutable } from './methods/asImmutable';
import { asMutable } from './methods/asMutable';
import { deleteIn } from './methods/deleteIn';
import { mergeDeep, mergeDeepWith } from './methods/mergeDeep';
import { mergeDeepIn } from './methods/mergeDeepIn';
import { mergeIn } from './methods/mergeIn';
import { setIn } from './methods/setIn';
import { update as genericUpdate } from './methods/update';
import { updateIn } from './methods/updateIn';
import { wasAltered } from './methods/wasAltered';
import { withMutations } from './methods/withMutations';
import { IS_COLLECTION_SYMBOL } from './predicates/isCollection.ts';
import { IS_MAP_SYMBOL, isMap } from './predicates/isMap.ts';
import { toJS as toJSValue } from './toJS.ts';
import arrCopy from './utils/arrCopy.ts';
import assertNotInfinite from './utils/assertNotInfinite.ts';
import isArrayLike from './utils/isArrayLike.ts';
import { isProtoKey } from './utils/protoInjection.ts';

export class Map extends KeyedCollection {
  // @pragma Construction

  constructor(value) {
    // eslint-disable-next-line no-constructor-return
    return value === undefined || value === null
      ? emptyMap()
      : isMap(value)
        ? value
        : Array.isArray(value)
          ? mapFromEntries(value)
          : canBuildMapFromObject(value)
            ? mapFromObject(value)
            : mapFromKeyedCollection(value);
  }

  toString() {
    return this.__toString('Map {', '}');
  }

  hashCode() {
    if (!this._root) {
      return KeyedCollection.prototype.hashCode.call(this);
    }

    return (
      this.__hash ||
      (this.__hash = murmurHashOfSize(this.size, mapRootHash(this._root)))
    );
  }

  toArray() {
    if (!this._root) {
      return this.size === 0
        ? []
        : KeyedCollection.prototype.toArray.call(this);
    }

    const array = new Array(this.size);
    mapRootToArray(this._root, array, 0);
    return array;
  }

  toObject() {
    if (!this._root) {
      return this.size === 0
        ? {}
        : KeyedCollection.prototype.toObject.call(this);
    }

    const object = {};
    mapRootToObject(this._root, object);
    return object;
  }

  toJS() {
    if (!this._root) {
      return this.size === 0 ? {} : KeyedCollection.prototype.toJS.call(this);
    }

    const object = {};
    mapRootToJSObject(this._root, object);
    return object;
  }

  // @pragma Access

  get(k, notSetValue) {
    return this._root
      ? this._root.get(0, undefined, k, notSetValue)
      : notSetValue;
  }

  has(k) {
    return this._root ? this._root.has(0, undefined, k) : false;
  }

  includes(searchValue) {
    return this._root
      ? mapRootIncludes(this._root, searchValue)
      : this.size === 0
        ? false
        : KeyedCollection.prototype.includes.call(this, searchValue);
  }

  keyOf(searchValue) {
    if (!this._root) {
      return this.size === 0
        ? undefined
        : KeyedCollection.prototype.keyOf.call(this, searchValue);
    }

    const key = mapRootKeyOf(this._root, searchValue);
    return key === NOT_SET ? undefined : key;
  }

  lastKeyOf(searchValue) {
    if (!this._root) {
      return this.size === 0
        ? undefined
        : KeyedCollection.prototype.lastKeyOf.call(this, searchValue);
    }

    const key = mapRootKeyOf(this._root, searchValue, true);
    return key === NOT_SET ? undefined : key;
  }

  every(predicate, context) {
    if (!this._root) {
      return this.size === 0
        ? true
        : KeyedCollection.prototype.every.call(this, predicate, context);
    }

    return mapRootEvery(this._root, predicate, context, this);
  }

  some(predicate, context) {
    if (!this._root) {
      return this.size === 0
        ? false
        : KeyedCollection.prototype.some.call(this, predicate, context);
    }

    return mapRootSome(this._root, predicate, context, this);
  }

  find(predicate, context, notSetValue) {
    if (!this._root) {
      return this.size === 0
        ? notSetValue
        : KeyedCollection.prototype.find.call(
            this,
            predicate,
            context,
            notSetValue
          );
    }

    const entry = mapRootFindEntry(this._root, predicate, context, this, false);
    return entry === NOT_SET ? notSetValue : entry[1];
  }

  findEntry(predicate, context, notSetValue) {
    if (!this._root) {
      return this.size === 0
        ? notSetValue
        : KeyedCollection.prototype.findEntry.call(
            this,
            predicate,
            context,
            notSetValue
          );
    }

    const entry = mapRootFindEntry(this._root, predicate, context, this, false);
    return entry === NOT_SET ? notSetValue : entry;
  }

  findKey(predicate, context) {
    if (!this._root) {
      return this.size === 0
        ? undefined
        : KeyedCollection.prototype.findKey.call(this, predicate, context);
    }

    const entry = mapRootFindEntry(this._root, predicate, context, this, false);
    return entry === NOT_SET ? undefined : entry[0];
  }

  findLast(predicate, context, notSetValue) {
    if (!this._root) {
      return this.size === 0
        ? notSetValue
        : KeyedCollection.prototype.findLast.call(
            this,
            predicate,
            context,
            notSetValue
          );
    }

    const entry = mapRootFindEntry(this._root, predicate, context, this, true);
    return entry === NOT_SET ? notSetValue : entry[1];
  }

  findLastEntry(predicate, context, notSetValue) {
    if (!this._root) {
      return this.size === 0
        ? notSetValue
        : KeyedCollection.prototype.findLastEntry.call(
            this,
            predicate,
            context,
            notSetValue
          );
    }

    const entry = mapRootFindEntry(this._root, predicate, context, this, true);
    return entry === NOT_SET ? notSetValue : entry;
  }

  findLastKey(predicate, context) {
    if (!this._root) {
      return this.size === 0
        ? undefined
        : KeyedCollection.prototype.findLastKey.call(this, predicate, context);
    }

    const entry = mapRootFindEntry(this._root, predicate, context, this, true);
    return entry === NOT_SET ? undefined : entry[0];
  }

  count(predicate, context) {
    if (!predicate) {
      return this.size;
    }
    if (!this._root) {
      return this.size === 0
        ? 0
        : KeyedCollection.prototype.count.call(this, predicate, context);
    }

    return mapRootCount(this._root, predicate, context, this);
  }

  reduce(reducer, initialReduction, context) {
    if (!this._root) {
      return this.size === 0
        ? initialReduction
        : KeyedCollection.prototype.reduce.apply(this, arguments);
    }

    if (arguments.length >= 2) {
      return mapRootReduceWithInitial(
        this._root,
        reducer,
        initialReduction,
        context,
        this,
        false
      );
    }

    return mapRootReduce(
      this._root,
      reducer,
      initialReduction,
      context,
      this,
      arguments.length < 2,
      false
    );
  }

  reduceRight(reducer, initialReduction, context) {
    if (!this._root) {
      return this.size === 0
        ? initialReduction
        : KeyedCollection.prototype.reduceRight.apply(this, arguments);
    }

    if (arguments.length >= 2) {
      return mapRootReduceWithInitial(
        this._root,
        reducer,
        initialReduction,
        context,
        this,
        true
      );
    }

    return mapRootReduce(
      this._root,
      reducer,
      initialReduction,
      context,
      this,
      arguments.length < 2,
      true
    );
  }

  first(notSetValue) {
    if (!this._root) {
      return this.size === 0
        ? notSetValue
        : KeyedCollection.prototype.first.call(this, notSetValue);
    }

    const value = mapRootFirst(this._root, false);
    return value === NOT_SET ? notSetValue : value;
  }

  last(notSetValue) {
    if (!this._root) {
      return this.size === 0
        ? notSetValue
        : KeyedCollection.prototype.last.call(this, notSetValue);
    }

    const value = mapRootFirst(this._root, true);
    return value === NOT_SET ? notSetValue : value;
  }

  update(key, notSetValue, updater) {
    const argumentsLength = arguments.length;
    if (argumentsLength === 1) {
      return key(this);
    }
    if (this._root === undefined) {
      return genericUpdate.apply(this, arguments);
    }
    if (argumentsLength === 2) {
      updater = notSetValue;
      notSetValue = undefined;
    }
    const existingValue = this.get(key, NOT_SET);
    const value = existingValue === NOT_SET ? notSetValue : existingValue;
    const newValue = updater(value);
    return newValue === value ? this : updateMap(this, key, newValue);
  }

  getIn(searchKeyPath, notSetValue) {
    if (!Array.isArray(searchKeyPath)) {
      return getInValue(this, searchKeyPath, notSetValue);
    }
    let index = 0;
    const size = searchKeyPath.length;
    if (size === 0) {
      return this;
    }
    let collection = this.get(searchKeyPath[index++], NOT_SET);
    if (collection === NOT_SET) {
      return notSetValue;
    }
    while (index !== size) {
      collection = getValue(collection, searchKeyPath[index++], NOT_SET);
      if (collection === NOT_SET) {
        return notSetValue;
      }
    }
    return collection;
  }

  // @pragma Modification

  set(k, v) {
    return updateMap(this, k, v);
  }

  remove(k) {
    return removeMap(this, k);
  }

  deleteAll(keys) {
    if (Array.isArray(keys)) {
      return deleteAllArray(this, keys);
    }

    const collection = Collection(keys);

    if (collection.size === 0) {
      return this;
    }

    return this.withMutations((map) => {
      collection.forEach((key) => map.remove(key));
    });
  }

  clear() {
    if (this.size === 0) {
      return this;
    }
    if (this.__ownerID) {
      this.size = 0;
      this._root = null;
      this.__hash = undefined;
      this.__altered = true;
      return this;
    }
    return emptyMap();
  }

  // @pragma Composition

  map(mapper, context) {
    if (this.size === 0) {
      return this;
    }

    if (this._root) {
      return this.withMutations((map) => {
        mapMapRootIntoMap(map, this._root, mapper, context, this);
      });
    }

    return this.withMutations((map) => {
      map.forEach((value, key) => {
        map.set(key, mapper.call(context, value, key, this));
      });
    });
  }

  mapKeys(mapper, context) {
    if (this.size === 0) {
      return this;
    }

    if (this._root) {
      return mapKeys(this, mapper, context);
    }

    return KeyedCollection.prototype.mapKeys.call(this, mapper, context);
  }

  mapEntries(mapper, context) {
    if (this.size === 0) {
      return this;
    }

    if (this._root) {
      return mapEntries(this, mapper, context);
    }

    return KeyedCollection.prototype.mapEntries.call(this, mapper, context);
  }

  flip() {
    if (this.size === 0) {
      return this;
    }

    if (this._root) {
      return flipMap(this);
    }

    return KeyedCollection.prototype.flip.call(this);
  }

  filter(predicate, context) {
    if (this.size === 0) {
      return this;
    }

    if (this._root) {
      return filterMap(this, predicate, context, false);
    }

    return KeyedCollection.prototype.filter.call(this, predicate, context);
  }

  filterNot(predicate, context) {
    if (this.size === 0) {
      return this;
    }

    if (this._root) {
      return filterMap(this, predicate, context, true);
    }

    return KeyedCollection.prototype.filterNot.call(this, predicate, context);
  }

  // @pragma Mutability

  __iterator(type, reverse) {
    return new MapIterator(this, type, reverse);
  }

  __iterate(fn, reverse) {
    let iterations = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
    this._root &&
      this._root.iterate((key, value) => {
        iterations++;
        return fn(value, key, this);
      }, reverse);
    return iterations;
  }

  __ensureOwner(ownerID) {
    if (ownerID === this.__ownerID) {
      return this;
    }
    if (!ownerID) {
      if (this.size === 0) {
        return emptyMap();
      }
      this.__ownerID = ownerID;
      this.__altered = false;
      return this;
    }
    return makeMap(this.size, this._root, ownerID, this.__hash);
  }
}

Map.isMap = isMap;

const MapPrototype = Map.prototype;
MapPrototype[IS_MAP_SYMBOL] = true;
MapPrototype[DELETE] = MapPrototype.remove;
MapPrototype.removeAll = MapPrototype.deleteAll;
MapPrototype.setIn = setIn;
MapPrototype.removeIn = MapPrototype.deleteIn = deleteIn;
MapPrototype.updateIn = updateIn;
MapPrototype.merge = MapPrototype.concat = mergeMap;
MapPrototype.mergeWith = mergeWithMap;
MapPrototype.mergeDeep = mergeDeep;
MapPrototype.mergeDeepWith = mergeDeepWith;
MapPrototype.mergeIn = mergeIn;
MapPrototype.mergeDeepIn = mergeDeepIn;
MapPrototype.withMutations = withMutations;
MapPrototype.wasAltered = wasAltered;
MapPrototype.asImmutable = asImmutable;
MapPrototype['@@transducer/init'] = MapPrototype.asMutable = asMutable;
MapPrototype['@@transducer/step'] = function (result, arr) {
  return result.set(arr[0], arr[1]);
};
MapPrototype['@@transducer/result'] = function (obj) {
  return obj.asImmutable();
};

// #pragma Trie Nodes

class ArrayMapNode {
  constructor(ownerID, entries) {
    this.ownerID = ownerID;
    this.entries = entries;
  }

  get(shift, keyHash, key, notSetValue) {
    const entries = this.entries;
    for (let ii = 0, len = entries.length; ii < len; ii += 2) {
      const entryKey = entries[ii];
      if (key === entryKey || isKeyEqual(key, entryKey)) {
        return entries[ii + 1];
      }
    }
    return notSetValue;
  }

  has(shift, keyHash, key) {
    const entries = this.entries;
    for (let ii = 0, len = entries.length; ii < len; ii += 2) {
      const entryKey = entries[ii];
      if (key === entryKey || isKeyEqual(key, entryKey)) {
        return true;
      }
    }
    return false;
  }

  update(ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
    const removed = value === NOT_SET;

    const entries = this.entries;
    let idx = 0;
    const len = entries.length;
    for (; idx < len; idx += 2) {
      const entryKey = entries[idx];
      if (key === entryKey || isKeyEqual(key, entryKey)) {
        break;
      }
    }
    const exists = idx < len;

    if (exists ? entries[idx + 1] === value : removed) {
      return this;
    }

    SetRef(didAlter);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
    (removed || !exists) && SetRef(didChangeSize);

    if (removed && len === 2) {
      return; // undefined
    }

    if (!exists && !removed && len >= MAX_ARRAY_MAP_SIZE * 2) {
      return createNodes(ownerID, entries, key, value);
    }

    const isEditable = ownerID && ownerID === this.ownerID;
    const newEntries = isEditable ? entries : arrCopy(entries);

    if (exists) {
      if (removed) {
        const lastKeyIndex = len - 2;
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
        idx === lastKeyIndex
          ? (newEntries.pop(), newEntries.pop())
          : ((newEntries[idx] = newEntries[lastKeyIndex]),
            (newEntries[idx + 1] = newEntries[lastKeyIndex + 1]),
            newEntries.pop(),
            newEntries.pop());
      } else {
        newEntries[idx] = key;
        newEntries[idx + 1] = value;
      }
    } else {
      newEntries.push(key, value);
    }

    if (isEditable) {
      this.entries = newEntries;
      return this;
    }

    return new ArrayMapNode(ownerID, newEntries);
  }

  remove(shift, keyHash, key) {
    const entries = this.entries;
    let idx = 0;
    const len = entries.length;
    for (; idx < len; idx += 2) {
      const entryKey = entries[idx];
      if (key === entryKey || isKeyEqual(key, entryKey)) {
        break;
      }
    }
    if (idx === len) {
      return this;
    }
    if (len === 2) {
      return; // undefined
    }

    const newEntries = arrCopy(entries);
    const lastKeyIndex = len - 2;
    if (idx === lastKeyIndex) {
      newEntries.pop();
      newEntries.pop();
    } else {
      newEntries[idx] = newEntries[lastKeyIndex];
      newEntries[idx + 1] = newEntries[lastKeyIndex + 1];
      newEntries.pop();
      newEntries.pop();
    }
    return new ArrayMapNode(undefined, newEntries);
  }
}

class BitmapIndexedNode {
  constructor(ownerID, bitmap, nodes) {
    this.ownerID = ownerID;
    this.bitmap = bitmap;
    this.nodes = nodes;
  }

  get(shift, keyHash, key, notSetValue) {
    if (keyHash === undefined) {
      keyHash = hash(key);
    }
    const bit = 1 << ((shift === 0 ? keyHash : keyHash >>> shift) & MASK);
    const bitmap = this.bitmap;
    return (bitmap & bit) === 0
      ? notSetValue
      : this.nodes[popCount(bitmap & (bit - 1))].get(
          shift + SHIFT,
          keyHash,
          key,
          notSetValue
        );
  }

  has(shift, keyHash, key) {
    if (keyHash === undefined) {
      keyHash = hash(key);
    }
    const bit = 1 << ((shift === 0 ? keyHash : keyHash >>> shift) & MASK);
    const bitmap = this.bitmap;
    return (
      (bitmap & bit) !== 0 &&
      this.nodes[popCount(bitmap & (bit - 1))].has(shift + SHIFT, keyHash, key)
    );
  }

  update(ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
    if (keyHash === undefined) {
      keyHash = hash(key);
    }
    const keyHashFrag = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;
    const bit = 1 << keyHashFrag;
    const bitmap = this.bitmap;
    const exists = (bitmap & bit) !== 0;

    if (!exists && value === NOT_SET) {
      return this;
    }

    const idx = popCount(bitmap & (bit - 1));
    const nodes = this.nodes;
    const node = exists ? nodes[idx] : undefined;
    const newNode = updateNode(
      node,
      ownerID,
      shift + SHIFT,
      keyHash,
      key,
      value,
      didChangeSize,
      didAlter
    );

    if (newNode === node) {
      return this;
    }

    if (!exists && newNode && nodes.length >= MAX_BITMAP_INDEXED_SIZE) {
      return expandNodes(ownerID, nodes, bitmap, keyHashFrag, newNode);
    }

    if (
      exists &&
      !newNode &&
      nodes.length === 2 &&
      isLeafNode(nodes[idx ^ 1])
    ) {
      return nodes[idx ^ 1];
    }

    if (exists && newNode && nodes.length === 1 && isLeafNode(newNode)) {
      return newNode;
    }

    const isEditable = ownerID && ownerID === this.ownerID;
    const newBitmap = exists ? (newNode ? bitmap : bitmap ^ bit) : bitmap | bit;
    const newNodes = exists
      ? newNode
        ? setAt(nodes, idx, newNode, isEditable)
        : spliceOut(nodes, idx, isEditable)
      : spliceIn(nodes, idx, newNode, isEditable);

    if (isEditable) {
      this.bitmap = newBitmap;
      this.nodes = newNodes;
      return this;
    }

    return new BitmapIndexedNode(ownerID, newBitmap, newNodes);
  }

  remove(shift, keyHash, key) {
    if (keyHash === undefined) {
      keyHash = hash(key);
    }
    const bit = 1 << ((shift === 0 ? keyHash : keyHash >>> shift) & MASK);
    const bitmap = this.bitmap;
    if ((bitmap & bit) === 0) {
      return this;
    }

    const idx = popCount(bitmap & (bit - 1));
    const nodes = this.nodes;
    const node = nodes[idx];
    const newNode = node.remove(shift + SHIFT, keyHash, key);
    if (newNode === node) {
      return this;
    }

    if (!newNode && nodes.length === 2 && isLeafNode(nodes[idx ^ 1])) {
      return nodes[idx ^ 1];
    }

    if (newNode && nodes.length === 1 && isLeafNode(newNode)) {
      return newNode;
    }

    const newBitmap = newNode ? bitmap : bitmap ^ bit;
    const newNodes = newNode
      ? setAt(nodes, idx, newNode, false)
      : spliceOut(nodes, idx, false);

    return new BitmapIndexedNode(undefined, newBitmap, newNodes);
  }
}

class HashArrayMapNode {
  constructor(ownerID, count, nodes) {
    this.ownerID = ownerID;
    this.count = count;
    this.nodes = nodes;
  }

  get(shift, keyHash, key, notSetValue) {
    if (keyHash === undefined) {
      keyHash = hash(key);
    }
    const idx = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;
    const node = this.nodes[idx];
    return node
      ? node.get(shift + SHIFT, keyHash, key, notSetValue)
      : notSetValue;
  }

  has(shift, keyHash, key) {
    if (keyHash === undefined) {
      keyHash = hash(key);
    }
    const idx = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;
    const node = this.nodes[idx];
    return !!node && node.has(shift + SHIFT, keyHash, key);
  }

  update(ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
    if (keyHash === undefined) {
      keyHash = hash(key);
    }
    const idx = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;
    const removed = value === NOT_SET;
    const nodes = this.nodes;
    const node = nodes[idx];

    if (removed && !node) {
      return this;
    }

    const newNode = updateNode(
      node,
      ownerID,
      shift + SHIFT,
      keyHash,
      key,
      value,
      didChangeSize,
      didAlter
    );
    if (newNode === node) {
      return this;
    }

    let newCount = this.count;
    if (!node) {
      newCount++;
    } else if (!newNode) {
      newCount--;
      if (newCount < MIN_HASH_ARRAY_MAP_SIZE) {
        return packNodes(ownerID, nodes, newCount, idx);
      }
    }

    const isEditable = ownerID && ownerID === this.ownerID;
    const newNodes = setAt(nodes, idx, newNode, isEditable);

    if (isEditable) {
      this.count = newCount;
      this.nodes = newNodes;
      return this;
    }

    return new HashArrayMapNode(ownerID, newCount, newNodes);
  }

  remove(shift, keyHash, key) {
    if (keyHash === undefined) {
      keyHash = hash(key);
    }
    const idx = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;
    const nodes = this.nodes;
    const node = nodes[idx];
    if (!node) {
      return this;
    }

    const newNode = node.remove(shift + SHIFT, keyHash, key);
    if (newNode === node) {
      return this;
    }

    let newCount = this.count;
    if (!newNode) {
      newCount--;
      if (newCount < MIN_HASH_ARRAY_MAP_SIZE) {
        return packNodes(undefined, nodes, newCount, idx);
      }
    }

    const newNodes = setAt(nodes, idx, newNode, false);
    return new HashArrayMapNode(undefined, newCount, newNodes);
  }
}

class HashCollisionNode {
  constructor(ownerID, keyHash, entries) {
    this.ownerID = ownerID;
    this.keyHash = keyHash;
    this.entries = entries;
  }

  get(shift, keyHash, key, notSetValue) {
    const entries = this.entries;
    for (let ii = 0, len = entries.length; ii < len; ii++) {
      const entry = entries[ii];
      if (key === entry[0] || isKeyEqual(key, entry[0])) {
        return entry[1];
      }
    }
    return notSetValue;
  }

  has(shift, keyHash, key) {
    const entries = this.entries;
    for (let ii = 0, len = entries.length; ii < len; ii++) {
      const entry = entries[ii];
      if (key === entry[0] || isKeyEqual(key, entry[0])) {
        return true;
      }
    }
    return false;
  }

  update(ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
    if (keyHash === undefined) {
      keyHash = hash(key);
    }

    const removed = value === NOT_SET;

    if (keyHash !== this.keyHash) {
      if (removed) {
        return this;
      }
      SetRef(didAlter);
      SetRef(didChangeSize);
      return mergeIntoNode(this, ownerID, shift, keyHash, [key, value]);
    }

    const entries = this.entries;
    let idx = 0;
    const len = entries.length;
    for (; idx < len; idx++) {
      const entry = entries[idx];
      if (key === entry[0] || isKeyEqual(key, entry[0])) {
        break;
      }
    }
    const exists = idx < len;

    if (exists ? entries[idx][1] === value : removed) {
      return this;
    }

    SetRef(didAlter);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
    (removed || !exists) && SetRef(didChangeSize);

    if (removed && len === 2) {
      const entry = entries[idx ^ 1];
      return new ValueNode(ownerID, this.keyHash, entry[0], entry[1]);
    }

    const isEditable = ownerID && ownerID === this.ownerID;
    const newEntries = isEditable ? entries : arrCopy(entries);

    if (exists) {
      if (removed) {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
        idx === len - 1
          ? newEntries.pop()
          : (newEntries[idx] = newEntries.pop());
      } else {
        newEntries[idx] = [key, value];
      }
    } else {
      newEntries.push([key, value]);
    }

    if (isEditable) {
      this.entries = newEntries;
      return this;
    }

    return new HashCollisionNode(ownerID, this.keyHash, newEntries);
  }

  remove(shift, keyHash, key) {
    if (keyHash === undefined) {
      keyHash = hash(key);
    }
    if (keyHash !== this.keyHash) {
      return this;
    }

    const entries = this.entries;
    let idx = 0;
    const len = entries.length;
    for (; idx < len; idx++) {
      const entry = entries[idx];
      if (key === entry[0] || isKeyEqual(key, entry[0])) {
        break;
      }
    }
    if (idx === len) {
      return this;
    }
    if (len === 2) {
      const entry = entries[idx ^ 1];
      return new ValueNode(undefined, this.keyHash, entry[0], entry[1]);
    }

    const newEntries = arrCopy(entries);
    if (idx === len - 1) {
      newEntries.pop();
    } else {
      newEntries[idx] = newEntries.pop();
    }
    return new HashCollisionNode(undefined, this.keyHash, newEntries);
  }
}

class ValueNode {
  constructor(ownerID, keyHash, key, value) {
    this.ownerID = ownerID;
    this.keyHash = keyHash;
    this.key = key;
    this.value = value;
  }

  get(shift, keyHash, key, notSetValue) {
    const nodeKey = this.key;
    return key === nodeKey || isKeyEqual(key, nodeKey)
      ? this.value
      : notSetValue;
  }

  has(shift, keyHash, key) {
    const nodeKey = this.key;
    return key === nodeKey || isKeyEqual(key, nodeKey);
  }

  update(ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
    const removed = value === NOT_SET;
    const nodeKey = this.key;
    const keyMatch = key === nodeKey || isKeyEqual(key, nodeKey);
    if (keyMatch ? value === this.value : removed) {
      return this;
    }

    SetRef(didAlter);

    if (removed) {
      SetRef(didChangeSize);
      return; // undefined
    }

    if (keyMatch) {
      if (ownerID && ownerID === this.ownerID) {
        this.key = key;
        this.value = value;
        return this;
      }
      return new ValueNode(ownerID, this.keyHash, key, value);
    }

    SetRef(didChangeSize);
    return mergeIntoNode(this, ownerID, shift, hash(key), [key, value]);
  }

  remove(shift, keyHash, key) {
    const nodeKey = this.key;
    return key === nodeKey || isKeyEqual(key, nodeKey) ? undefined : this;
  }
}

// #pragma Iterators

ArrayMapNode.prototype.iterate = function (fn, reverse) {
  const entries = this.entries;
  const maxIndex = entries.length - 2;
  for (let ii = 0; ii <= maxIndex; ii += 2) {
    const entryIndex = reverse ? maxIndex - ii : ii;
    if (fn(entries[entryIndex], entries[entryIndex + 1]) === false) {
      return false;
    }
  }
};

HashCollisionNode.prototype.iterate = function (fn, reverse) {
  const entries = this.entries;
  for (let ii = 0, maxIndex = entries.length - 1; ii <= maxIndex; ii++) {
    const entry = entries[reverse ? maxIndex - ii : ii];
    if (fn(entry[0], entry[1]) === false) {
      return false;
    }
  }
};

BitmapIndexedNode.prototype.iterate = HashArrayMapNode.prototype.iterate =
  function (fn, reverse) {
    const nodes = this.nodes;
    for (let ii = 0, maxIndex = nodes.length - 1; ii <= maxIndex; ii++) {
      const node = nodes[reverse ? maxIndex - ii : ii];
      if (node && node.iterate(fn, reverse) === false) {
        return false;
      }
    }
  };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
ValueNode.prototype.iterate = function (fn, reverse) {
  return fn(this.key, this.value);
};

class MapIterator extends Iterator {
  constructor(map, type, reverse) {
    this._type = type;
    this._reverse = reverse;
    this._stack = map._root && mapIteratorFrame(map._root);
  }

  next() {
    const type = this._type;
    let stack = this._stack;
    while (stack) {
      const node = stack.node;
      const index = stack.index++;
      let maxIndex;
      if (node.constructor === ValueNode) {
        if (index === 0) {
          return iteratorValue(type, node.key, node.value);
        }
      } else if (node.constructor === ArrayMapNode) {
        maxIndex = node.entries.length / 2 - 1;
        if (index <= maxIndex) {
          const entryIndex = (this._reverse ? maxIndex - index : index) * 2;
          return iteratorValue(
            type,
            node.entries[entryIndex],
            node.entries[entryIndex + 1]
          );
        }
      } else if (node.entries) {
        maxIndex = node.entries.length - 1;
        if (index <= maxIndex) {
          return mapIteratorValue(
            type,
            node.entries[this._reverse ? maxIndex - index : index]
          );
        }
      } else {
        maxIndex = node.nodes.length - 1;
        if (index <= maxIndex) {
          const subNode = node.nodes[this._reverse ? maxIndex - index : index];
          if (subNode) {
            if (subNode.constructor === ValueNode) {
              return iteratorValue(type, subNode.key, subNode.value);
            }
            stack = this._stack = mapIteratorFrame(subNode, stack);
          }
          continue;
        }
      }
      stack = this._stack = this._stack.__prev;
    }
    return iteratorDone();
  }
}

function mapIteratorValue(type, entry) {
  return iteratorValue(type, entry[0], entry[1]);
}

function mapIteratorFrame(node, prev) {
  return {
    node: node,
    index: 0,
    __prev: prev,
  };
}

function makeMap(size, root, ownerID, hash) {
  const map = Object.create(MapPrototype);
  map.size = size;
  map._root = root;
  map.__ownerID = ownerID;
  map.__hash = hash;
  map.__altered = false;
  return map;
}

let EMPTY_MAP;
export function emptyMap() {
  return EMPTY_MAP || (EMPTY_MAP = makeMap(0));
}

function canBuildMapFromObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !isArrayLike(value) &&
    !hasIterator(value)
  );
}

function mapFromObject(object) {
  const keys = Object.keys(object);
  const symbols = Object.getOwnPropertySymbols
    ? Object.getOwnPropertySymbols(object)
    : [];
  const keysSize = keys.length;
  const symbolsSize = symbols.length;
  const size = keysSize + symbolsSize;
  if (size === 0) {
    return emptyMap();
  }

  const ownerID = new OwnerID();
  const firstKey = keysSize ? keys[0] : symbols[0];
  let root = new ArrayMapNode(ownerID, [firstKey, object[firstKey]]);
  for (let ii = 1; ii < keysSize; ii++) {
    root = addObjectKey(root, ownerID, object, keys[ii]);
  }
  for (let ii = keysSize ? 0 : 1; ii < symbolsSize; ii++) {
    root = addObjectKey(root, ownerID, object, symbols[ii]);
  }
  return makeMap(size, root);
}

function addObjectKey(root, ownerID, object, key) {
  return updateNode(
    root,
    ownerID,
    0,
    undefined,
    key,
    object[key],
    undefined,
    undefined
  );
}

function mapFromKeyedCollection(value) {
  return emptyMap().withMutations((map) => {
    const iter = KeyedCollection(value);
    assertNotInfinite(iter.size);
    iter.forEach((v, k) => map.set(k, v));
  });
}

function mapFromEntries(entries) {
  const size = entries.length;
  if (size === 0) {
    return emptyMap();
  }

  const ownerID = new OwnerID();
  const didChangeSize = MakeRef();
  let mapSize = 0;
  let root;
  for (let ii = 0; ii < size; ii++) {
    const entry = entries[ii];
    if (entry) {
      const type = typeof entry;
      if (type !== 'object' && type !== 'function') {
        throw new TypeError('Expected [K, V] tuple: ' + entry);
      }
      const indexedCollection = entry[IS_COLLECTION_SYMBOL];
      const key = indexedCollection ? entry.get(0) : entry[0];
      const value = indexedCollection ? entry.get(1) : entry[1];
      if (root) {
        didChangeSize.value = false;
        root = updateNode(
          root,
          ownerID,
          0,
          undefined,
          key,
          value,
          didChangeSize,
          undefined
        );
        if (didChangeSize.value) {
          mapSize++;
        }
      } else {
        root = new ArrayMapNode(ownerID, [key, value]);
        mapSize = 1;
      }
    }
  }
  return root ? makeMap(mapSize, root) : emptyMap();
}

function mergeMap(...collections) {
  if (collections.length === 1) {
    const collection = collections[0];
    if (
      !isMap(collection) &&
      !Array.isArray(collection) &&
      canBuildMapFromObject(collection)
    ) {
      return mergeObjectIntoMap(this, collection);
    }
  }

  const iters = [];
  for (let ii = 0; ii < collections.length; ii++) {
    const collection = collections[ii];
    if (Array.isArray(collection)) {
      if (collection.length !== 0) {
        iters.push(collection);
      }
    } else {
      const iter = isMap(collection) ? collection : KeyedCollection(collection);
      if (iter.size !== 0) {
        iters.push(iter);
      }
    }
  }
  if (iters.length === 0) {
    return this;
  }
  if (this.size === 0 && !this.__ownerID && iters.length === 1) {
    return this.constructor(iters[0]);
  }
  return this.withMutations((map) => {
    const mergeIntoMap = (value, key) => {
      map.set(key, value);
    };
    for (let ii = 0; ii < iters.length; ii++) {
      const iter = iters[ii];
      if (Array.isArray(iter)) {
        mergeEntriesIntoMap(map, iter);
      } else if (iter._root) {
        mergeMapRootIntoMap(map, iter._root);
      } else {
        iter.forEach(mergeIntoMap);
      }
    }
  });
}

function mergeWithMap(merger, ...collections) {
  if (typeof merger !== 'function') {
    throw new TypeError('Invalid merger function: ' + merger);
  }

  if (collections.length === 1) {
    const collection = collections[0];
    if (
      !isMap(collection) &&
      !Array.isArray(collection) &&
      canBuildMapFromObject(collection)
    ) {
      return mergeObjectWithIntoMap(this, collection, merger);
    }
  }

  const iters = [];
  for (let ii = 0; ii < collections.length; ii++) {
    const collection = collections[ii];
    if (Array.isArray(collection)) {
      if (collection.length !== 0) {
        iters.push(collection);
      }
    } else {
      const iter = isMap(collection) ? collection : KeyedCollection(collection);
      if (iter.size !== 0) {
        iters.push(iter);
      }
    }
  }
  if (iters.length === 0) {
    return this;
  }
  if (this.size === 0 && !this.__ownerID && iters.length === 1) {
    return this.constructor(iters[0]);
  }
  return this.withMutations((map) => {
    const mergeIntoMap = (value, key) => {
      const oldValue = map.get(key, NOT_SET);
      map.set(key, oldValue === NOT_SET ? value : merger(oldValue, value, key));
    };
    for (let ii = 0; ii < iters.length; ii++) {
      const iter = iters[ii];
      if (Array.isArray(iter)) {
        mergeEntriesWithIntoMap(map, iter, merger);
      } else if (iter._root) {
        mergeMapRootWithIntoMap(map, iter._root, merger);
      } else {
        iter.forEach(mergeIntoMap);
      }
    }
  });
}

function mergeObjectIntoMap(map, object) {
  const keys = Object.keys(object);
  const symbols = Object.getOwnPropertySymbols
    ? Object.getOwnPropertySymbols(object)
    : [];
  if (keys.length === 0 && symbols.length === 0) {
    return map;
  }
  if (map.size === 0 && !map.__ownerID) {
    return map.constructor(object);
  }
  return map.withMutations((mutable) => {
    for (let ii = 0, size = keys.length; ii < size; ii++) {
      const key = keys[ii];
      mutable.set(key, object[key]);
    }
    for (let ii = 0, size = symbols.length; ii < size; ii++) {
      const key = symbols[ii];
      mutable.set(key, object[key]);
    }
  });
}

function mergeObjectWithIntoMap(map, object, merger) {
  const keys = Object.keys(object);
  const symbols = Object.getOwnPropertySymbols
    ? Object.getOwnPropertySymbols(object)
    : [];
  if (keys.length === 0 && symbols.length === 0) {
    return map;
  }
  if (map.size === 0 && !map.__ownerID) {
    return map.constructor(object);
  }
  return map.withMutations((mutable) => {
    for (let ii = 0, size = keys.length; ii < size; ii++) {
      mergeObjectKeyWithIntoMap(mutable, object, keys[ii], merger);
    }
    for (let ii = 0, size = symbols.length; ii < size; ii++) {
      mergeObjectKeyWithIntoMap(mutable, object, symbols[ii], merger);
    }
  });
}

function mergeObjectKeyWithIntoMap(map, object, key, merger) {
  const value = object[key];
  const oldValue = map.get(key, NOT_SET);
  map.set(key, oldValue === NOT_SET ? value : merger(oldValue, value, key));
}

function mergeMapRootIntoMap(map, node) {
  if (node.constructor === ValueNode) {
    map.set(node.key, node.value);
    return;
  }

  if (node.constructor === ArrayMapNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii += 2) {
      map.set(entries[ii], entries[ii + 1]);
    }
    return;
  }

  if (node.constructor === HashCollisionNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii++) {
      const entry = entries[ii];
      map.set(entry[0], entry[1]);
    }
    return;
  }

  const nodes = node.nodes;
  for (let ii = 0, size = nodes.length; ii < size; ii++) {
    const child = nodes[ii];
    if (child) {
      mergeMapRootIntoMap(map, child);
    }
  }
}

function mergeMapRootWithIntoMap(map, node, merger) {
  if (node.constructor === ValueNode) {
    mergeValueIntoMap(map, node.key, node.value, merger);
    return;
  }

  if (node.constructor === ArrayMapNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii += 2) {
      mergeValueIntoMap(map, entries[ii], entries[ii + 1], merger);
    }
    return;
  }

  if (node.constructor === HashCollisionNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii++) {
      const entry = entries[ii];
      mergeValueIntoMap(map, entry[0], entry[1], merger);
    }
    return;
  }

  const nodes = node.nodes;
  for (let ii = 0, size = nodes.length; ii < size; ii++) {
    const child = nodes[ii];
    if (child) {
      mergeMapRootWithIntoMap(map, child, merger);
    }
  }
}

function mergeValueIntoMap(map, key, value, merger) {
  const oldValue = map.get(key, NOT_SET);
  map.set(key, oldValue === NOT_SET ? value : merger(oldValue, value, key));
}

function mapMapRootIntoMap(map, node, mapper, context, collection) {
  if (node.constructor === ValueNode) {
    map.set(node.key, mapper.call(context, node.value, node.key, collection));
    return;
  }

  if (node.constructor === ArrayMapNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii += 2) {
      map.set(
        entries[ii],
        mapper.call(context, entries[ii + 1], entries[ii], collection)
      );
    }
    return;
  }

  if (node.constructor === HashCollisionNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii++) {
      const entry = entries[ii];
      map.set(entry[0], mapper.call(context, entry[1], entry[0], collection));
    }
    return;
  }

  const nodes = node.nodes;
  for (let ii = 0, size = nodes.length; ii < size; ii++) {
    const child = nodes[ii];
    if (child) {
      mapMapRootIntoMap(map, child, mapper, context, collection);
    }
  }
}

function filterMap(collection, predicate, context, negate) {
  const map = emptyMap().asMutable();
  filterMapRootIntoMap(
    map,
    collection._root,
    predicate,
    context,
    collection,
    negate
  );
  return map.asImmutable();
}

function mapKeys(collection, mapper, context) {
  const map = emptyMap().asMutable();
  mapKeysRootIntoMap(map, collection._root, mapper, context, collection);
  return map.asImmutable();
}

function mapKeysRootIntoMap(map, node, mapper, context, collection) {
  if (node.constructor === ValueNode) {
    map.set(mapper.call(context, node.key, node.value, collection), node.value);
    return;
  }

  if (node.constructor === ArrayMapNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii += 2) {
      map.set(
        mapper.call(context, entries[ii], entries[ii + 1], collection),
        entries[ii + 1]
      );
    }
    return;
  }

  if (node.constructor === HashCollisionNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii++) {
      const entry = entries[ii];
      map.set(mapper.call(context, entry[0], entry[1], collection), entry[1]);
    }
    return;
  }

  const nodes = node.nodes;
  for (let ii = 0, size = nodes.length; ii < size; ii++) {
    const child = nodes[ii];
    if (child) {
      mapKeysRootIntoMap(map, child, mapper, context, collection);
    }
  }
}

function mapEntries(collection, mapper, context) {
  const map = emptyMap().asMutable();
  const iterations = { value: 0 };
  mapEntriesRootIntoMap(
    map,
    collection._root,
    mapper,
    context,
    collection,
    iterations
  );
  return map.asImmutable();
}

function mapEntriesRootIntoMap(
  map,
  node,
  mapper,
  context,
  collection,
  iterations
) {
  if (node.constructor === ValueNode) {
    addMappedEntryToMap(
      map,
      mapper.call(
        context,
        [node.key, node.value],
        iterations.value++,
        collection
      )
    );
    return;
  }

  if (node.constructor === ArrayMapNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii += 2) {
      addMappedEntryToMap(
        map,
        mapper.call(
          context,
          [entries[ii], entries[ii + 1]],
          iterations.value++,
          collection
        )
      );
    }
    return;
  }

  if (node.constructor === HashCollisionNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii++) {
      const entry = entries[ii];
      addMappedEntryToMap(
        map,
        mapper.call(
          context,
          [entry[0], entry[1]],
          iterations.value++,
          collection
        )
      );
    }
    return;
  }

  const nodes = node.nodes;
  for (let ii = 0, size = nodes.length; ii < size; ii++) {
    const child = nodes[ii];
    if (child) {
      mapEntriesRootIntoMap(
        map,
        child,
        mapper,
        context,
        collection,
        iterations
      );
    }
  }
}

function addMappedEntryToMap(map, entry) {
  if (entry) {
    const type = typeof entry;
    if (type !== 'object' && type !== 'function') {
      throw new TypeError('Expected [K, V] tuple: ' + entry);
    }
    const indexedCollection = entry[IS_COLLECTION_SYMBOL];
    map.set(
      indexedCollection ? entry.get(0) : entry[0],
      indexedCollection ? entry.get(1) : entry[1]
    );
  }
}

function mapRootHash(node) {
  if (node.constructor === ValueNode) {
    return hashMerge(hash(node.value), hash(node.key));
  }

  if (node.constructor === ArrayMapNode) {
    let h = 0;
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii += 2) {
      h = (h + hashMerge(hash(entries[ii + 1]), hash(entries[ii]))) | 0;
    }
    return h;
  }

  if (node.constructor === HashCollisionNode) {
    let h = 0;
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii++) {
      const entry = entries[ii];
      h = (h + hashMerge(hash(entry[1]), hash(entry[0]))) | 0;
    }
    return h;
  }

  let h = 0;
  const nodes = node.nodes;
  for (let ii = 0, size = nodes.length; ii < size; ii++) {
    const child = nodes[ii];
    if (child) {
      h = (h + mapRootHash(child)) | 0;
    }
  }
  return h;
}

function murmurHashOfSize(size, h) {
  h = imul(h, 0xcc9e2d51);
  h = imul((h << 15) | (h >>> -15), 0x1b873593);
  h = imul((h << 13) | (h >>> -13), 5);
  h = ((h + 0xe6546b64) | 0) ^ size;
  h = imul(h ^ (h >>> 16), 0x85ebca6b);
  h = imul(h ^ (h >>> 13), 0xc2b2ae35);
  return smi(h ^ (h >>> 16));
}

function hashMerge(a, b) {
  return (a ^ (b + 0x9e3779b9 + (a << 6) + (a >> 2))) | 0;
}

function flipMap(collection) {
  const map = emptyMap().asMutable();
  flipMapRootIntoMap(map, collection._root);
  return map.asImmutable();
}

function flipMapRootIntoMap(map, node) {
  if (node.constructor === ValueNode) {
    map.set(node.value, node.key);
    return;
  }

  if (node.constructor === ArrayMapNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii += 2) {
      map.set(entries[ii + 1], entries[ii]);
    }
    return;
  }

  if (node.constructor === HashCollisionNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii++) {
      const entry = entries[ii];
      map.set(entry[1], entry[0]);
    }
    return;
  }

  const nodes = node.nodes;
  for (let ii = 0, size = nodes.length; ii < size; ii++) {
    const child = nodes[ii];
    if (child) {
      flipMapRootIntoMap(map, child);
    }
  }
}

function filterMapRootIntoMap(
  map,
  node,
  predicate,
  context,
  collection,
  negate
) {
  if (node.constructor === ValueNode) {
    filterValueInMap(
      map,
      node.key,
      node.value,
      predicate,
      context,
      collection,
      negate
    );
    return;
  }

  if (node.constructor === ArrayMapNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii += 2) {
      filterValueInMap(
        map,
        entries[ii],
        entries[ii + 1],
        predicate,
        context,
        collection,
        negate
      );
    }
    return;
  }

  if (node.constructor === HashCollisionNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii++) {
      const entry = entries[ii];
      filterValueInMap(
        map,
        entry[0],
        entry[1],
        predicate,
        context,
        collection,
        negate
      );
    }
    return;
  }

  const nodes = node.nodes;
  for (let ii = 0, size = nodes.length; ii < size; ii++) {
    const child = nodes[ii];
    if (child) {
      filterMapRootIntoMap(map, child, predicate, context, collection, negate);
    }
  }
}

function filterValueInMap(
  map,
  key,
  value,
  predicate,
  context,
  collection,
  negate
) {
  const keep = !!predicate.call(context, value, key, collection);
  if (keep !== negate) {
    map.set(key, value);
  }
}

function mapRootToArray(node, array, index) {
  if (node.constructor === ValueNode) {
    array[index] = [node.key, node.value];
    return index + 1;
  }

  if (node.constructor === ArrayMapNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii += 2) {
      array[index++] = [entries[ii], entries[ii + 1]];
    }
    return index;
  }

  if (node.constructor === HashCollisionNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii++) {
      const entry = entries[ii];
      array[index++] = [entry[0], entry[1]];
    }
    return index;
  }

  const nodes = node.nodes;
  for (let ii = 0, size = nodes.length; ii < size; ii++) {
    const child = nodes[ii];
    if (child) {
      index = mapRootToArray(child, array, index);
    }
  }
  return index;
}

function mapRootToObject(node, object) {
  if (node.constructor === ValueNode) {
    setObjectKey(object, node.key, node.value);
    return;
  }

  if (node.constructor === ArrayMapNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii += 2) {
      setObjectKey(object, entries[ii], entries[ii + 1]);
    }
    return;
  }

  if (node.constructor === HashCollisionNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii++) {
      const entry = entries[ii];
      setObjectKey(object, entry[0], entry[1]);
    }
    return;
  }

  const nodes = node.nodes;
  for (let ii = 0, size = nodes.length; ii < size; ii++) {
    const child = nodes[ii];
    if (child) {
      mapRootToObject(child, object);
    }
  }
}

function mapRootToJSObject(node, object) {
  if (node.constructor === ValueNode) {
    setJSObjectKey(object, node.key, node.value);
    return;
  }

  if (node.constructor === ArrayMapNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii += 2) {
      setJSObjectKey(object, entries[ii], entries[ii + 1]);
    }
    return;
  }

  if (node.constructor === HashCollisionNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii++) {
      const entry = entries[ii];
      setJSObjectKey(object, entry[0], entry[1]);
    }
    return;
  }

  const nodes = node.nodes;
  for (let ii = 0, size = nodes.length; ii < size; ii++) {
    const child = nodes[ii];
    if (child) {
      mapRootToJSObject(child, object);
    }
  }
}

function setObjectKey(object, key, value) {
  if (!isProtoKey(key)) {
    object[key] = value;
  }
}

function setJSObjectKey(object, key, value) {
  if (!isProtoKey(key)) {
    object[key] = toJSValue(value);
  }
}

function mapRootIncludes(node, searchValue) {
  if (node.constructor === ValueNode) {
    const value = node.value;
    return value === searchValue || isKeyEqual(value, searchValue);
  }

  if (node.constructor === ArrayMapNode) {
    const entries = node.entries;
    for (let ii = 1, size = entries.length; ii < size; ii += 2) {
      const value = entries[ii];
      if (value === searchValue || isKeyEqual(value, searchValue)) {
        return true;
      }
    }
    return false;
  }

  if (node.constructor === HashCollisionNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii++) {
      const value = entries[ii][1];
      if (value === searchValue || isKeyEqual(value, searchValue)) {
        return true;
      }
    }
    return false;
  }

  const nodes = node.nodes;
  for (let ii = 0, size = nodes.length; ii < size; ii++) {
    const child = nodes[ii];
    if (child && mapRootIncludes(child, searchValue)) {
      return true;
    }
  }
  return false;
}

function mapRootKeyOf(node, searchValue, reverse) {
  if (node.constructor === ValueNode) {
    const value = node.value;
    return value === searchValue || isKeyEqual(value, searchValue)
      ? node.key
      : NOT_SET;
  }

  if (node.constructor === ArrayMapNode) {
    const entries = node.entries;
    const maxIndex = entries.length - 2;
    for (let ii = 0; ii <= maxIndex; ii += 2) {
      const entryIndex = reverse ? maxIndex - ii : ii;
      const value = entries[entryIndex + 1];
      if (value === searchValue || isKeyEqual(value, searchValue)) {
        return entries[entryIndex];
      }
    }
    return NOT_SET;
  }

  if (node.constructor === HashCollisionNode) {
    const entries = node.entries;
    for (let ii = 0, maxIndex = entries.length - 1; ii <= maxIndex; ii++) {
      const entry = entries[reverse ? maxIndex - ii : ii];
      const value = entry[1];
      if (value === searchValue || isKeyEqual(value, searchValue)) {
        return entry[0];
      }
    }
    return NOT_SET;
  }

  const nodes = node.nodes;
  if (reverse) {
    for (let ii = nodes.length - 1; ii >= 0; ii--) {
      const child = nodes[ii];
      if (child) {
        const key = mapRootKeyOf(child, searchValue, reverse);
        if (key !== NOT_SET) {
          return key;
        }
      }
    }
  } else {
    for (let ii = 0, size = nodes.length; ii < size; ii++) {
      const child = nodes[ii];
      if (child) {
        const key = mapRootKeyOf(child, searchValue, reverse);
        if (key !== NOT_SET) {
          return key;
        }
      }
    }
  }
  return NOT_SET;
}

function mapRootEvery(node, predicate, context, collection) {
  if (node.constructor === ValueNode) {
    return !!predicate.call(context, node.value, node.key, collection);
  }

  if (node.constructor === ArrayMapNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii += 2) {
      if (!predicate.call(context, entries[ii + 1], entries[ii], collection)) {
        return false;
      }
    }
    return true;
  }

  if (node.constructor === HashCollisionNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii++) {
      const entry = entries[ii];
      if (!predicate.call(context, entry[1], entry[0], collection)) {
        return false;
      }
    }
    return true;
  }

  const nodes = node.nodes;
  for (let ii = 0, size = nodes.length; ii < size; ii++) {
    const child = nodes[ii];
    if (child && !mapRootEvery(child, predicate, context, collection)) {
      return false;
    }
  }
  return true;
}

function mapRootSome(node, predicate, context, collection) {
  if (node.constructor === ValueNode) {
    return !!predicate.call(context, node.value, node.key, collection);
  }

  if (node.constructor === ArrayMapNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii += 2) {
      if (predicate.call(context, entries[ii + 1], entries[ii], collection)) {
        return true;
      }
    }
    return false;
  }

  if (node.constructor === HashCollisionNode) {
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii++) {
      const entry = entries[ii];
      if (predicate.call(context, entry[1], entry[0], collection)) {
        return true;
      }
    }
    return false;
  }

  const nodes = node.nodes;
  for (let ii = 0, size = nodes.length; ii < size; ii++) {
    const child = nodes[ii];
    if (child && mapRootSome(child, predicate, context, collection)) {
      return true;
    }
  }
  return false;
}

function mapRootCount(node, predicate, context, collection) {
  if (node.constructor === ValueNode) {
    return predicate.call(context, node.value, node.key, collection) ? 1 : 0;
  }

  if (node.constructor === ArrayMapNode) {
    let count = 0;
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii += 2) {
      if (predicate.call(context, entries[ii + 1], entries[ii], collection)) {
        count++;
      }
    }
    return count;
  }

  if (node.constructor === HashCollisionNode) {
    let count = 0;
    const entries = node.entries;
    for (let ii = 0, size = entries.length; ii < size; ii++) {
      const entry = entries[ii];
      if (predicate.call(context, entry[1], entry[0], collection)) {
        count++;
      }
    }
    return count;
  }

  let count = 0;
  const nodes = node.nodes;
  for (let ii = 0, size = nodes.length; ii < size; ii++) {
    const child = nodes[ii];
    if (child) {
      count += mapRootCount(child, predicate, context, collection);
    }
  }
  return count;
}

function mapRootReduce(
  node,
  reducer,
  reduction,
  context,
  collection,
  useFirst,
  reverse
) {
  const reductionRef = { value: reduction, useFirst };
  mapRootReduceIntoRef(
    node,
    reducer,
    reductionRef,
    context,
    collection,
    reverse
  );
  return reductionRef.value;
}

function mapRootReduceWithInitial(
  node,
  reducer,
  reduction,
  context,
  collection,
  reverse
) {
  if (node.constructor === ValueNode) {
    return reducer.call(context, reduction, node.value, node.key, collection);
  }

  if (node.constructor === ArrayMapNode) {
    const entries = node.entries;
    const maxIndex = entries.length - 2;
    for (let ii = 0; ii <= maxIndex; ii += 2) {
      const entryIndex = reverse ? maxIndex - ii : ii;
      reduction = reducer.call(
        context,
        reduction,
        entries[entryIndex + 1],
        entries[entryIndex],
        collection
      );
    }
    return reduction;
  }

  if (node.constructor === HashCollisionNode) {
    const entries = node.entries;
    for (let ii = 0, maxIndex = entries.length - 1; ii <= maxIndex; ii++) {
      const entry = entries[reverse ? maxIndex - ii : ii];
      reduction = reducer.call(
        context,
        reduction,
        entry[1],
        entry[0],
        collection
      );
    }
    return reduction;
  }

  const nodes = node.nodes;
  if (reverse) {
    for (let ii = nodes.length - 1; ii >= 0; ii--) {
      const child = nodes[ii];
      if (child) {
        reduction = mapRootReduceWithInitial(
          child,
          reducer,
          reduction,
          context,
          collection,
          reverse
        );
      }
    }
  } else {
    for (let ii = 0, size = nodes.length; ii < size; ii++) {
      const child = nodes[ii];
      if (child) {
        reduction = mapRootReduceWithInitial(
          child,
          reducer,
          reduction,
          context,
          collection,
          reverse
        );
      }
    }
  }
  return reduction;
}

function mapRootReduceIntoRef(
  node,
  reducer,
  reductionRef,
  context,
  collection,
  reverse
) {
  if (node.constructor === ValueNode) {
    reduceValueIntoRef(
      reducer,
      reductionRef,
      context,
      collection,
      node.value,
      node.key
    );
    return;
  }

  if (node.constructor === ArrayMapNode) {
    const entries = node.entries;
    const maxIndex = entries.length - 2;
    for (let ii = 0; ii <= maxIndex; ii += 2) {
      const entryIndex = reverse ? maxIndex - ii : ii;
      reduceValueIntoRef(
        reducer,
        reductionRef,
        context,
        collection,
        entries[entryIndex + 1],
        entries[entryIndex]
      );
    }
    return;
  }

  if (node.constructor === HashCollisionNode) {
    const entries = node.entries;
    for (let ii = 0, maxIndex = entries.length - 1; ii <= maxIndex; ii++) {
      const entry = entries[reverse ? maxIndex - ii : ii];
      reduceValueIntoRef(
        reducer,
        reductionRef,
        context,
        collection,
        entry[1],
        entry[0]
      );
    }
    return;
  }

  const nodes = node.nodes;
  if (reverse) {
    for (let ii = nodes.length - 1; ii >= 0; ii--) {
      const child = nodes[ii];
      if (child) {
        mapRootReduceIntoRef(
          child,
          reducer,
          reductionRef,
          context,
          collection,
          reverse
        );
      }
    }
  } else {
    for (let ii = 0, size = nodes.length; ii < size; ii++) {
      const child = nodes[ii];
      if (child) {
        mapRootReduceIntoRef(
          child,
          reducer,
          reductionRef,
          context,
          collection,
          reverse
        );
      }
    }
  }
}

function reduceValueIntoRef(
  reducer,
  reductionRef,
  context,
  collection,
  value,
  key
) {
  if (reductionRef.useFirst) {
    reductionRef.useFirst = false;
    reductionRef.value = value;
  } else {
    reductionRef.value = reducer.call(
      context,
      reductionRef.value,
      value,
      key,
      collection
    );
  }
}

function mapRootFirst(node, reverse) {
  if (node.constructor === ValueNode) {
    return node.value;
  }

  if (node.constructor === ArrayMapNode) {
    const entries = node.entries;
    return reverse ? entries[entries.length - 1] : entries[1];
  }

  if (node.constructor === HashCollisionNode) {
    const entries = node.entries;
    return entries[reverse ? entries.length - 1 : 0][1];
  }

  const nodes = node.nodes;
  if (reverse) {
    for (let ii = nodes.length - 1; ii >= 0; ii--) {
      const child = nodes[ii];
      if (child) {
        return mapRootFirst(child, reverse);
      }
    }
  } else {
    for (let ii = 0, size = nodes.length; ii < size; ii++) {
      const child = nodes[ii];
      if (child) {
        return mapRootFirst(child, reverse);
      }
    }
  }
  return NOT_SET;
}

function mapRootFindEntry(node, predicate, context, collection, reverse) {
  if (node.constructor === ValueNode) {
    return predicate.call(context, node.value, node.key, collection)
      ? [node.key, node.value]
      : NOT_SET;
  }

  if (node.constructor === ArrayMapNode) {
    const entries = node.entries;
    const maxIndex = entries.length - 2;
    for (let ii = 0; ii <= maxIndex; ii += 2) {
      const entryIndex = reverse ? maxIndex - ii : ii;
      const key = entries[entryIndex];
      const value = entries[entryIndex + 1];
      if (predicate.call(context, value, key, collection)) {
        return [key, value];
      }
    }
    return NOT_SET;
  }

  if (node.constructor === HashCollisionNode) {
    const entries = node.entries;
    for (let ii = 0, maxIndex = entries.length - 1; ii <= maxIndex; ii++) {
      const entry = entries[reverse ? maxIndex - ii : ii];
      if (predicate.call(context, entry[1], entry[0], collection)) {
        return [entry[0], entry[1]];
      }
    }
    return NOT_SET;
  }

  const nodes = node.nodes;
  if (reverse) {
    for (let ii = nodes.length - 1; ii >= 0; ii--) {
      const child = nodes[ii];
      if (child) {
        const entry = mapRootFindEntry(
          child,
          predicate,
          context,
          collection,
          reverse
        );
        if (entry !== NOT_SET) {
          return entry;
        }
      }
    }
  } else {
    for (let ii = 0, size = nodes.length; ii < size; ii++) {
      const child = nodes[ii];
      if (child) {
        const entry = mapRootFindEntry(
          child,
          predicate,
          context,
          collection,
          reverse
        );
        if (entry !== NOT_SET) {
          return entry;
        }
      }
    }
  }
  return NOT_SET;
}

function mergeEntriesIntoMap(map, entries) {
  for (let ii = 0, size = entries.length; ii < size; ii++) {
    const entry = entries[ii];
    if (entry) {
      const type = typeof entry;
      if (type !== 'object' && type !== 'function') {
        throw new TypeError('Expected [K, V] tuple: ' + entry);
      }
      const indexedCollection = entry[IS_COLLECTION_SYMBOL];
      map.set(
        indexedCollection ? entry.get(0) : entry[0],
        indexedCollection ? entry.get(1) : entry[1]
      );
    }
  }
}

function mergeEntriesWithIntoMap(map, entries, merger) {
  for (let ii = 0, size = entries.length; ii < size; ii++) {
    const entry = entries[ii];
    if (entry) {
      const type = typeof entry;
      if (type !== 'object' && type !== 'function') {
        throw new TypeError('Expected [K, V] tuple: ' + entry);
      }
      const indexedCollection = entry[IS_COLLECTION_SYMBOL];
      const key = indexedCollection ? entry.get(0) : entry[0];
      const value = indexedCollection ? entry.get(1) : entry[1];
      const oldValue = map.get(key, NOT_SET);
      map.set(key, oldValue === NOT_SET ? value : merger(oldValue, value, key));
    }
  }
}

function deleteAllArray(map, keys) {
  const size = keys.length;
  if (size === 0) {
    return map;
  }
  return map.withMutations((mutable) => {
    for (let ii = 0; ii < size; ii++) {
      mutable.remove(keys[ii]);
    }
  });
}

function removeMap(map, k) {
  if (!map._root || map.__ownerID) {
    return updateMap(map, k, NOT_SET);
  }
  const newRoot = map._root.remove(0, undefined, k);
  if (newRoot === map._root) {
    return map;
  }
  return newRoot ? makeMap(map.size - 1, newRoot) : emptyMap();
}

function updateMap(map, k, v) {
  let newRoot;
  let newSize;
  if (!map._root) {
    if (v === NOT_SET) {
      return map;
    }
    newSize = 1;
    newRoot = new ArrayMapNode(map.__ownerID, [k, v]);
  } else {
    const didChangeSize = MakeRef();
    const didAlter = MakeRef();
    newRoot = updateNode(
      map._root,
      map.__ownerID,
      0,
      undefined,
      k,
      v,
      didChangeSize,
      didAlter
    );
    if (!didAlter.value) {
      return map;
    }
    newSize = map.size + (didChangeSize.value ? (v === NOT_SET ? -1 : 1) : 0);
  }
  if (map.__ownerID) {
    map.size = newSize;
    map._root = newRoot;
    map.__hash = undefined;
    map.__altered = true;
    return map;
  }
  return newRoot ? makeMap(newSize, newRoot) : emptyMap();
}

function updateNode(
  node,
  ownerID,
  shift,
  keyHash,
  key,
  value,
  didChangeSize,
  didAlter
) {
  if (!node) {
    if (value === NOT_SET) {
      return node;
    }
    SetRef(didAlter);
    SetRef(didChangeSize);
    return new ValueNode(ownerID, keyHash, key, value);
  }
  return node.update(
    ownerID,
    shift,
    keyHash,
    key,
    value,
    didChangeSize,
    didAlter
  );
}

function isKeyEqual(valueA, valueB) {
  if (valueA !== valueA && valueB !== valueB) {
    return true;
  }
  if (!valueA || !valueB) {
    return false;
  }
  const typeA = typeof valueA;
  const typeB = typeof valueB;
  if (
    typeA !== 'object' &&
    typeA !== 'function' &&
    typeB !== 'object' &&
    typeB !== 'function'
  ) {
    return false;
  }
  return is(valueA, valueB);
}

function isLeafNode(node) {
  return (
    node.constructor === ValueNode || node.constructor === HashCollisionNode
  );
}

function mergeIntoNode(node, ownerID, shift, keyHash, entry) {
  if (node.keyHash === keyHash) {
    return new HashCollisionNode(ownerID, keyHash, [
      [node.key, node.value],
      entry,
    ]);
  }

  const idx1 = (shift === 0 ? node.keyHash : node.keyHash >>> shift) & MASK;
  const idx2 = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;

  let newNode;
  const nodes =
    idx1 === idx2
      ? [mergeIntoNode(node, ownerID, shift + SHIFT, keyHash, entry)]
      : ((newNode = new ValueNode(ownerID, keyHash, entry[0], entry[1])),
        idx1 < idx2 ? [node, newNode] : [newNode, node]);

  return new BitmapIndexedNode(ownerID, (1 << idx1) | (1 << idx2), nodes);
}

function createNodes(ownerID, entries, key, value) {
  if (!ownerID) {
    ownerID = new OwnerID();
  }
  let node = new ValueNode(ownerID, hash(key), key, value);
  for (let ii = 0, len = entries.length; ii < len; ii += 2) {
    node = node.update(ownerID, 0, undefined, entries[ii], entries[ii + 1]);
  }
  return node;
}

function packNodes(ownerID, nodes, count, excluding) {
  let bitmap = 0;
  let packedII = 0;
  const packedNodes = new Array(count);
  for (let ii = 0, bit = 1, len = nodes.length; ii < len; ii++, bit <<= 1) {
    const node = nodes[ii];
    if (node !== undefined && ii !== excluding) {
      bitmap |= bit;
      packedNodes[packedII++] = node;
    }
  }
  return new BitmapIndexedNode(ownerID, bitmap, packedNodes);
}

function expandNodes(ownerID, nodes, bitmap, including, node) {
  let count = 0;
  const expandedNodes = new Array(SIZE);
  for (let ii = 0; bitmap !== 0; ii++, bitmap >>>= 1) {
    expandedNodes[ii] = bitmap & 1 ? nodes[count++] : undefined;
  }
  expandedNodes[including] = node;
  return new HashArrayMapNode(ownerID, count + 1, expandedNodes);
}

function popCount(x) {
  x -= (x >> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
  x = (x + (x >> 4)) & 0x0f0f0f0f;
  x += x >> 8;
  x += x >> 16;
  return x & 0x7f;
}

function setAt(array, idx, val, canEdit) {
  const newArray = canEdit ? array : arrCopy(array);
  newArray[idx] = val;
  return newArray;
}

function spliceIn(array, idx, val, canEdit) {
  const newLen = array.length + 1;
  if (canEdit && idx + 1 === newLen) {
    array[idx] = val;
    return array;
  }
  const newArray = new Array(newLen);
  let after = 0;
  for (let ii = 0; ii < newLen; ii++) {
    if (ii === idx) {
      newArray[ii] = val;
      after = -1;
    } else {
      newArray[ii] = array[ii + after];
    }
  }
  return newArray;
}

function spliceOut(array, idx, canEdit) {
  const newLen = array.length - 1;
  if (canEdit && idx === newLen) {
    array.pop();
    return array;
  }
  const newArray = new Array(newLen);
  let after = 0;
  for (let ii = 0; ii < newLen; ii++) {
    if (ii === idx) {
      after = 1;
    }
    newArray[ii] = array[ii + after];
  }
  return newArray;
}

const MAX_ARRAY_MAP_SIZE = SIZE / 4;
const MAX_BITMAP_INDEXED_SIZE = SIZE / 2;
const MIN_HASH_ARRAY_MAP_SIZE = SIZE / 4;
