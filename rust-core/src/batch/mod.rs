//! Batch command processor for WASM
//!
//! Executes multiple operations from a command buffer in a single WASM call.
//! This minimizes JS ↔ WASM boundary crossing overhead.

use wasm_bindgen::prelude::*;

/// Operation codes matching TypeScript WasmOpCode
#[repr(u32)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum OpCode {
    // Vector3 operations (0x00-0x0F)
    Vec3Add = 0x00,
    Vec3Sub = 0x01,
    Vec3Scale = 0x02,
    Vec3Normalize = 0x03,
    Vec3Dot = 0x04,
    Vec3Cross = 0x05,
    Vec3Lerp = 0x06,
    Vec3Length = 0x07,
    Vec3Distance = 0x08,

    // Vector4 operations (0x10-0x1F)
    Vec4Add = 0x10,
    Vec4Sub = 0x11,
    Vec4Scale = 0x12,
    Vec4Normalize = 0x13,
    Vec4Dot = 0x14,

    // Quaternion operations (0x20-0x2F)
    QuatMultiply = 0x20,
    QuatSlerp = 0x21,
    QuatNormalize = 0x22,
    QuatInverse = 0x23,
    QuatFromEuler = 0x24,
    QuatToEuler = 0x25,
    QuatFromAxisAngle = 0x26,
    QuatRotateVec3 = 0x27,

    // Matrix4 operations (0x30-0x3F)
    Mat4Multiply = 0x30,
    Mat4Invert = 0x31,
    Mat4Transpose = 0x32,
    Mat4Trs = 0x33,
    Mat4Perspective = 0x34,
    Mat4Ortho = 0x35,
    Mat4LookAt = 0x36,
    Mat4TransformPoint = 0x37,
    Mat4TransformDirection = 0x38,
    Mat4Decompose = 0x39,

    // Batch operations (0x40-0x4F)
    BatchTransformPoints = 0x40,
    BatchMultiplyMatrices = 0x41,
    BatchSlerpQuats = 0x42,
    BatchSkinning = 0x43,

    // Culling (0x50-0x5F)
    FrustumCullAabbs = 0x50,
    FrustumCullSpheres = 0x51,

    // Physics (0x60-0x6F)
    PhysicsIntegrate = 0x60,
    PhysicsCollisionSpheres = 0x61,

    // Animation (0x70-0x7F)
    SkeletonInterpolate = 0x70,
    SkeletonBlend = 0x71,
    MorphInterpolate = 0x72,

    // Particles (0x80-0x8F)
    ParticlesUpdate = 0x80,
    ParticlesEmit = 0x81,
    ParticlesSort = 0x82,
}

impl OpCode {
    fn from_u32(v: u32) -> Option<Self> {
        match v {
            0x00 => Some(OpCode::Vec3Add),
            0x01 => Some(OpCode::Vec3Sub),
            0x02 => Some(OpCode::Vec3Scale),
            0x03 => Some(OpCode::Vec3Normalize),
            0x04 => Some(OpCode::Vec3Dot),
            0x05 => Some(OpCode::Vec3Cross),
            0x06 => Some(OpCode::Vec3Lerp),
            0x07 => Some(OpCode::Vec3Length),
            0x08 => Some(OpCode::Vec3Distance),
            0x10 => Some(OpCode::Vec4Add),
            0x11 => Some(OpCode::Vec4Sub),
            0x12 => Some(OpCode::Vec4Scale),
            0x13 => Some(OpCode::Vec4Normalize),
            0x14 => Some(OpCode::Vec4Dot),
            0x20 => Some(OpCode::QuatMultiply),
            0x21 => Some(OpCode::QuatSlerp),
            0x22 => Some(OpCode::QuatNormalize),
            0x23 => Some(OpCode::QuatInverse),
            0x24 => Some(OpCode::QuatFromEuler),
            0x25 => Some(OpCode::QuatToEuler),
            0x26 => Some(OpCode::QuatFromAxisAngle),
            0x27 => Some(OpCode::QuatRotateVec3),
            0x30 => Some(OpCode::Mat4Multiply),
            0x31 => Some(OpCode::Mat4Invert),
            0x32 => Some(OpCode::Mat4Transpose),
            0x33 => Some(OpCode::Mat4Trs),
            0x34 => Some(OpCode::Mat4Perspective),
            0x35 => Some(OpCode::Mat4Ortho),
            0x36 => Some(OpCode::Mat4LookAt),
            0x37 => Some(OpCode::Mat4TransformPoint),
            0x38 => Some(OpCode::Mat4TransformDirection),
            0x39 => Some(OpCode::Mat4Decompose),
            0x40 => Some(OpCode::BatchTransformPoints),
            0x41 => Some(OpCode::BatchMultiplyMatrices),
            0x42 => Some(OpCode::BatchSlerpQuats),
            0x43 => Some(OpCode::BatchSkinning),
            0x50 => Some(OpCode::FrustumCullAabbs),
            0x51 => Some(OpCode::FrustumCullSpheres),
            0x60 => Some(OpCode::PhysicsIntegrate),
            0x61 => Some(OpCode::PhysicsCollisionSpheres),
            0x70 => Some(OpCode::SkeletonInterpolate),
            0x71 => Some(OpCode::SkeletonBlend),
            0x72 => Some(OpCode::MorphInterpolate),
            0x80 => Some(OpCode::ParticlesUpdate),
            0x81 => Some(OpCode::ParticlesEmit),
            0x82 => Some(OpCode::ParticlesSort),
            _ => None,
        }
    }
}

/// Command header structure
/// [opcode: u32, count: u32, data_offset: u32, output_offset: u32]
const COMMAND_HEADER_SIZE: usize = 4;

/// Execute a batch of commands from buffers
///
/// # Arguments
/// * `commands` - Command buffer (opcode, count, data_offset, output_offset per command)
/// * `command_count` - Number of commands
/// * `data` - Input data buffer
/// * `output` - Output buffer (will be written to)
#[wasm_bindgen]
pub fn execute_batch(
    commands: &[u32],
    command_count: u32,
    data: &[f32],
    output: &mut [f32],
) -> u32 {
    let mut ops_executed: u32 = 0;

    for i in 0..(command_count as usize) {
        let cmd_offset = i * COMMAND_HEADER_SIZE;

        if cmd_offset + COMMAND_HEADER_SIZE > commands.len() {
            break;
        }

        let opcode_raw = commands[cmd_offset];
        let count = commands[cmd_offset + 1] as usize;
        let data_offset = commands[cmd_offset + 2] as usize;
        let output_offset = commands[cmd_offset + 3] as usize;

        if let Some(opcode) = OpCode::from_u32(opcode_raw) {
            execute_command(opcode, count, data, data_offset, output, output_offset);
            ops_executed += count as u32;
        }
    }

    ops_executed
}

/// Execute a single command type for multiple items
fn execute_command(
    opcode: OpCode,
    count: usize,
    data: &[f32],
    data_offset: usize,
    output: &mut [f32],
    output_offset: usize,
) {
    match opcode {
        OpCode::Vec3Add => execute_vec3_add(count, data, data_offset, output, output_offset),
        OpCode::Vec3Sub => execute_vec3_sub(count, data, data_offset, output, output_offset),
        OpCode::Vec3Scale => execute_vec3_scale(count, data, data_offset, output, output_offset),
        OpCode::Vec3Normalize => execute_vec3_normalize(count, data, data_offset, output, output_offset),
        OpCode::Vec3Dot => execute_vec3_dot(count, data, data_offset, output, output_offset),
        OpCode::Vec3Cross => execute_vec3_cross(count, data, data_offset, output, output_offset),
        OpCode::Vec3Lerp => execute_vec3_lerp(count, data, data_offset, output, output_offset),
        OpCode::QuatMultiply => execute_quat_multiply(count, data, data_offset, output, output_offset),
        OpCode::QuatSlerp => execute_quat_slerp(count, data, data_offset, output, output_offset),
        OpCode::QuatNormalize => execute_quat_normalize(count, data, data_offset, output, output_offset),
        OpCode::Mat4Multiply => execute_mat4_multiply(count, data, data_offset, output, output_offset),
        OpCode::Mat4Trs => execute_mat4_trs(count, data, data_offset, output, output_offset),
        OpCode::Mat4TransformPoint => execute_mat4_transform_point(count, data, data_offset, output, output_offset),
        OpCode::BatchTransformPoints => execute_batch_transform_points(data, data_offset, output, output_offset),
        OpCode::BatchSlerpQuats => execute_batch_slerp_quats(count, data, data_offset, output, output_offset),
        _ => {} // Unimplemented opcodes
    }
}

// ==================== Vector3 Operations ====================

#[inline]
fn execute_vec3_add(count: usize, data: &[f32], mut d: usize, output: &mut [f32], mut o: usize) {
    for _ in 0..count {
        output[o] = data[d] + data[d + 3];
        output[o + 1] = data[d + 1] + data[d + 4];
        output[o + 2] = data[d + 2] + data[d + 5];
        d += 6;
        o += 3;
    }
}

#[inline]
fn execute_vec3_sub(count: usize, data: &[f32], mut d: usize, output: &mut [f32], mut o: usize) {
    for _ in 0..count {
        output[o] = data[d] - data[d + 3];
        output[o + 1] = data[d + 1] - data[d + 4];
        output[o + 2] = data[d + 2] - data[d + 5];
        d += 6;
        o += 3;
    }
}

#[inline]
fn execute_vec3_scale(count: usize, data: &[f32], mut d: usize, output: &mut [f32], mut o: usize) {
    for _ in 0..count {
        let s = data[d + 3];
        output[o] = data[d] * s;
        output[o + 1] = data[d + 1] * s;
        output[o + 2] = data[d + 2] * s;
        d += 4;
        o += 3;
    }
}

#[inline]
fn execute_vec3_normalize(count: usize, data: &[f32], mut d: usize, output: &mut [f32], mut o: usize) {
    for _ in 0..count {
        let x = data[d];
        let y = data[d + 1];
        let z = data[d + 2];
        let len = (x * x + y * y + z * z).sqrt();

        if len > 0.0 {
            let inv_len = 1.0 / len;
            output[o] = x * inv_len;
            output[o + 1] = y * inv_len;
            output[o + 2] = z * inv_len;
        } else {
            output[o] = 0.0;
            output[o + 1] = 0.0;
            output[o + 2] = 0.0;
        }
        d += 3;
        o += 3;
    }
}

#[inline]
fn execute_vec3_dot(count: usize, data: &[f32], mut d: usize, output: &mut [f32], mut o: usize) {
    for _ in 0..count {
        output[o] = data[d] * data[d + 3] + data[d + 1] * data[d + 4] + data[d + 2] * data[d + 5];
        d += 6;
        o += 1;
    }
}

#[inline]
fn execute_vec3_cross(count: usize, data: &[f32], mut d: usize, output: &mut [f32], mut o: usize) {
    for _ in 0..count {
        let ax = data[d];
        let ay = data[d + 1];
        let az = data[d + 2];
        let bx = data[d + 3];
        let by = data[d + 4];
        let bz = data[d + 5];

        output[o] = ay * bz - az * by;
        output[o + 1] = az * bx - ax * bz;
        output[o + 2] = ax * by - ay * bx;

        d += 6;
        o += 3;
    }
}

#[inline]
fn execute_vec3_lerp(count: usize, data: &[f32], mut d: usize, output: &mut [f32], mut o: usize) {
    for _ in 0..count {
        let t = data[d + 6];
        output[o] = data[d] + (data[d + 3] - data[d]) * t;
        output[o + 1] = data[d + 1] + (data[d + 4] - data[d + 1]) * t;
        output[o + 2] = data[d + 2] + (data[d + 5] - data[d + 2]) * t;
        d += 7;
        o += 3;
    }
}

// ==================== Quaternion Operations ====================

#[inline]
fn execute_quat_multiply(count: usize, data: &[f32], mut d: usize, output: &mut [f32], mut o: usize) {
    for _ in 0..count {
        let ax = data[d];
        let ay = data[d + 1];
        let az = data[d + 2];
        let aw = data[d + 3];
        let bx = data[d + 4];
        let by = data[d + 5];
        let bz = data[d + 6];
        let bw = data[d + 7];

        output[o] = aw * bx + ax * bw + ay * bz - az * by;
        output[o + 1] = aw * by - ax * bz + ay * bw + az * bx;
        output[o + 2] = aw * bz + ax * by - ay * bx + az * bw;
        output[o + 3] = aw * bw - ax * bx - ay * by - az * bz;

        d += 8;
        o += 4;
    }
}

#[inline]
fn execute_quat_slerp(count: usize, data: &[f32], mut d: usize, output: &mut [f32], mut o: usize) {
    for _ in 0..count {
        let ax = data[d];
        let ay = data[d + 1];
        let az = data[d + 2];
        let aw = data[d + 3];
        let mut bx = data[d + 4];
        let mut by = data[d + 5];
        let mut bz = data[d + 6];
        let mut bw = data[d + 7];
        let t = data[d + 8];

        let mut cosom = ax * bx + ay * by + az * bz + aw * bw;

        if cosom < 0.0 {
            cosom = -cosom;
            bx = -bx;
            by = -by;
            bz = -bz;
            bw = -bw;
        }

        let (scale0, scale1) = if 1.0 - cosom > 0.000001 {
            let omega = cosom.acos();
            let sinom = omega.sin();
            (
                ((1.0 - t) * omega).sin() / sinom,
                (t * omega).sin() / sinom,
            )
        } else {
            (1.0 - t, t)
        };

        output[o] = scale0 * ax + scale1 * bx;
        output[o + 1] = scale0 * ay + scale1 * by;
        output[o + 2] = scale0 * az + scale1 * bz;
        output[o + 3] = scale0 * aw + scale1 * bw;

        d += 9;
        o += 4;
    }
}

#[inline]
fn execute_quat_normalize(count: usize, data: &[f32], mut d: usize, output: &mut [f32], mut o: usize) {
    for _ in 0..count {
        let x = data[d];
        let y = data[d + 1];
        let z = data[d + 2];
        let w = data[d + 3];

        let len = (x * x + y * y + z * z + w * w).sqrt();

        if len > 0.0 {
            let inv_len = 1.0 / len;
            output[o] = x * inv_len;
            output[o + 1] = y * inv_len;
            output[o + 2] = z * inv_len;
            output[o + 3] = w * inv_len;
        } else {
            output[o] = 0.0;
            output[o + 1] = 0.0;
            output[o + 2] = 0.0;
            output[o + 3] = 1.0;
        }

        d += 4;
        o += 4;
    }
}

// ==================== Matrix4 Operations ====================

#[inline]
fn execute_mat4_multiply(count: usize, data: &[f32], mut d: usize, output: &mut [f32], mut o: usize) {
    for _ in 0..count {
        // a = data[d..d+16], b = data[d+16..d+32]
        for i in 0..4 {
            for j in 0..4 {
                output[o + i * 4 + j] =
                    data[d + i * 4 + 0] * data[d + 16 + 0 * 4 + j] +
                    data[d + i * 4 + 1] * data[d + 16 + 1 * 4 + j] +
                    data[d + i * 4 + 2] * data[d + 16 + 2 * 4 + j] +
                    data[d + i * 4 + 3] * data[d + 16 + 3 * 4 + j];
            }
        }
        d += 32;
        o += 16;
    }
}

#[inline]
fn execute_mat4_trs(count: usize, data: &[f32], mut d: usize, output: &mut [f32], mut o: usize) {
    for _ in 0..count {
        let tx = data[d];
        let ty = data[d + 1];
        let tz = data[d + 2];
        let rx = data[d + 3];
        let ry = data[d + 4];
        let rz = data[d + 5];
        let rw = data[d + 6];
        let sx = data[d + 7];
        let sy = data[d + 8];
        let sz = data[d + 9];

        let x2 = rx + rx;
        let y2 = ry + ry;
        let z2 = rz + rz;
        let xx = rx * x2;
        let xy = rx * y2;
        let xz = rx * z2;
        let yy = ry * y2;
        let yz = ry * z2;
        let zz = rz * z2;
        let wx = rw * x2;
        let wy = rw * y2;
        let wz = rw * z2;

        output[o + 0] = (1.0 - (yy + zz)) * sx;
        output[o + 1] = (xy + wz) * sx;
        output[o + 2] = (xz - wy) * sx;
        output[o + 3] = 0.0;
        output[o + 4] = (xy - wz) * sy;
        output[o + 5] = (1.0 - (xx + zz)) * sy;
        output[o + 6] = (yz + wx) * sy;
        output[o + 7] = 0.0;
        output[o + 8] = (xz + wy) * sz;
        output[o + 9] = (yz - wx) * sz;
        output[o + 10] = (1.0 - (xx + yy)) * sz;
        output[o + 11] = 0.0;
        output[o + 12] = tx;
        output[o + 13] = ty;
        output[o + 14] = tz;
        output[o + 15] = 1.0;

        d += 10;
        o += 16;
    }
}

#[inline]
fn execute_mat4_transform_point(count: usize, data: &[f32], mut d: usize, output: &mut [f32], mut o: usize) {
    for _ in 0..count {
        // Matrix is first 16, point is next 3
        let x = data[d + 16];
        let y = data[d + 17];
        let z = data[d + 18];

        let w = data[d + 3] * x + data[d + 7] * y + data[d + 11] * z + data[d + 15];
        let inv_w = if w != 0.0 { 1.0 / w } else { 1.0 };

        output[o] = (data[d + 0] * x + data[d + 4] * y + data[d + 8] * z + data[d + 12]) * inv_w;
        output[o + 1] = (data[d + 1] * x + data[d + 5] * y + data[d + 9] * z + data[d + 13]) * inv_w;
        output[o + 2] = (data[d + 2] * x + data[d + 6] * y + data[d + 10] * z + data[d + 14]) * inv_w;

        d += 19;
        o += 3;
    }
}

// ==================== Batch Operations ====================

fn execute_batch_transform_points(data: &[f32], data_offset: usize, output: &mut [f32], output_offset: usize) {
    // First 16 floats are the matrix, rest are points (x,y,z triplets)
    let point_count = (data.len() - data_offset - 16) / 3;

    for i in 0..point_count {
        let px = data[data_offset + 16 + i * 3];
        let py = data[data_offset + 16 + i * 3 + 1];
        let pz = data[data_offset + 16 + i * 3 + 2];

        let d = data_offset;
        let w = data[d + 3] * px + data[d + 7] * py + data[d + 11] * pz + data[d + 15];
        let inv_w = if w != 0.0 { 1.0 / w } else { 1.0 };

        let o = output_offset + i * 3;
        output[o] = (data[d + 0] * px + data[d + 4] * py + data[d + 8] * pz + data[d + 12]) * inv_w;
        output[o + 1] = (data[d + 1] * px + data[d + 5] * py + data[d + 9] * pz + data[d + 13]) * inv_w;
        output[o + 2] = (data[d + 2] * px + data[d + 6] * py + data[d + 10] * pz + data[d + 14]) * inv_w;
    }
}

fn execute_batch_slerp_quats(count: usize, data: &[f32], data_offset: usize, output: &mut [f32], output_offset: usize) {
    // Layout: quats_a[count*4], quats_b[count*4], t
    let t = data[data_offset + count * 8];

    for i in 0..count {
        let a_off = data_offset + i * 4;
        let b_off = data_offset + count * 4 + i * 4;
        let o = output_offset + i * 4;

        let ax = data[a_off];
        let ay = data[a_off + 1];
        let az = data[a_off + 2];
        let aw = data[a_off + 3];
        let mut bx = data[b_off];
        let mut by = data[b_off + 1];
        let mut bz = data[b_off + 2];
        let mut bw = data[b_off + 3];

        let mut cosom = ax * bx + ay * by + az * bz + aw * bw;

        if cosom < 0.0 {
            cosom = -cosom;
            bx = -bx;
            by = -by;
            bz = -bz;
            bw = -bw;
        }

        let (scale0, scale1) = if 1.0 - cosom > 0.000001 {
            let omega = cosom.acos();
            let sinom = omega.sin();
            (
                ((1.0 - t) * omega).sin() / sinom,
                (t * omega).sin() / sinom,
            )
        } else {
            (1.0 - t, t)
        };

        output[o] = scale0 * ax + scale1 * bx;
        output[o + 1] = scale0 * ay + scale1 * by;
        output[o + 2] = scale0 * az + scale1 * bz;
        output[o + 3] = scale0 * aw + scale1 * bw;
    }
}

// ==================== Direct batch APIs for common operations ====================

/// Batch multiply matrices (for transform hierarchies)
#[wasm_bindgen]
pub fn batch_multiply_matrices_chain(matrices: &[f32], count: u32) -> Vec<f32> {
    if count == 0 {
        return vec![1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0];
    }

    let mut result = vec![0.0f32; 16];
    result.copy_from_slice(&matrices[0..16]);

    for i in 1..(count as usize) {
        let b_off = i * 16;
        let mut temp = [0.0f32; 16];

        for row in 0..4 {
            for col in 0..4 {
                temp[row * 4 + col] =
                    result[row * 4 + 0] * matrices[b_off + 0 * 4 + col] +
                    result[row * 4 + 1] * matrices[b_off + 1 * 4 + col] +
                    result[row * 4 + 2] * matrices[b_off + 2 * 4 + col] +
                    result[row * 4 + 3] * matrices[b_off + 3 * 4 + col];
            }
        }

        result.copy_from_slice(&temp);
    }

    result
}

/// Batch transform array of points by matrix
#[wasm_bindgen]
pub fn batch_transform_points_by_matrix(matrix: &[f32], points: &[f32]) -> Vec<f32> {
    let count = points.len() / 3;
    let mut output = vec![0.0f32; count * 3];

    for i in 0..count {
        let px = points[i * 3];
        let py = points[i * 3 + 1];
        let pz = points[i * 3 + 2];

        let w = matrix[3] * px + matrix[7] * py + matrix[11] * pz + matrix[15];
        let inv_w = if w != 0.0 { 1.0 / w } else { 1.0 };

        output[i * 3] = (matrix[0] * px + matrix[4] * py + matrix[8] * pz + matrix[12]) * inv_w;
        output[i * 3 + 1] = (matrix[1] * px + matrix[5] * py + matrix[9] * pz + matrix[13]) * inv_w;
        output[i * 3 + 2] = (matrix[2] * px + matrix[6] * py + matrix[10] * pz + matrix[14]) * inv_w;
    }

    output
}

/// Batch SLERP quaternions
#[wasm_bindgen]
pub fn batch_slerp_quaternions(quats_a: &[f32], quats_b: &[f32], t: f32) -> Vec<f32> {
    let count = quats_a.len() / 4;
    let mut output = vec![0.0f32; count * 4];

    for i in 0..count {
        let a_off = i * 4;
        let ax = quats_a[a_off];
        let ay = quats_a[a_off + 1];
        let az = quats_a[a_off + 2];
        let aw = quats_a[a_off + 3];

        let mut bx = quats_b[a_off];
        let mut by = quats_b[a_off + 1];
        let mut bz = quats_b[a_off + 2];
        let mut bw = quats_b[a_off + 3];

        let mut cosom = ax * bx + ay * by + az * bz + aw * bw;

        if cosom < 0.0 {
            cosom = -cosom;
            bx = -bx;
            by = -by;
            bz = -bz;
            bw = -bw;
        }

        let (scale0, scale1) = if 1.0 - cosom > 0.000001 {
            let omega = cosom.acos();
            let sinom = omega.sin();
            (
                ((1.0 - t) * omega).sin() / sinom,
                (t * omega).sin() / sinom,
            )
        } else {
            (1.0 - t, t)
        };

        let o = i * 4;
        output[o] = scale0 * ax + scale1 * bx;
        output[o + 1] = scale0 * ay + scale1 * by;
        output[o + 2] = scale0 * az + scale1 * bz;
        output[o + 3] = scale0 * aw + scale1 * bw;
    }

    output
}

/// Batch compute TRS matrices
#[wasm_bindgen]
pub fn batch_compute_trs_matrices(
    positions: &[f32],
    rotations: &[f32],
    scales: &[f32],
    count: u32,
) -> Vec<f32> {
    let count = count as usize;
    let mut output = vec![0.0f32; count * 16];

    for i in 0..count {
        let p = i * 3;
        let r = i * 4;
        let s = i * 3;
        let o = i * 16;

        let tx = positions[p];
        let ty = positions[p + 1];
        let tz = positions[p + 2];

        let rx = rotations[r];
        let ry = rotations[r + 1];
        let rz = rotations[r + 2];
        let rw = rotations[r + 3];

        let sx = scales[s];
        let sy = scales[s + 1];
        let sz = scales[s + 2];

        let x2 = rx + rx;
        let y2 = ry + ry;
        let z2 = rz + rz;
        let xx = rx * x2;
        let xy = rx * y2;
        let xz = rx * z2;
        let yy = ry * y2;
        let yz = ry * z2;
        let zz = rz * z2;
        let wx = rw * x2;
        let wy = rw * y2;
        let wz = rw * z2;

        output[o + 0] = (1.0 - (yy + zz)) * sx;
        output[o + 1] = (xy + wz) * sx;
        output[o + 2] = (xz - wy) * sx;
        output[o + 3] = 0.0;
        output[o + 4] = (xy - wz) * sy;
        output[o + 5] = (1.0 - (xx + zz)) * sy;
        output[o + 6] = (yz + wx) * sy;
        output[o + 7] = 0.0;
        output[o + 8] = (xz + wy) * sz;
        output[o + 9] = (yz - wx) * sz;
        output[o + 10] = (1.0 - (xx + yy)) * sz;
        output[o + 11] = 0.0;
        output[o + 12] = tx;
        output[o + 13] = ty;
        output[o + 14] = tz;
        output[o + 15] = 1.0;
    }

    output
}
