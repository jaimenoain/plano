export const MOCK_ADMIN_STATS = {
    pulse: {
        total_users: 1250,
        new_users_30d: 45,
        new_users_24h: 3,
        active_users_24h: 320,
        active_users_30d: 850,
        network_density: 12.5,
        total_buildings: 450,
        total_reviews: 1200,
        total_photos: 380,
        pending_reports: 5,
    },
    activity_trends: {
        actions: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            logs: Math.floor(Math.random() * 50) + 10,
            comments: Math.floor(Math.random() * 100) + 20,
            likes: Math.floor(Math.random() * 200) + 50,
            votes: Math.floor(Math.random() * 30),
            follows: Math.floor(Math.random() * 10),
        })),
        logins: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            count: Math.floor(Math.random() * 300) + 50,
        })),
        dau_by_feature: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            logs_users: Math.floor(Math.random() * 40) + 5,
            comments_users: Math.floor(Math.random() * 80) + 10,
            likes_users: Math.floor(Math.random() * 150) + 20,
            votes_users: Math.floor(Math.random() * 20),
            visited_users: Math.floor(Math.random() * 200) + 150,
        })),
    },
    content_intelligence: {
        trending_buildings: [
            { building_id: '1', name: 'Empire State Building', visit_count: 45 },
            { building_id: '2', name: 'Fallingwater', visit_count: 32 },
            { building_id: '3', name: 'Guggenheim Museum', visit_count: 28 },
            { building_id: '4', name: 'Sydney Opera House', visit_count: 15 },
            { building_id: '5', name: 'Burj Khalifa', visit_count: 12 },
        ],
    },
    user_leaderboard: {
        most_reviews: [
            { user_id: '1', username: 'archilover99', avatar_url: null, count: 25 },
            { user_id: '2', username: 'critic_alice', avatar_url: null, count: 18 },
            { user_id: '3', username: 'joe_blogs', avatar_url: null, count: 12 },
        ],
        most_ratings: [
            { user_id: '4', username: 'rater_x', avatar_url: null, count: 150 },
            { user_id: '1', username: 'archilover99', avatar_url: null, count: 140 },
            { user_id: '5', username: 'star_gazer', avatar_url: null, count: 110 },
        ],
        most_likes: [
            { user_id: '6', username: 'social_butterfly', avatar_url: null, count: 500 },
            { user_id: '2', username: 'critic_alice', avatar_url: null, count: 320 },
            { user_id: '7', username: 'liker_bot_human', avatar_url: null, count: 290 },
        ],
        most_comments: [
            { user_id: '8', username: 'chatterbox', avatar_url: null, count: 85 },
            { user_id: '6', username: 'social_butterfly', avatar_url: null, count: 60 },
            { user_id: '1', username: 'archilover99', avatar_url: null, count: 45 },
        ],
        most_votes: [
            { user_id: '9', username: 'voter_citizen', avatar_url: null, count: 20 },
            { user_id: '10', username: 'decider_dave', avatar_url: null, count: 18 },
            { user_id: '4', username: 'rater_x', avatar_url: null, count: 15 },
        ],
        most_recently_online: [
            { user_id: '1', username: 'archilover99', avatar_url: null, last_online: new Date().toISOString() },
            { user_id: '6', username: 'social_butterfly', avatar_url: null, last_online: new Date(Date.now() - 5 * 60000).toISOString() },
            { user_id: '4', username: 'rater_x', avatar_url: null, last_online: new Date(Date.now() - 15 * 60000).toISOString() },
        ],
        most_follows_given: [
            { user_id: '1', username: 'archilover99', avatar_url: null, count: 50 },
            { user_id: '6', username: 'social_butterfly', avatar_url: null, count: 45 },
        ],
        most_followers_gained: [
            { user_id: '2', username: 'critic_alice', avatar_url: null, count: 30 },
            { user_id: '1', username: 'archilover99', avatar_url: null, count: 25 },
        ],
    },
    retention_analysis: {
        user_activity_distribution: {
            active_30d: 850,
            active_90d: 200,
            inactive: 200,
        },
        active_30d_breakdown: Array.from({ length: 30 }, (_, i) => ({
            days_since_active: i,
            user_count: Math.floor(Math.random() * 50) + 10,
        })),
        recent_users: Array.from({ length: 50 }, (_, i) => ({
            user_id: `r${i}`,
            username: `user_${i}`,
            avatar_url: null,
            last_online: new Date(Date.now() - i * 60000 * 10).toISOString(),
        })),
    },
    notification_intelligence: {
        engagement: {
            total_notifications: 15420,
            read_rate: 68.5,
            active_users_never_read_percent: 12.4,
            active_ignoring_percent: 24.8,
        },
        unread_distribution: [
            { bucket: "0", count: 450 },
            { bucket: "1-5", count: 320 },
            { bucket: "6-20", count: 210 },
            { bucket: "20+", count: 85 },
        ],
    },
};
