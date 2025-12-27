//! Quat - Quaternion with optimized SLERP

use wasm_bindgen::prelude::*;
use super::vec3::Vec3;
use super::mat4::Mat4;
use std::f32::consts::PI;

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Quat {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub w: f32,
}

#[wasm_bindgen]
impl Quat {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f32, y: f32, z: f32, w: f32) -> Self {
        Self { x, y, z, w }
    }

    pub fn identity() -> Self {
        Self { x: 0.0, y: 0.0, z: 0.0, w: 1.0 }
    }

    pub fn set(&mut self, x: f32, y: f32, z: f32, w: f32) {
        self.x = x;
        self.y = y;
        self.z = z;
        self.w = w;
    }

    pub fn copy(&mut self, other: &Quat) {
        self.x = other.x;
        self.y = other.y;
        self.z = other.z;
        self.w = other.w;
    }

    pub fn clone_quat(&self) -> Quat {
        Quat::new(self.x, self.y, self.z, self.w)
    }

    // ==================== Quaternion Operations ====================

    pub fn dot(&self, other: &Quat) -> f32 {
        self.x * other.x + self.y * other.y + self.z * other.z + self.w * other.w
    }

    pub fn length_squared(&self) -> f32 {
        self.x * self.x + self.y * self.y + self.z * self.z + self.w * self.w
    }

    pub fn length(&self) -> f32 {
        self.length_squared().sqrt()
    }

    pub fn normalize(&self) -> Quat {
        let len = self.length();
        if len > 1e-8 {
            let inv = 1.0 / len;
            Quat::new(self.x * inv, self.y * inv, self.z * inv, self.w * inv)
        } else {
            Quat::identity()
        }
    }

    pub fn conjugate(&self) -> Quat {
        Quat::new(-self.x, -self.y, -self.z, self.w)
    }

    pub fn invert(&self) -> Quat {
        let len_sq = self.length_squared();
        if len_sq > 1e-8 {
            let inv = 1.0 / len_sq;
            Quat::new(-self.x * inv, -self.y * inv, -self.z * inv, self.w * inv)
        } else {
            Quat::identity()
        }
    }

    /// Multiply quaternions: result = self * other
    pub fn multiply(&self, other: &Quat) -> Quat {
        Quat::new(
            self.w * other.x + self.x * other.w + self.y * other.z - self.z * other.y,
            self.w * other.y - self.x * other.z + self.y * other.w + self.z * other.x,
            self.w * other.z + self.x * other.y - self.y * other.x + self.z * other.w,
            self.w * other.w - self.x * other.x - self.y * other.y - self.z * other.z,
        )
    }

    // ==================== Interpolation ====================

    pub fn lerp(&self, other: &Quat, t: f32) -> Quat {
        Quat::new(
            self.x + (other.x - self.x) * t,
            self.y + (other.y - self.y) * t,
            self.z + (other.z - self.z) * t,
            self.w + (other.w - self.w) * t,
        ).normalize()
    }

    /// Spherical linear interpolation (optimized)
    pub fn slerp(&self, other: &Quat, t: f32) -> Quat {
        let mut cos_half_theta = self.dot(other);

        // If cos is negative, negate one quat to take shorter path
        let (b, cos_half_theta) = if cos_half_theta < 0.0 {
            (Quat::new(-other.x, -other.y, -other.z, -other.w), -cos_half_theta)
        } else {
            (other.clone_quat(), cos_half_theta)
        };

        // If quaternions are very close, use linear interpolation
        if cos_half_theta > 0.9999 {
            return self.lerp(&b, t);
        }

        let half_theta = cos_half_theta.acos();
        let sin_half_theta = (1.0 - cos_half_theta * cos_half_theta).sqrt();

        // If theta is 180 degrees, result is undefined
        if sin_half_theta.abs() < 1e-8 {
            return Quat::new(
                self.x * 0.5 + b.x * 0.5,
                self.y * 0.5 + b.y * 0.5,
                self.z * 0.5 + b.z * 0.5,
                self.w * 0.5 + b.w * 0.5,
            );
        }

        let ratio_a = ((1.0 - t) * half_theta).sin() / sin_half_theta;
        let ratio_b = (t * half_theta).sin() / sin_half_theta;

        Quat::new(
            self.x * ratio_a + b.x * ratio_b,
            self.y * ratio_a + b.y * ratio_b,
            self.z * ratio_a + b.z * ratio_b,
            self.w * ratio_a + b.w * ratio_b,
        )
    }

    // ==================== Rotation Construction ====================

    pub fn from_axis_angle(axis: &Vec3, radians: f32) -> Quat {
        let half = radians * 0.5;
        let s = half.sin();
        let n = axis.normalize();
        Quat::new(n.x * s, n.y * s, n.z * s, half.cos())
    }

    pub fn from_euler(x: f32, y: f32, z: f32) -> Quat {
        let hx = x * 0.5;
        let hy = y * 0.5;
        let hz = z * 0.5;

        let cx = hx.cos();
        let sx = hx.sin();
        let cy = hy.cos();
        let sy = hy.sin();
        let cz = hz.cos();
        let sz = hz.sin();

        Quat::new(
            sx * cy * cz - cx * sy * sz,
            cx * sy * cz + sx * cy * sz,
            cx * cy * sz - sx * sy * cz,
            cx * cy * cz + sx * sy * sz,
        )
    }

    /// Create quaternion from Euler angles in degrees
    pub fn euler(x: f32, y: f32, z: f32) -> Quat {
        let deg2rad = PI / 180.0;
        Quat::from_euler(x * deg2rad, y * deg2rad, z * deg2rad)
    }

    pub fn from_mat4(m: &Mat4) -> Quat {
        let data = m.to_array();
        let m00 = data[0]; let m01 = data[1]; let m02 = data[2];
        let m10 = data[4]; let m11 = data[5]; let m12 = data[6];
        let m20 = data[8]; let m21 = data[9]; let m22 = data[10];

        let trace = m00 + m11 + m22;

        if trace > 0.0 {
            let s = 0.5 / (trace + 1.0).sqrt();
            Quat::new(
                (m12 - m21) * s,
                (m20 - m02) * s,
                (m01 - m10) * s,
                0.25 / s,
            )
        } else if m00 > m11 && m00 > m22 {
            let s = 2.0 * (1.0 + m00 - m11 - m22).sqrt();
            Quat::new(
                0.25 * s,
                (m01 + m10) / s,
                (m20 + m02) / s,
                (m12 - m21) / s,
            )
        } else if m11 > m22 {
            let s = 2.0 * (1.0 + m11 - m00 - m22).sqrt();
            Quat::new(
                (m01 + m10) / s,
                0.25 * s,
                (m12 + m21) / s,
                (m20 - m02) / s,
            )
        } else {
            let s = 2.0 * (1.0 + m22 - m00 - m11).sqrt();
            Quat::new(
                (m20 + m02) / s,
                (m12 + m21) / s,
                0.25 * s,
                (m01 - m10) / s,
            )
        }
    }

    /// Look rotation - creates a rotation looking from origin towards forward
    pub fn look_rotation(forward: &Vec3, up: &Vec3) -> Quat {
        let f = forward.normalize();
        let r = up.cross(&f).normalize();
        let u = f.cross(&r);

        let m00 = r.x; let m01 = r.y; let m02 = r.z;
        let m10 = u.x; let m11 = u.y; let m12 = u.z;
        let m20 = f.x; let m21 = f.y; let m22 = f.z;

        let trace = m00 + m11 + m22;

        if trace > 0.0 {
            let s = 0.5 / (trace + 1.0).sqrt();
            Quat::new(
                (m12 - m21) * s,
                (m20 - m02) * s,
                (m01 - m10) * s,
                0.25 / s,
            )
        } else if m00 > m11 && m00 > m22 {
            let s = 2.0 * (1.0 + m00 - m11 - m22).sqrt();
            Quat::new(
                0.25 * s,
                (m01 + m10) / s,
                (m20 + m02) / s,
                (m12 - m21) / s,
            )
        } else if m11 > m22 {
            let s = 2.0 * (1.0 + m11 - m00 - m22).sqrt();
            Quat::new(
                (m01 + m10) / s,
                0.25 * s,
                (m12 + m21) / s,
                (m20 - m02) / s,
            )
        } else {
            let s = 2.0 * (1.0 + m22 - m00 - m11).sqrt();
            Quat::new(
                (m20 + m02) / s,
                (m12 + m21) / s,
                0.25 * s,
                (m01 - m10) / s,
            )
        }
    }

    // ==================== Rotation Application ====================

    /// Rotate a vector by this quaternion
    pub fn mul_vec3(&self, v: &Vec3) -> Vec3 {
        let qv = Vec3::new(self.x, self.y, self.z);
        let uv = qv.cross(v);
        let uuv = qv.cross(&uv);

        v.add_vec(&uv.mul_scalar(2.0 * self.w)).add_vec(&uuv.mul_scalar(2.0))
    }

    // ==================== Getters ====================

    pub fn euler_angles(&self) -> Vec3 {
        let sinr_cosp = 2.0 * (self.w * self.x + self.y * self.z);
        let cosr_cosp = 1.0 - 2.0 * (self.x * self.x + self.y * self.y);
        let x = sinr_cosp.atan2(cosr_cosp);

        let sinp = 2.0 * (self.w * self.y - self.z * self.x);
        let y = if sinp.abs() >= 1.0 {
            std::f32::consts::FRAC_PI_2.copysign(sinp)
        } else {
            sinp.asin()
        };

        let siny_cosp = 2.0 * (self.w * self.z + self.x * self.y);
        let cosy_cosp = 1.0 - 2.0 * (self.y * self.y + self.z * self.z);
        let z = siny_cosp.atan2(cosy_cosp);

        let rad2deg = 180.0 / PI;
        Vec3::new(x * rad2deg, y * rad2deg, z * rad2deg)
    }

    pub fn angle(&self, other: &Quat) -> f32 {
        let dot = self.dot(other).abs().min(1.0);
        2.0 * dot.acos() * (180.0 / PI)
    }

    pub fn equals(&self, other: &Quat) -> bool {
        (self.x - other.x).abs() < 1e-6 &&
        (self.y - other.y).abs() < 1e-6 &&
        (self.z - other.z).abs() < 1e-6 &&
        (self.w - other.w).abs() < 1e-6
    }

    pub fn to_array(&self) -> Vec<f32> {
        vec![self.x, self.y, self.z, self.w]
    }
}

impl Default for Quat {
    fn default() -> Self {
        Self::identity()
    }
}

impl std::ops::Mul for Quat {
    type Output = Self;
    fn mul(self, other: Self) -> Self {
        self.multiply(&other)
    }
}
