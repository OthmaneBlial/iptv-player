use crate::models::Channel;
use std::collections::HashMap;

/// Extract title and attributes from #EXTINF line
pub fn parse_extinf_line(line: &str) -> Option<(String, HashMap<String, String>)> {
    if !line.starts_with("#EXTINF") {
        return None;
    }

    let separator_index = line.find(',').unwrap_or(0);
    let metadata = if separator_index > 0 {
        &line[..separator_index]
    } else {
        line
    };
    let title = if separator_index > 0 && separator_index + 1 < line.len() {
        line[separator_index + 1..].trim()
    } else {
        "Unknown"
    };

    let mut attributes = HashMap::new();
    let attribute_pattern = regex::Regex::new(r#"([\w-]+)="([^"]*)""#).unwrap();

    for cap in attribute_pattern.captures_iter(metadata) {
        if let (Some(key), Some(value)) = (cap.get(1), cap.get(2)) {
            attributes.insert(key.as_str().to_string(), value.as_str().to_string());
        }
    }

    attributes.insert("title".to_string(), title.to_string());
    Some((title.to_string(), attributes))
}

/// Parse a complete M3U playlist
pub fn parse_m3u(data: &str, base_url: &str) -> Vec<Channel> {
    let lines: Vec<&str> = data.lines().collect();
    let mut channels: Vec<Channel> = Vec::new();
    let mut current_attrs: HashMap<String, String> = HashMap::new();

    for line in lines {
        let line = line.trim();

        if line.starts_with("#EXTINF") {
            if let Some((title, attrs)) = parse_extinf_line(line) {
                current_attrs = attrs;
                current_attrs.insert("title".to_string(), title);
            }
        } else if !line.is_empty() && !line.starts_with("#") {
            // This is the URL line
            let url = resolve_url(line, base_url);
            if !url.is_empty() {
                let name = current_attrs
                    .get("tvg-name")
                    .or_else(|| current_attrs.get("title"))
                    .cloned()
                    .filter(|s| !s.is_empty())
                    .unwrap_or_else(|| "Unknown".to_string());

                let display_name = current_attrs
                    .get("title")
                    .cloned()
                    .filter(|s| !s.is_empty())
                    .unwrap_or_else(|| name.clone());

                channels.push(Channel {
                    name,
                    url,
                    logo: current_attrs.get("tvg-logo").cloned().unwrap_or_default(),
                    group: current_attrs
                        .get("group-title")
                        .cloned()
                        .filter(|s| !s.is_empty())
                        .unwrap_or_else(|| "Ungrouped".to_string()),
                    country: current_attrs.get("tvg-country").cloned().unwrap_or_default(),
                    language: current_attrs.get("tvg-language").cloned().unwrap_or_default(),
                    id: current_attrs.get("tvg-id").cloned().unwrap_or_default(),
                    display_name,
                });
            }
            current_attrs.clear();
        }
    }

    channels
}

/// Resolve a URL relative to a base URL
fn resolve_url(url: &str, base_url: &str) -> String {
    if url.is_empty() {
        return String::new();
    }

    // Already absolute URL
    if url.starts_with("http://") || url.starts_with("https://") {
        return url.to_string();
    }

    // Protocol-relative URL
    if url.starts_with("//") {
        return format!("https:{}", url);
    }

    // No base URL, return as-is
    if base_url.is_empty() || !base_url.starts_with("http") {
        return url.to_string();
    }

    // Try to resolve relative URL
    if let Ok(base) = url::Url::parse(base_url) {
        if let Ok(resolved) = base.join(url) {
            return resolved.to_string();
        }
    }

    url.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_extinf_line() {
        let line = r#"#EXTINF:-1 tvg-id="123" tvg-name="Test Channel" tvg-logo="http://example.com/logo.png" group-title="News",Test Channel"#;
        let result = parse_extinf_line(line);
        assert!(result.is_some());

        let (title, attrs) = result.unwrap();
        assert_eq!(title, "Test Channel");
        assert_eq!(attrs.get("tvg-id"), Some(&"123".to_string()));
        assert_eq!(attrs.get("tvg-name"), Some(&"Test Channel".to_string()));
        assert_eq!(
            attrs.get("tvg-logo"),
            Some(&"http://example.com/logo.png".to_string())
        );
        assert_eq!(attrs.get("group-title"), Some(&"News".to_string()));
    }

    #[test]
    fn test_parse_m3u() {
        let data = r#"#EXTM3U
#EXTINF:-1 tvg-id="1" tvg-name="Channel 1" group-title="News",Channel 1
http://example.com/stream1.m3u8
#EXTINF:-1 tvg-id="2" tvg-name="Channel 2" group-title="Sports",Channel 2
http://example.com/stream2.m3u8
"#;
        let channels = parse_m3u(data, "");
        assert_eq!(channels.len(), 2);
        assert_eq!(channels[0].name, "Channel 1");
        assert_eq!(channels[0].url, "http://example.com/stream1.m3u8");
        assert_eq!(channels[0].group, "News");
    }
}
