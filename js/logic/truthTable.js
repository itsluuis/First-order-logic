/**
 * truthTable.js - Motor Evaluador de Tablas de Verdad y Clasificación Lógica
 * Calcula todas las combinaciones posibles (2^n filas), desglosa columnas intermedias
 * y clasifica en Tautología, Contradicción o Contingencia.
 */

import { FBFParser, OPERATORS, NOTATION_MODES } from './ast.js';

export class TruthTableEngine {
  /**
   * Evalúa recursivamente un nodo AST con un mapa de asignaciones de verdad.
   */
  static evaluate(node, values) {
    if (!node) return false;

    if (node.type === 'variable') {
      return Boolean(values[node.name]);
    }

    if (node.type === 'unary') {
      if (node.op === OPERATORS.NOT) {
        return !this.evaluate(node.operand, values);
      }
    }

    if (node.type === 'binary') {
      const leftVal = this.evaluate(node.left, values);
      const rightVal = this.evaluate(node.right, values);

      switch (node.op) {
        case OPERATORS.AND:
          return leftVal && rightVal;
        case OPERATORS.OR:
          return leftVal || rightVal;
        case OPERATORS.IMPLIES:
          return !leftVal || rightVal; // V -> F es F, todo lo demás V
        case OPERATORS.IFF:
          return leftVal === rightVal; // V <-> V es V, F <-> F es V
        default:
          return false;
      }
    }

    return false;
  }

  /**
   * Recolecta subexpresiones únicas del AST para formar columnas intermedias paso a paso.
   */
  static getSubExpressions(node, notation = NOTATION_MODES.STANDARD) {
    const subs = [];

    function collect(n) {
      if (!n || n.type === 'variable') return;

      if (n.type === 'unary') {
        collect(n.operand);
      } else if (n.type === 'binary') {
        collect(n.left);
        collect(n.right);
      }

      const str = FBFParser.toString(n, notation, false);
      if (!subs.some(s => s.str === str)) {
        subs.push({ str, node: n });
      }
    }

    collect(node);
    return subs;
  }

  /**
   * Genera la tabla de verdad completa o el diagnóstico formal si excede 6 proposiciones.
   */
  static generate(ast, notation = NOTATION_MODES.STANDARD) {
    const variables = FBFParser.getVariables(ast);
    const n = variables.length;

    if (n === 0) {
      throw new Error('No se encontraron variables proposicionales para evaluar.');
    }

    if (n > 12) {
      throw new Error(`La fórmula contiene ${n} variables. El límite máximo de evaluación es de 12 variables.`);
    }

    const fullExprStr = FBFParser.toString(ast, notation, false);
    const totalRows = Math.pow(2, n);

    // Si tiene más de 6 proposiciones, evaluamos el diagnóstico formal
    // sin generar el arreglo masivo de filas HTML de la tabla
    if (n > 6) {
      let trueCount = 0;
      let falseCount = 0;

      for (let r = 0; r < totalRows; r++) {
        const assignment = {};
        for (let i = 0; i < n; i++) {
          const period = Math.pow(2, n - 1 - i);
          assignment[variables[i]] = Math.floor(r / period) % 2 === 0;
        }

        const res = this.evaluate(ast, assignment);
        if (res) trueCount++;
        else falseCount++;
      }

      let classification = 'CONTINGENCIA';
      let description = 'La fórmula es una Contingencia: su valor de verdad depende de los valores de las proposiciones atómicas (contiene tanto valores Verdaderos como Falsos).';

      if (trueCount === totalRows) {
        classification = 'TAUTOLOGÍA';
        description = 'La fórmula es una Tautología: es universalmente Verdadera (V) bajo cualquier interpretación de sus variables proposicionales.';
      } else if (falseCount === totalRows) {
        classification = 'CONTRADICCIÓN';
        description = 'La fórmula es una Contradicción: es universalmente Falsa (F) bajo cualquier interpretación de sus variables proposicionales.';
      }

      return {
        variables,
        intermediateColumns: [],
        fullExprStr,
        totalRows,
        rows: [],
        stats: {
          trueCount,
          falseCount
        },
        classification,
        description,
        limitExceeded: true,
        errorMessage: 'La tabla solo puede aparecer cuando se estan operando 6 o menos preposiciones.'
      };
    }

    const rows = [];

    // Obtener subexpresiones intermedias y la expresión principal
    const subExpressions = this.getSubExpressions(ast, notation);

    // Asegurar que la expresión principal esté al final como columna resultado
    const intermediateColumns = subExpressions.filter(s => s.str !== fullExprStr);

    let trueCount = 0;
    let falseCount = 0;

    for (let r = 0; r < totalRows; r++) {
      const assignment = {};
      const rowValues = [];

      // Asignar V / F a cada variable (formato estándar: V=true, F=false)
      // Para la variable i, alterna cada 2^(n - 1 - i) filas
      for (let i = 0; i < n; i++) {
        const period = Math.pow(2, n - 1 - i);
        const val = Math.floor(r / period) % 2 === 0;
        assignment[variables[i]] = val;
        rowValues.push({
          colType: 'var',
          name: variables[i],
          val: val ? 'V' : 'F'
        });
      }

      // Evaluar columnas intermedias
      const intermediateValues = [];
      for (const item of intermediateColumns) {
        const val = this.evaluate(item.node, assignment);
        intermediateValues.push({
          expr: item.str,
          val: val ? 'V' : 'F'
        });
      }

      // Evaluar resultado final
      const finalResult = this.evaluate(ast, assignment);
      if (finalResult) trueCount++;
      else falseCount++;

      rows.push({
        rowIndex: r + 1,
        assignment,
        varValues: rowValues,
        intermediateValues,
        finalResult: finalResult ? 'V' : 'F'
      });
    }

    // Clasificación formal
    let classification = 'CONTINGENCIA';
    let description = 'La fórmula es una Contingencia: su valor de verdad depende de los valores de las proposiciones atómicas (contiene tanto valores Verdaderos como Falsos).';

    if (trueCount === totalRows) {
      classification = 'TAUTOLOGÍA';
      description = 'La fórmula es una Tautología: es universalmente Verdadera (V) bajo cualquier interpretación de sus variables proposicionales.';
    } else if (falseCount === totalRows) {
      classification = 'CONTRADICCIÓN';
      description = 'La fórmula es una Contradicción: es universalmente Falsa (F) bajo cualquier interpretación de sus variables proposicionales.';
    }

    return {
      variables,
      intermediateColumns: intermediateColumns.map(i => i.str),
      fullExprStr,
      totalRows,
      rows,
      stats: {
        trueCount,
        falseCount
      },
      classification,
      description,
      limitExceeded: false
    };
  }
}
