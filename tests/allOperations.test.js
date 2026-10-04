import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { AllOperationsEngine, OPERATION_DEFINITIONS } from '../js/logic/allOperations.js';
import { NOTATION_MODES, OPERATORS } from '../js/logic/ast.js';

describe('AllOperationsEngine - Cálculo de Todas las Operaciones Posibles', () => {
  it('Retorna lista vacía si hay menos de 2 variables', () => {
    assert.deepEqual(AllOperationsEngine.getPairs([]), []);
    assert.deepEqual(AllOperationsEngine.getPairs(['p']), []);
    assert.deepEqual(AllOperationsEngine.generateAllPairwiseOperations([]), []);
    assert.deepEqual(AllOperationsEngine.generateAllPairwiseOperations(['p']), []);
  });

  it('Genera las combinaciones de pares exactas según C(N, 2)', () => {
    // 2 variables -> 1 par
    assert.equal(AllOperationsEngine.getPairs(['p', 'q']).length, 1);
    // 3 variables -> 3 pares
    assert.equal(AllOperationsEngine.getPairs(['p', 'q', 'r']).length, 3);
    // 4 variables -> 6 pares
    assert.equal(AllOperationsEngine.getPairs(['p', 'q', 'r', 's']).length, 6);
    // 5 variables -> 10 pares
    assert.equal(AllOperationsEngine.getPairs(['p', 'q', 'r', 's', 't']).length, 10);
  });

  it('Genera exactamente 5 operaciones por cada par (30 operaciones para 4 variables)', () => {
    const vars2 = ['p', 'q'];
    const ops2 = AllOperationsEngine.generateAllPairwiseOperations(vars2);
    assert.equal(ops2.length, 5, 'Para 2 variables deben ser 5 operaciones (AND, OR, IFF, IMPLIES dir e inv)');

    const vars3 = ['p', 'q', 'r'];
    const ops3 = AllOperationsEngine.generateAllPairwiseOperations(vars3);
    assert.equal(ops3.length, 15, 'Para 3 variables deben ser 15 operaciones (3 pares * 5)');

    const vars4 = ['p', 'q', 'r', 's'];
    const ops4 = AllOperationsEngine.generateAllPairwiseOperations(vars4);
    assert.equal(ops4.length, 30, 'Para 4 variables deben ser 30 operaciones (6 pares * 5)');
  });

  it('Genera el condicional en ambas direcciones y los demás conmutativos una sola vez', () => {
    const ops = AllOperationsEngine.generateAllPairwiseOperations(['p', 'q']);
    const impliesOps = ops.filter(o => o.operator === OPERATORS.IMPLIES);
    assert.equal(impliesOps.length, 2, 'Deben existir 2 condicionales (p -> q y q -> p)');

    const fbfs = impliesOps.map(o => o.fbf);
    assert.ok(fbfs.includes('p → q'), 'Debe incluir p → q');
    assert.ok(fbfs.includes('q → p'), 'Debe incluir q → p');

    const andOps = ops.filter(o => o.operator === OPERATORS.AND);
    assert.equal(andOps.length, 1, 'Debe haber solo 1 conjunción');

    const orOps = ops.filter(o => o.operator === OPERATORS.OR);
    assert.equal(orOps.length, 1, 'Debe haber solo 1 disyunción');

    const iffOps = ops.filter(o => o.operator === OPERATORS.IFF);
    assert.equal(iffOps.length, 1, 'Debe haber solo 1 bicondicional');
  });

  it('Evalúa correctamente los valores de verdad y la clasificación lógica', () => {
    const ops = AllOperationsEngine.generateAllPairwiseOperations(['p', 'q']);

    for (const op of ops) {
      assert.equal(op.truthDiagnosis, 'Contingencia', 'Toda operación binaria entre 2 variables independientes es Contingencia');
      assert.equal(op.truthValues.length, 4, 'Debe calcular exactamente 4 filas de verdad');
    }

    const andOp = ops.find(o => o.operator === OPERATORS.AND);
    assert.deepEqual(andOp.truthValues, [true, false, false, false], 'Tabla de AND: V, F, F, F');

    const orOp = ops.find(o => o.operator === OPERATORS.OR);
    assert.deepEqual(orOp.truthValues, [true, true, true, false], 'Tabla de OR: V, V, V, F');

    const directImplies = ops.find(o => o.operator === OPERATORS.IMPLIES && !o.isReverse);
    assert.deepEqual(directImplies.truthValues, [true, false, true, true], 'Tabla de p -> q: V, F, V, V');

    const reverseImplies = ops.find(o => o.operator === OPERATORS.IMPLIES && o.isReverse);
    assert.deepEqual(reverseImplies.truthValues, [true, true, false, true], 'Tabla de q -> p: V, V, F, V');

    const iffOp = ops.find(o => o.operator === OPERATORS.IFF);
    assert.deepEqual(iffOp.truthValues, [true, false, false, true], 'Tabla de IFF: V, F, F, V');
  });

  it('Traduce fluidamente a Lenguaje Natural en español con variableMap', () => {
    const variableMap = {
      p: 'estudio para el examen',
      q: 'apruebo la materia'
    };
    const ops = AllOperationsEngine.generateAllPairwiseOperations(['p', 'q'], variableMap);

    const andOp = ops.find(o => o.operator === OPERATORS.AND);
    assert.match(andOp.spanishText.toLowerCase(), /estudio para el examen y apruebo la materia/);

    const directImplies = ops.find(o => o.operator === OPERATORS.IMPLIES && !o.isReverse);
    assert.match(directImplies.spanishText.toLowerCase(), /si estudio para el examen, entonces apruebo la materia/);
  });

  it('Soporta notación alternativa (~, &, ∨, ⊃, ≡)', () => {
    const opsStandard = AllOperationsEngine.generateAllPairwiseOperations(['p', 'q'], {}, NOTATION_MODES.STANDARD);
    const opsAlternative = AllOperationsEngine.generateAllPairwiseOperations(['p', 'q'], {}, NOTATION_MODES.ALTERNATIVE);

    const andStd = opsStandard.find(o => o.operator === OPERATORS.AND);
    const andAlt = opsAlternative.find(o => o.operator === OPERATORS.AND);
    assert.equal(andStd.fbf, 'p ∧ q');
    assert.equal(andAlt.fbf, 'p & q');

    const impStd = opsStandard.find(o => o.operator === OPERATORS.IMPLIES && !o.isReverse);
    const impAlt = opsAlternative.find(o => o.operator === OPERATORS.IMPLIES && !o.isReverse);
    assert.equal(impStd.fbf, 'p → q');
    assert.equal(impAlt.fbf, 'p ⊃ q');

    const iffStd = opsStandard.find(o => o.operator === OPERATORS.IFF);
    const iffAlt = opsAlternative.find(o => o.operator === OPERATORS.IFF);
    assert.equal(iffStd.fbf, 'p ↔ q');
    assert.equal(iffAlt.fbf, 'p ≡ q');
  });

  it('Cumple con la política de Cero Emojis en el código del motor', () => {
    const filePath = path.resolve('js/logic/allOperations.js');
    const content = fs.readFileSync(filePath, 'utf-8');
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu;
    const matches = content.match(emojiRegex);
    assert.equal(matches, null, `allOperations.js debe tener 0 emojis, encontrados: ${matches ? matches.join(', ') : 'ninguno'}`);
  });

  it('Verifica que index.html contiene los botones y secciones en Constructor e Inverso', () => {
    const html = fs.readFileSync(path.resolve('index.html'), 'utf-8');
    assert.match(html, /id="btn-calc-all-builder"/, 'index.html debe contener btn-calc-all-builder');
    assert.match(html, /id="builder-all-operations-section"/, 'index.html debe contener builder-all-operations-section');
    assert.match(html, /id="btn-calc-all-inverse"/, 'index.html debe contener btn-calc-all-inverse');
    assert.match(html, /id="inverse-all-operations-section"/, 'index.html debe contener inverse-all-operations-section');
  });

  it('Verifica que app.js contiene la lógica de conexión para ambas secciones', () => {
    const appJs = fs.readFileSync(path.resolve('js/app.js'), 'utf-8');
    assert.match(appJs, /btn-calc-all-builder/, 'app.js debe enlazar btn-calc-all-builder');
    assert.match(appJs, /btn-calc-all-inverse/, 'app.js debe enlazar btn-calc-all-inverse');
    assert.match(appJs, /renderAllOperationsPanel/, 'app.js debe definir renderAllOperationsPanel');
  });
});

