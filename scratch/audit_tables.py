
import os
import re

migrations_dir = 'supabase/migrations'
migration_files = sorted([f for f in os.listdir(migrations_dir) if f.endswith('.sql')])

tables = {}

# Regex to match CREATE TABLE statements
create_table_re = re.compile(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)', re.IGNORECASE)
enable_rls_re = re.compile(r'ALTER\s+TABLE\s+(?:public\.)?(\w+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY', re.IGNORECASE)
grant_re = re.compile(r'GRANT\s+.*?\s+ON\s+(?:TABLE\s+)?(?:public\.)?(\w+)\s+TO\s+(\w+)', re.IGNORECASE)
policy_re = re.compile(r'CREATE\s+POLICY\s+.*?\s+ON\s+(?:public\.)?(\w+)', re.IGNORECASE)

for filename in migration_files:
    filepath = os.path.join(migrations_dir, filename)
    with open(filepath, 'r') as f:
        content = f.read()
        
        # Find table creations
        matches = create_table_re.findall(content)
        for table in matches:
            if table not in tables:
                tables[table] = {
                    'name': table,
                    'created_in': filename,
                    'rls_enabled': False,
                    'policies': [],
                    'grants': []
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
                tables[table]['policies'].append(filename)
                
        # Check for grants
        grant_matches = grant_re.findall(content)
        for table, role in grant_matches:
            if table in tables:
                tables[table]['grants'].append(role)

# Print results in a markdown-friendly format
print("| Table Name | Created In | RLS Enabled | Policies Count | Grants |")
print("|------------|------------|-------------|----------------|--------|")
for name, data in sorted(tables.items()):
    grants = ", ".join(set(data['grants']))
    print(f"| {name} | {data['created_in']} | {data['rls_enabled']} | {len(data['policies'])} | {grants} |")
