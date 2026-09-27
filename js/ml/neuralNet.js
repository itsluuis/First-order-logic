/**
 * neuralNet.js - Implementación de Red Neuronal Artificial (Perceptrón Multicapa - MLP)
 * 100% nativa en JavaScript para ejecución local en el navegador sin dependencias externas.
 * 
 * Arquitectura:
 * - Capa de Entrada -> Capas Ocultas con función de activación Sigmoide -> Capa de Salida
 * - Propagación hacia adelante (Forward Propagation)
 * - Retropropagación del gradiente (Backpropagation) con tasa de aprendizaje (Learning Rate) y Momentum
 * - Serialización a JSON para persistencia en localStorage
 */

export class NeuralNetwork {
  constructor(options = {}) {
    this.inputSize = options.inputSize || 7;
    this.hiddenSizes = options.hiddenSizes || [8, 6];
    this.outputSize = options.outputSize || 4;
    this.learningRate = options.learningRate || 0.15;
    this.momentum = options.momentum || 0.1;

    // Estructura completa de capas: [inputSize, ...hiddenSizes, outputSize]
    this.layerSizes = [this.inputSize, ...this.hiddenSizes, this.outputSize];
    this.numLayers = this.layerSizes.length;

    // Inicialización de pesos y sesgos (biases) usando inicialización de Xavier/Glorot
    this.weights = [];
    this.biases = [];
    this.prevWeightDeltas = [];

    this._initWeights();
  }

  /**
   * Inicializa pesos y sesgos con valores aleatorios pequeños
   */
  _initWeights() {
    this.weights = [];
    this.biases = [];
    this.prevWeightDeltas = [];

    for (let i = 0; i < this.numLayers - 1; i++) {
      const rows = this.layerSizes[i + 1];
      const cols = this.layerSizes[i];
      const scale = Math.sqrt(2.0 / (cols + rows));

      const wMatrix = [];
      const deltaMatrix = [];
      for (let r = 0; r < rows; r++) {
        const row = [];
        const deltaRow = [];
        for (let c = 0; c < cols; c++) {
          row.push((Math.random() * 2 - 1) * scale);
          deltaRow.push(0);
        }
        wMatrix.push(row);
        deltaMatrix.push(deltaRow);
      }
      this.weights.push(wMatrix);
      this.prevWeightDeltas.push(deltaMatrix);

      // Biases inicializados en 0 o números pequeños
      const bVector = [];
      for (let r = 0; r < rows; r++) {
        bVector.push((Math.random() * 0.2 - 0.1));
      }
      this.biases.push(bVector);
    }
  }

  /**
   * Función de activación Sigmoide: f(x) = 1 / (1 + e^(-x))
   */
  static sigmoid(x) {
    return 1 / (1 + Math.exp(-Math.max(-45, Math.min(45, x))));
  }

  /**
   * Derivada de la Sigmoide: f'(x) = f(x) * (1 - f(x))
   */
  static sigmoidDerivative(y) {
    return y * (1 - y);
  }

  /**
   * Propagación hacia adelante (Forward Pass)
   * Devuelve las activaciones de cada capa
   */
  feedForward(inputVector) {
    if (inputVector.length !== this.inputSize) {
      throw new Error(`Dimensión de entrada inválida: esperada ${this.inputSize}, recibida ${inputVector.length}`);
    }

    const activations = [inputVector.slice()];

    for (let l = 0; l < this.numLayers - 1; l++) {
      const currentInput = activations[l];
      const wMatrix = this.weights[l];
      const bVector = this.biases[l];
      const nextActivation = [];

      for (let j = 0; j < wMatrix.length; j++) {
        let sum = bVector[j];
        for (let i = 0; i < currentInput.length; i++) {
          sum += wMatrix[j][i] * currentInput[i];
        }
        nextActivation.push(NeuralNetwork.sigmoid(sum));
      }

      activations.push(nextActivation);
    }

    return activations;
  }

  /**
   * Predice la salida para un vector de entrada dado
   */
  predict(inputVector) {
    const activations = this.feedForward(inputVector);
    return activations[activations.length - 1];
  }

  /**
   * Entrena la red con un conjunto de muestras usando Retropropagación
   * data: Array de { input: [...], output: [...] }
   */
  train(dataset, iterations = 200) {
    if (!dataset || dataset.length === 0) return { error: 0, iterations: 0 };

    let totalError = 0;

    for (let epoch = 0; epoch < iterations; epoch++) {
      totalError = 0;

      for (const sample of dataset) {
        // 1. Forward Pass
        const activations = this.feedForward(sample.input);
        const output = activations[activations.length - 1];
        const target = sample.output;

        // 2. Calcular error en la capa de salida (MSE)
        const deltas = new Array(this.numLayers - 1);
        const lastIdx = this.numLayers - 2;
        const outputDeltas = [];

        for (let i = 0; i < this.outputSize; i++) {
          const err = target[i] - output[i];
          totalError += err * err;
          outputDeltas.push(err * NeuralNetwork.sigmoidDerivative(output[i]));
        }
        deltas[lastIdx] = outputDeltas;

        // 3. Retropropagar error hacia capas ocultas
        for (let l = lastIdx - 1; l >= 0; l--) {
          const nextDeltas = deltas[l + 1];
          const nextWeights = this.weights[l + 1];
          const currentAct = activations[l + 1];
          const currentDeltas = [];

          for (let i = 0; i < this.layerSizes[l + 1]; i++) {
            let errorSum = 0;
            for (let j = 0; j < nextDeltas.length; j++) {
              errorSum += nextDeltas[j] * nextWeights[j][i];
            }
            currentDeltas.push(errorSum * NeuralNetwork.sigmoidDerivative(currentAct[i]));
          }
          deltas[l] = currentDeltas;
        }

        // 4. Actualizar pesos y sesgos con gradiente descendente + momentum
        for (let l = 0; l < this.numLayers - 1; l++) {
          const layerDeltas = deltas[l];
          const layerInputs = activations[l];

          for (let j = 0; j < layerDeltas.length; j++) {
            for (let i = 0; i < layerInputs.length; i++) {
              const delta = (this.learningRate * layerDeltas[j] * layerInputs[i]) + 
                            (this.momentum * this.prevWeightDeltas[l][j][i]);
              this.weights[l][j][i] += delta;
              this.prevWeightDeltas[l][j][i] = delta;
            }
            this.biases[l][j] += this.learningRate * layerDeltas[j];
          }
        }
      }
    }

    return {
      finalError: totalError / (dataset.length * this.outputSize),
      iterations
    };
  }

  /**
   * Serializa el modelo a formato JSON
   */
  toJSON() {
    return {
      inputSize: this.inputSize,
      hiddenSizes: this.hiddenSizes,
      outputSize: this.outputSize,
      learningRate: this.learningRate,
      momentum: this.momentum,
      weights: this.weights,
      biases: this.biases
    };
  }

  /**
   * Carga el modelo desde formato JSON
   */
  fromJSON(json) {
    if (!json || !json.weights || !json.biases) return false;
    this.inputSize = json.inputSize || this.inputSize;
    this.hiddenSizes = json.hiddenSizes || this.hiddenSizes;
    this.outputSize = json.outputSize || this.outputSize;
    this.weights = json.weights;
    this.biases = json.biases;
    this.layerSizes = [this.inputSize, ...this.hiddenSizes, this.outputSize];
    this.numLayers = this.layerSizes.length;
    return true;
  }
}
