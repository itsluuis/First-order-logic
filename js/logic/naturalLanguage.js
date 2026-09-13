/**
 * naturalLanguage.js - Traductor Determinista de Lógica Simbólica a Lenguaje Natural
 * Convierte árboles AST de FBF en proposiciones moleculares en español coherentes,
 * respetando el mapeo explícito de variables definido por el usuario (determinismo).
 */

import { OPERATORS } from './ast.js';

export class NaturalLanguageTranslator {
  /**
   * Limpia y normaliza una frase en español para que encaje de manera fluida en la proposición.
   */
  static cleanSentence(str) {
    if (!str) return '';
    let cleaned = str.trim();
    // Remover punto final si existe
    if (cleaned.endsWith('.')) {
      cleaned = cleaned.slice(0, -1).trim();
    }
    return cleaned;
  }

  /**
   * Aplica negación en español a una proposición.
   * Si es un enunciado simple, inserta "No..." o "No es cierto que...".
   */
  static negateText(text, isCompound = false) {
    const trimmed = text.trim();
    if (!trimmed) return 'no ocurre dicha proposición';

    if (isCompound) {
      return `no es cierto que (${trimmed})`;
    }

    // Si ya empieza con "no ", podemos transformar en doble negación o prefijar
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('no ')) {
      return `es falso que ${trimmed}`;
    }

    // Minúscula al inicio para fluidez gramatical
    const firstCharLower = trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
    return `no ${firstCharLower}`;
  }

  /**
   * Traduce recursivamente un AST en una proposición molecular en español.
   * @param {Object} node - Nodo del AST
   * @param {Object} variableMap - Diccionario { p: "estudio para el examen", q: "apruebo la materia" }
   * @param {boolean} isRoot - Si es el nodo raíz
   */
  static toSpanish(node, variableMap = {}, isRoot = true) {
    if (!node) return '';

    if (node.type === 'variable') {
      const statement = variableMap[node.name];
      if (statement && statement.trim()) {
        return this.cleanSentence(statement);
      }
      return `[proposición ${node.name}]`;
    }

    if (node.type === 'unary') {
      if (node.op === OPERATORS.NOT) {
        const isChildCompound = node.operand.type === 'binary';
        const innerText = this.toSpanish(node.operand, variableMap, false);
        return this.negateText(innerText, isChildCompound);
      }
    }

    if (node.type === 'binary') {
      const leftText = this.toSpanish(node.left, variableMap, false);
      const rightText = this.toSpanish(node.right, variableMap, false);

      const isLeftCompound = node.left.type === 'binary';
      const isRightCompound = node.right.type === 'binary';

      const leftFormatted = isLeftCompound ? `(${leftText})` : leftText;
      const rightFormatted = isRightCompound ? `(${rightText})` : rightText;

      switch (node.op) {
        case OPERATORS.AND:
          // Conjunción
          return `${leftFormatted} y ${rightFormatted}`;

        case OPERATORS.OR:
          // Disyunción
          return `${leftFormatted} o ${rightFormatted}`;

        case OPERATORS.IMPLIES:
          // Condicional: Si A, entonces B
          return `si ${leftFormatted}, entonces ${rightFormatted}`;

        case OPERATORS.IFF:
          // Bicondicional: A si y solo si B
          return `${leftFormatted} si y solo si ${rightFormatted}`;

        default:
          return `${leftFormatted} ? ${rightFormatted}`;
      }
    }

    return '';
  }

  /**
   * Formatea la proposición final como una oración en español capitalizada y con punto final.
   */
  static formatCompleteSentence(rawText) {
    if (!rawText || !rawText.trim()) return '';
    let result = rawText.trim();
    // Capitalizar primera letra
    result = result.charAt(0).toUpperCase() + result.slice(1);
    if (!result.endsWith('.')) {
      result += '.';
    }
    return result;
  }
}
