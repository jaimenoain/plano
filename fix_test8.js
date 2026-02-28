import fs from 'fs';
const FILE_PATH = 'src/features/maps/components/FilterDrawer.test.tsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

// The error is `});\n  });` instead of `});`
content = content.replace("    });\n  });\n  });", "    });\n  });");

fs.writeFileSync(FILE_PATH, content);
