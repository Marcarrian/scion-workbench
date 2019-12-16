/*
 * Copyright (c) 2018-2019 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 *  SPDX-License-Identifier: EPL-2.0
 */

import { QueryList } from '@angular/core'; // FIXME this module must not have an Angular dependency
import { Defined } from './defined.util';

/**
 * Provides array utility methods.
 */
export class Arrays {

  private constructor() {
  }

  /**
   * Creates an array from the given value, or returns the value if already an array.
   */
  public static from(value: string | string[]): string[] {
    if (!value || !value.length) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  }

  /**
   * Compares items of given arrays for reference equality.
   *
   * Use the parameter `exactOrder` to control if the item order must be equal (which is by default) or not.
   */
  public static isEqual(array1: any[], array2: any[], options?: { exactOrder?: boolean }): boolean {
    if (array1 === array2) {
      return true;
    }
    if (!array1 || !array2) {
      return false;
    }
    if (array1.length !== array2.length) {
      return false;
    }

    const exactOrder = Defined.orElse(options && options.exactOrder, true);
    return array1.every((item, index) => {
      if (exactOrder) {
        return item === array2[index];
      }
      else {
        return array2.includes(item);
      }
    });
  }

  /**
   * Finds the last item matching the given predicate, if any,
   * or returns the last item in the array if no predicate is specified.
   *
   * Returns `undefined` if no element is found.
   */
  public static last<T>(items: T[] | QueryList<T>, predicate?: (item: T) => boolean): T | undefined {
    const array = items ? (Array.isArray(items) ? items : items.toArray()) : [];

    if (!predicate) {
      return array[array.length - 1];
    }
    return [...array].reverse().find(predicate);
  }

  /**
   * Removes the specified element from an array, or the elements which satisfy the provided predicate function.
   * The original array will be changed.
   *
   * @param  array
   *         The array from which elements should be removed.
   * @param  element
   *         The element to be removed, or a predicate function to resolve elements which to be removed.
   * @param  options
   *         Control if to remove all occurrences of the element.
   * @return the elements removed from the array.
   */
  public static remove<T>(array: T[], element: any | ((element: T) => boolean), options: { firstOnly: boolean }): T[] {
    // define a function to resolve the element's index in the original array
    const indexOfElementFn = ((): () => number => {
      if (typeof element === 'function') {
        return (): number => array.findIndex(element);
      }
      else {
        return (): number => array.indexOf(element);
      }
    })();

    const removedElements = [];
    for (let i = indexOfElementFn(); i !== -1; i = indexOfElementFn()) {
      removedElements.push(...array.splice(i, 1)); // changes the original array
      if (options.firstOnly) {
        break;
      }
    }
    return removedElements;
  }

  /**
   * Removes duplicate items from the array. The original array will not be modified.
   *
   * Use the parameter `identityFn` to provide a function for comparing objects.
   */
  public static distinct<T>(items: T[], identityFn: (item: T) => any = (item: T): any => item): T[] {
    const visitedItems = new Set<T>();
    return items.filter(item => {
      const identity = identityFn(item);
      if (visitedItems.has(identity)) {
        return false;
      }
      visitedItems.add(identity);
      return true;
    });
  }
}
