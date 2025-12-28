/**
 * Transform component for position, rotation, and scale.
 * Similar to UnityEngine.Transform
 */

import { Component } from './Component';
import { Vector3 } from '../math/Vector3';
import { Quaternion } from '../math/Quaternion';
import { Matrix4x4 } from '../math/Matrix4x4';

export class Transform extends Component {
    private _localPosition: Vector3 = new Vector3(0, 0, 0);
    private _localRotation: Quaternion = new Quaternion(0, 0, 0, 1);
    private _localScale: Vector3 = new Vector3(1, 1, 1);

    private _parent: Transform | null = null;
    private _children: Transform[] = [];

    private _localToWorldMatrix: Matrix4x4 = Matrix4x4.identity;
    private _worldToLocalMatrix: Matrix4x4 = Matrix4x4.identity;
    private _dirty: boolean = true;

    constructor() {
        super();
    }

    // ==================== Position ====================

    /** Position relative to parent */
    get localPosition(): Vector3 {
        return this._localPosition.clone();
    }

    set localPosition(value: Vector3) {
        this._localPosition.copy(value);
        this._setDirty();
    }

    /** World space position */
    get position(): Vector3 {
        this._updateMatrices();
        return this._localToWorldMatrix.getPosition();
    }

    set position(value: Vector3) {
        if (this._parent) {
            this._localPosition = this._parent.inverseTransformPoint(value);
        } else {
            this._localPosition.copy(value);
        }
        this._setDirty();
    }

    // ==================== Rotation ====================

    /** Rotation relative to parent */
    get localRotation(): Quaternion {
        return this._localRotation.clone();
    }

    set localRotation(value: Quaternion) {
        this._localRotation.copy(value);
        this._setDirty();
    }

    /** World space rotation */
    get rotation(): Quaternion {
        if (this._parent) {
            return this._parent.rotation.multiply(this._localRotation);
        }
        return this._localRotation.clone();
    }

    set rotation(value: Quaternion) {
        if (this._parent) {
            this._localRotation = this._parent.rotation.inverse().multiply(value);
        } else {
            this._localRotation.copy(value);
        }
        this._setDirty();
    }

    /** Euler angles relative to parent (in degrees) */
    get localEulerAngles(): Vector3 {
        return this._localRotation.eulerAngles;
    }

    set localEulerAngles(value: Vector3) {
        this._localRotation = Quaternion.euler(value.x, value.y, value.z);
        this._setDirty();
    }

    /** World space euler angles (in degrees) */
    get eulerAngles(): Vector3 {
        return this.rotation.eulerAngles;
    }

    set eulerAngles(value: Vector3) {
        this.rotation = Quaternion.euler(value.x, value.y, value.z);
    }

    // ==================== Scale ====================

    /** Scale relative to parent */
    get localScale(): Vector3 {
        return this._localScale.clone();
    }

    set localScale(value: Vector3) {
        this._localScale.copy(value);
        this._setDirty();
    }

    /** Approximate world scale (may not be accurate with non-uniform parent scale) */
    get lossyScale(): Vector3 {
        if (this._parent) {
            const parentScale = this._parent.lossyScale;
            return new Vector3(
                parentScale.x * this._localScale.x,
                parentScale.y * this._localScale.y,
                parentScale.z * this._localScale.z
            );
        }
        return this._localScale.clone();
    }

    // ==================== Directions ====================

    /** Forward direction in world space (positive Z) */
    get forward(): Vector3 {
        return Quaternion.rotateVector(this.rotation, Vector3.forward);
    }

    set forward(value: Vector3) {
        this.rotation = Quaternion.lookRotation(value, Vector3.up);
    }

    /** Right direction in world space */
    get right(): Vector3 {
        return Quaternion.rotateVector(this.rotation, Vector3.right);
    }

    set right(value: Vector3) {
        this.rotation = Quaternion.fromToRotation(Vector3.right, value);
    }

    /** Up direction in world space */
    get up(): Vector3 {
        return Quaternion.rotateVector(this.rotation, Vector3.up);
    }

    set up(value: Vector3) {
        this.rotation = Quaternion.fromToRotation(Vector3.up, value);
    }

    // ==================== Hierarchy ====================

    /** Parent transform */
    get parent(): Transform | null {
        return this._parent;
    }

    set parent(value: Transform | null) {
        this.setParent(value, true);
    }

    /** Set parent with option to maintain world position */
    setParent(parent: Transform | null, worldPositionStays: boolean = true): void {
        if (this._parent === parent) return;

        const worldPosition = worldPositionStays ? this.position : null;
        const worldRotation = worldPositionStays ? this.rotation : null;
        const worldScale = worldPositionStays ? this.lossyScale : null;

        // Remove from old parent
        if (this._parent) {
            const index = this._parent._children.indexOf(this);
            if (index >= 0) {
                this._parent._children.splice(index, 1);
            }
        }

        this._parent = parent;

        // Add to new parent
        if (parent) {
            parent._children.push(this);
        }

        // Restore world transform if needed
        if (worldPositionStays && worldPosition && worldRotation && worldScale) {
            this.position = worldPosition;
            this.rotation = worldRotation;
            // Scale is trickier with non-uniform parent scale
        }

        this._setDirty();
    }

    /** Root of the hierarchy */
    get root(): Transform {
        let current: Transform = this;
        while (current._parent) {
            current = current._parent;
        }
        return current;
    }

    /** Number of children */
    get childCount(): number {
        return this._children.length;
    }

    /** Get child by index */
    getChild(index: number): Transform {
        return this._children[index];
    }

    /** Find child by name (not recursive) */
    find(name: string): Transform | null {
        for (const child of this._children) {
            if (child.name === name) {
                return child;
            }
        }
        return null;
    }

    /** Detach all children */
    detachChildren(): void {
        for (const child of [...this._children]) {
            child.parent = null;
        }
    }

    /** Check if this is a child of parent */
    isChildOf(parent: Transform): boolean {
        let current: Transform | null = this._parent;
        while (current) {
            if (current === parent) return true;
            current = current._parent;
        }
        return false;
    }

    /** Get sibling index */
    getSiblingIndex(): number {
        if (!this._parent) return 0;
        return this._parent._children.indexOf(this);
    }

    /** Set sibling index */
    setSiblingIndex(index: number): void {
        if (!this._parent) return;
        const siblings = this._parent._children;
        const currentIndex = siblings.indexOf(this);
        if (currentIndex >= 0) {
            siblings.splice(currentIndex, 1);
            siblings.splice(Math.min(index, siblings.length), 0, this);
        }
    }

    // ==================== Transform Operations ====================

    /** Rotate by euler angles (in degrees) */
    rotate(eulerAngles: Vector3, relativeTo: Space = Space.Self): void;
    rotate(xAngle: number, yAngle: number, zAngle: number, relativeTo?: Space): void;
    rotate(xOrEuler: Vector3 | number, yOrSpace?: number | Space, zAngle?: number, relativeTo?: Space): void {
        let euler: Vector3;
        let space: Space;

        if (typeof xOrEuler === 'number') {
            euler = new Vector3(xOrEuler, yOrSpace as number, zAngle!);
            space = relativeTo ?? Space.Self;
        } else {
            euler = xOrEuler;
            space = (yOrSpace as Space) ?? Space.Self;
        }

        const rot = Quaternion.euler(euler.x, euler.y, euler.z);

        if (space === Space.Self) {
            this._localRotation = this._localRotation.multiply(rot);
        } else {
            this.rotation = rot.multiply(this.rotation);
        }
        this._setDirty();
    }

    /** Rotate around an axis */
    rotateAround(point: Vector3, axis: Vector3, angle: number): void {
        const q = Quaternion.angleAxis(angle, axis);
        const diff = this.position.subtract(point);
        const rotatedDiff = Quaternion.rotateVector(q, diff);
        this.position = point.plus(rotatedDiff);
        this.rotation = q.multiply(this.rotation);
    }

    /** Look at a target */
    lookAt(target: Vector3, worldUp?: Vector3): void;
    lookAt(target: Transform, worldUp?: Vector3): void;
    lookAt(target: Vector3 | Transform, worldUp: Vector3 = Vector3.up): void {
        const targetPos = target instanceof Transform ? target.position : target;
        const direction = targetPos.subtract(this.position).normalized;
        if (direction.magnitude > 0.0001) {
            this.rotation = Quaternion.lookRotation(direction, worldUp);
        }
    }

    /** Translate in local or world space */
    translate(translation: Vector3, relativeTo?: Space): void;
    translate(x: number, y: number, z: number, relativeTo?: Space): void;
    translate(xOrVec: Vector3 | number, yOrSpace?: number | Space, z?: number, relativeTo?: Space): void {
        let translation: Vector3;
        let space: Space;

        if (typeof xOrVec === 'number') {
            translation = new Vector3(xOrVec, yOrSpace as number, z!);
            space = relativeTo ?? Space.Self;
        } else {
            translation = xOrVec;
            space = (yOrSpace as Space) ?? Space.Self;
        }

        if (space === Space.Self) {
            this.position = this.position.add(this.transformDirection(translation));
        } else {
            this.position = this.position.add(translation);
        }
    }

    // ==================== Point/Direction Transforms ====================

    /** Transform point from local to world space */
    transformPoint(point: Vector3): Vector3 {
        this._updateMatrices();
        return this._localToWorldMatrix.transformPoint(point);
    }

    /** Transform point from world to local space */
    inverseTransformPoint(point: Vector3): Vector3 {
        this._updateMatrices();
        return this._worldToLocalMatrix.transformPoint(point);
    }

    /** Transform direction from local to world space */
    transformDirection(direction: Vector3): Vector3 {
        return Quaternion.rotateVector(this.rotation, direction);
    }

    /** Transform direction from world to local space */
    inverseTransformDirection(direction: Vector3): Vector3 {
        return Quaternion.rotateVector(this.rotation.inverse(), direction);
    }

    /** Transform vector from local to world space (includes scale) */
    transformVector(vector: Vector3): Vector3 {
        this._updateMatrices();
        return this._localToWorldMatrix.transformDirection(vector);
    }

    /** Transform vector from world to local space */
    inverseTransformVector(vector: Vector3): Vector3 {
        this._updateMatrices();
        return this._worldToLocalMatrix.transformDirection(vector);
    }

    // ==================== Matrices ====================

    /** Local to world transformation matrix */
    get localToWorldMatrix(): Matrix4x4 {
        this._updateMatrices();
        return this._localToWorldMatrix.clone();
    }

    /** World to local transformation matrix */
    get worldToLocalMatrix(): Matrix4x4 {
        this._updateMatrices();
        return this._worldToLocalMatrix.clone();
    }

    // ==================== Internal ====================

    private _setDirty(): void {
        if (this._dirty) return;
        this._dirty = true;
        for (const child of this._children) {
            child._setDirty();
        }
    }

    private _updateMatrices(): void {
        if (!this._dirty) return;

        this._localToWorldMatrix = Matrix4x4.trs(
            this._localPosition,
            this._localRotation,
            this._localScale
        );

        if (this._parent) {
            this._parent._updateMatrices();
            this._localToWorldMatrix = this._parent._localToWorldMatrix.multiply(this._localToWorldMatrix);
        }

        this._worldToLocalMatrix = this._localToWorldMatrix.inverse;
        this._dirty = false;
    }

    /** @internal Get dirty flag */
    get isDirty(): boolean {
        return this._dirty;
    }

    /**
     * @internal Set matrices from batch update (used by TransformBatchUpdater)
     * This bypasses normal lazy evaluation for batch performance
     */
    _setMatricesFromBatch(worldMatrix: Matrix4x4): void {
        this._localToWorldMatrix = worldMatrix;
        this._worldToLocalMatrix = worldMatrix.inverse;
        this._dirty = false;
    }

    /** Iterate over children */
    *[Symbol.iterator](): Iterator<Transform> {
        for (const child of this._children) {
            yield child;
        }
    }
}

export enum Space {
    World = 0,
    Self = 1,
}
