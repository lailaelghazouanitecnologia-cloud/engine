//! Batch operations for high-performance array processing

use wasm_bindgen::prelude::*;
use super::{Vec3, Vec4, Mat4, Quat};

/// Batch transform points by a matrix
#[wasm_bindgen]
pub fn batch_transform_points(matrix: &Mat4, points: &[f32]) -> Vec<f32> {
    let count = points.len() / 3;
    let mut result = Vec::with_capacity(count * 3);

    for i in 0..count {
        let idx = i * 3;
        let p = Vec3::new(points[idx], points[idx + 1], points[idx + 2]);
        let transformed = matrix.transform_point(&p);
        result.push(transformed.x);
        result.push(transformed.y);
        result.push(transformed.z);
    }

    result
}

/// Batch transform directions by a matrix (no translation)
#[wasm_bindgen]
pub fn batch_transform_directions(matrix: &Mat4, directions: &[f32]) -> Vec<f32> {
    let count = directions.len() / 3;
    let mut result = Vec::with_capacity(count * 3);

    for i in 0..count {
        let idx = i * 3;
        let d = Vec3::new(directions[idx], directions[idx + 1], directions[idx + 2]);
        let transformed = matrix.transform_direction(&d);
        result.push(transformed.x);
        result.push(transformed.y);
        result.push(transformed.z);
    }

    result
}

/// Batch multiply matrices: C[i] = A[i] * B[i]
#[wasm_bindgen]
pub fn batch_multiply_matrices(a_data: &[f32], b_data: &[f32]) -> Vec<f32> {
    let count = a_data.len() / 16;
    let mut result = Vec::with_capacity(count * 16);

    for i in 0..count {
        let idx = i * 16;

        let a = Mat4::from_values(
            a_data[idx], a_data[idx+1], a_data[idx+2], a_data[idx+3],
            a_data[idx+4], a_data[idx+5], a_data[idx+6], a_data[idx+7],
            a_data[idx+8], a_data[idx+9], a_data[idx+10], a_data[idx+11],
            a_data[idx+12], a_data[idx+13], a_data[idx+14], a_data[idx+15],
        );

        let b = Mat4::from_values(
            b_data[idx], b_data[idx+1], b_data[idx+2], b_data[idx+3],
            b_data[idx+4], b_data[idx+5], b_data[idx+6], b_data[idx+7],
            b_data[idx+8], b_data[idx+9], b_data[idx+10], b_data[idx+11],
            b_data[idx+12], b_data[idx+13], b_data[idx+14], b_data[idx+15],
        );

        let c = a.multiply(&b);
        result.extend_from_slice(&c.to_array());
    }

    result
}

/// Batch SLERP quaternions
#[wasm_bindgen]
pub fn batch_slerp_quats(a_data: &[f32], b_data: &[f32], t: f32) -> Vec<f32> {
    let count = a_data.len() / 4;
    let mut result = Vec::with_capacity(count * 4);

    for i in 0..count {
        let idx = i * 4;

        let a = Quat::new(a_data[idx], a_data[idx+1], a_data[idx+2], a_data[idx+3]);
        let b = Quat::new(b_data[idx], b_data[idx+1], b_data[idx+2], b_data[idx+3]);

        let c = a.slerp(&b, t);
        result.extend_from_slice(&c.to_array());
    }

    result
}

/// Batch LERP vectors
#[wasm_bindgen]
pub fn batch_lerp_vec3(a_data: &[f32], b_data: &[f32], t: f32) -> Vec<f32> {
    let count = a_data.len() / 3;
    let mut result = Vec::with_capacity(count * 3);

    for i in 0..count {
        let idx = i * 3;

        let a = Vec3::new(a_data[idx], a_data[idx+1], a_data[idx+2]);
        let b = Vec3::new(b_data[idx], b_data[idx+1], b_data[idx+2]);

        let c = a.lerp(&b, t);
        result.extend_from_slice(&c.to_array());
    }

    result
}

/// Batch normalize vectors
#[wasm_bindgen]
pub fn batch_normalize_vec3(data: &[f32]) -> Vec<f32> {
    let count = data.len() / 3;
    let mut result = Vec::with_capacity(count * 3);

    for i in 0..count {
        let idx = i * 3;
        let v = Vec3::new(data[idx], data[idx+1], data[idx+2]);
        let n = v.normalize();
        result.extend_from_slice(&n.to_array());
    }

    result
}

/// Batch dot product
#[wasm_bindgen]
pub fn batch_dot_vec3(a_data: &[f32], b_data: &[f32]) -> Vec<f32> {
    let count = a_data.len() / 3;
    let mut result = Vec::with_capacity(count);

    for i in 0..count {
        let idx = i * 3;
        let a = Vec3::new(a_data[idx], a_data[idx+1], a_data[idx+2]);
        let b = Vec3::new(b_data[idx], b_data[idx+1], b_data[idx+2]);
        result.push(a.dot(&b));
    }

    result
}

/// Batch cross product
#[wasm_bindgen]
pub fn batch_cross_vec3(a_data: &[f32], b_data: &[f32]) -> Vec<f32> {
    let count = a_data.len() / 3;
    let mut result = Vec::with_capacity(count * 3);

    for i in 0..count {
        let idx = i * 3;
        let a = Vec3::new(a_data[idx], a_data[idx+1], a_data[idx+2]);
        let b = Vec3::new(b_data[idx], b_data[idx+1], b_data[idx+2]);
        let c = a.cross(&b);
        result.extend_from_slice(&c.to_array());
    }

    result
}

/// Compose batch TRS matrices
#[wasm_bindgen]
pub fn batch_compose_trs(
    positions: &[f32],
    rotations: &[f32],
    scales: &[f32],
) -> Vec<f32> {
    let count = positions.len() / 3;
    let mut result = Vec::with_capacity(count * 16);

    for i in 0..count {
        let pi = i * 3;
        let ri = i * 4;
        let si = i * 3;

        let pos = Vec3::new(positions[pi], positions[pi+1], positions[pi+2]);
        let rot = Quat::new(rotations[ri], rotations[ri+1], rotations[ri+2], rotations[ri+3]);
        let scale = Vec3::new(scales[si], scales[si+1], scales[si+2]);

        let mat = Mat4::compose(&pos, &rot, &scale);
        result.extend_from_slice(&mat.to_array());
    }

    result
}
