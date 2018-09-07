/**
 * Decorator function that allows caching values for ES6 getter functions.
 */
export default function Memoize() {
  return (target: object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
    if (descriptor.get != null) {
      descriptor.get = getNewFunction(descriptor.get);
    } else {
      throw new Error("Only use @Memoize() with get accessors");
    }
  };
}

// object instance -> object property -> value
const returnedValueCache: WeakMap<any, WeakMap<any, any>> = new WeakMap();

function getNewFunction(originalMethod: () => void) {
  // The function returned here gets called instead of originalMethod.
  return function(this: any, ...args: any[]) {
    if (!returnedValueCache.has(this)) {
      returnedValueCache.set(this, new WeakMap());
    }
    if (!returnedValueCache.get(this)!.has(originalMethod)) {
      const returnedValue = originalMethod.apply(this, args);
      returnedValueCache.get(this)!.set(originalMethod, returnedValue);
      return returnedValue;
    } else {
      return returnedValueCache.get(this)!.get(originalMethod);
    }
  };
}
