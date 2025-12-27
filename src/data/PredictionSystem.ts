/**
 * PredictionSystem - Predictive computation with validation
 *
 * Uses historical data to predict future values, reducing GPU roundtrips
 * by pre-computing likely outcomes. Validators verify predictions and
 * adjust confidence for future predictions.
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                          PredictionSystem                               │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │                    Prediction Buffer                            │   │
 * │  │  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │   │
 * │  │  │Predicted │Predicted │Predicted │Confidence│ History  │      │   │
 * │  │  │Position  │Velocity  │ State    │  Score   │ (N vals) │      │   │
 * │  │  └──────────┴──────────┴──────────┴──────────┴──────────┘      │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                                    │                                    │
 * │                                    ▼                                    │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │                    Prediction Strategies                        │   │
 * │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │   │
 * │  │  │   Linear    │ │  Velocity   │ │   Pattern   │               │   │
 * │  │  │ Extrapolate │ │  Based      │ │   Match     │               │   │
 * │  │  └─────────────┘ └─────────────┘ └─────────────┘               │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                                    │                                    │
 * │                                    ▼                                    │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │                       Validators                                 │   │
 * │  │  ┌───────────────────────────────────────────────────────────┐ │   │
 * │  │  │  Compare predicted vs actual → Update confidence score    │ │   │
 * │  │  │  If confidence > threshold → Use predicted value          │ │   │
 * │  │  │  If confidence < threshold → Compute actual value         │ │   │
 * │  │  └───────────────────────────────────────────────────────────┘ │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                                    │                                    │
 * │                                    ▼                                    │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │                    Validation Results                           │   │
 * │  │  ┌─────────┬─────────┬─────────┬─────────┐                     │   │
 * │  │  │ Entity  │Predicted│ Actual  │ Error   │                     │   │
 * │  │  │   ID    │  Value  │  Value  │Magnitude│                     │   │
 * │  │  └─────────┴─────────┴─────────┴─────────┘                     │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import { DataMatrix, DataColumn } from './DataMatrix';
import { DirtyTracker, DirtyChannel } from './DirtyTracker';

/** Prediction strategy type */
export enum PredictionStrategy {
    /** No prediction, always compute */
    NONE = 0,
    /** Linear extrapolation based on velocity */
    LINEAR = 1,
    /** Quadratic extrapolation (includes acceleration) */
    QUADRATIC = 2,
    /** Pattern-based prediction from history */
    PATTERN = 3,
    /** Static - entity doesn't change */
    STATIC = 4,
    /** User-defined prediction function */
    CUSTOM = 5,
}

/** Prediction entry for a single value */
interface PredictionEntry {
    /** Predicted value */
    predicted: number[];
    /** Confidence score (0-1) */
    confidence: number;
    /** Number of consecutive correct predictions */
    streak: number;
    /** Historical values for pattern matching */
    history: number[][];
    /** Strategy being used */
    strategy: PredictionStrategy;
    /** Last computed actual value */
    lastActual: number[];
    /** Frame when prediction was made */
    predictionFrame: number;
}

/** Validation result */
export interface ValidationResult {
    entityIndex: number;
    columnName: string;
    predicted: number[];
    actual: number[];
    error: number;
    wasAccurate: boolean;
    confidence: number;
}

/** Prediction statistics */
export interface PredictionStats {
    totalPredictions: number;
    accuratePredictions: number;
    inaccuratePredictions: number;
    averageError: number;
    averageConfidence: number;
    gpuComputesSaved: number;
}

/**
 * Predictor for a specific data column
 */
export class ColumnPredictor {
    readonly columnName: string;
    readonly componentCount: number;

    private _entries: Map<number, PredictionEntry> = new Map();
    private _threshold: number;
    private _historySize: number;
    private _frameCount: number = 0;
    private _stats: PredictionStats = {
        totalPredictions: 0,
        accuratePredictions: 0,
        inaccuratePredictions: 0,
        averageError: 0,
        averageConfidence: 0,
        gpuComputesSaved: 0,
    };

    constructor(
        columnName: string,
        componentCount: number,
        options: {
            threshold?: number;
            historySize?: number;
        } = {}
    ) {
        this.columnName = columnName;
        this.componentCount = componentCount;
        this._threshold = options.threshold ?? 0.01; // 1% error threshold
        this._historySize = options.historySize ?? 8;
    }

    get stats(): PredictionStats {
        return { ...this._stats };
    }

    /** Get or create prediction entry */
    private _getEntry(index: number): PredictionEntry {
        let entry = this._entries.get(index);
        if (!entry) {
            entry = {
                predicted: new Array(this.componentCount).fill(0),
                confidence: 0,
                streak: 0,
                history: [],
                strategy: PredictionStrategy.LINEAR,
                lastActual: new Array(this.componentCount).fill(0),
                predictionFrame: 0,
            };
            this._entries.set(index, entry);
        }
        return entry;
    }

    /**
     * Record actual value and update history
     */
    recordActual(index: number, value: number[]): void {
        const entry = this._getEntry(index);

        // Add to history
        entry.history.push([...value]);
        if (entry.history.length > this._historySize) {
            entry.history.shift();
        }

        entry.lastActual = [...value];
    }

    /**
     * Make prediction for next frame
     */
    predict(index: number, deltaTime: number): number[] {
        const entry = this._getEntry(index);

        if (entry.history.length < 2) {
            // Not enough history, return last known value
            return entry.lastActual;
        }

        switch (entry.strategy) {
            case PredictionStrategy.STATIC:
                return entry.lastActual;

            case PredictionStrategy.LINEAR:
                return this._linearPredict(entry, deltaTime);

            case PredictionStrategy.QUADRATIC:
                return this._quadraticPredict(entry, deltaTime);

            case PredictionStrategy.PATTERN:
                return this._patternPredict(entry);

            default:
                return entry.lastActual;
        }

        entry.predicted = entry.lastActual; // Fallback
        entry.predictionFrame = this._frameCount;
        this._stats.totalPredictions++;

        return entry.predicted;
    }

    /**
     * Linear extrapolation
     */
    private _linearPredict(entry: PredictionEntry, deltaTime: number): number[] {
        const n = entry.history.length;
        const current = entry.history[n - 1];
        const previous = entry.history[n - 2];

        const predicted = new Array(this.componentCount);
        for (let i = 0; i < this.componentCount; i++) {
            const velocity = current[i] - previous[i];
            predicted[i] = current[i] + velocity;
        }

        entry.predicted = predicted;
        entry.predictionFrame = this._frameCount;
        return predicted;
    }

    /**
     * Quadratic extrapolation (with acceleration)
     */
    private _quadraticPredict(entry: PredictionEntry, deltaTime: number): number[] {
        const n = entry.history.length;
        if (n < 3) return this._linearPredict(entry, deltaTime);

        const p0 = entry.history[n - 3];
        const p1 = entry.history[n - 2];
        const p2 = entry.history[n - 1];

        const predicted = new Array(this.componentCount);
        for (let i = 0; i < this.componentCount; i++) {
            // Calculate velocity and acceleration
            const v1 = p1[i] - p0[i];
            const v2 = p2[i] - p1[i];
            const acceleration = v2 - v1;

            // Predict next position
            predicted[i] = p2[i] + v2 + acceleration * 0.5;
        }

        entry.predicted = predicted;
        entry.predictionFrame = this._frameCount;
        return predicted;
    }

    /**
     * Pattern-based prediction
     */
    private _patternPredict(entry: PredictionEntry): number[] {
        const n = entry.history.length;
        if (n < 4) return this._linearPredict(entry, 0);

        // Look for repeating patterns
        const current = entry.history[n - 1];
        const previous = entry.history[n - 2];

        // Calculate current delta
        const currentDelta = new Array(this.componentCount);
        for (let i = 0; i < this.componentCount; i++) {
            currentDelta[i] = current[i] - previous[i];
        }

        // Find best matching historical delta
        let bestMatch = -1;
        let bestMatchScore = Infinity;

        for (let j = 0; j < n - 3; j++) {
            const h1 = entry.history[j];
            const h2 = entry.history[j + 1];

            let score = 0;
            for (let i = 0; i < this.componentCount; i++) {
                const historicalDelta = h2[i] - h1[i];
                score += Math.abs(currentDelta[i] - historicalDelta);
            }

            if (score < bestMatchScore) {
                bestMatchScore = score;
                bestMatch = j;
            }
        }

        if (bestMatch >= 0 && bestMatch + 2 < n) {
            // Use the pattern that followed the matched delta
            const patternNext = entry.history[bestMatch + 2];
            const patternCurrent = entry.history[bestMatch + 1];

            const predicted = new Array(this.componentCount);
            for (let i = 0; i < this.componentCount; i++) {
                const patternDelta = patternNext[i] - patternCurrent[i];
                predicted[i] = current[i] + patternDelta;
            }

            entry.predicted = predicted;
            entry.predictionFrame = this._frameCount;
            return predicted;
        }

        return this._linearPredict(entry, 0);
    }

    /**
     * Validate prediction against actual value
     */
    validate(index: number, actual: number[]): ValidationResult {
        const entry = this._getEntry(index);

        // Calculate error
        let error = 0;
        for (let i = 0; i < this.componentCount; i++) {
            const diff = entry.predicted[i] - actual[i];
            error += diff * diff;
        }
        error = Math.sqrt(error);

        // Normalize error by magnitude of actual value
        let magnitude = 0;
        for (let i = 0; i < this.componentCount; i++) {
            magnitude += actual[i] * actual[i];
        }
        magnitude = Math.sqrt(magnitude);

        const normalizedError = magnitude > 0 ? error / magnitude : error;
        const wasAccurate = normalizedError < this._threshold;

        // Update confidence
        if (wasAccurate) {
            entry.streak++;
            entry.confidence = Math.min(1, entry.confidence + 0.1);
            this._stats.accuratePredictions++;

            if (entry.streak > 10 && entry.strategy !== PredictionStrategy.STATIC) {
                // Object is very predictable, might be static
                entry.strategy = PredictionStrategy.STATIC;
            }
        } else {
            entry.streak = 0;
            entry.confidence = Math.max(0, entry.confidence - 0.2);
            this._stats.inaccuratePredictions++;

            // Consider changing strategy
            if (entry.confidence < 0.3) {
                this._adjustStrategy(entry);
            }
        }

        // Update stats
        const n = this._stats.totalPredictions;
        this._stats.averageError = (this._stats.averageError * n + normalizedError) / (n + 1);
        this._stats.averageConfidence = (this._stats.averageConfidence * n + entry.confidence) / (n + 1);

        // Record actual for next prediction
        this.recordActual(index, actual);

        return {
            entityIndex: index,
            columnName: this.columnName,
            predicted: [...entry.predicted],
            actual: [...actual],
            error: normalizedError,
            wasAccurate,
            confidence: entry.confidence,
        };
    }

    /**
     * Check if we should use prediction or compute actual
     */
    shouldUsePrediction(index: number): boolean {
        const entry = this._entries.get(index);
        if (!entry) return false;

        // Use prediction if confidence is high enough
        if (entry.confidence > 0.8 && entry.streak > 3) {
            this._stats.gpuComputesSaved++;
            return true;
        }

        return false;
    }

    /**
     * Get predicted value for entity
     */
    getPredicted(index: number): number[] | null {
        const entry = this._entries.get(index);
        return entry ? [...entry.predicted] : null;
    }

    /**
     * Get confidence for entity
     */
    getConfidence(index: number): number {
        const entry = this._entries.get(index);
        return entry ? entry.confidence : 0;
    }

    /**
     * Set strategy for entity
     */
    setStrategy(index: number, strategy: PredictionStrategy): void {
        const entry = this._getEntry(index);
        entry.strategy = strategy;
        entry.confidence = 0;
        entry.streak = 0;
    }

    /**
     * Adjust strategy based on prediction performance
     */
    private _adjustStrategy(entry: PredictionEntry): void {
        // Cycle through strategies
        switch (entry.strategy) {
            case PredictionStrategy.LINEAR:
                entry.strategy = PredictionStrategy.QUADRATIC;
                break;
            case PredictionStrategy.QUADRATIC:
                entry.strategy = PredictionStrategy.PATTERN;
                break;
            case PredictionStrategy.PATTERN:
                entry.strategy = PredictionStrategy.LINEAR;
                break;
        }
    }

    /**
     * Advance frame counter
     */
    advanceFrame(): void {
        this._frameCount++;
    }

    /**
     * Clear prediction data for entity
     */
    clear(index: number): void {
        this._entries.delete(index);
    }

    /**
     * Reset all predictions
     */
    reset(): void {
        this._entries.clear();
        this._stats = {
            totalPredictions: 0,
            accuratePredictions: 0,
            inaccuratePredictions: 0,
            averageError: 0,
            averageConfidence: 0,
            gpuComputesSaved: 0,
        };
    }
}

/**
 * PredictionSystem - Main prediction orchestrator
 */
export class PredictionSystem {
    private _predictors: Map<string, ColumnPredictor> = new Map();
    private _dirtyTracker: DirtyTracker;
    private _validationResults: ValidationResult[] = [];
    private _frameCount: number = 0;

    constructor(dirtyTracker: DirtyTracker) {
        this._dirtyTracker = dirtyTracker;
    }

    /**
     * Register a column for prediction
     */
    registerColumn(
        columnName: string,
        componentCount: number,
        options?: { threshold?: number; historySize?: number }
    ): void {
        this._predictors.set(
            columnName,
            new ColumnPredictor(columnName, componentCount, options)
        );
    }

    /**
     * Get predictor for column
     */
    getPredictor(columnName: string): ColumnPredictor | null {
        return this._predictors.get(columnName) ?? null;
    }

    /**
     * Make predictions for all dirty entities
     */
    predictDirty(channel: DirtyChannel, deltaTime: number): Map<number, Map<string, number[]>> {
        const predictions = new Map<number, Map<string, number[]>>();
        const dirtyIndices = this._dirtyTracker.getDirtyList(channel);

        for (const index of dirtyIndices) {
            const entityPredictions = new Map<string, number[]>();

            for (const [name, predictor] of this._predictors) {
                if (predictor.shouldUsePrediction(index)) {
                    const predicted = predictor.getPredicted(index);
                    if (predicted) {
                        entityPredictions.set(name, predicted);
                    }
                } else {
                    const predicted = predictor.predict(index, deltaTime);
                    entityPredictions.set(name, predicted);
                }
            }

            predictions.set(index, entityPredictions);
        }

        return predictions;
    }

    /**
     * Record actual computed values and validate predictions
     */
    validateAndRecord(
        index: number,
        actuals: Map<string, number[]>
    ): ValidationResult[] {
        const results: ValidationResult[] = [];

        for (const [name, actual] of actuals) {
            const predictor = this._predictors.get(name);
            if (predictor) {
                const result = predictor.validate(index, actual);
                results.push(result);
                this._validationResults.push(result);
            }
        }

        return results;
    }

    /**
     * Get entities that can skip GPU computation
     */
    getSkippableEntities(channel: DirtyChannel): number[] {
        const dirtyIndices = this._dirtyTracker.getDirtyList(channel);
        const skippable: number[] = [];

        for (const index of dirtyIndices) {
            let canSkip = true;

            for (const predictor of this._predictors.values()) {
                if (!predictor.shouldUsePrediction(index)) {
                    canSkip = false;
                    break;
                }
            }

            if (canSkip) {
                skippable.push(index);
            }
        }

        return skippable;
    }

    /**
     * Apply predictions directly (skip GPU compute)
     */
    applyPredictions(matrix: DataMatrix, skippableIndices: number[]): void {
        for (const index of skippableIndices) {
            for (const [name, predictor] of this._predictors) {
                const predicted = predictor.getPredicted(index);
                if (predicted) {
                    matrix.setValue(index, name, predicted);
                }
            }
        }
    }

    /**
     * End frame - advance predictors
     */
    endFrame(): void {
        for (const predictor of this._predictors.values()) {
            predictor.advanceFrame();
        }

        // Keep only recent validation results
        if (this._validationResults.length > 1000) {
            this._validationResults = this._validationResults.slice(-500);
        }

        this._frameCount++;
    }

    /**
     * Get recent validation results
     */
    getValidationResults(): ValidationResult[] {
        return [...this._validationResults];
    }

    /**
     * Get combined statistics
     */
    getStats(): {
        overall: PredictionStats;
        byColumn: Map<string, PredictionStats>;
    } {
        const byColumn = new Map<string, PredictionStats>();
        const overall: PredictionStats = {
            totalPredictions: 0,
            accuratePredictions: 0,
            inaccuratePredictions: 0,
            averageError: 0,
            averageConfidence: 0,
            gpuComputesSaved: 0,
        };

        for (const [name, predictor] of this._predictors) {
            const stats = predictor.stats;
            byColumn.set(name, stats);

            overall.totalPredictions += stats.totalPredictions;
            overall.accuratePredictions += stats.accuratePredictions;
            overall.inaccuratePredictions += stats.inaccuratePredictions;
            overall.gpuComputesSaved += stats.gpuComputesSaved;
        }

        if (overall.totalPredictions > 0) {
            let totalError = 0;
            let totalConfidence = 0;
            for (const stats of byColumn.values()) {
                totalError += stats.averageError * stats.totalPredictions;
                totalConfidence += stats.averageConfidence * stats.totalPredictions;
            }
            overall.averageError = totalError / overall.totalPredictions;
            overall.averageConfidence = totalConfidence / overall.totalPredictions;
        }

        return { overall, byColumn };
    }

    /**
     * Reset all predictors
     */
    reset(): void {
        for (const predictor of this._predictors.values()) {
            predictor.reset();
        }
        this._validationResults = [];
    }
}

/**
 * PredictionValidator - Standalone validator for custom use
 */
export class PredictionValidator {
    private _threshold: number;
    private _stats = {
        validations: 0,
        passes: 0,
        fails: 0,
    };

    constructor(threshold: number = 0.01) {
        this._threshold = threshold;
    }

    /**
     * Validate a single prediction
     */
    validate(predicted: number[], actual: number[]): {
        passed: boolean;
        error: number;
    } {
        let error = 0;
        let magnitude = 0;

        for (let i = 0; i < predicted.length; i++) {
            const diff = predicted[i] - (actual[i] ?? 0);
            error += diff * diff;
            magnitude += actual[i] * actual[i];
        }

        error = Math.sqrt(error);
        magnitude = Math.sqrt(magnitude);

        const normalizedError = magnitude > 0 ? error / magnitude : error;
        const passed = normalizedError < this._threshold;

        this._stats.validations++;
        if (passed) {
            this._stats.passes++;
        } else {
            this._stats.fails++;
        }

        return { passed, error: normalizedError };
    }

    get stats() {
        return { ...this._stats };
    }

    get accuracy(): number {
        return this._stats.validations > 0
            ? this._stats.passes / this._stats.validations
            : 0;
    }
}
