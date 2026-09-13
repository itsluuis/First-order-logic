/**
 * generators.js - Generador Aleatorio de Proposiciones Moleculares y Fórmulas Bien Formadas (FBF)
 * Adaptado para generación directa dentro del Constructor Visual y del Proceso Inverso.
 */

import { OPERATORS, NOTATION_MODES, NOTATION_SYMBOLS } from './ast.js';

// Banco de enunciados atómicos en español para generar proposiciones naturales
export const ATOMIC_BANK = [
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
  'se enciende la luz indicadora',
  'el algoritmo converge correctamente',
  'la base de datos está sincronizada',
  'se compila el código sin errores'
];

export class RandomGenerators {
  /**
   * Genera un conjunto de enunciados atómicos aleatorios para una lista de variables dada.
   * Si hay 1 variable, genera 1 enunciado; si hay 3 variables, genera 3 enunciados distintos.
   */
  static generateAtomicStatements(variables = ['p']) {
    const shuffled = [...ATOMIC_BANK].sort(() => 0.5 - Math.random());
    const result = {};

    variables.forEach((v, idx) => {
      result[v] = shuffled[idx % shuffled.length];
    });

    return result;
  }

  /**
   * Genera un AST aleatorio con profundidad y variables especificadas.
   */
  static generateRandomAST(depth = 0, maxDepth = 3, availableVars = ['p', 'q']) {
    // Caso base: profundidad alcanzada o variable terminal
    if (depth >= maxDepth || (depth > 0 && Math.random() < 0.32)) {
      const varName = availableVars[Math.floor(Math.random() * availableVars.length)];
      return {
        type: 'variable',
        name: varName
      };
    }

    // Probabilidad de negación unaria (¬)
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
   * Convierte un AST en una lista plana de tokens para el Constructor Visual.
   * Tokens con { type: 'var'|'op'|'paren', value: string }
   */
  static astToTokens(node) {
    const tokens = [];

    function walk(n, isTop = false) {
      if (!n) return;

      if (n.type === 'variable') {
        tokens.push({ type: 'var', value: n.name });
        return;
      }

      if (n.type === 'unary') {
        tokens.push({ type: 'op', value: 'NOT' });
        if (n.operand.type === 'binary') {
          tokens.push({ type: 'paren', value: '(' });
          walk(n.operand, false);
          tokens.push({ type: 'paren', value: ')' });
        } else {
          walk(n.operand, false);
        }
        return;
      }

      if (n.type === 'binary') {
        const needParens = !isTop;
        if (needParens) tokens.push({ type: 'paren', value: '(' });

        walk(n.left, false);
        tokens.push({ type: 'op', value: n.op });
        walk(n.right, false);

        if (needParens) tokens.push({ type: 'paren', value: ')' });
      }
    }

    walk(node, true);
    return tokens;
  }

  /**
   * Genera una FBF aleatoria formateada como string.
   */
  static generateFBF(complexity = 'random', notation = NOTATION_MODES.STANDARD, availableVars = ['p', 'q', 'r', 's', 't']) {
    let maxDepth = 2;
    if (complexity === 'simple') maxDepth = 1;
    else if (complexity === 'medio') maxDepth = 2;
    else if (complexity === 'largo') maxDepth = 4;
    else maxDepth = Math.floor(Math.random() * 3) + 2; // 2, 3 o 4

    const varCount = Math.min(maxDepth + 1, availableVars.length);
    const chosenVars = availableVars.slice(0, varCount);

    const ast = this.generateRandomAST(0, maxDepth, chosenVars);
    const symbols = NOTATION_SYMBOLS[notation] || NOTATION_SYMBOLS.standard;

    function serialize(node, isTopLevel = false) {
      if (node.type === 'variable') return node.name;

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
