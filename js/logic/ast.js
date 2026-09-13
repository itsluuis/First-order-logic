/**
 * ast.js - Analizador Léxico y Sintáctico (Parser) para Fórmulas Bien Formadas (FBF)
 * Convierte expresiones simbólicas en Árboles de Sintaxis Abstracta (AST),
 * valida la gramática formal y formatea en distintas notaciones lógicas.
 */

export const NOTATION_MODES = {
  STANDARD: 'standard',     // ¬, ∧, ∨, →, ↔
  ALTERNATIVE: 'alternative' // ~, &, ∨, ⊃, ≡
};

export const OPERATORS = {
  NOT: 'NOT',
  AND: 'AND',
  OR: 'OR',
  IMPLIES: 'IMPLIES',
  IFF: 'IFF'
};

// Mapeo de operadores según la notación visual
export const NOTATION_SYMBOLS = {
  standard: {
    [OPERATORS.NOT]: '¬',
    [OPERATORS.AND]: '∧',
    [OPERATORS.OR]: '∨',
    [OPERATORS.IMPLIES]: '→',
    [OPERATORS.IFF]: '↔'
  },
  alternative: {
    [OPERATORS.NOT]: '~',
    [OPERATORS.AND]: '&',
    [OPERATORS.OR]: '∨',
    [OPERATORS.IMPLIES]: '⊃',
    [OPERATORS.IFF]: '≡'
  }
};

export class FBFParser {
  /**
   * Tokenizador: Convierte el texto de la fórmula en una lista de tokens reconocidos.
   */
  static tokenize(input) {
    const tokens = [];
    let i = 0;
    const str = input.trim();

    while (i < str.length) {
      const char = str[i];

      // Ignorar espacios en blanco
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Paréntesis
      if (char === '(' || char === '[' || char === '{') {
        tokens.push({ type: 'LPAREN', value: '(', pos: i });
        i++;
        continue;
      }
      if (char === ')' || char === ']' || char === '}') {
        tokens.push({ type: 'RPAREN', value: ')', pos: i });
        i++;
        continue;
      }

      // Bicondicional: <->, <=>, ↔, ≡
      if (str.slice(i, i + 3) === '<->' || str.slice(i, i + 3) === '<=>') {
        tokens.push({ type: 'OP', op: OPERATORS.IFF, value: '↔', pos: i });
        i += 3;
        continue;
      }
      if (char === '↔' || char === '≡') {
        tokens.push({ type: 'OP', op: OPERATORS.IFF, value: '↔', pos: i });
        i++;
        continue;
      }

      // Condicional: ->, =>, →, ⊃
      if (str.slice(i, i + 2) === '->' || str.slice(i, i + 2) === '=>') {
        tokens.push({ type: 'OP', op: OPERATORS.IMPLIES, value: '→', pos: i });
        i += 2;
        continue;
      }
      if (char === '→' || char === '⊃') {
        tokens.push({ type: 'OP', op: OPERATORS.IMPLIES, value: '→', pos: i });
        i++;
        continue;
      }

      // Conjunción: ∧, ^, &
      if (char === '∧' || char === '^' || char === '&') {
        tokens.push({ type: 'OP', op: OPERATORS.AND, value: '∧', pos: i });
        i++;
        continue;
      }

      // Disyunción: ∨, v, V (cuidado con no confundir con variable si es letra 'v' aislada entre proposiciones)
      if (char === '∨') {
        tokens.push({ type: 'OP', op: OPERATORS.OR, value: '∨', pos: i });
        i++;
        continue;
      }

      // Negación: ¬, ~, -
      if (char === '¬' || char === '~' || char === '-') {
        tokens.push({ type: 'NOT', op: OPERATORS.NOT, value: '¬', pos: i });
        i++;
        continue;
      }

      // Letra v como disyunción si está precedida y sucedida por variables o paréntesis
      if (char.toLowerCase() === 'v' && str.length > 1) {
        // Si el token previo fue variable o RPAREN, se trata de una disyunción 'v'
        const prev = tokens[tokens.length - 1];
        if (prev && (prev.type === 'VAR' || prev.type === 'RPAREN')) {
          tokens.push({ type: 'OP', op: OPERATORS.OR, value: '∨', pos: i });
          i++;
          continue;
        }
      }

      // Variables proposicionales (letras individuales p, q, r, s, t...)
      if (/[a-zA-Z]/.test(char)) {
        tokens.push({ type: 'VAR', value: char.toLowerCase(), pos: i });
        i++;
        continue;
      }

      throw new Error(`Carácter no reconocido "${char}" en la posición ${i + 1}.`);
    }

    return tokens;
  }

  /**
   * Parser recursivo descendente con jerarquía formal de operadores lógicos:
   * 1. IFF (↔, ≡) - Menor precedencia
   * 2. IMPLIES (→, ⊃)
   * 3. OR (∨)
   * 4. AND (∧, &)
   * 5. NOT (¬, ~) - Prefijo unario
   * 6. Átomos (variables) y expresiones entre paréntesis
   */
  static parse(input) {
    if (!input || !input.trim()) {
      throw new Error('La fórmula no puede estar vacía.');
    }

    const tokens = this.tokenize(input);
    if (tokens.length === 0) {
      throw new Error('No se encontraron proposiciones o conectivos.');
    }

    let cursor = 0;

    function peek() {
      return tokens[cursor];
    }

    function consume(expectedType) {
      const current = tokens[cursor];
      if (!current) {
        throw new Error(`Se esperaba "${expectedType}" pero se llegó al final de la fórmula.`);
      }
      if (expectedType && current.type !== expectedType) {
        throw new Error(`Se esperaba "${expectedType}" pero se encontró "${current.value}" en pos ${current.pos + 1}.`);
      }
      cursor++;
      return current;
    }

    // Regla 1: Bicondicional (↔)
    function parseBiconditional() {
      let node = parseConditional();
      while (peek() && peek().type === 'OP' && peek().op === OPERATORS.IFF) {
        const opToken = consume();
        const right = parseConditional();
        node = {
          type: 'binary',
          op: opToken.op,
          left: node,
          right: right
        };
      }
      return node;
    }

    // Regla 2: Condicional (→) - Asociativo por la derecha
    function parseConditional() {
      let node = parseDisjunction();
      if (peek() && peek().type === 'OP' && peek().op === OPERATORS.IMPLIES) {
        const opToken = consume();
        const right = parseConditional(); // Recursión para asociatividad a la derecha: p -> q -> r => p -> (q -> r)
        node = {
          type: 'binary',
          op: opToken.op,
          left: node,
          right: right
        };
      }
      return node;
    }

    // Regla 3: Disyunción (∨)
    function parseDisjunction() {
      let node = parseConjunction();
      while (peek() && peek().type === 'OP' && peek().op === OPERATORS.OR) {
        const opToken = consume();
        const right = parseConjunction();
        node = {
          type: 'binary',
          op: opToken.op,
          left: node,
          right: right
        };
      }
      return node;
    }

    // Regla 4: Conjunción (∧)
    function parseConjunction() {
      let node = parseUnary();
      while (peek() && peek().type === 'OP' && peek().op === OPERATORS.AND) {
        const opToken = consume();
        const right = parseUnary();
        node = {
          type: 'binary',
          op: opToken.op,
          left: node,
          right: right
        };
      }
      return node;
    }

    // Regla 5: Negación unaria (¬)
    function parseUnary() {
      if (peek() && peek().type === 'NOT') {
        const opToken = consume();
        const operand = parseUnary(); // Permite negaciones consecutivas como ¬¬p
        return {
          type: 'unary',
          op: opToken.op,
          operand: operand
        };
      }
      return parsePrimary();
    }

    // Regla 6: Átomos y Paréntesis
    function parsePrimary() {
      const token = peek();
      if (!token) {
        throw new Error('Fórmula incompleta. Se esperaba una proposición atómica o un paréntesis.');
      }

      if (token.type === 'VAR') {
        consume('VAR');
        return {
          type: 'variable',
          name: token.value
        };
      }

      if (token.type === 'LPAREN') {
        consume('LPAREN');
        const expr = parseBiconditional();
        if (!peek() || peek().type !== 'RPAREN') {
          throw new Error('Paréntesis sin cerrar. Verifique que cada "(" tenga su correspondiente ")".');
        }
        consume('RPAREN');
        return expr;
      }

      throw new Error(`Sintaxis inválida cerca de "${token.value}".`);
    }

    const ast = parseBiconditional();

    if (cursor < tokens.length) {
      const leftover = tokens[cursor];
      throw new Error(`Símbolo inesperado "${leftover.value}" después de una fórmula válida.`);
    }

    return ast;
  }

  /**
   * Extrae la lista ordenada de variables atómicas únicas presentes en el AST.
   */
  static getVariables(node) {
    const vars = new Set();
    function walk(n) {
      if (!n) return;
      if (n.type === 'variable') {
        vars.add(n.name);
      } else if (n.type === 'unary') {
        walk(n.operand);
      } else if (n.type === 'binary') {
        walk(n.left);
        walk(n.right);
      }
    }
    walk(node);
    return Array.from(vars).sort();
  }

  /**
   * Imprime el AST en notación simbólica (estándar o alternativa) con paréntesis estrictos o canónicos.
   */
  static toString(node, notation = NOTATION_MODES.STANDARD, outerParens = false) {
    if (!node) return '';
    const symbols = NOTATION_SYMBOLS[notation] || NOTATION_SYMBOLS.standard;

    if (node.type === 'variable') {
      return node.name;
    }

    if (node.type === 'unary') {
      const sym = symbols[node.op];
      const operandStr = this.toString(node.operand, notation, false);
      if (node.operand.type === 'binary') {
        return `${sym}(${operandStr})`;
      }
      return `${sym}${operandStr}`;
    }

    if (node.type === 'binary') {
      const sym = symbols[node.op];
      const leftStr = this.toString(node.left, notation, false);
      const rightStr = this.toString(node.right, notation, false);

      const formattedLeft = node.left.type === 'binary' ? `(${leftStr})` : leftStr;
      const formattedRight = node.right.type === 'binary' ? `(${rightStr})` : rightStr;

      const expr = `${formattedLeft} ${sym} ${formattedRight}`;
      return outerParens ? `(${expr})` : expr;
    }

    return '';
  }

  /**
   * Obtiene la estructura jerárquica para representar el Árbol Sintáctico.
   */
  static toTreeData(node, notation = NOTATION_MODES.STANDARD) {
    if (!node) return null;
    const symbols = NOTATION_SYMBOLS[notation] || NOTATION_SYMBOLS.standard;

    if (node.type === 'variable') {
      return {
        label: node.name,
        type: 'variable',
        description: `Proposición Atómica [${node.name}]`
      };
    }

    if (node.type === 'unary') {
      return {
        label: symbols[node.op],
        type: 'unary',
        description: 'Conectivo Monádico (Negación)',
        children: [this.toTreeData(node.operand, notation)]
      };
    }

    if (node.type === 'binary') {
      const names = {
        [OPERATORS.AND]: 'Conjunción',
        [OPERATORS.OR]: 'Disyunción',
        [OPERATORS.IMPLIES]: 'Condicional (Implicación)',
        [OPERATORS.IFF]: 'Bicondicional (Doble Implicación)'
      };
      return {
        label: symbols[node.op],
        type: 'binary',
        description: `Conectivo Diádico Principal (${names[node.op]})`,
        children: [
          this.toTreeData(node.left, notation),
          this.toTreeData(node.right, notation)
        ]
      };
    }

    return null;
  }
}
