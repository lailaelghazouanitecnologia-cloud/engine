# WASM Backend Usage Rules

## Performance Thresholds

Based on benchmarks, the overhead of crossing the JS ↔ WASM boundary is ~50-200ns per call.
This means:

| Scenario | Recommended Backend | Reason |
|----------|---------------------|--------|
| Single operation | **JavaScript** | Boundary overhead > computation time |
| < 4 operations | **JavaScript** | Not enough work to amortize overhead |
| ≥ 4 operations | **WASM Batch** | Overhead amortized across operations |
| ≥ 100 operations | **WASM Batch** | 1.5x-4x faster than JS |

## Decision Matrix by Operation Type

### Vector3 Operations
```typescript
// ALWAYS use JS for single operations
const result = a.add(b);                    // ✅ JS (single)

// Use WASM for batch operations
batchProcessor.queueVec3Add(a, b, cb);      // ✅ Queue
batchProcessor.queueVec3Add(c, d, cb);
batchProcessor.flush();                     // Single WASM call
```

### Matrix4 Operations
```typescript
// Single multiply: JS (0.5µs)
const result = Matrix4x4.multiply(a, b);    // ✅ JS

// Transform hierarchy (many matrices): WASM
const matrices = transforms.map(t => t.localToWorldMatrix);
wasm.batch_multiply_matrices_chain(matrices, count);  // ✅ WASM
```

### Quaternion SLERP
```typescript
// Single slerp: JS
const q = Quaternion.slerp(a, b, t);        // ✅ JS

// Animation blending (many bones): WASM
wasm.batch_slerp_quats(bonesA, bonesB, t);  // ✅ WASM 4x faster
```

### Frustum Culling
```typescript
// Always WASM - designed for batch
wasm.batch_cull_spheres(frustum, centers, radii);  // ✅ WASM
wasm.batch_cull_aabbs(frustum, mins, maxs);        // ✅ WASM
```

## API Layers

### Layer 1: Direct WASM (Low-level)
For engine internals, maximum performance:
```typescript
import { WasmBridge } from './WasmBridge';

const wasm = WasmBridge.instance.module;
const result = wasm.math.batch_multiply_matrices(matricesA, matricesB);
```

### Layer 2: OperationPool (Mid-level)
For deduplication and caching:
```typescript
import { OperationPool } from './OperationPool';

const pool = OperationPool.instance;
pool.queueMatrixMultiply(a, b, (result) => { /* ... */ });
pool.queueMatrixMultiply(c, d, (result) => { /* ... */ });
pool.flush(); // Batches to WASM
```

### Layer 3: WasmBatchProcessor (High-level)
For mixed operation types:
```typescript
import { WasmBatchProcessor } from './WasmBatchProcessor';

const batch = WasmBatchProcessor.instance;
batch.queueVec3Add(a, b, cb1);
batch.queueMat4Multiply(m1, m2, cb2);
batch.queueQuatSlerp(q1, q2, t, cb3);
batch.flush(); // Single WASM call for all
```

## System Integration Points

### Transform System
```typescript
// Per-frame update:
// 1. Collect dirty transforms
// 2. Batch compute TRS matrices (WASM)
// 3. Batch multiply hierarchies (WASM)

const positions = new Float32Array(count * 3);
const rotations = new Float32Array(count * 4);
const scales = new Float32Array(count * 3);
wasm.batch_compute_trs_matrices(positions, rotations, scales, count);
```

### Animation System
```typescript
// Skeleton update:
wasm.batch_interpolate_bones(
    poseA_positions, poseA_rotations, poseA_scales,
    poseB_positions, poseB_rotations, poseB_scales,
    t
);
```

### Culling System
```typescript
// Always batch - never cull single objects
const visibility = wasm.batch_cull_spheres(frustum, centers, radii);
```

### Particle System
```typescript
// Physics integration (100s-1000s of particles)
wasm.update_particle_positions(positions, velocities, deltaTime);
wasm.apply_gravity(velocities, gx, gy, gz, deltaTime);
```

## OpCode Reference

| Category | OpCodes | Input Size | Output Size |
|----------|---------|------------|-------------|
| Vec3 | 0x00-0x08 | 3-7 floats | 1-3 floats |
| Vec4 | 0x10-0x14 | 4-8 floats | 1-4 floats |
| Quat | 0x20-0x27 | 3-9 floats | 3-4 floats |
| Mat4 | 0x30-0x39 | 10-32 floats | 3-16 floats |
| Batch | 0x40-0x43 | Variable | Variable |
| Culling | 0x50-0x51 | 24+ floats | N bytes |
| Physics | 0x60-0x61 | Variable | Variable |
| Animation | 0x70-0x72 | Variable | Variable |
| Particles | 0x80-0x82 | Variable | Variable |

## Memory Layout for Batch Commands

```
Command Buffer (Uint32Array):
┌────────┬────────┬────────────┬──────────────┐
│ OpCode │ Count  │ DataOffset │ OutputOffset │
│ (u32)  │ (u32)  │ (u32)      │ (u32)        │
├────────┼────────┼────────────┼──────────────┤
│  0x30  │  100   │     0      │      0       │ ← 100 Mat4 multiplies
│  0x21  │   50   │  3200      │   1600       │ ← 50 Quat SLERPs
│  0x03  │  200   │  3650      │   1800       │ ← 200 Vec3 normalizes
└────────┴────────┴────────────┴──────────────┘

Data Buffer (Float32Array):
┌─────────────────────────────────────────────────────────┐
│ [mat4A₀|mat4B₀|mat4A₁|mat4B₁|...|quatA₀|quatB₀|t|...] │
└─────────────────────────────────────────────────────────┘

Output Buffer (Float32Array):
┌─────────────────────────────────────────────────────────┐
│ [result₀|result₁|...|slerpResult₀|...|normResult₀|...] │
└─────────────────────────────────────────────────────────┘
```
