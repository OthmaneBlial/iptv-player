use crate::models::{Channel, ChannelFilter};

/// Calculate fuzzy match score between value and query
/// Returns a score > 0 for matches, -1 for no match
pub fn fuzzy_score(value: &str, query: &str) -> i32 {
    if query.is_empty() {
        return 0;
    }

    let value_lower = value.to_lowercase();
    let query_lower = query.to_lowercase();

    // Exact substring match gets high score
    if let Some(pos) = value_lower.find(&query_lower) {
        // Earlier position = higher score
        return 1000 - pos as i32;
    }

    // Sequential character match
    let mut score = 0;
    let mut query_idx = 0;
    let query_chars: Vec<char> = query_lower.chars().collect();

    for ch in value_lower.chars() {
        if query_idx < query_chars.len() && ch == query_chars[query_idx] {
            score += 10;
            query_idx += 1;
            if query_idx == query_chars.len() {
                return score;
            }
        }
    }

    -1
}

/// Check if a channel matches the given filter criteria
pub fn channel_matches_filter(channel: &Channel, filter: &ChannelFilter) -> bool {
    // Check group filter
    if filter.group != "all" && channel.group != filter.group {
        return false;
    }

    // Check country filter
    if filter.country != "all" && channel.country != filter.country {
        return false;
    }

    // Check language filter
    if filter.language != "all" && channel.language != filter.language {
        return false;
    }

    // Check query filter
    if !filter.query.is_empty() {
        let query = &filter.query.to_lowercase();

        let display_name_score = fuzzy_score(&channel.display_name, query);
        let group_score = fuzzy_score(&channel.group, query);
        let country_score = fuzzy_score(&channel.country, query);
        let language_score = fuzzy_score(&channel.language, query);
        let name_score = fuzzy_score(&channel.name, query);

        let max_score = display_name_score
            .max(group_score)
            .max(country_score)
            .max(language_score)
            .max(name_score);

        if max_score < 0 {
            return false;
        }
    }

    true
}

/// Filter channels based on the given criteria
pub fn filter_channels(channels: &[Channel], filter: &ChannelFilter) -> Vec<Channel> {
    channels
        .iter()
        .filter(|channel| channel_matches_filter(channel, filter))
        .cloned()
        .collect()
}

/// Search channels with fuzzy matching
/// Returns channels sorted by relevance score
pub fn search_channels(channels: &[Channel], query: &str) -> Vec<(Channel, i32)> {
    if query.is_empty() {
        return Vec::new();
    }

    let query_lower = query.to_lowercase();
    let mut results: Vec<(Channel, i32)> = channels
        .iter()
        .map(|channel| {
            let display_name_score = fuzzy_score(&channel.display_name, &query_lower);
            let group_score = fuzzy_score(&channel.group, &query_lower);
            let country_score = fuzzy_score(&channel.country, &query_lower);
            let language_score = fuzzy_score(&channel.language, &query_lower);
            let name_score = fuzzy_score(&channel.name, &query_lower);

            let max_score = display_name_score
                .max(group_score)
                .max(country_score)
                .max(language_score)
                .max(name_score);

            (channel.clone(), max_score)
        })
        .filter(|(_, score)| *score >= 0)
        .collect();

    // Sort by score descending
    results.sort_by(|a, b| b.1.cmp(&a.1));
    results
}

/// Sort channels by the specified sort order
pub fn sort_channels(channels: &mut [Channel], sort: &str, favorites: &[String]) {
    let favorites_set: std::collections::HashSet<&str> =
        favorites.iter().map(|s| s.as_str()).collect();

    match sort {
        "name" => {
            channels.sort_by(|a, b| a.display_name.cmp(&b.display_name));
        }
        "group" => {
            channels.sort_by(|a, b| {
                a.group
                    .cmp(&b.group)
                    .then_with(|| a.display_name.cmp(&b.display_name))
            });
        }
        "favorites" => {
            channels.sort_by(|a, b| {
                let a_fav = favorites_set.contains(a.url.as_str());
                let b_fav = favorites_set.contains(b.url.as_str());
                b_fav.cmp(&a_fav).then_with(|| a.display_name.cmp(&b.display_name))
            });
        }
        "country" => {
            channels.sort_by(|a, b| {
                a.country
                    .cmp(&b.country)
                    .then_with(|| a.display_name.cmp(&b.display_name))
            });
        }
        "language" => {
            channels.sort_by(|a, b| {
                a.language
                    .cmp(&b.language)
                    .then_with(|| a.display_name.cmp(&b.display_name))
            });
        }
        _ => {
            // Default to name sort
            channels.sort_by(|a, b| a.display_name.cmp(&b.display_name));
        }
    }
}

/// Extract unique values from a channel field
pub fn extract_unique_values(channels: &[Channel], field: &str) -> Vec<String> {
    let mut values = std::collections::HashSet::new();

    for channel in channels {
        let value = match field {
            "group" => channel.group.clone(),
            "country" => channel.country.clone(),
            "language" => channel.language.clone(),
            _ => String::new(),
        };

        if !value.is_empty() {
            values.insert(value);
        }
    }

    let mut result: Vec<String> = values.into_iter().collect();
    result.sort();
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fuzzy_score() {
        assert_eq!(fuzzy_score("CNN", "cnn"), 1000);
        assert_eq!(fuzzy_score("CNN International", "cnn"), 1000);
        assert!(fuzzy_score("CNN", "c") > 0);
        assert_eq!(fuzzy_score("ABC", "xyz"), -1);
        assert_eq!(fuzzy_score("", "test"), -1);
    }

    #[test]
    fn test_filter_channels() {
        let channels = vec![
            Channel::new(
                "CNN".to_string(),
                "http://example.com/cnn".to_string(),
                "".to_string(),
                "News".to_string(),
                "US".to_string(),
                "English".to_string(),
                "".to_string(),
                "CNN".to_string(),
            ),
            Channel::new(
                "BBC".to_string(),
                "http://example.com/bbc".to_string(),
                "".to_string(),
                "News".to_string(),
                "UK".to_string(),
                "English".to_string(),
                "".to_string(),
                "BBC".to_string(),
            ),
        ];

        let filter = ChannelFilter {
            query: String::new(),
            country: "US".to_string(),
            group: "all".to_string(),
            language: "all".to_string(),
            sort: "name".to_string(),
        };

        let result = filter_channels(&channels, &filter);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name, "CNN");
    }

    #[test]
    fn test_search_channels() {
        let channels = vec![
            Channel::new(
                "CNN International".to_string(),
                "http://example.com/cnn".to_string(),
                "".to_string(),
                "News".to_string(),
                "US".to_string(),
                "English".to_string(),
                "".to_string(),
                "CNN".to_string(),
            ),
            Channel::new(
                "BBC News".to_string(),
                "http://example.com/bbc".to_string(),
                "".to_string(),
                "News".to_string(),
                "UK".to_string(),
                "English".to_string(),
                "".to_string(),
                "BBC".to_string(),
            ),
        ];

        let results = search_channels(&channels, "cnn");
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].0.name, "CNN International");
        assert!(results[0].1 > 0);
    }
}
