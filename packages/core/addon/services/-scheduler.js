import { assert } from "@ember/debug";
import { once } from "@ember/runloop";
import Service, { inject as service } from "@ember/service";
import { camelize } from "@ember/string";
import { task } from "ember-concurrency";
import { pluralize } from "ember-inflector";

/**
 * Decorator to define a type resolver in the scheduler service.
 *
 * @function typeResolver
 * @param {"group"|"user"} type The type of the objects to resolve
 * @returns {Function} The decorator function that returns an enqueued task to resolve the requested objects
 */
function typeResolver(type) {
  return task(function* () {
    const identifiers = [...this[type].identifiers];
    const callbacks = [...this[type].callbacks];

    this[type] = undefined;

    if (!identifiers.length) return;

    const methodName = camelize(`resolve-${pluralize(type)}`);
    const result = yield this.calumaOptions[methodName]?.(identifiers);

    yield Promise.all(callbacks.map((callback) => callback(result)));

    return result;
  }).enqueue();
}

export default class PrivateSchedulerService extends Service {
  @service calumaOptions;

  @typeResolver("group") resolveGroup;
  @typeResolver("user") resolveUser;

  /**
   * Resolve a certain object of a type only once in the runloop.
   *
   * This method adds the given identifier to a set of already requested
   * identifiers of a type and calls the resolve method of that type once in a
   * single render loop and then passes the resolved object to a passed
   * callback.
   *
   * @method resolveOnce
   * @param {String} identifier The identifier used to find the resolved object
   * @param {"group"|"user"} type The type of the object to resolve
   * @param {Function} callback The callback function to call after the object is resolved
   */
  resolveOnce(identifier, type, callback) {
    const _callback = (result) => {
      callback(
        result.find(
          (obj) =>
            String(obj[this.calumaOptions[`${type}IdentifierProperty`]]) ===
            String(identifier)
        )
      );
    };

    if (!this[type]) {
      this[type] = { identifiers: new Set(), callbacks: new Set() };
    }

    this[type].identifiers.add(identifier);
    this[type].callbacks.add(_callback);

    const typeResolverName = camelize(`resolve-${type}`);

    assert(
      `${typeResolverName} needs to be defined on the scheduler service`,
      typeResolverName in this
    );

    once(this[typeResolverName], "perform");
  }
}
