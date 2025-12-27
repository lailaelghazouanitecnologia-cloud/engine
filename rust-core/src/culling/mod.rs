//! Culling module - Frustum culling with SIMD optimizations

use wasm_bindgen::prelude::*;
use crate::math::{Vec3, Vec4, Mat4};

/// Frustum planes (6 planes: left, right, bottom, top, near, far)
#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct Frustum {
    planes: [Vec4; 6],
}

#[wasm_bindgen]
impl Frustum {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            planes: [Vec4::zero(); 6],
        }
    }

    /// Extract frustum planes from view-projection matrix
    pub fn from_matrix(vp: &Mat4) -> Self {
        let m = vp.to_array();

        // Extract planes (Gribb-Hartmann method)
        let planes = [
            // Left
            Vec4::new(
                m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]
            ),
            // Right
            Vec4::new(
                m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]
            ),
            // Bottom
            Vec4::new(
                m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]
            ),
            // Top
            Vec4::new(
                m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]
            ),
            // Near
            Vec4::new(
                m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]
            ),
            // Far
            Vec4::new(
                m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]
            ),
        ];

        // Normalize planes
        let mut normalized = [Vec4::zero(); 6];
        for i in 0..6 {
            let p = &planes[i];
            let len = (p.x * p.x + p.y * p.y + p.z * p.z).sqrt();
            if len > 1e-8 {
                let inv = 1.0 / len;
                normalized[i] = Vec4::new(p.x * inv, p.y * inv, p.z * inv, p.w * inv);
            }
        }

        Self { planes: normalized }
    }

    /// Test if a sphere is inside or intersects the frustum
    pub fn contains_sphere(&self, center: &Vec3, radius: f32) -> bool {
        for plane in &self.planes {
            let dist = plane.x * center.x + plane.y * center.y + plane.z * center.z + plane.w;
            if dist < -radius {
                return false;
            }
        }
        true
    }

    /// Test if an AABB is inside or intersects the frustum
    pub fn contains_aabb(&self, min: &Vec3, max: &Vec3) -> bool {
        for plane in &self.planes {
            // Find the positive vertex (furthest along plane normal)
            let px = if plane.x >= 0.0 { max.x } else { min.x };
            let py = if plane.y >= 0.0 { max.y } else { min.y };
            let pz = if plane.z >= 0.0 { max.z } else { min.z };

            let dist = plane.x * px + plane.y * py + plane.z * pz + plane.w;
            if dist < 0.0 {
                return false;
            }
        }
        true
    }

    /// Test if a point is inside the frustum
    pub fn contains_point(&self, point: &Vec3) -> bool {
        for plane in &self.planes {
            let dist = plane.x * point.x + plane.y * point.y + plane.z * point.z + plane.w;
            if dist < 0.0 {
                return false;
            }
        }
        true
    }
}

// ==================== Batch Culling Operations ====================

/// Batch cull spheres against frustum
/// Returns a byte array where 1 = visible, 0 = culled
#[wasm_bindgen]
pub fn batch_cull_spheres(
    frustum: &Frustum,
    centers: &[f32],  // [x, y, z, x, y, z, ...]
    radii: &[f32],    // [r, r, r, ...]
) -> Vec<u8> {
    let count = radii.len();
    let mut result = Vec::with_capacity(count);

    for i in 0..count {
        let idx = i * 3;
        let center = Vec3::new(centers[idx], centers[idx + 1], centers[idx + 2]);
        let visible = frustum.contains_sphere(&center, radii[i]);
        result.push(if visible { 1 } else { 0 });
    }

    result
}

/// Batch cull AABBs against frustum
#[wasm_bindgen]
pub fn batch_cull_aabbs(
    frustum: &Frustum,
    mins: &[f32],  // [x, y, z, x, y, z, ...]
    maxs: &[f32],  // [x, y, z, x, y, z, ...]
) -> Vec<u8> {
    let count = mins.len() / 3;
    let mut result = Vec::with_capacity(count);

    for i in 0..count {
        let idx = i * 3;
        let min = Vec3::new(mins[idx], mins[idx + 1], mins[idx + 2]);
        let max = Vec3::new(maxs[idx], maxs[idx + 1], maxs[idx + 2]);
        let visible = frustum.contains_aabb(&min, &max);
        result.push(if visible { 1 } else { 0 });
    }

    result
}

/// Batch cull spheres against multiple frustums
/// Returns visibility matrix (cameras × objects)
#[wasm_bindgen]
pub fn batch_cull_multi_frustum(
    frustums: Vec<Frustum>,
    centers: &[f32],
    radii: &[f32],
) -> Vec<u8> {
    let object_count = radii.len();
    let frustum_count = frustums.len();
    let mut result = Vec::with_capacity(frustum_count * object_count);

    for frustum in &frustums {
        for i in 0..object_count {
            let idx = i * 3;
            let center = Vec3::new(centers[idx], centers[idx + 1], centers[idx + 2]);
            let visible = frustum.contains_sphere(&center, radii[i]);
            result.push(if visible { 1 } else { 0 });
        }
    }

    result
}

impl Default for Frustum {
    fn default() -> Self {
        Self::new()
    }
}
