import os
import re
import json
from parse_schema_test import parse_schema

def find_files(root_dir):
    file_paths = []
    for root, dirs, files in os.walk(root_dir):
        # Skip node_modules and .git
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.git' in dirs:
            dirs.remove('.git')

        for file in files:
            if file.endswith('.ts') or file.endswith('.tsx'):
                file_paths.append(os.path.join(root, file))
    return file_paths

def extract_table_references(content):
    # Match supabase.from('table') or .from("table")
    # Also handle newlines between supabase and .from
    matches = []
    # Simplified regex, assuming typical usage
    # We look for .from('...')
    for match in re.finditer(r"\.from\(['\"](\w+)['\"]\)", content):
        matches.append((match.group(1), match.start()))
    return matches

def analyze_chain(content, start_index, table_name, schema):
    discrepancies = []

    # Find the end of the chain. This is hard without a proper parser.
    # We will look for chained methods until we hit a semicolon or something that looks like end of statement.
    # Actually, we can just look for specific method calls following the .from()

    # We will limit the search window to say 500 characters or until next .from or ;
    search_window = content[start_index:]
    end_stmt = search_window.find(';')
    if end_stmt != -1:
        search_window = search_window[:end_stmt]

    next_from = search_window.find('.from(')
    if next_from != -1 and next_from > 10: # ensure it's not the current one
         search_window = search_window[:next_from]

    # Check for .select()
    select_matches = re.finditer(r"\.select\(['\"](.*?)['\"]\)", search_window, re.DOTALL)
    for match in select_matches:
        columns_str = match.group(1)
        # remove newlines
        columns_str = columns_str.replace('\n', '')

        # Split by comma, but be careful about nested parens like related(col,col)
        # This is a naive split, might fail on complex nested relations
        # But should work for top level columns

        # A better approach for static analysis of string content:
        # 1. Top level columns: "id, name, created_at"
        # 2. Relations: "profiles(username)"
        # 3. Aliased relations: "owner:profiles(username)"
        # 4. JSON arrows: "data->value" (should treat as "data")

        # We can try to parse the string with a simple state machine or regex
        # For now, let's just extract words that look like columns and check if they exist in schema[table_name]
        # If it looks like a relation (followed by '('), we check if the relation exists (as a table)

        # Let's clean the string of modifiers like !inner, count=...
        columns_str = re.sub(r'!inner', '', columns_str)

        # Tokenize by comma, but handle parens
        tokens = []
        depth = 0
        current_token = ""
        for char in columns_str:
            if char == '(':
                depth += 1
                current_token += char
            elif char == ')':
                depth -= 1
                current_token += char
            elif char == ',' and depth == 0:
                tokens.append(current_token.strip())
                current_token = ""
            else:
                current_token += char
        if current_token:
            tokens.append(current_token.strip())

        for token in tokens:
            # Handle aliases: "alias:column" or "alias:table(cols)"
            if ':' in token:
                parts = token.split(':', 1)
                # The right side is the actual column or table
                token = parts[1]

            # Check if it is a relation: "table(cols)"
            if '(' in token:
                # It's a join. The part before '(' is the table name.
                rel_table_match = re.match(r'(\w+)', token)
                if rel_table_match:
                    rel_table = rel_table_match.group(1)
                    if rel_table not in schema:
                         # It might be a foreign key name instead of table name, but Supabase usually expects table name or relation name.
                         # But let's report it if it's not a table.
                         # Actually, wait. Supabase allows embedding by FK name.
                         # For strict check, let's flag it if it's not a known table.
                         # But be gentle.
                         pass
                    else:
                        # Recursively check columns inside parens?
                        # That requires knowing which table the alias maps to if aliased, or just assuming table name.
                        # For "profiles(username)", we check 'username' in 'profiles'.
                        inner_cols = token[token.find('(')+1 : token.rfind(')')]
                        # We can verify inner_cols against rel_table
                        # But let's stick to top level for now or simple recursion if easy.
                        pass
                continue

            # It's a simple column (or with modifiers like count)
            # "id"
            # "id.count()" -> no, supabase doesn't do that inside select string usually
            # "data->field"

            col_name = token.split('->')[0].strip() # Handle json operators
            col_name = col_name.split('.')[0].strip() # Handle accidental dots?
            col_name = col_name.split(' ')[0].strip() # Handle ' column as alias' (SQL style? no supabase uses :)

            if col_name == '*':
                continue

            if col_name and col_name not in schema.get(table_name, {}):
                 # Check closest neighbor
                 suggestion = find_closest_neighbor(col_name, schema.get(table_name, {}).keys())
                 discrepancies.append({
                     "type": "column",
                     "table": table_name,
                     "invalid": col_name,
                     "suggestion": suggestion
                 })

    # Check for .eq('col', val), .order('col'), .gt('col'), etc.
    # list of methods that take column as first arg
    col_arg_methods = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'contains', 'containedBy', 'rangeGt', 'rangeGte', 'rangeLt', 'rangeLte', 'rangeAdjacent', 'overlaps', 'textSearch', 'match', 'order']

    for method in col_arg_methods:
        method_matches = re.finditer(r"\." + method + r"\(['\"](.*?)['\"]", search_window)
        for match in method_matches:
            col_name = match.group(1)
            # handle json arrows
            col_name = col_name.split('->')[0].strip()

            # handle table qualifiers if any: "table.col" (not common in supabase js, but possible in join filters?)
            # usually it is just "col" or "foreign_table.col" for join filtering?
            # Actually Supabase JS uses logic filters on joined tables differently usually.
            # But if it is "col", it refers to `table_name`.

            if '.' in col_name:
                # "relation.col"
                rel, col = col_name.split('.', 1)
                # we need to check if rel is a valid table (or alias) and col is valid on it.
                # Simplification: check if 'rel' is in schema. If so, check 'col' on 'rel'.
                if rel in schema:
                    if col not in schema[rel]:
                        suggestion = find_closest_neighbor(col, schema[rel].keys())
                        discrepancies.append({
                             "type": "column",
                             "table": rel,
                             "invalid": col,
                             "suggestion": suggestion
                        })
                continue

            if col_name and col_name not in schema.get(table_name, {}):
                 suggestion = find_closest_neighbor(col_name, schema.get(table_name, {}).keys())
                 discrepancies.append({
                     "type": "column",
                     "table": table_name,
                     "invalid": col_name,
                     "suggestion": suggestion
                 })

    # Check for .insert([...]) or .insert({...}) or .update or .upsert
    # This is harder because the keys are in an object literal.
    # regex to find .insert/update/upsert
    write_methods = ['insert', 'update', 'upsert']
    for method in write_methods:
        # We need to capture the object content.
        # This is very hard with regex because of nested braces.
        # But we can try to find simple keys.
        # Look for .method({ ... }) or .method([{...}])
        pass
        # For now, skipping write methods object parsing via regex as it is error prone.
        # But we can look for "key:" patterns inside the method call?

    return discrepancies

import difflib

def find_closest_neighbor(word, possibilities):
    matches = difflib.get_close_matches(word, possibilities, n=1, cutoff=0.6)
    return matches[0] if matches else None

def main():
    schema = parse_schema('schema.sql')
    files = find_files('src')

    report = []

    for filepath in files:
        with open(filepath, 'r') as f:
            content = f.read()

        # check for invalid table usage
        table_refs = extract_table_references(content)
        for table_name, index in table_refs:
            if table_name not in schema:
                # Table does not exist
                suggestion = find_closest_neighbor(table_name, schema.keys())
                report.append({
                    "file": filepath,
                    "error": f"Invalid table reference: '{table_name}'",
                    "fix": f"Change to '{suggestion}'" if suggestion else "Unknown table",
                    "line": content[:index].count('\n') + 1
                })
            else:
                # Analyze columns
                discs = analyze_chain(content, index, table_name, schema)
                for d in discs:
                    report.append({
                        "file": filepath,
                        "error": f"Invalid column '{d['invalid']}' on table '{d['table']}'",
                        "fix": f"Change to '{d['suggestion']}'" if d['suggestion'] else "Unknown column",
                        "line": content[:index].count('\n') + 1 # Approximate line
                    })

    # Print report
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()
