pub mod filter;
pub mod models;
pub mod parser;

use wasm_bindgen::prelude::*;

use crate::filter::{fuzzy_score, search_channels, sort_channels};
use crate::models::{Channel, ChannelFilter};
use crate::parser::parse_m3u;

// Initialize the console error panic hook for better error messages in browser
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Parse M3U playlist content and return array of channels
#[wasm_bindgen]
pub fn parse_playlist(data: &str, base_url: &str) -> JsValue {
    let channels = parse_m3u(data, base_url);
    serde_wasm_bindgen::to_value(&channels).unwrap()
}

/// Filter channels based on filter criteria
#[wasm_bindgen]
pub fn filter_channels_js(channels_js: JsValue, filter_js: JsValue) -> JsValue {
    let channels: Vec<Channel> = serde_wasm_bindgen::from_value(channels_js).unwrap();
    let filter: ChannelFilter = serde_wasm_bindgen::from_value(filter_js).unwrap();

    let mut filtered: Vec<Channel> = channels
        .into_iter()
        .filter(|c| crate::filter::channel_matches_filter(c, &filter))
        .collect();

    sort_channels(&mut filtered, &filter.sort, &[]);

    serde_wasm_bindgen::to_value(&filtered).unwrap()
}

/// Search channels with fuzzy matching
#[wasm_bindgen]
pub fn search_channels_js(channels_js: JsValue, query: &str) -> JsValue {
    let channels: Vec<Channel> = serde_wasm_bindgen::from_value(channels_js).unwrap();
    let results = search_channels(&channels, query);
    serde_wasm_bindgen::to_value(&results).unwrap()
}

/// Get fuzzy score for a value and query
#[wasm_bindgen]
pub fn get_fuzzy_score(value: &str, query: &str) -> i32 {
    fuzzy_score(value, query)
}

/// Extract unique groups from channels
#[wasm_bindgen]
pub fn get_unique_groups(channels_js: JsValue) -> JsValue {
    let channels: Vec<Channel> = serde_wasm_bindgen::from_value(channels_js).unwrap();
    let groups = crate::filter::extract_unique_values(&channels, "group");
    serde_wasm_bindgen::to_value(&groups).unwrap()
}

/// Extract unique countries from channels
#[wasm_bindgen]
pub fn get_unique_countries(channels_js: JsValue) -> JsValue {
    let channels: Vec<Channel> = serde_wasm_bindgen::from_value(channels_js).unwrap();
    let countries = crate::filter::extract_unique_values(&channels, "country");
    serde_wasm_bindgen::to_value(&countries).unwrap()
}

/// Extract unique languages from channels
#[wasm_bindgen]
pub fn get_unique_languages(channels_js: JsValue) -> JsValue {
    let channels: Vec<Channel> = serde_wasm_bindgen::from_value(channels_js).unwrap();
    let languages = crate::filter::extract_unique_values(&channels, "language");
    serde_wasm_bindgen::to_value(&languages).unwrap()
}

/// Create a new channel instance
#[wasm_bindgen]
pub fn create_channel(
    name: &str,
    url: &str,
    logo: &str,
    group: &str,
    country: &str,
    language: &str,
    id: &str,
    display_name: &str,
) -> JsValue {
    let channel = Channel::new(
        name.to_string(),
        url.to_string(),
        logo.to_string(),
        group.to_string(),
        country.to_string(),
        language.to_string(),
        id.to_string(),
        display_name.to_string(),
    );
    serde_wasm_bindgen::to_value(&channel).unwrap()
}

/// Sort channels by favorites
#[wasm_bindgen]
pub fn sort_channels_by_favorites(
    channels_js: JsValue,
    favorites_js: JsValue,
) -> JsValue {
    let mut channels: Vec<Channel> = serde_wasm_bindgen::from_value(channels_js).unwrap();
    let favorites: Vec<String> = serde_wasm_bindgen::from_value(favorites_js).unwrap();
    sort_channels(&mut channels, "favorites", &favorites);
    serde_wasm_bindgen::to_value(&channels).unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_playlist() {
        let data = r#"#EXTM3U
#EXTINF:-1 tvg-id="1" tvg-name="Test" group-title="News",Test Channel
http://example.com/test.m3u8
"#;
        let result = parse_m3u(data, "");
        assert_eq!(result.len(), 1);
        // name gets tvg-name first, then title
        assert_eq!(result[0].name, "Test");
        assert_eq!(result[0].display_name, "Test Channel");
    }
}
