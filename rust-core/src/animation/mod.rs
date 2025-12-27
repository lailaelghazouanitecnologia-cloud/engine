//! Animation module - Skeleton and keyframe animation

use wasm_bindgen::prelude::*;
use crate::math::{Vec3, Quat, Mat4};

/// Bone transform
#[wasm_bindgen]
#[derive(Clone, Copy, Debug)]
pub struct BoneTransform {
    pub position: Vec3,
    pub rotation: Quat,
    pub scale: Vec3,
}

#[wasm_bindgen]
impl BoneTransform {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            position: Vec3::zero(),
            rotation: Quat::identity(),
            scale: Vec3::one(),
        }
    }

    pub fn identity() -> Self {
        Self::new()
    }

    pub fn to_matrix(&self) -> Mat4 {
        Mat4::compose(&self.position, &self.rotation, &self.scale)
    }

    pub fn lerp(&self, other: &BoneTransform, t: f32) -> BoneTransform {
        BoneTransform {
            position: self.position.lerp(&other.position, t),
            rotation: self.rotation.slerp(&other.rotation, t),
            scale: self.scale.lerp(&other.scale, t),
        }
    }
}

impl Default for BoneTransform {
    fn default() -> Self {
        Self::new()
    }
}

// ==================== Batch Animation Operations ====================

/// Batch interpolate bone transforms
#[wasm_bindgen]
pub fn batch_interpolate_bones(
    a_positions: &[f32],  // [x, y, z, ...]
    a_rotations: &[f32],  // [x, y, z, w, ...]
    a_scales: &[f32],     // [x, y, z, ...]
    b_positions: &[f32],
    b_rotations: &[f32],
    b_scales: &[f32],
    t: f32,
) -> Vec<f32> {
    let bone_count = a_positions.len() / 3;

    // Output: position(3) + rotation(4) + scale(3) = 10 floats per bone
    let mut result = Vec::with_capacity(bone_count * 10);

    for i in 0..bone_count {
        let pi = i * 3;
        let ri = i * 4;
        let si = i * 3;

        // Interpolate position
        let pos = Vec3::new(a_positions[pi], a_positions[pi+1], a_positions[pi+2])
            .lerp(&Vec3::new(b_positions[pi], b_positions[pi+1], b_positions[pi+2]), t);

        // Interpolate rotation (SLERP)
        let rot = Quat::new(a_rotations[ri], a_rotations[ri+1], a_rotations[ri+2], a_rotations[ri+3])
            .slerp(&Quat::new(b_rotations[ri], b_rotations[ri+1], b_rotations[ri+2], b_rotations[ri+3]), t);

        // Interpolate scale
        let scale = Vec3::new(a_scales[si], a_scales[si+1], a_scales[si+2])
            .lerp(&Vec3::new(b_scales[si], b_scales[si+1], b_scales[si+2]), t);

        result.extend_from_slice(&pos.to_array());
        result.extend_from_slice(&rot.to_array());
        result.extend_from_slice(&scale.to_array());
    }

    result
}

/// Compute final bone matrices from local transforms and hierarchy
#[wasm_bindgen]
pub fn compute_bone_matrices(
    local_transforms: &[f32],  // 10 floats per bone (pos + rot + scale)
    parent_indices: &[i32],    // -1 for root bones
    bind_poses: &[f32],        // 16 floats per bone (inverse bind matrix)
) -> Vec<f32> {
    let bone_count = parent_indices.len();
    let mut world_matrices: Vec<Mat4> = Vec::with_capacity(bone_count);
    let mut result = Vec::with_capacity(bone_count * 16);

    // First pass: compute world matrices
    for i in 0..bone_count {
        let ti = i * 10;

        let pos = Vec3::new(
            local_transforms[ti],
            local_transforms[ti + 1],
            local_transforms[ti + 2],
        );
        let rot = Quat::new(
            local_transforms[ti + 3],
            local_transforms[ti + 4],
            local_transforms[ti + 5],
            local_transforms[ti + 6],
        );
        let scale = Vec3::new(
            local_transforms[ti + 7],
            local_transforms[ti + 8],
            local_transforms[ti + 9],
        );

        let local = Mat4::compose(&pos, &rot, &scale);

        let world = if parent_indices[i] >= 0 {
            let parent_idx = parent_indices[i] as usize;
            world_matrices[parent_idx].multiply(&local)
        } else {
            local
        };

        world_matrices.push(world);
    }

    // Second pass: multiply by inverse bind pose
    for i in 0..bone_count {
        let bi = i * 16;
        let bind = Mat4::from_values(
            bind_poses[bi], bind_poses[bi+1], bind_poses[bi+2], bind_poses[bi+3],
            bind_poses[bi+4], bind_poses[bi+5], bind_poses[bi+6], bind_poses[bi+7],
            bind_poses[bi+8], bind_poses[bi+9], bind_poses[bi+10], bind_poses[bi+11],
            bind_poses[bi+12], bind_poses[bi+13], bind_poses[bi+14], bind_poses[bi+15],
        );

        let final_mat = world_matrices[i].multiply(&bind);
        result.extend_from_slice(&final_mat.to_array());
    }

    result
}

/// Blend two skeleton poses
#[wasm_bindgen]
pub fn blend_skeleton_poses(
    pose_a: &[f32],  // 10 floats per bone
    pose_b: &[f32],
    weight: f32,
) -> Vec<f32> {
    let bone_count = pose_a.len() / 10;
    let mut result = Vec::with_capacity(bone_count * 10);

    for i in 0..bone_count {
        let ti = i * 10;

        // Position
        let pos_a = Vec3::new(pose_a[ti], pose_a[ti+1], pose_a[ti+2]);
        let pos_b = Vec3::new(pose_b[ti], pose_b[ti+1], pose_b[ti+2]);
        let pos = pos_a.lerp(&pos_b, weight);

        // Rotation
        let rot_a = Quat::new(pose_a[ti+3], pose_a[ti+4], pose_a[ti+5], pose_a[ti+6]);
        let rot_b = Quat::new(pose_b[ti+3], pose_b[ti+4], pose_b[ti+5], pose_b[ti+6]);
        let rot = rot_a.slerp(&rot_b, weight);

        // Scale
        let scale_a = Vec3::new(pose_a[ti+7], pose_a[ti+8], pose_a[ti+9]);
        let scale_b = Vec3::new(pose_b[ti+7], pose_b[ti+8], pose_b[ti+9]);
        let scale = scale_a.lerp(&scale_b, weight);

        result.extend_from_slice(&pos.to_array());
        result.extend_from_slice(&rot.to_array());
        result.extend_from_slice(&scale.to_array());
    }

    result
}
