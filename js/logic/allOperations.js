/**
 * allOperations.js - Generador de Todas las Operaciones Posibles
 * Calcula combinaciones binarias (AND, OR, IFF, IMPLIES directo e inverso)
 * para todas las parejas de proposiciones atómicas activas.
 */

import { OPERATORS, NOTATION_MODES, FBFParser } from './ast.js';
import { NaturalLanguageTranslator } from './naturalLanguage.js';
import { TruthTableEngine } from './truthTable.js';

export const OPERATION_DEFINITIONS = [
  { op: OPERATORS.AND, label: 'Conjunción', orderSensitive: false, isReverse: false },
  { op: OPERATORS.OR, label: 'Disyunción', orderSensitive: false, isReverse: false },
  { op: OPERATORS.IFF, label: 'Bicondicional', orderSensitive: false, isReverse: false },
  { op: OPERATORS.IMPLIES, label: 'Condicional (Directo)', orderSensitive: true, isReverse: false },
  { op: OPERATORS.IMPLIES, label: 'Condicional (Recíproco)', orderSensitive: true, isReverse: true }
];

export class AllOperationsEngine {
  /**
   * Genera todas las parejas no ordenadas C(N, 2)
   */
  static getPairs(variables) {
    if (!Array.isArray(variables) || variables.length < 2) {
      return [];
    }
    const cleanVars = Array.from(new Set(variables.map(v => typeof v === 'string' ? v.trim() : '').filter(Boolean))).sort();
    const pairs = [];
    for (let i = 0; i < cleanVars.length; i++) {
      for (let j = i + 1; j < cleanVars.length; j++) {
        pairs.push([cleanVars[i], cleanVars[j]]);
      }
    }
    return pairs;
  }

  /**
   * Evalúa la clasificación lógica y los 4 valores de verdad para una operación binaria entre 2 variables
   */
  static evaluateTruth(ast) {
    const vars = FBFParser.getVariables(ast);
    const v1 = vars[0] || 'p';
    const v2 = vars[1] || 'q';

    const assignments = [
      { [v1]: true, [v2]: true },
      { [v1]: true, [v2]: false },
      { [v1]: false, [v2]: true },
      { [v1]: false, [v2]: false }
    ];

    const truthValues = assignments.map(assign => TruthTableEngine.evaluate(ast, assign));
    const trueCount = truthValues.filter(Boolean).length;

    let diagnosis = 'Contingencia';
    let badgeClass = 'badge-contingency';

    if (trueCount === assignments.length) {
      diagnosis = 'Tautología';
      badgeClass = 'badge-tautology';
    } else if (trueCount === 0) {
      diagnosis = 'Contradicción';
      badgeClass = 'badge-contradiction';
    }

    return {
      diagnosis,
      badgeClass,
      truthValues,
      stats: { trueCount, falseCount: assignments.length - trueCount }
    };
  }

  /**
   * Genera todas las operaciones posibles entre las variables dadas
   * @param {string[]} variables - Lista de nombres de variables (ej. ['p', 'q', 'r'])
   * @param {Object} variableMap - Mapeo de enunciados { p: 'estudio', q: 'apruebo' }
   * @param {string} notation - 'standard' o 'alternative'
   * @returns {Object[]} Lista de operaciones calculadas
   */
  static generateAllPairwiseOperations(variables, variableMap = {}, notation = NOTATION_MODES.STANDARD) {
    const pairs = this.getPairs(variables);
    if (pairs.length === 0) {
      return [];
    }

    const operations = [];

    for (const [varA, varB] of pairs) {
      for (const opDef of OPERATION_DEFINITIONS) {
        const left = opDef.isReverse ? varB : varA;
        const right = opDef.isReverse ? varA : varB;

        const astNode = {
          type: 'binary',
          op: opDef.op,
          left: { type: 'variable', name: left },
          right: { type: 'variable', name: right }
        };

        const fbf = FBFParser.toString(astNode, notation, false);
        const spanishText = NaturalLanguageTranslator.toSpanish(astNode, variableMap, true);
        const truth = this.evaluateTruth(astNode);

        operations.push({
          id: `op-${left}-${right}-${opDef.op}${opDef.isReverse ? '-rev' : ''}`,
          operator: opDef.op,
          opLabel: opDef.label,
          leftVar: left,
          rightVar: right,
          isReverse: Boolean(opDef.isReverse),
          fbf,
          astNode,
          spanishText,
          truthDiagnosis: truth.diagnosis,
          badgeClass: truth.badgeClass,
          truthValues: truth.truthValues
        });
      }
    }

    return operations;
  }
}
