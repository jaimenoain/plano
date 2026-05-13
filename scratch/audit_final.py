
import os
import re
import subprocess

migrations_dir = 'supabase/migrations'
migration_files = sorted([f for f in os.listdir(migrations_dir) if f.endswith('.sql')])

# Tables to audit (extracted from types.ts previously, cleaning up)
target_tables = [
    'admin_audit_logs', 'ambassador_chapters', 'ambassador_memberships', 'ambassador_applications',
    'allowed_emails', 'architect_claims', 'architectural_styles', 'attribute_groups', 'attributes',
    'blocks', 'building_attributes', 'building_audit_logs', 'building_credits', 'building_credit_notes',
    'building_functional_typologies', 'building_posts', 'building_styles', 'buildings',
    'collection_contributors', 'collection_favorites', 'collection_items', 'collection_markers', 'collections',
    'comment_likes', 'comments', 'companies', 'company_claim_disputes', 'company_claim_verification_tokens',
    'company_steward_invites', 'company_steward_request_approval_tokens', 'company_steward_requests',
    'company_stewards', 'credit_notification_log', 'credit_removal_tokens', 'deletion_jobs',
    'event_attendances', 'event_buildings', 'events', 'follows', 'functional_categories',
    'functional_typologies', 'image_comments', 'image_likes', 'import_buildings', 'likes',
    'link_likes', 'localities', 'login_logs', 'notifications', 'people', 'person_company_affiliations',
    'profiles', 'recommendations', 'reports', 'review_images', 'review_links', 'saved_views',
    'suggested_profile_hides', 'user_buildings', 'user_folder_items', 'user_folders', 'waitlist_signups'
]

results = {}
for table in target_tables:
    results[table] = {
        'name': table,
        'created_in': 'Unknown',
        'rls_enabled': False,
        'policies_count': 0,
        'grants': [],
        'code_references': 0
    }

# Regex patterns
create_table_re = re.compile(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)', re.IGNORECASE)
enable_rls_re = re.compile(r'ALTER\s+TABLE\s+(?:public\.)?(\w+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY', re.IGNORECASE)
grant_re = re.compile(r'GRANT\s+(.*?)\s+ON\s+(?:TABLE\s+)?(?:public\.)?(\w+)\s+TO\s+([\w, ]+)', re.IGNORECASE)
policy_re = re.compile(r'CREATE\s+POLICY\s+.*?\s+ON\s+(?:public\.)?(\w+)', re.IGNORECASE)

for filename in migration_files:
    filepath = os.path.join(migrations_dir, filename)
    try:
        with open(filepath, 'r') as f:
            content = f.read()
            
            # Find table creations
            matches = create_table_re.findall(content)
            for table in matches:
                if table in results and results[table]['created_in'] == 'Unknown':
                    results[table]['created_in'] = filename
            
            # Check for RLS
            rls_matches = enable_rls_re.findall(content)
            for table in rls_matches:
                if table in results:
                    results[table]['rls_enabled'] = True
            
            # Check for policies
            policy_matches = policy_re.findall(content)
            for table in policy_matches:
                if table in results:
                    results[table]['policies_count'] += 1
                    
            # Check for grants
            grant_matches = grant_re.findall(content)
            for privileges, table, roles in grant_matches:
                if table in results:
                    roles_list = [r.strip() for r in roles.split(',')]
                    results[table]['grants'].extend(roles_list)
    except Exception as e:
        print(f"Error reading {filename}: {e}")

# Grep code for Data API usage
for table in results:
    # Search for .from('table_name') or .from("table_name")
    cmd = f"grep -rE \"\\.from\\(['\\\"]{table}['\\\"]\\)\" src app apps packages --exclude-dir=node_modules | wc -l"
    try:
        count = subprocess.check_output(cmd, shell=True).decode().strip()
        results[table]['code_references'] = int(count)
    except:
        pass

# Print Report
print("# Supabase Data API Compliance Audit Report")
print("\n## Step 1 Audit Results\n")
print("| Table Name | Created In | RLS | Policies | Explicit Grants | Code Refs (Data API) |")
print("|------------|------------|-----|----------|-----------------|----------------------|")
for name, data in sorted(results.items()):
    grants = ", ".join(sorted(set(data['grants'])))
    rls = "✅" if data['rls_enabled'] else "❌"
    print(f"| {name} | {data['created_in']} | {rls} | {data['policies_count']} | {grants} | {data['code_references']} |")

print("\n## Data API Confirmation")
# Check for createClient usage
create_client_cmd = "grep -r \"createClient\" src app apps --exclude-dir=node_modules | wc -l"
create_client_count = subprocess.check_output(create_client_cmd, shell=True).decode().strip()
print(f"Usage of 'createClient': {create_client_count} occurrences")

# Check for supabase-js usage
supabase_js_cmd = "grep -r \"@supabase/supabase-js\" package.json | wc -l"
supabase_js_count = subprocess.check_output(supabase_js_cmd, shell=True).decode().strip()
print(f"Usage of '@supabase/supabase-js' in package.json: {supabase_js_count}")

data_api_tables = [t for t, d in results.items() if d['code_references'] > 0]
print(f"\nTables accessed via Data API in code: {', '.join(sorted(data_api_tables))}")
