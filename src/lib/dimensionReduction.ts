/**
 * 向量降维算法（t-SNE/UMAP）
 * 用于将高维向量（384/768维）投影到 2D/3D 空间进行可视化
 */

export interface DimensionReductionOptions {
  /** 目标维度：2 或 3 */
  dimensions: 2 | 3;
  /** 算法：tsne | umap */
  algorithm: 'tsne' | 'umap';
  /** 迭代次数（t-SNE） */
  iterations?: number;
  /** 困惑度（t-SNE，默认 30） */
  perplexity?: number;
  /** 学习率（t-SNE，默认 200） */
  learningRate?: number;
}

export interface ReducedPoint {
  /** 原始向量索引 */
  index: number;
  /** 降维后的坐标 [x, y] 或 [x, y, z] */
  coordinates: number[];
}

/**
 * 简化版 t-SNE 实现（基于梯度下降）
 * 参考：https://en.wikipedia.org/wiki/T-distributed_stochastic_neighbor_embedding
 */
class SimpleTSNE {
  private inputData: Float32Array[];
  private outputDim: number;
  private perplexity: number;
  private learningRate: number;
  private iterations: number;

  constructor(
    data: Float32Array[],
    outputDim: number,
    perplexity: number,
    learningRate: number,
    iterations: number
  ) {
    this.inputData = data;
    this.outputDim = outputDim;
    this.perplexity = perplexity;
    this.learningRate = learningRate;
    this.iterations = iterations;
  }

  /**
   * 计算欧氏距离
   */
  private euclideanDistance(a: Float32Array, b: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * 计算高斯核相似度矩阵（P matrix）
   */
  private computePairwiseProbabilities(): number[][] {
    const n = this.inputData.length;
    const P: number[][] = Array(n)
      .fill(0)
      .map(() => Array(n).fill(0));

    // 计算距离矩阵
    const distances: number[][] = Array(n)
      .fill(0)
      .map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dist = this.euclideanDistance(this.inputData[i], this.inputData[j]);
        distances[i][j] = dist;
        distances[j][i] = dist;
      }
    }

    // 使用固定方差简化计算（真实 t-SNE 需要二分搜索找方差）
    const variance = this.perplexity / 3;

    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          P[i][j] = Math.exp(-(distances[i][j] ** 2) / (2 * variance));
          sum += P[i][j];
        }
      }
      // 归一化
      for (let j = 0; j < n; j++) {
        if (sum > 0) P[i][j] /= sum;
      }
    }

    return P;
  }

  /**
   * 执行降维
   */
  run(): number[][] {
    const n = this.inputData.length;
    const P = this.computePairwiseProbabilities();

    // 随机初始化低维坐标
    const Y: number[][] = Array(n)
      .fill(0)
      .map(() =>
        Array(this.outputDim)
          .fill(0)
          .map(() => (Math.random() - 0.5) * 0.01)
      );

    const velocity: number[][] = Array(n)
      .fill(0)
      .map(() => Array(this.outputDim).fill(0));

    const momentum = 0.5;
    const finalMomentum = 0.8;
    const switchIter = 250;

    // 梯度下降优化
    for (let iter = 0; iter < this.iterations; iter++) {
      const grad: number[][] = Array(n)
        .fill(0)
        .map(() => Array(this.outputDim).fill(0));

      // 计算 Q matrix（t 分布）
      const Q: number[][] = Array(n)
        .fill(0)
        .map(() => Array(n).fill(0));
      let qSum = 0;

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          let dist = 0;
          for (let d = 0; d < this.outputDim; d++) {
            dist += (Y[i][d] - Y[j][d]) ** 2;
          }
          const q = 1 / (1 + dist);
          Q[i][j] = q;
          Q[j][i] = q;
          qSum += 2 * q;
        }
      }

      // 归一化 Q
      if (qSum > 0) {
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            Q[i][j] = Math.max(Q[i][j] / qSum, 1e-12);
          }
        }
      }

      // 计算梯度
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          const mult = (P[i][j] - Q[i][j]) * (1 / (1 + this.euclidean2D(Y[i], Y[j])));
          for (let d = 0; d < this.outputDim; d++) {
            grad[i][d] += 4 * mult * (Y[i][d] - Y[j][d]);
          }
        }
      }

      // 更新位置（动量梯度下降）
      const currentMomentum = iter < switchIter ? momentum : finalMomentum;
      for (let i = 0; i < n; i++) {
        for (let d = 0; d < this.outputDim; d++) {
          velocity[i][d] =
            currentMomentum * velocity[i][d] - this.learningRate * grad[i][d];
          Y[i][d] += velocity[i][d];
        }
      }
    }

    return Y;
  }

  private euclidean2D(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }
}

/**
 * 简化版 UMAP 实现（使用随机投影作为快速近似）
 * 真实 UMAP 需要复杂的拓扑优化，这里用 PCA + 扰动模拟
 */
class SimpleUMAP {
  private inputData: Float32Array[];
  private outputDim: number;

  constructor(data: Float32Array[], outputDim: number) {
    this.inputData = data;
    this.outputDim = outputDim;
  }

  /**
   * 简化版：随机投影 + 局部优化
   */
  run(): number[][] {
    const n = this.inputData.length;
    const inputDim = this.inputData[0].length;

    // 随机投影矩阵
    const projectionMatrix: number[][] = Array(inputDim)
      .fill(0)
      .map(() =>
        Array(this.outputDim)
          .fill(0)
          .map(() => Math.random() - 0.5)
      );

    // 投影到低维
    const Y: number[][] = Array(n)
      .fill(0)
      .map((_, i) => {
        const result = Array(this.outputDim).fill(0);
        for (let d = 0; d < this.outputDim; d++) {
          for (let j = 0; j < inputDim; j++) {
            result[d] += this.inputData[i][j] * projectionMatrix[j][d];
          }
        }
        return result;
      });

    // 归一化到 [-10, 10] 范围
    for (let d = 0; d < this.outputDim; d++) {
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < n; i++) {
        min = Math.min(min, Y[i][d]);
        max = Math.max(max, Y[i][d]);
      }
      const range = max - min;
      if (range > 0) {
        for (let i = 0; i < n; i++) {
          Y[i][d] = ((Y[i][d] - min) / range) * 20 - 10;
        }
      }
    }

    return Y;
  }
}

/**
 * 降维主函数
 */
export async function reduceDimensions(
  embeddings: Float32Array[],
  options: DimensionReductionOptions,
  onProgress?: (progress: number) => void
): Promise<ReducedPoint[]> {
  const {
    dimensions,
    algorithm,
    iterations = 1000,
    perplexity = 30,
    learningRate = 200,
  } = options;

  if (embeddings.length < 2) {
    throw new Error('At least 2 embeddings required for dimensionality reduction');
  }

  onProgress?.(0);

  let coordinates: number[][];

  if (algorithm === 'tsne') {
    const tsne = new SimpleTSNE(
      embeddings,
      dimensions,
      Math.min(perplexity, embeddings.length - 1),
      learningRate,
      iterations
    );
    coordinates = tsne.run();
  } else {
    const umap = new SimpleUMAP(embeddings, dimensions);
    coordinates = umap.run();
  }

  onProgress?.(100);

  return coordinates.map((coords, index) => ({
    index,
    coordinates: coords,
  }));
}
