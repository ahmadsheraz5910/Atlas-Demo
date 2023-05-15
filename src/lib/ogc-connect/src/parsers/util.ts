import { ONLY_WHITESPACE_RE, getAllTextContent } from "../../external/ol/xml";

/**
 * Verify if node is text node and return text within
 * @param node Element
 * @returns undefined | string
 */
export const getFromTextNode = (node:Element) => {
    if (
        node.childNodes.length === 0 ||
        (node.childNodes.length === 1 &&
        (node.firstChild.nodeType === 3 || node.firstChild.nodeType === 4))
    ) {
        let value = getAllTextContent(node, false)
        if (ONLY_WHITESPACE_RE.test(value)) {
            return undefined
        }
        return value;
    }
    
}
