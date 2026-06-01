import Map from 'immutable';

describe('ImmutableMap package', () => {
  it('exports Map as the default API', () => {
    const map = Map({ b: 2, a: 1 });

    expect(map.get('a')).toBe(1);
    expect(map.set('a', 1)).toBe(map);
    expect(Map.isMap(map)).toBe(true);
  });

  it('keeps the Map-only runtime surface', () => {
    const map = Map({ b: 2, a: 1 });

    expect(Map.of).toBeUndefined();
    expect(map.toList).toBeUndefined();
    expect(map.toSet).toBeUndefined();
    expect(map.toOrderedMap).toBeUndefined();
    expect(map.sort().toString()).toBe('Map { "a": 1, "b": 2 }');
  });

  it('preserves Immutable key equality semantics', () => {
    const stringObject = new String('key');
    const date = new Date(123);
    const symbol = Symbol('symbol');
    const map = Map()
      .set(stringObject, 'boxed')
      .set(date, 'date')
      .set(NaN, 'nan')
      .set(symbol, 'symbol');

    expect(map.get('key')).toBe('boxed');
    expect(map.get(123)).toBe('date');
    expect(map.get(NaN)).toBe('nan');
    expect(map.get(symbol)).toBe('symbol');
  });

  it('preserves Map hash semantics', () => {
    const first = Map({ a: 1, b: 2 }).set(NaN, 'nan');
    const second = Map({ b: 2, a: 1 }).set(NaN, 'nan');
    const changed = second.set('c', 3);

    expect(first.hashCode()).toBe(second.hashCode());
    expect(first.hashCode()).not.toBe(changed.hashCode());
    expect(first.hashCode()).toBe(first.hashCode());
  });

  it('preserves constructor duplicate key equality semantics', () => {
    const stringObject = new String('key');
    const date = new Date(123);
    const map = Map([
      [stringObject, 'boxed'],
      ['key', 'primitive'],
      [date, 'date'],
      [123, 'number'],
      [NaN, 'first nan'],
      [NaN, 'second nan'],
    ]);

    expect(map.size).toBe(3);
    expect(map.get(stringObject)).toBe('primitive');
    expect(map.get(date)).toBe('number');
    expect(map.get(NaN)).toBe('second nan');
  });

  it('accepts collection-like constructor entries', () => {
    const entry = {
      '@@__IMMUTABLE_ITERABLE__@@': true,
      get(index: number) {
        return index === 0 ? 'key' : 'value';
      },
    };

    const map = Map([entry as unknown as [string, string]]);

    expect(map.get('key')).toBe('value');
  });

  it('rejects non-entry constructor values', () => {
    expect(() => Map([1 as unknown as [unknown, unknown]])).toThrow(
      'Expected [K, V] tuple: 1'
    );
  });

  it('constructs from object symbol keys', () => {
    const symbol = Symbol('key');
    const map = Map({ [symbol]: 'value' });

    expect(map.get(symbol)).toBe('value');
  });

  it('constructs from objects with Immutable marker-named keys', () => {
    const map = Map({ '@@__IMMUTABLE_ITERABLE__@@': true, a: 1 });

    expect(map.size).toBe(2);
    expect(map.get('@@__IMMUTABLE_ITERABLE__@@')).toBe(true);
    expect(map.get('a')).toBe(1);
  });

  it('reports key presence independent of stored value', () => {
    const map = Map().set('defined', undefined);

    expect(map.has('defined')).toBe(true);
    expect(map.has('missing')).toBe(false);
  });

  it('gets values from key paths', () => {
    const nested = Map({
      a: Map({
        b: Map({
          c: 10,
        }),
      }),
    });

    expect(nested.getIn(['a'])).toBe(nested.get('a'));
    expect(nested.getIn(['a', 'b', 'c'])).toBe(10);
    expect(nested.getIn(['a', 'x'], 'missing')).toBe('missing');
    expect(nested.getIn([])).toBe(nested);
    expect(() => nested.getIn('abc' as unknown as Array<string>)).toThrow(
      TypeError
    );
  });

  it('updates keyed values', () => {
    const map = Map({ a: 1 });

    expect(
      map.update('a', (value: number | undefined) => value! + 1).get('a')
    ).toBe(2);
    expect(map.update('b', (value: number | undefined) => value)).toBe(map);
    expect(map.update('b', 10, (value: number) => value)).toBe(map);
    expect(map.update('b', 10, (value: number) => value + 1).get('b')).toBe(11);
    expect(map.update((value: typeof map) => value.set('c', 3)).get('c')).toBe(
      3
    );
  });

  it('removes keyed values persistently', () => {
    const map = Map().withMutations((mutable) => {
      mutable.set('a', 1);
      mutable.set('b', 2);
    });
    const result = map.remove('a');

    expect(result.toObject()).toEqual({ b: 2 });
    expect(map.toObject()).toEqual({ a: 1, b: 2 });
    expect(map.remove('missing')).toBe(map);
  });

  it('preserves scan method behavior', () => {
    const context = { limit: 4 };
    const map = Map({ a: 1, b: 2, c: 3 }).set('nan', NaN);
    const every = jest.fn(function (
      this: typeof context,
      value: number,
      key: string,
      collection: typeof map
    ) {
      expect(collection).toBe(map);
      return key === 'nan' || value < this.limit;
    });
    const some = jest.fn((value: number) => value === 2);
    const find = jest.fn((value: number) => value === 3);
    const forEach = jest.fn((value: number) => value !== 2);

    expect(map.includes(NaN)).toBe(true);
    expect(map.keyOf(NaN)).toBe('nan');
    expect(Map({ first: 1, second: 1 }).lastKeyOf(1)).toBe('second');
    expect(
      Map().set(undefined, 'target').set('later', 'target').keyOf('target')
    ).toBe(undefined);
    expect(
      Map().set(undefined, 'target').set('later', 'target').lastKeyOf('target')
    ).toBe('later');
    expect(
      Map()
        .set(undefined, 'target')
        .remove(undefined)
        .set('later', 'target')
        .keyOf('target')
    ).toBe('later');
    expect(map.first()).toBe(map.valueSeq().first());
    expect(map.last()).toBe(map.valueSeq().last());
    expect(
      Map().set('first', undefined).set('second', 2).first('missing')
    ).toBe(undefined);
    expect(Map().first('missing')).toBe('missing');
    expect(Map().last('missing')).toBe('missing');
    expect(map.every(every, context)).toBe(true);
    expect(map.some(some)).toBe(true);
    expect(some).toHaveBeenCalledTimes(2);
    expect(map.forEach(forEach)).toBe(2);
    expect(forEach).toHaveBeenCalledTimes(2);
    expect(map.find(find)).toBe(3);
    expect(find).toHaveBeenCalledTimes(3);
    expect(map.findEntry((value: number) => value === 2)).toEqual(['b', 2]);
    expect(map.findKey((value: number) => value === 2)).toBe('b');
    expect(
      Map({ a: undefined }).findEntry((value) => value === undefined)
    ).toEqual(['a', undefined]);
    expect(map.findLast((value: number) => value < 3)).toBe(
      map
        .toSeq()
        .reverse()
        .find((value: number) => value < 3)
    );
    expect(map.findLastEntry((value: number) => value < 3)).toEqual(
      map
        .toSeq()
        .reverse()
        .findEntry((value: number) => value < 3)
    );
    expect(map.findLastKey((value: number) => value < 3)).toBe(
      map
        .toSeq()
        .reverse()
        .findKey((value: number) => value < 3)
    );
    expect(map.count()).toBe(4);
    expect(
      map.count(function (this: typeof context, value: number, key: string) {
        expect(this).toBe(context);
        return key === 'nan' || value < this.limit;
      }, context)
    ).toBe(4);
    expect(Map().count(() => true)).toBe(0);
    expect(Map().find(() => true, undefined, 'missing')).toBe('missing');
    expect(Map().findLast(() => true, undefined, 'missing')).toBe('missing');
    expect(map.reduce((total: number, value: number) => total + value, 0)).toBe(
      NaN
    );
    expect(
      map.remove('nan').reduce((total: number, value: number) => total + value)
    ).toBe(6);
    expect(
      map
        .remove('nan')
        .reduceRight((total: number, value: number) => total + value, 0)
    ).toBe(6);
  });

  it('preserves map and filter behavior', () => {
    const context = { offset: 10, minimum: 2 };
    const map = Map({ a: 1, b: 2, c: 3 });
    const mapper = jest.fn(function (
      this: typeof context,
      value: number,
      key: string,
      collection: typeof map
    ) {
      expect(collection).toBe(map);
      return value + this.offset + key.length;
    });
    const predicate = jest.fn(function (
      this: typeof context,
      value: number,
      key: string,
      collection: typeof map
    ) {
      expect(collection).toBe(map);
      return value >= this.minimum || key === 'a';
    });

    expect(map.map(mapper, context).toObject()).toEqual({
      a: 12,
      b: 13,
      c: 14,
    });
    expect(mapper).toHaveBeenCalledTimes(3);
    expect(map.map((value: number) => value)).toBe(map);
    expect(
      map
        .mapKeys(function (
          this: typeof context,
          key: string,
          value: number,
          collection: typeof map
        ) {
          expect(this).toBe(context);
          expect(collection).toBe(map);
          return key + (value + this.offset);
        }, context)
        .toObject()
    ).toEqual({
      a11: 1,
      b12: 2,
      c13: 3,
    });
    expect(map.mapKeys((key) => key)).not.toBe(map);
    expect(map.mapKeys(() => 'same').toObject()).toEqual({ same: 3 });
    const mappedEntriesCalls: Array<[string, number, number, boolean]> = [];
    expect(
      map
        .mapEntries(function (
          this: typeof context,
          entry: [string, number],
          index: number,
          collection: typeof map
        ) {
          expect(this).toBe(context);
          mappedEntriesCalls.push([
            entry[0],
            entry[1],
            index,
            collection === map,
          ]);
          return [entry[0] + index, entry[1] + this.offset];
        }, context)
        .toObject()
    ).toEqual({
      a0: 11,
      b1: 12,
      c2: 13,
    });
    expect(mappedEntriesCalls).toEqual([
      ['a', 1, 0, true],
      ['b', 2, 1, true],
      ['c', 3, 2, true],
    ]);
    expect(map.mapEntries(([key, value]) => [key, value])).not.toBe(map);
    expect(map.mapEntries(() => ['same', 1]).toObject()).toEqual({ same: 1 });
    expect(map.mapEntries(() => null).toObject()).toEqual({});
    expect(() =>
      map.mapEntries(() => 1 as unknown as [string, number])
    ).toThrow('Expected [K, V] tuple: 1');
    expect(map.flip().toObject()).toEqual({ 1: 'a', 2: 'b', 3: 'c' });
    expect(Map({ a: 1, b: 1, c: 2 }).flip().toObject()).toEqual({
      1: 'b',
      2: 'c',
    });
    expect(map.filter(predicate, context).toObject()).toEqual({
      a: 1,
      b: 2,
      c: 3,
    });
    expect(predicate).toHaveBeenCalledTimes(3);
    expect(map.filter(() => true)).not.toBe(map);
    expect(map.filterNot(() => false)).not.toBe(map);
  });

  it('merges maps and keyed inputs', () => {
    const symbol = Symbol('merged');
    const map = Map({ a: 1, b: 2 });
    const sourceMap = Map({ b: 3, c: 4 });
    const sourceObject = { b: 5, [symbol]: 7 };

    expect(map.merge(sourceMap).toObject()).toEqual({ a: 1, b: 3, c: 4 });
    expect(map.merge(sourceObject).toObject()).toEqual({
      a: 1,
      b: 5,
      [symbol]: 7,
    });
    expect(map.merge(sourceObject).get(symbol)).toBe(7);
    expect(map.concat([['b', 6]]).toObject()).toEqual({ a: 1, b: 6 });
    expect(Map().merge(sourceMap)).toBe(sourceMap);
  });

  it('merges maps with a merger function', () => {
    const map = Map({ a: 1, b: 2 });
    const sourceMap = Map({ b: 3, c: 4 });
    const sourceObject = { b: 5, c: 6 };
    const merger = jest.fn((left: number, right: number) => left + right);

    expect(map.mergeWith(merger, sourceMap).toObject()).toEqual({
      a: 1,
      b: 5,
      c: 4,
    });
    expect(merger).toHaveBeenCalledTimes(1);
    expect(merger).toHaveBeenCalledWith(2, 3, 'b');
    expect(map.mergeWith(merger, sourceObject).toObject()).toEqual({
      a: 1,
      b: 7,
      c: 6,
    });
    expect(map.mergeWith(merger, [['b', 8]]).toObject()).toEqual({
      a: 1,
      b: 10,
    });
    expect(() =>
      map.mergeWith(1 as unknown as typeof merger, sourceMap)
    ).toThrow(TypeError);
    expect(Map().mergeWith(merger, sourceMap)).toBe(sourceMap);
  });

  it('deletes keys from arrays', () => {
    const keys = ['a'] as Array<string | undefined>;
    keys.length = 2;

    const map = Map({ a: 1, b: 2 }).set(undefined, 3);
    const result = map.deleteAll(keys);

    expect(result.has('a')).toBe(false);
    expect(result.has(undefined)).toBe(false);
    expect(result.get('b')).toBe(2);
  });

  it('deletes keys from large sparse arrays', () => {
    const keys = new Array(64) as Array<string | undefined>;
    keys[0] = 'a';
    keys[63] = 'b';

    const map = Map({ a: 1, b: 2, c: 3 }).set(undefined, 4);
    const result = map.deleteAll(keys);

    expect(result.has('a')).toBe(false);
    expect(result.has('b')).toBe(false);
    expect(result.has(undefined)).toBe(false);
    expect(result.get('c')).toBe(3);
  });

  it('does not expose prototype pollution keys in JS conversions', () => {
    const protoResult = Map().set('__proto__', { admin: true }).toJS() as {
      admin?: boolean;
    };

    expect(Object.prototype.hasOwnProperty.call(protoResult, '__proto__')).toBe(
      false
    );
    expect(protoResult.admin).toBeUndefined();
    expect(Object.getPrototypeOf(protoResult).admin).toBeUndefined();

    const constructorResult = Map()
      .set('constructor', { prototype: { admin: true } })
      .toObject();

    expect(
      Object.prototype.hasOwnProperty.call(constructorResult, 'constructor')
    ).toBe(false);
  });

  it('preserves direct conversion behavior', () => {
    const symbol = Symbol('direct');
    const map = Map({ a: 1, b: 2 })
      .set(symbol, 3)
      .set('__proto__', 4)
      .set('constructor', 5);
    const object = map.toObject() as { a: number; b: number; [symbol]: number };

    expect(map.toArray()).toEqual([
      ['a', 1],
      ['b', 2],
      [symbol, 3],
      ['__proto__', 4],
      ['constructor', 5],
    ]);
    expect(object.a).toBe(1);
    expect(object.b).toBe(2);
    expect(object[symbol]).toBe(3);
    expect(Object.prototype.hasOwnProperty.call(object, '__proto__')).toBe(
      false
    );
    expect(Object.prototype.hasOwnProperty.call(object, 'constructor')).toBe(
      false
    );
    expect(Map({ nested: Map({ value: 6 }) }).toJS()).toEqual({
      nested: { value: 6 },
    });
  });
});
