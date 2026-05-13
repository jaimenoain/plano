
import os
import re
import subprocess

migrations_dir = 'supabase/migrations'
migration_files = sorted([f for f in os.listdir(migrations_dir) if f.endswith('.sql')])

tables = {}

# Regex patterns
create_table_re = re.compile(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)', re.IGNORECASE)
enable_rls_re = re.compile(r'ALTER\s+TABLE\s+(?:public\.)?(\w+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY', re.IGNORECASE)
grant_re = re.compile(r'GRANT\s+(.*?)\s+ON\s+(?:TABLE\s+)?(?:public\.)?(\w+)\s+TO\s+([\w, ]+)', re.IGNORECASE)
policy_re = re.compile(r'CREATE\s+POLICY\s+.*?\s+ON\s+(?:public\.)?(\w+)', re.IGNORECASE)

# Noise to ignore
noise = {'IF', 'for', 'statement', 'to', 'EXISTS'}

for filename in migration_files:
    filepath = os.path.join(migrations_dir, filename)
    try:
        with open(filepath, 'r') as f:
            content = f.read()
            
            # Find table creations
            matches = create_table_re.findall(content)
            for table in matches:
                if table.upper() in noise: continue
                if table not in tables:
                    tables[table] = {
                        'name': table,
                        'created_in': filename,
                        'rls_enabled': False,
                        'policies_count': 0,
                        'grants': [],
                        'code_references': 0
                    }
            
            # Check for RLS
            rls_matches = enable_rls_re.findall(content)
            for table in rls_matches:
                if table in tables:
                    tables[table]['rls_enabled'] = True
            
            # Check for policies
            policy_matches = policy_re.findall(content)
            for table in policy_matches:
                if table in tables:
                    tables[table]['policies_count'] += 1
                    
            # Check for grants
            grant_matches = grant_re.findall(content)
            for privileges, table, roles in grant_matches:
                if table in tables:
                    roles_list = [r.strip() for r in roles.split(',')]
                    tables[table]['grants'].extend(roles_list)
    except Exception as e:
        print(f"Error reading {filename}: {e}")

# Grep code for Data API usage
for table in tables:
    # Search for .from('table_name') or .from("table_name")
    cmd = f"grep -rE \"\\.from\\(['\\\"]{table}['\\\"]\\)\" src app apps packages --exclude-dir=node_modules | wc -l"
    try:
        count = subprocess.check_output(cmd, shell=True).decode().strip()
        tables[table]['code_references'] = int(count)
    except:
        pass

# Print Report
print("# Supabase Data API Compliance Audit")
print("\n## Tables Audit\n")
print("| Table Name | Created In | RLS | Policies | Explicit Grants | Code Refs (Data API) |")
print("|------------|------------|-----|----------|-----------------|----------------------|")
for name, data in sorted(tables.items()):
    grants = ", ".join(sorted(set(data['grants'])))
    rls = "✅" if data['rls_enabled'] else "❌"
    print(f"| {name} | {data['created_in']} | {rls} | {data['policies_count']} | {grants} | {data['code_references']} |")

print("\n## Data API Usage Summary")
data_api_tables = [t for t, d in tables.items() if d['code_references'] > 0]
print(f"Tables accessed via Data API: {', '.join(sorted(data_api_tables))}")
