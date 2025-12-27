//! Engine Core - High-performance WASM module with SIMD optimizations
//!
//! This crate provides optimized implementations for:
//! - Math operations (Vec3, Vec4, Mat4, Quat)
//! - Frustum culling
//! - Animation/skeleton updates
//! - Particle systems
//! - Gaussian splatting sorting

use wasm_bindgen::prelude::*;

pub mod math;
pub mod culling;
pub mod animation;
pub mod particles;
pub mod memory;

#[cfg(feature = "console_error_panic_hook")]
pub use console_error_panic_hook::set_once as set_panic_hook;

/// Initialize the WASM module
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Get version string
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Check if SIMD is available
#[wasm_bindgen]
pub fn simd_available() -> bool {
    #[cfg(target_feature = "simd128")]
    { true }
    #[cfg(not(target_feature = "simd128"))]
    { false }
}
