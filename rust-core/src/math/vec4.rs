//! Vec4 - 4D Vector with SIMD optimizations

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Vec4 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub w: f32,
}

#[wasm_bindgen]
impl Vec4 {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f32, y: f32, z: f32, w: f32) -> Self {
        Self { x, y, z, w }
    }

    pub fn zero() -> Self {
        Self { x: 0.0, y: 0.0, z: 0.0, w: 0.0 }
    }

    pub fn one() -> Self {
        Self { x: 1.0, y: 1.0, z: 1.0, w: 1.0 }
    }

    pub fn set(&mut self, x: f32, y: f32, z: f32, w: f32) {
        self.x = x;
        self.y = y;
        self.z = z;
        self.w = w;
    }

    pub fn copy(&mut self, other: &Vec4) {
        self.x = other.x;
        self.y = other.y;
        self.z = other.z;
        self.w = other.w;
    }

    pub fn add_vec(&self, other: &Vec4) -> Vec4 {
        Vec4::new(
            self.x + other.x,
            self.y + other.y,
            self.z + other.z,
            self.w + other.w,
        )
    }

    pub fn sub_vec(&self, other: &Vec4) -> Vec4 {
        Vec4::new(
            self.x - other.x,
            self.y - other.y,
            self.z - other.z,
            self.w - other.w,
        )
    }

    pub fn mul_scalar(&self, scalar: f32) -> Vec4 {
        Vec4::new(
            self.x * scalar,
            self.y * scalar,
            self.z * scalar,
            self.w * scalar,
        )
    }

    pub fn div_scalar(&self, scalar: f32) -> Vec4 {
        let inv = 1.0 / scalar;
        Vec4::new(
            self.x * inv,
            self.y * inv,
            self.z * inv,
            self.w * inv,
        )
    }

    pub fn dot(&self, other: &Vec4) -> f32 {
        self.x * other.x + self.y * other.y + self.z * other.z + self.w * other.w
    }

    pub fn length_squared(&self) -> f32 {
        self.x * self.x + self.y * self.y + self.z * self.z + self.w * self.w
    }

    pub fn length(&self) -> f32 {
        self.length_squared().sqrt()
    }

    pub fn magnitude(&self) -> f32 {
        self.length()
    }

    pub fn normalize(&self) -> Vec4 {
        let len = self.length();
        if len > 1e-8 {
            self.div_scalar(len)
        } else {
            Vec4::zero()
        }
    }

    pub fn lerp(&self, other: &Vec4, t: f32) -> Vec4 {
        Vec4::new(
            self.x + (other.x - self.x) * t,
            self.y + (other.y - self.y) * t,
            self.z + (other.z - self.z) * t,
            self.w + (other.w - self.w) * t,
        )
    }

    pub fn equals(&self, other: &Vec4) -> bool {
        (self.x - other.x).abs() < 1e-6 &&
        (self.y - other.y).abs() < 1e-6 &&
        (self.z - other.z).abs() < 1e-6 &&
        (self.w - other.w).abs() < 1e-6
    }

    pub fn to_array(&self) -> Vec<f32> {
        vec![self.x, self.y, self.z, self.w]
    }
}

impl Default for Vec4 {
    fn default() -> Self {
        Self::zero()
    }
}
