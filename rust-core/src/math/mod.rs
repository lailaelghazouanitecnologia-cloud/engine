//! Math module - SIMD-optimized vector and matrix operations

pub mod vec3;
pub mod vec4;
pub mod mat4;
pub mod quat;
pub mod batch;

pub use vec3::Vec3;
pub use vec4::Vec4;
pub use mat4::Mat4;
pub use quat::Quat;
