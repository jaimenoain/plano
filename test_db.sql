SELECT c.column_name, c.data_type
FROM information_schema.columns c
WHERE c.table_name = 'building_architects';

SELECT c.column_name, c.data_type
FROM information_schema.columns c
WHERE c.table_name = 'buildings';
