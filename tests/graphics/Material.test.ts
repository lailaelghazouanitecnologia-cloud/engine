/**
 * Material Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Material, StandardMaterial, UnlitMaterial, RenderQueue } from '../../src/graphics/Material';
import { Color } from '../../src/math/Color';
import { Vector4 } from '../../src/math/Vector4';
import { BlendMode, CullFace, CompareFunc } from '../../src/graphics/constants';

// Mock GraphicsDevice
const mockDevice = {
    gl: null,
} as any;

describe('Material', () => {
    let material: Material;

    beforeEach(() => {
        material = new Material(mockDevice);
    });

    describe('Constructor', () => {
        it('should create with device reference', () => {
            expect(material.device).toBe(mockDevice);
        });

        it('should have default render queue', () => {
            expect(material.renderQueue).toBe(RenderQueue.GEOMETRY);
        });

        it('should have default cull face', () => {
            expect(material.cullFace).toBe(CullFace.BACK);
        });

        it('should have depth write enabled by default', () => {
            expect(material.depthWrite).toBe(true);
        });

        it('should have depth test enabled by default', () => {
            expect(material.depthTest).toBe(true);
        });

        it('should have blend disabled by default', () => {
            expect(material.blend).toBe(false);
        });
    });

    describe('Property Setters', () => {
        it('should set float property', () => {
            material.setFloat('_Metallic', 0.8);
            expect(material.getFloat('_Metallic')).toBe(0.8);
        });

        it('should set int property', () => {
            material.setInt('_Count', 5);
            expect(material.getInt('_Count')).toBe(5);
        });

        it('should floor int property', () => {
            material.setInt('_Count', 5.7);
            expect(material.getInt('_Count')).toBe(5);
        });

        it('should set color property', () => {
            const color = new Color(1, 0.5, 0.25, 1);
            material.setColor('_Color', color);
            const result = material.getColor('_Color');
            expect(result).not.toBeNull();
            expect(result!.r).toBe(1);
            expect(result!.g).toBe(0.5);
            expect(result!.b).toBe(0.25);
        });

        it('should set vector property from Vector4', () => {
            const vec = new Vector4(1, 2, 3, 4);
            material.setVector('_Offset', vec);
            const result = material.getVector('_Offset');
            expect(result).toEqual([1, 2, 3, 4]);
        });

        it('should set vector property from array', () => {
            material.setVector('_Offset', [1, 2, 3, 4]);
            const result = material.getVector('_Offset');
            expect(result).toEqual([1, 2, 3, 4]);
        });

        it('should set matrix property', () => {
            const matrix = new Float32Array([
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]);
            material.setMatrix('_MVP', matrix);
            // Matrix is stored but no getter exists in base Material
            expect(material.hasProperty('_MVP')).toBe(true);
        });
    });

    describe('Property Getters', () => {
        it('should return 0 for undefined float', () => {
            expect(material.getFloat('_Undefined')).toBe(0);
        });

        it('should return 0 for undefined int', () => {
            expect(material.getInt('_Undefined')).toBe(0);
        });

        it('should return null for undefined color', () => {
            expect(material.getColor('_Undefined')).toBeNull();
        });

        it('should return null for undefined vector', () => {
            expect(material.getVector('_Undefined')).toBeNull();
        });

        it('should return null for undefined texture', () => {
            expect(material.getTexture('_Undefined')).toBeNull();
        });
    });

    describe('Has Property', () => {
        it('should return true for existing property', () => {
            material.setFloat('_Test', 1);
            expect(material.hasProperty('_Test')).toBe(true);
        });

        it('should return false for non-existing property', () => {
            expect(material.hasProperty('_NonExisting')).toBe(false);
        });
    });

    describe('Clone', () => {
        it('should clone material with all properties', () => {
            material.name = 'TestMaterial';
            material.setFloat('_Metallic', 0.8);
            material.setColor('_Color', new Color(1, 0, 0, 1));
            material.renderQueue = RenderQueue.TRANSPARENT;

            const clone = material.clone();

            expect(clone).not.toBe(material);
            // Clone appends " (Clone)" to the name
            expect(clone.name).toBe('TestMaterial (Clone)');
            expect(clone.getFloat('_Metallic')).toBe(0.8);
            expect(clone.getColor('_Color')?.r).toBe(1);
            expect(clone.renderQueue).toBe(RenderQueue.TRANSPARENT);
        });

        it('should create independent copy', () => {
            material.setFloat('_Value', 1);
            const clone = material.clone();

            clone.setFloat('_Value', 2);

            expect(material.getFloat('_Value')).toBe(1);
            expect(clone.getFloat('_Value')).toBe(2);
        });
    });
});

describe('StandardMaterial', () => {
    let material: StandardMaterial;

    beforeEach(() => {
        material = new StandardMaterial(mockDevice);
    });

    describe('Constructor', () => {
        it('should have default white color', () => {
            expect(material.color.r).toBe(1);
            expect(material.color.g).toBe(1);
            expect(material.color.b).toBe(1);
        });

        it('should have default metallic of 0', () => {
            expect(material.metallic).toBe(0);
        });

        it('should have default smoothness of 0.5', () => {
            expect(material.smoothness).toBe(0.5);
        });

        it('should have default opacity of 1', () => {
            expect(material.opacity).toBe(1);
        });

        it('should have default normal scale of 1', () => {
            expect(material.normalScale).toBe(1);
        });
    });

    describe('Properties', () => {
        it('should set color', () => {
            material.color = new Color(0.5, 0.25, 0.75, 1);
            expect(material.color.r).toBe(0.5);
            expect(material.color.g).toBe(0.25);
            expect(material.color.b).toBe(0.75);
        });

        it('should clamp metallic between 0 and 1', () => {
            material.metallic = -0.5;
            expect(material.metallic).toBe(0);

            material.metallic = 1.5;
            expect(material.metallic).toBe(1);

            material.metallic = 0.7;
            expect(material.metallic).toBe(0.7);
        });

        it('should clamp smoothness between 0 and 1', () => {
            material.smoothness = -0.5;
            expect(material.smoothness).toBe(0);

            material.smoothness = 1.5;
            expect(material.smoothness).toBe(1);

            material.smoothness = 0.3;
            expect(material.smoothness).toBe(0.3);
        });

        it('should clamp opacity between 0 and 1', () => {
            material.opacity = -0.5;
            expect(material.opacity).toBe(0);

            material.opacity = 1.5;
            expect(material.opacity).toBe(1);
        });

        it('should set emission color', () => {
            material.emissionColor = new Color(1, 0, 0, 1);
            expect(material.emissionColor.r).toBe(1);
            expect(material.emissionColor.g).toBe(0);
        });

        it('should set main texture', () => {
            const mockTexture = {} as any;
            material.mainTexture = mockTexture;
            expect(material.mainTexture).toBe(mockTexture);
        });
    });
});

describe('UnlitMaterial', () => {
    let material: UnlitMaterial;

    beforeEach(() => {
        material = new UnlitMaterial(mockDevice);
    });

    describe('Constructor', () => {
        it('should have default white color', () => {
            expect(material.color.r).toBe(1);
            expect(material.color.g).toBe(1);
            expect(material.color.b).toBe(1);
        });

        it('should have default opacity of 1', () => {
            expect(material.opacity).toBe(1);
        });
    });

    describe('Properties', () => {
        it('should set color', () => {
            material.color = new Color(0.2, 0.4, 0.6, 1);
            expect(material.color.r).toBe(0.2);
            expect(material.color.g).toBe(0.4);
            expect(material.color.b).toBe(0.6);
        });

        it('should set main texture', () => {
            const mockTexture = {} as any;
            material.mainTexture = mockTexture;
            expect(material.mainTexture).toBe(mockTexture);
        });

        it('should clamp opacity', () => {
            material.opacity = 2;
            expect(material.opacity).toBe(1);

            material.opacity = -1;
            expect(material.opacity).toBe(0);
        });
    });
});
