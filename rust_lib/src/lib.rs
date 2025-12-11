use wasm_bindgen::prelude::*;
use image::{ImageBuffer, Rgba};
use std::time::Instant;

#[wasm_bindgen]
pub struct ProcessResult {
    pub thumbnail: Vec<u8>,
    pub rust_time_ms: f64,
}

#[wasm_bindgen]
impl ProcessResult {
    pub fn thumbnail(&self) -> Vec<u8> {
        self.thumbnail.clone()
    }
    pub fn rust_time_ms(&self) -> f64 {
        self.rust_time_ms
    }
}

#[wasm_bindgen]
pub fn process_image(width: u32, height: u32, data: &[u8]) -> ProcessResult {
    let start = Instant::now();

    // 将 JS 的 RGBA 像素转换为 Rust 图像
    let img: ImageBuffer<Rgba<u8>, _> =
        ImageBuffer::from_raw(width, height, data.to_vec()).unwrap();

    // 生成缩略图，例如宽度缩小到 300
    let thumbnail = image::imageops::thumbnail(&img, 300, 300);

    // 导出 PNG
    let mut buf = Vec::new();
    thumbnail.write_to(&mut buf, image::ImageOutputFormat::Png).unwrap();

    let rust_time = start.elapsed().as_secs_f64() * 1000.0;

    ProcessResult {
        thumbnail: buf,
        rust_time_ms: rust_time,
    }
}
