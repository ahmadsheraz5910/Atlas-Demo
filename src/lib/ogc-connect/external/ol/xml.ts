/**
 * @module ol/xml
 */
import {extend} from './array.js';
import jsdom from 'jsdom'
/**
 * When using {@link module:ol/xml.makeChildAppender} or
 * {@link module:ol/xml.makeSimpleNodeFactory}, the top `objectStack` item needs
 * to have this structure.
 * @typedef {Object} NodeStackItem
 * @property {Element} node Node.
 */

/**
 * @typedef {function(Element, Array<*>): void} Parser
 */


export type Parser = (node:Element, objectStack:Array<any>) => any;


/**
 * A regular expression that matches if a string only contains whitespace
 * characters. It will e.g. match `''`, `' '`, `'\n'` etc.
 */
export const ONLY_WHITESPACE_RE = /^\s*$/;

/**
 * @type {string}
 */
export const XML_SCHEMA_INSTANCE_URI: string =
  'http://www.w3.org/2001/XMLSchema-instance';


/**
 * @param {Element} node Node.
 * @param {?string} namespaceURI Namespace URI.
 * @param {string} name Attribute name.
 * @return {string} Value
 */
export function getAttributeNS(node: Element, namespaceURI: string | null, name: string): string {
  return node.getAttributeNS(namespaceURI, name) || '';
}

/**
 * Recursively grab all text content of child nodes into a single string.
 * @param {Node} node Node.
 * @param {boolean} normalizeWhitespace Normalize whitespace: remove all line
 * breaks.
 * @return {string} All text content.
 * @api
 */
export function getAllTextContent(node: Node, normalizeWhitespace: boolean): string {
  return getAllTextContent_(node, normalizeWhitespace, []).join('');
}

/**
 * Recursively grab all text content of child nodes into a single string.
 * @param {Node} node Node.
 * @param {boolean} normalizeWhitespace Normalize whitespace: remove all line
 * breaks.
 * @param {Array<string>} accumulator Accumulator.
 * @private
 * @return {Array<string>} Accumulator.
 */
function getAllTextContent_(node: Node, normalizeWhitespace: boolean, accumulator: Array<string>): Array<string> {
  if (
    node.nodeType == 4 ||
    node.nodeType == 3
  ) {
    if (normalizeWhitespace) {
      accumulator.push(String(node.nodeValue).replace(/(\r\n|\r|\n)/g, ''));
    } else {
      if (node.nodeValue) accumulator.push(node.nodeValue);
    }
  } else {
    let n;
    for (n = node.firstChild; n; n = n.nextSibling) {
      getAllTextContent_(n, normalizeWhitespace, accumulator);
    }
  }
  return accumulator;
}

/**
 * @param {Object} object Object.
 * @return {boolean} Is a document.
 */
export function isDocument(object: object): boolean {
  return 'documentElement' in object;
}


/**
 * Parse an XML string to an XML Document.
 * @param {string} xml XML.
 * @return {Document} Document.
 * @api
 */
export function parse(xml: string): Document | undefined {
  try {
    return new jsdom.JSDOM(xml, {
      contentType:"text/xml",
      pretendToBeVisual:true
    }).window.document
  }
  catch(e){
    console.log(e)
  }
}

/**
 * Make an array extender function for extending the array at the top of the
 * object stack.
 * @param {function(this: T, Node, Array<*>): (Array<*>|undefined)} valueReader Value reader.
 * @param {T} [thisArg] The object to use as `this` in `valueReader`.
 * @return {Parser} Parser.
 * @template T
 */
export function makeArrayExtender<T>(
  valueReader: (arg1: Element, arg2: Array<any>) => (Array<any> | undefined), 
  thisArg?: T
): Parser {
  return (
    /**
     * @param {Node} node Node.
     * @param {Array<*>} objectStack Object stack.
     */
    function (this:T, node: Element, objectStack: Array<any>) {
      const value = valueReader.call(
        thisArg !== undefined ? thisArg : this,
        node,
        objectStack
      );
      if (value !== undefined) {
        const array = /** @type {Array<*>} */ (
          objectStack[objectStack.length - 1]
        );
        extend(array, value);
      }
    }
  );
}

/**
 * Make an array pusher function for pushing to the array at the top of the
 * object stack.
 * @param {function(this: T, Element, Array<*>): *} valueReader Value reader.
 * @param {T} [thisArg] The object to use as `this` in `valueReader`.
 * @return {Parser} Parser.
 * @template T
 */
export function makeArrayPusher<T>(
    valueReader: (this: T, arg1: Element, arg2: Array<any>) => void, 
    thisArg?: T
  ): Parser {
  return (
    /**
     * @param {Element} node Node.
     * @param {Array<*>} objectStack Object stack.
     */
    function (this:T, node: Element, objectStack: Array<any>) {
      const value = valueReader.call(
        thisArg !== undefined ? thisArg : this,
        node,
        objectStack
      );
      if (value !== undefined) {
        const array = /** @type {Array<*>} */ (
          objectStack[objectStack.length - 1]
        );
        array.push(value);
      }
    }
  );
}

/**
 * Make an object stack replacer function for replacing the object at the
 * top of the stack.
 * @param {function(this: T, Node, Array<*>): *} valueReader Value reader.
 * @param {T} [thisArg] The object to use as `this` in `valueReader`.
 * @return {Parser} Parser.
 * @template T
 */
export function makeReplacer<T>(
  valueReader: (this: T, arg1: Node, arg2: Array<any>) => void, 
  thisArg?: T
)
  : Parser {
  return (
    /**
     * @param {Node} node Node.
     * @param {Array<*>} objectStack Object stack.
     */
    function (this:T, node: Node, objectStack: Array<any>) {
      const value = valueReader.call(
        thisArg !== undefined ? thisArg : this,
        node,
        objectStack
      );
      if (value !== undefined) {
        objectStack[objectStack.length - 1] = value;
      }
    }
  );
}

/**
 * Make an object property pusher function for adding a property to the
 * object at the top of the stack.
 * @param {function(this: T, Element, Array<*>): *} valueReader Value reader.
 * @param {string} [property] Property.
 * @param {T} [thisArg] The object to use as `this` in `valueReader`.
 * @return {Parser} Parser.
 * @template T
 */
export function makeObjectPropertyPusher<T>(
  valueReader: (arg1: Element, arg2: Array<any>) => void, 
  property?: string, 
  thisArg?: T
  ): Parser {
  return (
    /**
     * @param {Element} node Node.
     * @param {Array<*>} objectStack Object stack.
     */
    function (this:T,node: Element, objectStack: Array<any>) {
      const value = valueReader.call(
        thisArg !== undefined ? thisArg : this,
        node,
        objectStack
      );
      if (value !== undefined) {
        const object = /** @type {!Object} */ (
          objectStack[objectStack.length - 1]
        );
        const name = property !== undefined ? property : node.localName;
        let array:any;
        if (name in object) {
          array = object[name];
        } else {
          array = [];
          object[name] = array;
        }
        array.push(value);
      }
    }
  );
}

/**
 * Make an object property setter function.
 * @param {function(this: T, Element, Array<*>): *} valueReader Value reader.
 * @param {string} [property] Property.
 * @param {T} [thisArg] The object to use as `this` in `valueReader`.
 * @return {Parser} Parser.
 * @template T
 */
export function makeObjectPropertySetter<T>
  (
    valueReader: (arg1: Element, arg2: Array<any>) => void, 
    property?: string, 
    thisArg?: T
  ): Parser {
  return (
    /**
     * @param {Element} node Node.
     * @param {Array<*>} objectStack Object stack.
     */
    function (this:T, node: Element, objectStack: Array<any>){
      const value = valueReader.call(
        thisArg !== undefined ? thisArg : this,
        node,
        objectStack
      );
      if (value !== undefined) {
        const object = /** @type {!Object} */ (
          objectStack[objectStack.length - 1]
        );
        const name = property !== undefined ? property : node.localName;
        object[name] = value;
      }
    }
  );
}



/**
 * Parse a node using the parsers and object stack.
 * @param {Object<string, Object<string, Parser>>} parsersNS
 *     Parsers by namespace.
 * @param {Element} node Node.
 * @param {Array<*>} objectStack Object stack.
 * @param {*} [thisArg] The object to use as `this`.
 */
export function parseNode(parsersNS: { [s: string]: {[key:string]:Parser} }, node: Element, objectStack: Array<any>, thisArg: any) {  
  let n;
  for (n = node.firstElementChild; n; n = n.nextElementSibling) {
    const parsers = parsersNS[n.namespaceURI ?? ""];
    if (parsers !== undefined) {
      const parser = parsers[n.localName];
      if (parser !== undefined) {
        parser.call(thisArg, n, objectStack);
      }
    }
  }
}

/**
 * Push an object on top of the stack, parse and return the popped object.
 * @param {T} object Object.
 * @param {Object<string, Object<string, Parser>>} parsersNS
 *     Parsers by namespace.
 * @param {Element} node Node.
 * @param {Array<*>} objectStack Object stack.
 * @param {*} [thisArg] The object to use as `this`.
 * @return {T} Object.
 * @template T
 */
export function pushParseAndPop<T>(
  object: T, 
  parsersNS: { [s: string]:{[key:string]:Parser}; }, 
  node: Element, 
  objectStack: Array<any>, 
  thisArg?: any
): T  {
  objectStack.push(object);
  parseNode(parsersNS, node, objectStack, thisArg);
  return /** @type {T} */ (objectStack.pop());
}


