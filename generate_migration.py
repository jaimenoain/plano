import re

input_file = 'supabase/migrations/20260412000000_add_retention_analysis.sql'
output_file = 'supabase/migrations/20260413000000_exclude_admin_from_stats.sql'

with open(input_file, 'r') as f:
    content = f.read()

# Replace the comment header
content = content.replace(
    "-- Add retention analysis to admin stats RPC\n-- Calculates user activity distribution and daily breakdown of active users",
    "-- Exclude admin users from admin stats RPC\n-- Updates get_admin_dashboard_stats to exclude 'admin' role in addition to 'test_user'"
)

# Regex to find "role IS DISTINCT FROM 'test_user'" with optional prefix (like p. or p_member.)
# We capture the prefix in group 1.
pattern = re.compile(r"([a-z0-9_]+\.)?role IS DISTINCT FROM 'test_user'")

def replacement(match):
    prefix = match.group(1) if match.group(1) else ""
    return f"({prefix}role IS DISTINCT FROM 'test_user' AND {prefix}role IS DISTINCT FROM 'admin')"

new_content = pattern.sub(replacement, content)

with open(output_file, 'w') as f:
    f.write(new_content)

print(f"Generated {output_file}")
