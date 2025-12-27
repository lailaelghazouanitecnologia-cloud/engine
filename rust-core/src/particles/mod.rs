//! Particles module - High-performance particle system

use wasm_bindgen::prelude::*;
use crate::math::Vec3;

/// Particle state
#[derive(Clone, Copy, Debug)]
pub struct Particle {
    pub position: Vec3,
    pub velocity: Vec3,
    pub life: f32,
    pub max_life: f32,
    pub size: f32,
    pub rotation: f32,
    pub color_r: f32,
    pub color_g: f32,
    pub color_b: f32,
    pub color_a: f32,
}

// ==================== Batch Particle Operations ====================

/// Update particle positions based on velocity
#[wasm_bindgen]
pub fn update_particle_positions(
    positions: &mut [f32],  // [x, y, z, ...]
    velocities: &[f32],     // [vx, vy, vz, ...]
    delta_time: f32,
) {
    let count = positions.len() / 3;

    for i in 0..count {
        let idx = i * 3;
        positions[idx] += velocities[idx] * delta_time;
        positions[idx + 1] += velocities[idx + 1] * delta_time;
        positions[idx + 2] += velocities[idx + 2] * delta_time;
    }
}

/// Apply gravity to particle velocities
#[wasm_bindgen]
pub fn apply_gravity(
    velocities: &mut [f32],
    gravity_x: f32,
    gravity_y: f32,
    gravity_z: f32,
    delta_time: f32,
) {
    let count = velocities.len() / 3;

    for i in 0..count {
        let idx = i * 3;
        velocities[idx] += gravity_x * delta_time;
        velocities[idx + 1] += gravity_y * delta_time;
        velocities[idx + 2] += gravity_z * delta_time;
    }
}

/// Update particle lifetimes and return alive mask
#[wasm_bindgen]
pub fn update_particle_lifetimes(
    lifetimes: &mut [f32],
    delta_time: f32,
) -> Vec<u8> {
    let mut alive = Vec::with_capacity(lifetimes.len());

    for life in lifetimes.iter_mut() {
        *life -= delta_time;
        alive.push(if *life > 0.0 { 1 } else { 0 });
    }

    alive
}

/// Interpolate particle sizes over lifetime
#[wasm_bindgen]
pub fn interpolate_particle_sizes(
    lifetimes: &[f32],
    max_lifetimes: &[f32],
    start_sizes: &[f32],
    end_sizes: &[f32],
) -> Vec<f32> {
    let count = lifetimes.len();
    let mut sizes = Vec::with_capacity(count);

    for i in 0..count {
        let t = if max_lifetimes[i] > 0.0 {
            1.0 - (lifetimes[i] / max_lifetimes[i])
        } else {
            1.0
        };
        let t = t.clamp(0.0, 1.0);
        sizes.push(start_sizes[i] + (end_sizes[i] - start_sizes[i]) * t);
    }

    sizes
}

/// Interpolate particle colors over lifetime
#[wasm_bindgen]
pub fn interpolate_particle_colors(
    lifetimes: &[f32],
    max_lifetimes: &[f32],
    start_colors: &[f32],  // [r, g, b, a, ...]
    end_colors: &[f32],
) -> Vec<f32> {
    let count = lifetimes.len();
    let mut colors = Vec::with_capacity(count * 4);

    for i in 0..count {
        let t = if max_lifetimes[i] > 0.0 {
            1.0 - (lifetimes[i] / max_lifetimes[i])
        } else {
            1.0
        };
        let t = t.clamp(0.0, 1.0);

        let ci = i * 4;
        colors.push(start_colors[ci] + (end_colors[ci] - start_colors[ci]) * t);
        colors.push(start_colors[ci+1] + (end_colors[ci+1] - start_colors[ci+1]) * t);
        colors.push(start_colors[ci+2] + (end_colors[ci+2] - start_colors[ci+2]) * t);
        colors.push(start_colors[ci+3] + (end_colors[ci+3] - start_colors[ci+3]) * t);
    }

    colors
}

/// Sort particles by distance to camera (for transparency)
#[wasm_bindgen]
pub fn sort_particles_by_distance(
    positions: &[f32],
    camera_pos_x: f32,
    camera_pos_y: f32,
    camera_pos_z: f32,
) -> Vec<u32> {
    let count = positions.len() / 3;
    let camera = Vec3::new(camera_pos_x, camera_pos_y, camera_pos_z);

    // Calculate distances
    let mut indices_distances: Vec<(u32, f32)> = (0..count as u32)
        .map(|i| {
            let idx = (i as usize) * 3;
            let pos = Vec3::new(positions[idx], positions[idx + 1], positions[idx + 2]);
            let dist = pos.distance_squared(&camera);
            (i, dist)
        })
        .collect();

    // Sort by distance (back to front)
    indices_distances.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    indices_distances.into_iter().map(|(i, _)| i).collect()
}

/// Spawn particles in a sphere
#[wasm_bindgen]
pub fn spawn_particles_sphere(
    count: u32,
    center_x: f32,
    center_y: f32,
    center_z: f32,
    radius: f32,
    seed: u32,
) -> Vec<f32> {
    let mut positions = Vec::with_capacity((count * 3) as usize);
    let mut rng_state = seed;

    for _ in 0..count {
        // Simple LCG random
        rng_state = rng_state.wrapping_mul(1103515245).wrapping_add(12345);
        let u = (rng_state as f32) / (u32::MAX as f32);

        rng_state = rng_state.wrapping_mul(1103515245).wrapping_add(12345);
        let v = (rng_state as f32) / (u32::MAX as f32);

        rng_state = rng_state.wrapping_mul(1103515245).wrapping_add(12345);
        let r = (rng_state as f32) / (u32::MAX as f32);

        // Convert to spherical coordinates
        let theta = 2.0 * std::f32::consts::PI * u;
        let phi = (2.0 * v - 1.0).acos();
        let r_scaled = r.powf(1.0 / 3.0) * radius;

        let x = center_x + r_scaled * phi.sin() * theta.cos();
        let y = center_y + r_scaled * phi.sin() * theta.sin();
        let z = center_z + r_scaled * phi.cos();

        positions.push(x);
        positions.push(y);
        positions.push(z);
    }

    positions
}

/// Spawn particles in a box
#[wasm_bindgen]
pub fn spawn_particles_box(
    count: u32,
    min_x: f32, min_y: f32, min_z: f32,
    max_x: f32, max_y: f32, max_z: f32,
    seed: u32,
) -> Vec<f32> {
    let mut positions = Vec::with_capacity((count * 3) as usize);
    let mut rng_state = seed;

    for _ in 0..count {
        rng_state = rng_state.wrapping_mul(1103515245).wrapping_add(12345);
        let x = min_x + (max_x - min_x) * ((rng_state as f32) / (u32::MAX as f32));

        rng_state = rng_state.wrapping_mul(1103515245).wrapping_add(12345);
        let y = min_y + (max_y - min_y) * ((rng_state as f32) / (u32::MAX as f32));

        rng_state = rng_state.wrapping_mul(1103515245).wrapping_add(12345);
        let z = min_z + (max_z - min_z) * ((rng_state as f32) / (u32::MAX as f32));

        positions.push(x);
        positions.push(y);
        positions.push(z);
    }

    positions
}
