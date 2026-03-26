use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Channel {
    pub name: String,
    pub url: String,
    pub logo: String,
    pub group: String,
    pub country: String,
    pub language: String,
    pub id: String,
    pub display_name: String,
}

impl Channel {
    pub fn new(
        name: String,
        url: String,
        logo: String,
        group: String,
        country: String,
        language: String,
        id: String,
        display_name: String,
    ) -> Self {
        Self {
            name,
            url,
            logo,
            group,
            country,
            language,
            id,
            display_name,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistRecord {
    pub id: String,
    pub name: String,
    pub url: String,
    pub channels: Vec<Channel>,
    pub last_loaded_at: String,
    pub source_label: String,
    pub source_type: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelFilter {
    pub query: String,
    pub country: String,
    pub group: String,
    pub language: String,
    pub sort: String,
}

impl Default for ChannelFilter {
    fn default() -> Self {
        Self {
            query: String::new(),
            country: "all".to_string(),
            group: "all".to_string(),
            language: "all".to_string(),
            sort: "name".to_string(),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EpgChannel {
    pub display_name: String,
    pub id: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EpgProgram {
    pub channel_id: String,
    pub description: String,
    pub end: String,
    pub start: String,
    pub title: String,
}
