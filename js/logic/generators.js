/**
 * generators.js - Generador Aleatorio de Proposiciones Moleculares y Fórmulas Bien Formadas (FBF)
 * Genera proposiciones en lenguaje natural con sentido lógico y FBFs complejas con paréntesis balanceados.
 */

import { OPERATORS, NOTATION_MODES, NOTATION_SYMBOLS } from './ast.js';

// Banco de enunciados atómicos en español para generar proposiciones naturales
const ATOMIC_BANK = [
  'estudio para el examen',
  'apruebo la materia de lógica',
  'el servidor responde a tiempo',
  'se ejecuta la consulta con éxito',
  'hace buen clima en la ciudad',
  'salgo a caminar por la tarde',
  'la señal de red es estable',
  'se descarga el archivo completo',
  'practico los ejercicios de programación',
  'obtengo una calificación sobresaliente',
  'se activa la alarma de seguridad',
  'el circuito eléctrico está cerrado',
  'fluye la corriente eléctrica',
  'el sensor detecta movimiento',
  'se enciende la luz indicadora'
];

const CONNECTIVE_TEMPLATES = [
  { op: 'AND', format: (a, b) => `${a} y ${b}` },
  { op: 'OR', format: (a, b) => `${a} o ${b}` },
  { op: 'IMPLIES', format: (a, b) => `si ${a}, entonces ${b}` },
  { op: 'IFF', format: (a, b) => `${a} si y solo si ${b}` }
];

export class RandomGenerators {
  /**
   * Genera aleatoriamente una proposición molecular en lenguaje natural coherente,
   * con múltiples operaciones y conectivos lógicos combinados.
   */
  static generateMolecularProposition() {
    // Seleccionar de 2 a 4 proposiciones atómicas sin repetir
    const shuffledAtomics = [...ATOMIC_BANK].sort(() => 0.5 - Math.random());
    const count = Math.floor(Math.random() * 3) + 2; // 2, 3 o 4 proposiciones
    const selectedAtomics = shuffledAtomics.slice(0, count);

    // Ocasionalmente aplicar negación a alguna atómica
    const preparedAtomics = selectedAtomics.map(stmt => {
      if (Math.random() < 0.3) {
        return `no ${stmt}`;
      }
      return stmt;
    });

    let current = preparedAtomics[0];

    for (let i = 1; i < preparedAtomics.length; i++) {
      const conn = CONNECTIVE_TEMPLATES[Math.floor(Math.random() * CONNECTIVE_TEMPLATES.length)];
      const nextStmt = preparedAtomics[i];

      // Ocasionalmente agrupar con paréntesis en lenguaje natural si es complejo
      if (i > 1 && Math.random() < 0.5) {
        current = `(${current})`;
      }

      current = conn.format(current, nextStmt);
    }

    // Capitalizar y añadir punto final
    let result = current.trim();
    result = result.charAt(0).toUpperCase() + result.slice(1) + '.';
    return result;
  }

  /**
   * Genera un árbol sintáctico aleatorio (AST) válido para FBF.
   * @param {number} depth - Profundidad actual
   * @param {number} maxDepth - Profundidad máxima (soporta formas largas y complejas)
   * @param {string[]} availableVars - Variables proposicionales a usar
   */
  static generateRandomAST(depth = 0, maxDepth = 3, availableVars = ['p', 'q', 'r', 's', 't']) {
    // Caso base: si llegamos a la profundidad máxima o por probabilidad, retornar variable
    if (depth >= maxDepth || (depth > 0 && Math.random() < 0.35)) {
      const varName = availableVars[Math.floor(Math.random() * availableVars.length)];
      return {
        type: 'variable',
        name: varName
      };
    }

    // Decidir entre unario (negación) o binario
    const isUnary = Math.random() < 0.25;

    if (isUnary) {
      return {
        type: 'unary',
        op: OPERATORS.NOT,
        operand: this.generateRandomAST(depth + 1, maxDepth, availableVars)
      };
    }

    // Operador binario aleatorio: AND, OR, IMPLIES, IFF
    const binaryOps = [OPERATORS.AND, OPERATORS.OR, OPERATORS.IMPLIES, OPERATORS.IFF];
    const chosenOp = binaryOps[Math.floor(Math.random() * binaryOps.length)];

    return {
      type: 'binary',
      op: chosenOp,
      left: this.generateRandomAST(depth + 1, maxDepth, availableVars),
      right: this.generateRandomAST(depth + 1, maxDepth, availableVars)
    };
  }

  /**
   * Convierte el AST generado en una cadena FBF con paréntesis perfectamente equilibrados.
   * Admite distintas complejidades: 'simple' (1-2 conectivos), 'medio' (2-4), 'largo' (4-7 conectivos).
   */
  static generateFBF(complexity = 'random', notation = NOTATION_MODES.STANDARD) {
    let maxDepth = 2;

    if (complexity === 'simple') {
      maxDepth = 1;
    } else if (complexity === 'medio') {
      maxDepth = 2;
    } else if (complexity === 'largo') {
      maxDepth = 4;
    } else {
      // Aleatorio entre 2 y 4 para soportar formas largas como p ^ (-s -> t) o s -> (-s ^ ((p v t) v (t ^ s)))
      maxDepth = Math.floor(Math.random() * 3) + 2; // 2, 3 o 4
    }

    // Conjunto de variables representativas
    const varsPool = ['p', 'q', 'r', 's', 't'];
    // Tomar subconjunto aleatorio de variables (2 a 4)
    const varCount = Math.min(maxDepth + 1, 4);
    const chosenVars = varsPool.slice(0, varCount);

    const ast = this.generateRandomAST(0, maxDepth, chosenVars);
    const symbols = NOTATION_SYMBOLS[notation] || NOTATION_SYMBOLS.standard;

    // Función de serialización con paréntesis estrictos y equilibrados
    function serialize(node, isTopLevel = false) {
      if (node.type === 'variable') {
        return node.name;
      }

      if (node.type === 'unary') {
        const inner = serialize(node.operand, false);
        if (node.operand.type === 'binary') {
          return `${symbols[node.op]}(${inner})`;
        }
        return `${symbols[node.op]}${inner}`;
      }

      if (node.type === 'binary') {
        const leftStr = serialize(node.left, false);
        const rightStr = serialize(node.right, false);

        const leftFormatted = node.left.type === 'binary' ? `(${leftStr})` : leftStr;
        const rightFormatted = node.right.type === 'binary' ? `(${rightStr})` : rightStr;

        const expr = `${leftFormatted} ${symbols[node.op]} ${rightFormatted}`;
        return isTopLevel ? expr : expr;
      }

      return '';
    }

    return {
      ast,
      fbfString: serialize(ast, true),
      variables: chosenVars
    };
  }
}
