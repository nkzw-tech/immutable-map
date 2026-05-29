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
});
