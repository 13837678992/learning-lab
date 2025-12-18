// 新增：引入 js_sys 库
use js_sys::Uint8Array;
use wasm_bindgen::prelude::*;
use image::codecs::png::{PngDecoder, PngEncoder};
use image::{DynamicImage, ImageEncoder};
use std::io::Cursor;

#[wasm_bindgen]
pub fn resize_png(input: &[u8], w: u32, h: u32) -> Vec<u8> {
    // 1. 解码 PNG
    let decoder = PngDecoder::new(Cursor::new(input)).expect("invalid png");
    let img = DynamicImage::from_decoder(decoder).expect("decode png failed");

    // 2. 缩放（Lanczos3 滤镜，可替换为 Nearest / Triangle 等）
    let resized = img.resize_exact(w, h, image::imageops::FilterType::Lanczos3);

    // 3. 编码为 PNG 并返回字节数组
    let mut buf = Vec::new();
    {
        let encoder = PngEncoder::new(&mut buf); // 移除不必要的 mut
        encoder
            .write_image(
                resized.as_bytes(),
                resized.width(),
                resized.height(),
                resized.color(),
            )
            .expect("encode png failed");
    }

    buf
}

#[wasm_bindgen]
pub fn slice_and_resize(
    src: &[u8],      // RGBA 原始数据
    page_width: u32,
    page_height: u32,
    page_count: u32,
    target_w: u32,
    target_h: u32,
) -> Vec<JsValue> { // 改为返回 Vec<JsValue>（每个元素是 Uint8Array）
    let mut result = Vec::with_capacity(page_count as usize);

    for page in 0..page_count {
        let y_offset = page * page_height;
        let mut out = vec![0u8; (target_w * target_h * 4) as usize];

        for ty in 0..target_h {
            let sy = y_offset + ty * page_height / target_h;
            for tx in 0..target_w {
                let sx = tx * page_width / target_w;

                let si = ((sy * page_width + sx) * 4) as usize;
                let di = ((ty * target_w + tx) * 4) as usize;

                // 边界检查：避免数组越界
                if si + 4 <= src.len() && di + 4 <= out.len() {
                    out[di..di + 4].copy_from_slice(&src[si..si + 4]);
                }
            }
        }

        // 简化写法：直接使用引入的 Uint8Array
        result.push(JsValue::from(Uint8Array::from(&out[..])));
    }

    result
}

// wasm-bindgen 启动函数（可选）
#[wasm_bindgen(start)]
pub fn start() {
    // 初始化控制台错误钩子（无需 cfg 检查，直接调用）
    console_error_panic_hook::set_once();
}