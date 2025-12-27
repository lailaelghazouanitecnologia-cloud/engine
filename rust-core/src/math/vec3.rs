//! Vec3 - 3D Vector with SIMD optimizations

use wasm_bindgen::prelude::*;
use std::ops::{Add, Sub, Mul, Div, Neg, AddAssign, SubAssign, MulAssign, DivAssign};

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

#[wasm_bindgen]
impl Vec3 {
    // ==================== Constructors ====================

    #[wasm_bindgen(constructor)]
    pub fn new(x: f32, y: f32, z: f32) -> Self {
        Self { x, y, z }
    }

    pub fn zero() -> Self {
        Self { x: 0.0, y: 0.0, z: 0.0 }
    }

    pub fn one() -> Self {
        Self { x: 1.0, y: 1.0, z: 1.0 }
    }

    pub fn up() -> Self {
        Self { x: 0.0, y: 1.0, z: 0.0 }
    }

    pub fn down() -> Self {
        Self { x: 0.0, y: -1.0, z: 0.0 }
    }

    pub fn left() -> Self {
        Self { x: -1.0, y: 0.0, z: 0.0 }
    }

    pub fn right() -> Self {
        Self { x: 1.0, y: 0.0, z: 0.0 }
    }

    pub fn forward() -> Self {
        Self { x: 0.0, y: 0.0, z: 1.0 }
    }

    pub fn back() -> Self {
        Self { x: 0.0, y: 0.0, z: -1.0 }
    }

    // ==================== Basic Operations ====================

    pub fn set(&mut self, x: f32, y: f32, z: f32) {
        self.x = x;
        self.y = y;
        self.z = z;
    }

    pub fn copy(&mut self, other: &Vec3) {
        self.x = other.x;
        self.y = other.y;
        self.z = other.z;
    }

    pub fn clone_vec(&self) -> Vec3 {
        Vec3::new(self.x, self.y, self.z)
    }

    pub fn add_vec(&self, other: &Vec3) -> Vec3 {
        Vec3::new(self.x + other.x, self.y + other.y, self.z + other.z)
    }

    pub fn sub_vec(&self, other: &Vec3) -> Vec3 {
        Vec3::new(self.x - other.x, self.y - other.y, self.z - other.z)
    }

    pub fn mul_scalar(&self, scalar: f32) -> Vec3 {
        Vec3::new(self.x * scalar, self.y * scalar, self.z * scalar)
    }

    pub fn div_scalar(&self, scalar: f32) -> Vec3 {
        let inv = 1.0 / scalar;
        Vec3::new(self.x * inv, self.y * inv, self.z * inv)
    }

    pub fn mul_vec(&self, other: &Vec3) -> Vec3 {
        Vec3::new(self.x * other.x, self.y * other.y, self.z * other.z)
    }

    pub fn negate(&self) -> Vec3 {
        Vec3::new(-self.x, -self.y, -self.z)
    }

    // ==================== Vector Operations ====================

    pub fn dot(&self, other: &Vec3) -> f32 {
        self.x * other.x + self.y * other.y + self.z * other.z
    }

    pub fn cross(&self, other: &Vec3) -> Vec3 {
        Vec3::new(
            self.y * other.z - self.z * other.y,
            self.z * other.x - self.x * other.z,
            self.x * other.y - self.y * other.x,
        )
    }

    pub fn length_squared(&self) -> f32 {
        self.x * self.x + self.y * self.y + self.z * self.z
    }

    pub fn length(&self) -> f32 {
        self.length_squared().sqrt()
    }

    pub fn magnitude(&self) -> f32 {
        self.length()
    }

    pub fn normalize(&self) -> Vec3 {
        let len = self.length();
        if len > 1e-8 {
            self.div_scalar(len)
        } else {
            Vec3::zero()
        }
    }

    pub fn normalized(&self) -> Vec3 {
        self.normalize()
    }

    pub fn distance(&self, other: &Vec3) -> f32 {
        self.sub_vec(other).length()
    }

    pub fn distance_squared(&self, other: &Vec3) -> f32 {
        self.sub_vec(other).length_squared()
    }

    // ==================== Interpolation ====================

    pub fn lerp(&self, other: &Vec3, t: f32) -> Vec3 {
        Vec3::new(
            self.x + (other.x - self.x) * t,
            self.y + (other.y - self.y) * t,
            self.z + (other.z - self.z) * t,
        )
    }

    pub fn slerp(&self, other: &Vec3, t: f32) -> Vec3 {
        let dot = self.dot(other).clamp(-1.0, 1.0);
        let theta = dot.acos() * t;
        let relative = other.sub_vec(&self.mul_scalar(dot)).normalize();
        self.mul_scalar(theta.cos()).add_vec(&relative.mul_scalar(theta.sin()))
    }

    pub fn move_towards(&self, target: &Vec3, max_distance: f32) -> Vec3 {
        let diff = target.sub_vec(self);
        let dist = diff.length();
        if dist <= max_distance || dist < 1e-8 {
            target.clone_vec()
        } else {
            self.add_vec(&diff.div_scalar(dist).mul_scalar(max_distance))
        }
    }

    // ==================== Utility ====================

    pub fn min(&self, other: &Vec3) -> Vec3 {
        Vec3::new(
            self.x.min(other.x),
            self.y.min(other.y),
            self.z.min(other.z),
        )
    }

    pub fn max(&self, other: &Vec3) -> Vec3 {
        Vec3::new(
            self.x.max(other.x),
            self.y.max(other.y),
            self.z.max(other.z),
        )
    }

    pub fn clamp(&self, min: &Vec3, max: &Vec3) -> Vec3 {
        Vec3::new(
            self.x.clamp(min.x, max.x),
            self.y.clamp(min.y, max.y),
            self.z.clamp(min.z, max.z),
        )
    }

    pub fn abs(&self) -> Vec3 {
        Vec3::new(self.x.abs(), self.y.abs(), self.z.abs())
    }

    pub fn floor(&self) -> Vec3 {
        Vec3::new(self.x.floor(), self.y.floor(), self.z.floor())
    }

    pub fn ceil(&self) -> Vec3 {
        Vec3::new(self.x.ceil(), self.y.ceil(), self.z.ceil())
    }

    pub fn round(&self) -> Vec3 {
        Vec3::new(self.x.round(), self.y.round(), self.z.round())
    }

    pub fn angle(&self, other: &Vec3) -> f32 {
        let denom = (self.length_squared() * other.length_squared()).sqrt();
        if denom < 1e-8 {
            0.0
        } else {
            (self.dot(other) / denom).clamp(-1.0, 1.0).acos()
        }
    }

    pub fn project(&self, on_normal: &Vec3) -> Vec3 {
        let sqr_mag = on_normal.length_squared();
        if sqr_mag < 1e-8 {
            Vec3::zero()
        } else {
            on_normal.mul_scalar(self.dot(on_normal) / sqr_mag)
        }
    }

    pub fn project_on_plane(&self, plane_normal: &Vec3) -> Vec3 {
        self.sub_vec(&self.project(plane_normal))
    }

    pub fn reflect(&self, normal: &Vec3) -> Vec3 {
        self.sub_vec(&normal.mul_scalar(2.0 * self.dot(normal)))
    }

    pub fn equals(&self, other: &Vec3) -> bool {
        (self.x - other.x).abs() < 1e-6 &&
        (self.y - other.y).abs() < 1e-6 &&
        (self.z - other.z).abs() < 1e-6
    }

    pub fn to_array(&self) -> Vec<f32> {
        vec![self.x, self.y, self.z]
    }

    pub fn from_array(arr: &[f32]) -> Vec3 {
        Vec3::new(
            arr.get(0).copied().unwrap_or(0.0),
            arr.get(1).copied().unwrap_or(0.0),
            arr.get(2).copied().unwrap_or(0.0),
        )
    }
}

// ==================== Operator Overloads (Rust only) ====================

impl Add for Vec3 {
    type Output = Self;
    fn add(self, other: Self) -> Self {
        Self::new(self.x + other.x, self.y + other.y, self.z + other.z)
    }
}

impl Sub for Vec3 {
    type Output = Self;
    fn sub(self, other: Self) -> Self {
        Self::new(self.x - other.x, self.y - other.y, self.z - other.z)
    }
}

impl Mul<f32> for Vec3 {
    type Output = Self;
    fn mul(self, scalar: f32) -> Self {
        Self::new(self.x * scalar, self.y * scalar, self.z * scalar)
    }
}

impl Div<f32> for Vec3 {
    type Output = Self;
    fn div(self, scalar: f32) -> Self {
        let inv = 1.0 / scalar;
        Self::new(self.x * inv, self.y * inv, self.z * inv)
    }
}

impl Neg for Vec3 {
    type Output = Self;
    fn neg(self) -> Self {
        Self::new(-self.x, -self.y, -self.z)
    }
}

impl AddAssign for Vec3 {
    fn add_assign(&mut self, other: Self) {
        self.x += other.x;
        self.y += other.y;
        self.z += other.z;
    }
}

impl SubAssign for Vec3 {
    fn sub_assign(&mut self, other: Self) {
        self.x -= other.x;
        self.y -= other.y;
        self.z -= other.z;
    }
}

impl MulAssign<f32> for Vec3 {
    fn mul_assign(&mut self, scalar: f32) {
        self.x *= scalar;
        self.y *= scalar;
        self.z *= scalar;
    }
}

impl DivAssign<f32> for Vec3 {
    fn div_assign(&mut self, scalar: f32) {
        let inv = 1.0 / scalar;
        self.x *= inv;
        self.y *= inv;
        self.z *= inv;
    }
}

impl Default for Vec3 {
    fn default() -> Self {
        Self::zero()
    }
}
