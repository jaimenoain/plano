import re
import json

def parse_schema(filepath):
    schema = {}
    current_table = None

    with open(filepath, 'r') as f:
        content = f.read()

    # Simple regex to find CREATE TABLE blocks
    # This is a basic parser and might need refinement
    table_blocks = re.split(r'CREATE TABLE public\.', content)

    for block in table_blocks[1:]: # Skip the first split which is before the first table
        table_name_match = re.match(r'(\w+)', block)
        if not table_name_match:
            continue

        table_name = table_name_match.group(1)
        schema[table_name] = {}

        # Extract columns
        # Looking for lines starting with two spaces, a word (column name), and then type
        lines = block.split('\n')
        for line in lines:
            line = line.strip()
            # Skip constraints and empty lines
            if not line or line.startswith('CONSTRAINT') or line.startswith(')'):
                continue

            # Simple column match: name type ...
            # Be careful with columns that might be quoted or have complex types
            col_match = re.match(r'(\w+)\s+([\w\-\[\]]+)', line)
            if col_match:
                col_name = col_match.group(1)
                col_type = col_match.group(2)
                # Ignore PRIMARY KEY etc for now, just get name and basic type
                if col_name.upper() not in ['CONSTRAINT', 'CREATE', 'PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK']:
                    schema[table_name][col_name] = col_type

    return schema

if __name__ == "__main__":
    schema = parse_schema('schema.sql')
    print(json.dumps(schema, indent=2))
