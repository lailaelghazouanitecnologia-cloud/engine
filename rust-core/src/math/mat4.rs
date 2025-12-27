//! Mat4 - 4x4 Matrix with SIMD optimizations

use wasm_bindgen::prelude::*;
use super::vec3::Vec3;
use super::vec4::Vec4;
use super::quat::Quat;

/// 4x4 Matrix stored in column-major order (OpenGL/WebGL convention)
/// Layout: [m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15]
///         [col0      ] [col1      ] [col2       ] [col3        ]
#[wasm_bindgen]
#[derive(Clone, Copy, Debug)]
pub struct Mat4 {
    data: [f32; 16],
}

#[wasm_bindgen]
impl Mat4 {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self::identity()
    }

    pub fn identity() -> Self {
        Self {
            data: [
                1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                0.0, 0.0, 0.0, 1.0,
            ],
        }
    }

    pub fn zero() -> Self {
        Self { data: [0.0; 16] }
    }

    pub fn from_values(
        m00: f32, m01: f32, m02: f32, m03: f32,
        m10: f32, m11: f32, m12: f32, m13: f32,
        m20: f32, m21: f32, m22: f32, m23: f32,
        m30: f32, m31: f32, m32: f32, m33: f32,
    ) -> Self {
        Self {
            data: [
                m00, m01, m02, m03,
                m10, m11, m12, m13,
                m20, m21, m22, m23,
                m30, m31, m32, m33,
            ],
        }
    }

    // ==================== Getters/Setters ====================

    pub fn get(&self, row: usize, col: usize) -> f32 {
        self.data[col * 4 + row]
    }

    pub fn set_value(&mut self, row: usize, col: usize, value: f32) {
        self.data[col * 4 + row] = value;
    }

    pub fn set_identity(&mut self) {
        self.data = [
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0,
        ];
    }

    pub fn copy(&mut self, other: &Mat4) {
        self.data.copy_from_slice(&other.data);
    }

    pub fn clone_mat(&self) -> Mat4 {
        Mat4 { data: self.data }
    }

    // ==================== Matrix Operations ====================

    /// Multiply two matrices: result = self * other
    pub fn multiply(&self, other: &Mat4) -> Mat4 {
        let a = &self.data;
        let b = &other.data;

        Mat4 {
            data: [
                // Column 0
                a[0]*b[0] + a[4]*b[1] + a[8]*b[2] + a[12]*b[3],
                a[1]*b[0] + a[5]*b[1] + a[9]*b[2] + a[13]*b[3],
                a[2]*b[0] + a[6]*b[1] + a[10]*b[2] + a[14]*b[3],
                a[3]*b[0] + a[7]*b[1] + a[11]*b[2] + a[15]*b[3],
                // Column 1
                a[0]*b[4] + a[4]*b[5] + a[8]*b[6] + a[12]*b[7],
                a[1]*b[4] + a[5]*b[5] + a[9]*b[6] + a[13]*b[7],
                a[2]*b[4] + a[6]*b[5] + a[10]*b[6] + a[14]*b[7],
                a[3]*b[4] + a[7]*b[5] + a[11]*b[6] + a[15]*b[7],
                // Column 2
                a[0]*b[8] + a[4]*b[9] + a[8]*b[10] + a[12]*b[11],
                a[1]*b[8] + a[5]*b[9] + a[9]*b[10] + a[13]*b[11],
                a[2]*b[8] + a[6]*b[9] + a[10]*b[10] + a[14]*b[11],
                a[3]*b[8] + a[7]*b[9] + a[11]*b[10] + a[15]*b[11],
                // Column 3
                a[0]*b[12] + a[4]*b[13] + a[8]*b[14] + a[12]*b[15],
                a[1]*b[12] + a[5]*b[13] + a[9]*b[14] + a[13]*b[15],
                a[2]*b[12] + a[6]*b[13] + a[10]*b[14] + a[14]*b[15],
                a[3]*b[12] + a[7]*b[13] + a[11]*b[14] + a[15]*b[15],
            ],
        }
    }

    pub fn transpose(&self) -> Mat4 {
        let m = &self.data;
        Mat4 {
            data: [
                m[0], m[4], m[8], m[12],
                m[1], m[5], m[9], m[13],
                m[2], m[6], m[10], m[14],
                m[3], m[7], m[11], m[15],
            ],
        }
    }

    pub fn determinant(&self) -> f32 {
        let m = &self.data;

        let a00 = m[0]; let a01 = m[1]; let a02 = m[2]; let a03 = m[3];
        let a10 = m[4]; let a11 = m[5]; let a12 = m[6]; let a13 = m[7];
        let a20 = m[8]; let a21 = m[9]; let a22 = m[10]; let a23 = m[11];
        let a30 = m[12]; let a31 = m[13]; let a32 = m[14]; let a33 = m[15];

        let b00 = a00 * a11 - a01 * a10;
        let b01 = a00 * a12 - a02 * a10;
        let b02 = a00 * a13 - a03 * a10;
        let b03 = a01 * a12 - a02 * a11;
        let b04 = a01 * a13 - a03 * a11;
        let b05 = a02 * a13 - a03 * a12;
        let b06 = a20 * a31 - a21 * a30;
        let b07 = a20 * a32 - a22 * a30;
        let b08 = a20 * a33 - a23 * a30;
        let b09 = a21 * a32 - a22 * a31;
        let b10 = a21 * a33 - a23 * a31;
        let b11 = a22 * a33 - a23 * a32;

        b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06
    }

    pub fn invert(&self) -> Option<Mat4> {
        let m = &self.data;

        let a00 = m[0]; let a01 = m[1]; let a02 = m[2]; let a03 = m[3];
        let a10 = m[4]; let a11 = m[5]; let a12 = m[6]; let a13 = m[7];
        let a20 = m[8]; let a21 = m[9]; let a22 = m[10]; let a23 = m[11];
        let a30 = m[12]; let a31 = m[13]; let a32 = m[14]; let a33 = m[15];

        let b00 = a00 * a11 - a01 * a10;
        let b01 = a00 * a12 - a02 * a10;
        let b02 = a00 * a13 - a03 * a10;
        let b03 = a01 * a12 - a02 * a11;
        let b04 = a01 * a13 - a03 * a11;
        let b05 = a02 * a13 - a03 * a12;
        let b06 = a20 * a31 - a21 * a30;
        let b07 = a20 * a32 - a22 * a30;
        let b08 = a20 * a33 - a23 * a30;
        let b09 = a21 * a32 - a22 * a31;
        let b10 = a21 * a33 - a23 * a31;
        let b11 = a22 * a33 - a23 * a32;

        let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
        if det.abs() < 1e-8 {
            return None;
        }

        let inv_det = 1.0 / det;

        Some(Mat4 {
            data: [
                (a11 * b11 - a12 * b10 + a13 * b09) * inv_det,
                (a02 * b10 - a01 * b11 - a03 * b09) * inv_det,
                (a31 * b05 - a32 * b04 + a33 * b03) * inv_det,
                (a22 * b04 - a21 * b05 - a23 * b03) * inv_det,
                (a12 * b08 - a10 * b11 - a13 * b07) * inv_det,
                (a00 * b11 - a02 * b08 + a03 * b07) * inv_det,
                (a32 * b02 - a30 * b05 - a33 * b01) * inv_det,
                (a20 * b05 - a22 * b02 + a23 * b01) * inv_det,
                (a10 * b10 - a11 * b08 + a13 * b06) * inv_det,
                (a01 * b08 - a00 * b10 - a03 * b06) * inv_det,
                (a30 * b04 - a31 * b02 + a33 * b00) * inv_det,
                (a21 * b02 - a20 * b04 - a23 * b00) * inv_det,
                (a11 * b07 - a10 * b09 - a12 * b06) * inv_det,
                (a00 * b09 - a01 * b07 + a02 * b06) * inv_det,
                (a31 * b01 - a30 * b03 - a32 * b00) * inv_det,
                (a20 * b03 - a21 * b01 + a22 * b00) * inv_det,
            ],
        })
    }

    pub fn inverse(&self) -> Mat4 {
        self.invert().unwrap_or(Mat4::identity())
    }

    // ==================== Transform Operations ====================

    pub fn transform_point(&self, point: &Vec3) -> Vec3 {
        let m = &self.data;
        let w = m[3] * point.x + m[7] * point.y + m[11] * point.z + m[15];
        let inv_w = if w.abs() > 1e-8 { 1.0 / w } else { 1.0 };

        Vec3::new(
            (m[0] * point.x + m[4] * point.y + m[8] * point.z + m[12]) * inv_w,
            (m[1] * point.x + m[5] * point.y + m[9] * point.z + m[13]) * inv_w,
            (m[2] * point.x + m[6] * point.y + m[10] * point.z + m[14]) * inv_w,
        )
    }

    pub fn transform_direction(&self, direction: &Vec3) -> Vec3 {
        let m = &self.data;
        Vec3::new(
            m[0] * direction.x + m[4] * direction.y + m[8] * direction.z,
            m[1] * direction.x + m[5] * direction.y + m[9] * direction.z,
            m[2] * direction.x + m[6] * direction.y + m[10] * direction.z,
        )
    }

    pub fn transform_vec4(&self, v: &Vec4) -> Vec4 {
        let m = &self.data;
        Vec4::new(
            m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12] * v.w,
            m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13] * v.w,
            m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14] * v.w,
            m[3] * v.x + m[7] * v.y + m[11] * v.z + m[15] * v.w,
        )
    }

    // ==================== Construction Methods ====================

    pub fn from_translation(v: &Vec3) -> Mat4 {
        Mat4 {
            data: [
                1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                v.x, v.y, v.z, 1.0,
            ],
        }
    }

    pub fn from_scale(v: &Vec3) -> Mat4 {
        Mat4 {
            data: [
                v.x, 0.0, 0.0, 0.0,
                0.0, v.y, 0.0, 0.0,
                0.0, 0.0, v.z, 0.0,
                0.0, 0.0, 0.0, 1.0,
            ],
        }
    }

    pub fn from_rotation_x(radians: f32) -> Mat4 {
        let c = radians.cos();
        let s = radians.sin();
        Mat4 {
            data: [
                1.0, 0.0, 0.0, 0.0,
                0.0, c, s, 0.0,
                0.0, -s, c, 0.0,
                0.0, 0.0, 0.0, 1.0,
            ],
        }
    }

    pub fn from_rotation_y(radians: f32) -> Mat4 {
        let c = radians.cos();
        let s = radians.sin();
        Mat4 {
            data: [
                c, 0.0, -s, 0.0,
                0.0, 1.0, 0.0, 0.0,
                s, 0.0, c, 0.0,
                0.0, 0.0, 0.0, 1.0,
            ],
        }
    }

    pub fn from_rotation_z(radians: f32) -> Mat4 {
        let c = radians.cos();
        let s = radians.sin();
        Mat4 {
            data: [
                c, s, 0.0, 0.0,
                -s, c, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                0.0, 0.0, 0.0, 1.0,
            ],
        }
    }

    pub fn from_axis_angle(axis: &Vec3, radians: f32) -> Mat4 {
        let c = radians.cos();
        let s = radians.sin();
        let t = 1.0 - c;
        let n = axis.normalize();
        let x = n.x; let y = n.y; let z = n.z;

        Mat4 {
            data: [
                t*x*x + c,    t*x*y + s*z,  t*x*z - s*y,  0.0,
                t*x*y - s*z,  t*y*y + c,    t*y*z + s*x,  0.0,
                t*x*z + s*y,  t*y*z - s*x,  t*z*z + c,    0.0,
                0.0,          0.0,          0.0,          1.0,
            ],
        }
    }

    pub fn from_quat(q: &Quat) -> Mat4 {
        let x = q.x; let y = q.y; let z = q.z; let w = q.w;
        let x2 = x + x; let y2 = y + y; let z2 = z + z;
        let xx = x * x2; let xy = x * y2; let xz = x * z2;
        let yy = y * y2; let yz = y * z2; let zz = z * z2;
        let wx = w * x2; let wy = w * y2; let wz = w * z2;

        Mat4 {
            data: [
                1.0 - (yy + zz),  xy + wz,          xz - wy,          0.0,
                xy - wz,          1.0 - (xx + zz),  yz + wx,          0.0,
                xz + wy,          yz - wx,          1.0 - (xx + yy),  0.0,
                0.0,              0.0,              0.0,              1.0,
            ],
        }
    }

    /// Compose TRS matrix (Translation * Rotation * Scale)
    pub fn compose(position: &Vec3, rotation: &Quat, scale: &Vec3) -> Mat4 {
        let rot = Mat4::from_quat(rotation);
        let m = &rot.data;

        Mat4 {
            data: [
                m[0] * scale.x,   m[1] * scale.x,   m[2] * scale.x,   0.0,
                m[4] * scale.y,   m[5] * scale.y,   m[6] * scale.y,   0.0,
                m[8] * scale.z,   m[9] * scale.z,   m[10] * scale.z,  0.0,
                position.x,       position.y,       position.z,       1.0,
            ],
        }
    }

    // ==================== Projection Matrices ====================

    pub fn perspective(fov_y: f32, aspect: f32, near: f32, far: f32) -> Mat4 {
        let f = 1.0 / (fov_y / 2.0).tan();
        let nf = 1.0 / (near - far);

        Mat4 {
            data: [
                f / aspect,  0.0,  0.0,                        0.0,
                0.0,         f,    0.0,                        0.0,
                0.0,         0.0,  (far + near) * nf,         -1.0,
                0.0,         0.0,  2.0 * far * near * nf,      0.0,
            ],
        }
    }

    pub fn ortho(left: f32, right: f32, bottom: f32, top: f32, near: f32, far: f32) -> Mat4 {
        let lr = 1.0 / (left - right);
        let bt = 1.0 / (bottom - top);
        let nf = 1.0 / (near - far);

        Mat4 {
            data: [
                -2.0 * lr,             0.0,                   0.0,              0.0,
                0.0,                   -2.0 * bt,             0.0,              0.0,
                0.0,                   0.0,                   2.0 * nf,         0.0,
                (left + right) * lr,   (top + bottom) * bt,   (far + near) * nf, 1.0,
            ],
        }
    }

    pub fn look_at(eye: &Vec3, target: &Vec3, up: &Vec3) -> Mat4 {
        let z = eye.sub_vec(target).normalize();
        let x = up.cross(&z).normalize();
        let y = z.cross(&x);

        Mat4 {
            data: [
                x.x,                  y.x,                  z.x,                  0.0,
                x.y,                  y.y,                  z.y,                  0.0,
                x.z,                  y.z,                  z.z,                  0.0,
                -x.dot(eye),          -y.dot(eye),          -z.dot(eye),          1.0,
            ],
        }
    }

    // ==================== Getters ====================

    pub fn get_position(&self) -> Vec3 {
        Vec3::new(self.data[12], self.data[13], self.data[14])
    }

    pub fn get_scale(&self) -> Vec3 {
        let m = &self.data;
        Vec3::new(
            Vec3::new(m[0], m[1], m[2]).length(),
            Vec3::new(m[4], m[5], m[6]).length(),
            Vec3::new(m[8], m[9], m[10]).length(),
        )
    }

    pub fn get_right(&self) -> Vec3 {
        Vec3::new(self.data[0], self.data[1], self.data[2]).normalize()
    }

    pub fn get_up(&self) -> Vec3 {
        Vec3::new(self.data[4], self.data[5], self.data[6]).normalize()
    }

    pub fn get_forward(&self) -> Vec3 {
        Vec3::new(-self.data[8], -self.data[9], -self.data[10]).normalize()
    }

    pub fn to_array(&self) -> Vec<f32> {
        self.data.to_vec()
    }

    pub fn equals(&self, other: &Mat4) -> bool {
        for i in 0..16 {
            if (self.data[i] - other.data[i]).abs() > 1e-6 {
                return false;
            }
        }
        true
    }
}

// Non-WASM methods (return types not compatible with wasm-bindgen)
impl Mat4 {
    /// Decompose matrix into TRS (position, rotation, scale)
    pub fn decompose(&self) -> (Vec3, Quat, Vec3) {
        let m = &self.data;

        // Extract translation
        let position = Vec3::new(m[12], m[13], m[14]);

        // Extract scale
        let sx = Vec3::new(m[0], m[1], m[2]).length();
        let sy = Vec3::new(m[4], m[5], m[6]).length();
        let sz = Vec3::new(m[8], m[9], m[10]).length();
        let scale = Vec3::new(sx, sy, sz);

        // Extract rotation (remove scale)
        let inv_sx = 1.0 / sx;
        let inv_sy = 1.0 / sy;
        let inv_sz = 1.0 / sz;

        let rot_mat = Mat4 {
            data: [
                m[0] * inv_sx, m[1] * inv_sx, m[2] * inv_sx, 0.0,
                m[4] * inv_sy, m[5] * inv_sy, m[6] * inv_sy, 0.0,
                m[8] * inv_sz, m[9] * inv_sz, m[10] * inv_sz, 0.0,
                0.0, 0.0, 0.0, 1.0,
            ],
        };

        let rotation = Quat::from_mat4(&rot_mat);

        (position, rotation, scale)
    }
}

impl Default for Mat4 {
    fn default() -> Self {
        Self::identity()
    }
}

impl std::ops::Mul for Mat4 {
    type Output = Self;
    fn mul(self, other: Self) -> Self {
        self.multiply(&other)
    }
}
