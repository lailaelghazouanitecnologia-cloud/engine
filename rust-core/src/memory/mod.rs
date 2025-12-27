//! Memory module - Shared memory management for WASM

use wasm_bindgen::prelude::*;

/// Allocate a Float32Array in WASM memory
#[wasm_bindgen]
pub fn alloc_f32(size: usize) -> *mut f32 {
    let mut vec = Vec::<f32>::with_capacity(size);
    vec.resize(size, 0.0);
    let ptr = vec.as_mut_ptr();
    std::mem::forget(vec);
    ptr
}

/// Free a Float32Array
#[wasm_bindgen]
pub fn free_f32(ptr: *mut f32, size: usize) {
    unsafe {
        let _ = Vec::from_raw_parts(ptr, size, size);
    }
}

/// Allocate a Uint32Array in WASM memory
#[wasm_bindgen]
pub fn alloc_u32(size: usize) -> *mut u32 {
    let mut vec = Vec::<u32>::with_capacity(size);
    vec.resize(size, 0);
    let ptr = vec.as_mut_ptr();
    std::mem::forget(vec);
    ptr
}

/// Free a Uint32Array
#[wasm_bindgen]
pub fn free_u32(ptr: *mut u32, size: usize) {
    unsafe {
        let _ = Vec::from_raw_parts(ptr, size, size);
    }
}

/// Get WASM memory
#[wasm_bindgen(js_name = "getMemory")]
pub fn get_memory() -> JsValue {
    wasm_bindgen::memory()
}
