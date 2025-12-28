/* tslint:disable */
/* eslint-disable */

export class BoneTransform {
  free(): void;
  [Symbol.dispose](): void;
  constructor();
  lerp(other: BoneTransform, t: number): BoneTransform;
  static identity(): BoneTransform;
  to_matrix(): Mat4;
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
}

export class Frustum {
  free(): void;
  [Symbol.dispose](): void;
  /**
   * Extract frustum planes from view-projection matrix
   */
  static from_matrix(vp: Mat4): Frustum;
  /**
   * Test if an AABB is inside or intersects the frustum
   */
  contains_aabb(min: Vec3, max: Vec3): boolean;
  /**
   * Test if a point is inside the frustum
   */
  contains_point(point: Vec3): boolean;
  /**
   * Test if a sphere is inside or intersects the frustum
   */
  contains_sphere(center: Vec3, radius: number): boolean;
  constructor();
}

export class Mat4 {
  free(): void;
  [Symbol.dispose](): void;
  static from_scale(v: Vec3): Mat4;
  determinant(): number;
  static from_values(m00: number, m01: number, m02: number, m03: number, m10: number, m11: number, m12: number, m13: number, m20: number, m21: number, m22: number, m23: number, m30: number, m31: number, m32: number, m33: number): Mat4;
  get_forward(): Vec3;
  static perspective(fov_y: number, aspect: number, near: number, far: number): Mat4;
  get_position(): Vec3;
  set_identity(): void;
  transform_vec4(v: Vec4): Vec4;
  static from_axis_angle(axis: Vec3, radians: number): Mat4;
  static from_rotation_x(radians: number): Mat4;
  static from_rotation_y(radians: number): Mat4;
  static from_rotation_z(radians: number): Mat4;
  transform_point(point: Vec3): Vec3;
  static from_translation(v: Vec3): Mat4;
  /**
   * Decompose matrix into TRS as flat array [tx,ty,tz, qx,qy,qz,qw, sx,sy,sz]
   * WASM-compatible version (returns 10 floats)
   */
  decompose_to_array(): Float32Array;
  transform_direction(direction: Vec3): Vec3;
  get(row: number, col: number): number;
  constructor();
  copy(other: Mat4): void;
  static zero(): Mat4;
  static ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4;
  equals(other: Mat4): boolean;
  get_up(): Vec3;
  invert(): Mat4 | undefined;
  /**
   * Compose TRS matrix (Translation * Rotation * Scale)
   */
  static compose(position: Vec3, rotation: Quat, scale: Vec3): Mat4;
  inverse(): Mat4;
  static look_at(eye: Vec3, target: Vec3, up: Vec3): Mat4;
  static identity(): Mat4;
  /**
   * Multiply two matrices: result = self * other
   */
  multiply(other: Mat4): Mat4;
  to_array(): Float32Array;
  clone_mat(): Mat4;
  static from_quat(q: Quat): Mat4;
  get_right(): Vec3;
  get_scale(): Vec3;
  set_value(row: number, col: number, value: number): void;
  transpose(): Mat4;
}

export class Quat {
  free(): void;
  [Symbol.dispose](): void;
  clone_quat(): Quat;
  static from_euler(x: number, y: number, z: number): Quat;
  euler_angles(): Vec3;
  /**
   * Look rotation - creates a rotation looking from origin towards forward
   */
  static look_rotation(forward: Vec3, up: Vec3): Quat;
  length_squared(): number;
  static from_axis_angle(axis: Vec3, radians: number): Quat;
  dot(other: Quat): number;
  constructor(x: number, y: number, z: number, w: number);
  set(x: number, y: number, z: number, w: number): void;
  copy(other: Quat): void;
  lerp(other: Quat, t: number): Quat;
  angle(other: Quat): number;
  /**
   * Create quaternion from Euler angles in degrees
   */
  static euler(x: number, y: number, z: number): Quat;
  /**
   * Spherical linear interpolation (optimized)
   */
  slerp(other: Quat, t: number): Quat;
  equals(other: Quat): boolean;
  invert(): Quat;
  length(): number;
  static identity(): Quat;
  /**
   * Rotate a vector by this quaternion
   */
  mul_vec3(v: Vec3): Vec3;
  /**
   * Multiply quaternions: result = self * other
   */
  multiply(other: Quat): Quat;
  to_array(): Float32Array;
  conjugate(): Quat;
  static from_mat4(m: Mat4): Quat;
  normalize(): Quat;
  x: number;
  y: number;
  z: number;
  w: number;
}

export class Vec3 {
  free(): void;
  [Symbol.dispose](): void;
  div_scalar(scalar: number): Vec3;
  static from_array(arr: Float32Array): Vec3;
  mul_scalar(scalar: number): Vec3;
  normalized(): Vec3;
  move_towards(target: Vec3, max_distance: number): Vec3;
  length_squared(): number;
  distance_squared(other: Vec3): number;
  project_on_plane(plane_normal: Vec3): Vec3;
  static up(): Vec3;
  abs(): Vec3;
  dot(other: Vec3): number;
  max(other: Vec3): Vec3;
  min(other: Vec3): Vec3;
  constructor(x: number, y: number, z: number);
  static one(): Vec3;
  set(x: number, y: number, z: number): void;
  static back(): Vec3;
  ceil(): Vec3;
  copy(other: Vec3): void;
  static down(): Vec3;
  static left(): Vec3;
  lerp(other: Vec3, t: number): Vec3;
  static zero(): Vec3;
  angle(other: Vec3): number;
  clamp(min: Vec3, max: Vec3): Vec3;
  cross(other: Vec3): Vec3;
  floor(): Vec3;
  static right(): Vec3;
  round(): Vec3;
  slerp(other: Vec3, t: number): Vec3;
  equals(other: Vec3): boolean;
  length(): number;
  negate(): Vec3;
  add_vec(other: Vec3): Vec3;
  static forward(): Vec3;
  mul_vec(other: Vec3): Vec3;
  project(on_normal: Vec3): Vec3;
  reflect(normal: Vec3): Vec3;
  sub_vec(other: Vec3): Vec3;
  distance(other: Vec3): number;
  to_array(): Float32Array;
  clone_vec(): Vec3;
  magnitude(): number;
  normalize(): Vec3;
  x: number;
  y: number;
  z: number;
}

export class Vec4 {
  free(): void;
  [Symbol.dispose](): void;
  div_scalar(scalar: number): Vec4;
  mul_scalar(scalar: number): Vec4;
  length_squared(): number;
  dot(other: Vec4): number;
  constructor(x: number, y: number, z: number, w: number);
  static one(): Vec4;
  set(x: number, y: number, z: number, w: number): void;
  copy(other: Vec4): void;
  lerp(other: Vec4, t: number): Vec4;
  static zero(): Vec4;
  equals(other: Vec4): boolean;
  length(): number;
  add_vec(other: Vec4): Vec4;
  sub_vec(other: Vec4): Vec4;
  to_array(): Float32Array;
  magnitude(): number;
  normalize(): Vec4;
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * Allocate a Float32Array in WASM memory
 */
export function alloc_f32(size: number): number;

/**
 * Allocate a Uint32Array in WASM memory
 */
export function alloc_u32(size: number): number;

/**
 * Apply gravity to particle velocities
 */
export function apply_gravity(velocities: Float32Array, gravity_x: number, gravity_y: number, gravity_z: number, delta_time: number): void;

/**
 * Compose batch TRS matrices
 */
export function batch_compose_trs(positions: Float32Array, rotations: Float32Array, scales: Float32Array): Float32Array;

/**
 * Batch compute TRS matrices
 */
export function batch_compute_trs_matrices(positions: Float32Array, rotations: Float32Array, scales: Float32Array, count: number): Float32Array;

/**
 * Batch cross product
 */
export function batch_cross_vec3(a_data: Float32Array, b_data: Float32Array): Float32Array;

/**
 * Batch cull AABBs against frustum
 */
export function batch_cull_aabbs(frustum: Frustum, mins: Float32Array, maxs: Float32Array): Uint8Array;

/**
 * Batch cull spheres against multiple frustums
 * Returns visibility matrix (cameras × objects)
 */
export function batch_cull_multi_frustum(frustums: Frustum[], centers: Float32Array, radii: Float32Array): Uint8Array;

/**
 * Batch cull spheres against frustum
 * Returns a byte array where 1 = visible, 0 = culled
 */
export function batch_cull_spheres(frustum: Frustum, centers: Float32Array, radii: Float32Array): Uint8Array;

/**
 * Batch dot product
 */
export function batch_dot_vec3(a_data: Float32Array, b_data: Float32Array): Float32Array;

/**
 * Batch interpolate bone transforms
 */
export function batch_interpolate_bones(a_positions: Float32Array, a_rotations: Float32Array, a_scales: Float32Array, b_positions: Float32Array, b_rotations: Float32Array, b_scales: Float32Array, t: number): Float32Array;

/**
 * Batch LERP vectors
 */
export function batch_lerp_vec3(a_data: Float32Array, b_data: Float32Array, t: number): Float32Array;

/**
 * Batch multiply matrices: C[i] = A[i] * B[i]
 */
export function batch_multiply_matrices(a_data: Float32Array, b_data: Float32Array): Float32Array;

/**
 * Batch multiply matrices (for transform hierarchies)
 */
export function batch_multiply_matrices_chain(matrices: Float32Array, count: number): Float32Array;

/**
 * Batch normalize vectors
 */
export function batch_normalize_vec3(data: Float32Array): Float32Array;

/**
 * Batch propagate transform hierarchy
 *
 * Takes local matrices and parent indices, outputs world matrices.
 * Must be called with transforms sorted by depth (parents before children).
 *
 * # Arguments
 * * `local_matrices` - Flat array of local matrices (count * 16 floats)
 * * `parent_indices` - Parent index for each transform (-1 = no parent, use local as world)
 * * `parent_world_matrices` - Optional external parent world matrices (for parents not in batch)
 * * `count` - Number of transforms
 *
 * # Returns
 * Flat array of world matrices (count * 16 floats)
 */
export function batch_propagate_hierarchy(local_matrices: Float32Array, parent_indices: Int32Array, parent_world_matrices: Float32Array, count: number): Float32Array;

/**
 * Batch rotate vectors by quaternions
 * Each quaternion rotates one vector
 */
export function batch_rotate_vectors(quats: Float32Array, vecs: Float32Array, count: number): Float32Array;

/**
 * Batch SLERP quaternions
 */
export function batch_slerp_quaternions(quats_a: Float32Array, quats_b: Float32Array, t: number): Float32Array;

/**
 * Batch SLERP quaternions
 */
export function batch_slerp_quats(a_data: Float32Array, b_data: Float32Array, t: number): Float32Array;

/**
 * Batch transform directions by a matrix (no translation)
 */
export function batch_transform_directions(matrix: Mat4, directions: Float32Array): Float32Array;

/**
 * Batch transform points by a matrix
 */
export function batch_transform_points(matrix: Mat4, points: Float32Array): Float32Array;

/**
 * Batch transform array of points by matrix
 */
export function batch_transform_points_by_matrix(matrix: Float32Array, points: Float32Array): Float32Array;

/**
 * Combined batch TRS + hierarchy propagation in one call
 *
 * This is the most efficient path for transform updates:
 * 1. Compute all TRS matrices from position/rotation/scale
 * 2. Propagate through hierarchy using parent indices
 *
 * # Arguments
 * * `positions` - Flat array of positions (count * 3 floats)
 * * `rotations` - Flat array of quaternions (count * 4 floats)
 * * `scales` - Flat array of scales (count * 3 floats)
 * * `parent_indices` - Parent index for each transform (-1 = root)
 * * `parent_world_matrices` - External parent world matrices (encoded with negative indices)
 * * `count` - Number of transforms
 */
export function batch_update_transforms(positions: Float32Array, rotations: Float32Array, scales: Float32Array, parent_indices: Int32Array, parent_world_matrices: Float32Array, count: number): Float32Array;

/**
 * Blend two skeleton poses
 */
export function blend_skeleton_poses(pose_a: Float32Array, pose_b: Float32Array, weight: number): Float32Array;

/**
 * Compute final bone matrices from local transforms and hierarchy
 */
export function compute_bone_matrices(local_transforms: Float32Array, parent_indices: Int32Array, bind_poses: Float32Array): Float32Array;

/**
 * Execute a batch of commands from buffers
 *
 * # Arguments
 * * `commands` - Command buffer (opcode, count, data_offset, output_offset per command)
 * * `command_count` - Number of commands
 * * `data` - Input data buffer
 * * `output` - Output buffer (will be written to)
 */
export function execute_batch(commands: Uint32Array, command_count: number, data: Float32Array, output: Float32Array): number;

/**
 * Free a Float32Array
 */
export function free_f32(ptr: number, size: number): void;

/**
 * Free a Uint32Array
 */
export function free_u32(ptr: number, size: number): void;

/**
 * Get WASM memory
 */
export function getMemory(): any;

/**
 * Initialize the WASM module
 */
export function init(): void;

/**
 * Interpolate particle colors over lifetime
 */
export function interpolate_particle_colors(lifetimes: Float32Array, max_lifetimes: Float32Array, start_colors: Float32Array, end_colors: Float32Array): Float32Array;

/**
 * Interpolate particle sizes over lifetime
 */
export function interpolate_particle_sizes(lifetimes: Float32Array, max_lifetimes: Float32Array, start_sizes: Float32Array, end_sizes: Float32Array): Float32Array;

/**
 * Decompose a 4x4 matrix into Translation, Rotation (quaternion), Scale
 * Returns 10 floats: [tx, ty, tz, qx, qy, qz, qw, sx, sy, sz]
 */
export function mat4_decompose(matrix: Float32Array): Float32Array;

/**
 * Rotate a vector by a quaternion
 * Returns 3 floats: [x, y, z]
 */
export function quat_rotate_vec3(quat: Float32Array, vec: Float32Array): Float32Array;

/**
 * Check if SIMD is available
 */
export function simd_available(): boolean;

/**
 * Sort particles by distance to camera (for transparency)
 */
export function sort_particles_by_distance(positions: Float32Array, camera_pos_x: number, camera_pos_y: number, camera_pos_z: number): Uint32Array;

/**
 * Spawn particles in a box
 */
export function spawn_particles_box(count: number, min_x: number, min_y: number, min_z: number, max_x: number, max_y: number, max_z: number, seed: number): Float32Array;

/**
 * Spawn particles in a sphere
 */
export function spawn_particles_sphere(count: number, center_x: number, center_y: number, center_z: number, radius: number, seed: number): Float32Array;

/**
 * Update particle lifetimes and return alive mask
 */
export function update_particle_lifetimes(lifetimes: Float32Array, delta_time: number): Uint8Array;

/**
 * Update particle positions based on velocity
 */
export function update_particle_positions(positions: Float32Array, velocities: Float32Array, delta_time: number): void;

/**
 * Get version string
 */
export function version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_bonetransform_free: (a: number, b: number) => void;
  readonly __wbg_frustum_free: (a: number, b: number) => void;
  readonly __wbg_get_bonetransform_position: (a: number) => number;
  readonly __wbg_get_bonetransform_rotation: (a: number) => number;
  readonly __wbg_get_bonetransform_scale: (a: number) => number;
  readonly __wbg_get_quat_w: (a: number) => number;
  readonly __wbg_get_quat_x: (a: number) => number;
  readonly __wbg_get_quat_y: (a: number) => number;
  readonly __wbg_get_quat_z: (a: number) => number;
  readonly __wbg_mat4_free: (a: number, b: number) => void;
  readonly __wbg_quat_free: (a: number, b: number) => void;
  readonly __wbg_set_bonetransform_position: (a: number, b: number) => void;
  readonly __wbg_set_bonetransform_rotation: (a: number, b: number) => void;
  readonly __wbg_set_bonetransform_scale: (a: number, b: number) => void;
  readonly __wbg_set_quat_w: (a: number, b: number) => void;
  readonly __wbg_set_quat_x: (a: number, b: number) => void;
  readonly __wbg_set_quat_y: (a: number, b: number) => void;
  readonly __wbg_set_quat_z: (a: number, b: number) => void;
  readonly __wbg_vec3_free: (a: number, b: number) => void;
  readonly alloc_f32: (a: number) => number;
  readonly alloc_u32: (a: number) => number;
  readonly apply_gravity: (a: number, b: number, c: any, d: number, e: number, f: number, g: number) => void;
  readonly batch_compose_trs: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
  readonly batch_compute_trs_matrices: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
  readonly batch_cross_vec3: (a: number, b: number, c: number, d: number) => [number, number];
  readonly batch_cull_aabbs: (a: number, b: number, c: number, d: number, e: number) => [number, number];
  readonly batch_cull_multi_frustum: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
  readonly batch_cull_spheres: (a: number, b: number, c: number, d: number, e: number) => [number, number];
  readonly batch_dot_vec3: (a: number, b: number, c: number, d: number) => [number, number];
  readonly batch_interpolate_bones: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number) => [number, number];
  readonly batch_lerp_vec3: (a: number, b: number, c: number, d: number, e: number) => [number, number];
  readonly batch_multiply_matrices: (a: number, b: number, c: number, d: number) => [number, number];
  readonly batch_multiply_matrices_chain: (a: number, b: number, c: number) => [number, number];
  readonly batch_normalize_vec3: (a: number, b: number) => [number, number];
  readonly batch_propagate_hierarchy: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
  readonly batch_rotate_vectors: (a: number, b: number, c: number, d: number, e: number) => [number, number];
  readonly batch_slerp_quaternions: (a: number, b: number, c: number, d: number, e: number) => [number, number];
  readonly batch_slerp_quats: (a: number, b: number, c: number, d: number, e: number) => [number, number];
  readonly batch_transform_directions: (a: number, b: number, c: number) => [number, number];
  readonly batch_transform_points: (a: number, b: number, c: number) => [number, number];
  readonly batch_transform_points_by_matrix: (a: number, b: number, c: number, d: number) => [number, number];
  readonly batch_update_transforms: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => [number, number];
  readonly blend_skeleton_poses: (a: number, b: number, c: number, d: number, e: number) => [number, number];
  readonly bonetransform_identity: () => number;
  readonly bonetransform_lerp: (a: number, b: number, c: number) => number;
  readonly bonetransform_to_matrix: (a: number) => number;
  readonly compute_bone_matrices: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
  readonly execute_batch: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: any) => number;
  readonly free_f32: (a: number, b: number) => void;
  readonly frustum_contains_aabb: (a: number, b: number, c: number) => number;
  readonly frustum_contains_point: (a: number, b: number) => number;
  readonly frustum_contains_sphere: (a: number, b: number, c: number) => number;
  readonly frustum_from_matrix: (a: number) => number;
  readonly frustum_new: () => number;
  readonly interpolate_particle_colors: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number];
  readonly interpolate_particle_sizes: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number];
  readonly mat4_clone_mat: (a: number) => number;
  readonly mat4_compose: (a: number, b: number, c: number) => number;
  readonly mat4_copy: (a: number, b: number) => void;
  readonly mat4_decompose: (a: number, b: number) => [number, number];
  readonly mat4_decompose_to_array: (a: number) => [number, number];
  readonly mat4_determinant: (a: number) => number;
  readonly mat4_equals: (a: number, b: number) => number;
  readonly mat4_from_axis_angle: (a: number, b: number) => number;
  readonly mat4_from_quat: (a: number) => number;
  readonly mat4_from_rotation_x: (a: number) => number;
  readonly mat4_from_rotation_y: (a: number) => number;
  readonly mat4_from_rotation_z: (a: number) => number;
  readonly mat4_from_scale: (a: number) => number;
  readonly mat4_from_translation: (a: number) => number;
  readonly mat4_from_values: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number) => number;
  readonly mat4_get: (a: number, b: number, c: number) => number;
  readonly mat4_get_forward: (a: number) => number;
  readonly mat4_get_position: (a: number) => number;
  readonly mat4_get_right: (a: number) => number;
  readonly mat4_get_scale: (a: number) => number;
  readonly mat4_get_up: (a: number) => number;
  readonly mat4_identity: () => number;
  readonly mat4_inverse: (a: number) => number;
  readonly mat4_invert: (a: number) => number;
  readonly mat4_look_at: (a: number, b: number, c: number) => number;
  readonly mat4_multiply: (a: number, b: number) => number;
  readonly mat4_ortho: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly mat4_perspective: (a: number, b: number, c: number, d: number) => number;
  readonly mat4_set_identity: (a: number) => void;
  readonly mat4_set_value: (a: number, b: number, c: number, d: number) => void;
  readonly mat4_to_array: (a: number) => [number, number];
  readonly mat4_transform_direction: (a: number, b: number) => number;
  readonly mat4_transform_point: (a: number, b: number) => number;
  readonly mat4_transform_vec4: (a: number, b: number) => number;
  readonly mat4_transpose: (a: number) => number;
  readonly mat4_zero: () => number;
  readonly quat_angle: (a: number, b: number) => number;
  readonly quat_clone_quat: (a: number) => number;
  readonly quat_conjugate: (a: number) => number;
  readonly quat_copy: (a: number, b: number) => void;
  readonly quat_dot: (a: number, b: number) => number;
  readonly quat_equals: (a: number, b: number) => number;
  readonly quat_euler: (a: number, b: number, c: number) => number;
  readonly quat_euler_angles: (a: number) => number;
  readonly quat_from_axis_angle: (a: number, b: number) => number;
  readonly quat_from_euler: (a: number, b: number, c: number) => number;
  readonly quat_from_mat4: (a: number) => number;
  readonly quat_identity: () => number;
  readonly quat_invert: (a: number) => number;
  readonly quat_length: (a: number) => number;
  readonly quat_length_squared: (a: number) => number;
  readonly quat_lerp: (a: number, b: number, c: number) => number;
  readonly quat_look_rotation: (a: number, b: number) => number;
  readonly quat_mul_vec3: (a: number, b: number) => number;
  readonly quat_multiply: (a: number, b: number) => number;
  readonly quat_new: (a: number, b: number, c: number, d: number) => number;
  readonly quat_normalize: (a: number) => number;
  readonly quat_rotate_vec3: (a: number, b: number, c: number, d: number) => [number, number];
  readonly quat_set: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly quat_slerp: (a: number, b: number, c: number) => number;
  readonly quat_to_array: (a: number) => [number, number];
  readonly simd_available: () => number;
  readonly sort_particles_by_distance: (a: number, b: number, c: number, d: number, e: number) => [number, number];
  readonly spawn_particles_box: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number];
  readonly spawn_particles_sphere: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
  readonly update_particle_lifetimes: (a: number, b: number, c: any, d: number) => [number, number];
  readonly update_particle_positions: (a: number, b: number, c: any, d: number, e: number, f: number) => void;
  readonly vec3_abs: (a: number) => number;
  readonly vec3_add_vec: (a: number, b: number) => number;
  readonly vec3_angle: (a: number, b: number) => number;
  readonly vec3_back: () => number;
  readonly vec3_ceil: (a: number) => number;
  readonly vec3_clamp: (a: number, b: number, c: number) => number;
  readonly vec3_clone_vec: (a: number) => number;
  readonly vec3_copy: (a: number, b: number) => void;
  readonly vec3_cross: (a: number, b: number) => number;
  readonly vec3_distance: (a: number, b: number) => number;
  readonly vec3_distance_squared: (a: number, b: number) => number;
  readonly vec3_div_scalar: (a: number, b: number) => number;
  readonly vec3_dot: (a: number, b: number) => number;
  readonly vec3_down: () => number;
  readonly vec3_equals: (a: number, b: number) => number;
  readonly vec3_floor: (a: number) => number;
  readonly vec3_forward: () => number;
  readonly vec3_from_array: (a: number, b: number) => number;
  readonly vec3_left: () => number;
  readonly vec3_length: (a: number) => number;
  readonly vec3_length_squared: (a: number) => number;
  readonly vec3_lerp: (a: number, b: number, c: number) => number;
  readonly vec3_max: (a: number, b: number) => number;
  readonly vec3_min: (a: number, b: number) => number;
  readonly vec3_move_towards: (a: number, b: number, c: number) => number;
  readonly vec3_mul_scalar: (a: number, b: number) => number;
  readonly vec3_mul_vec: (a: number, b: number) => number;
  readonly vec3_negate: (a: number) => number;
  readonly vec3_new: (a: number, b: number, c: number) => number;
  readonly vec3_normalize: (a: number) => number;
  readonly vec3_one: () => number;
  readonly vec3_project: (a: number, b: number) => number;
  readonly vec3_project_on_plane: (a: number, b: number) => number;
  readonly vec3_reflect: (a: number, b: number) => number;
  readonly vec3_right: () => number;
  readonly vec3_round: (a: number) => number;
  readonly vec3_set: (a: number, b: number, c: number, d: number) => void;
  readonly vec3_slerp: (a: number, b: number, c: number) => number;
  readonly vec3_sub_vec: (a: number, b: number) => number;
  readonly vec3_to_array: (a: number) => [number, number];
  readonly vec3_up: () => number;
  readonly vec3_zero: () => number;
  readonly vec4_add_vec: (a: number, b: number) => number;
  readonly vec4_div_scalar: (a: number, b: number) => number;
  readonly vec4_lerp: (a: number, b: number, c: number) => number;
  readonly vec4_mul_scalar: (a: number, b: number) => number;
  readonly vec4_normalize: (a: number) => number;
  readonly vec4_one: () => number;
  readonly vec4_sub_vec: (a: number, b: number) => number;
  readonly vec4_zero: () => number;
  readonly version: () => [number, number];
  readonly init: () => void;
  readonly vec4_length_squared: (a: number) => number;
  readonly vec3_magnitude: (a: number) => number;
  readonly __wbg_set_vec3_x: (a: number, b: number) => void;
  readonly __wbg_set_vec3_y: (a: number, b: number) => void;
  readonly __wbg_set_vec3_z: (a: number, b: number) => void;
  readonly __wbg_set_vec4_w: (a: number, b: number) => void;
  readonly __wbg_set_vec4_x: (a: number, b: number) => void;
  readonly __wbg_set_vec4_y: (a: number, b: number) => void;
  readonly __wbg_set_vec4_z: (a: number, b: number) => void;
  readonly mat4_new: () => number;
  readonly bonetransform_new: () => number;
  readonly getMemory: () => any;
  readonly vec4_length: (a: number) => number;
  readonly vec4_magnitude: (a: number) => number;
  readonly free_u32: (a: number, b: number) => void;
  readonly vec4_set: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly vec4_new: (a: number, b: number, c: number, d: number) => number;
  readonly __wbg_get_vec3_x: (a: number) => number;
  readonly __wbg_get_vec3_y: (a: number) => number;
  readonly __wbg_get_vec3_z: (a: number) => number;
  readonly __wbg_get_vec4_w: (a: number) => number;
  readonly __wbg_get_vec4_x: (a: number) => number;
  readonly __wbg_get_vec4_y: (a: number) => number;
  readonly __wbg_get_vec4_z: (a: number) => number;
  readonly vec3_normalized: (a: number) => number;
  readonly vec4_copy: (a: number, b: number) => void;
  readonly __wbg_vec4_free: (a: number, b: number) => void;
  readonly vec4_to_array: (a: number) => [number, number];
  readonly vec4_equals: (a: number, b: number) => number;
  readonly vec4_dot: (a: number, b: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
