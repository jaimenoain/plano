
function getPath(contentType: string, fileName: string, folderName: string | undefined, userId: string): string {
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime']
    let folderPrefix = 'review-images'

    if (allowedVideoTypes.includes(contentType)) {
      folderPrefix = 'review-videos'
    }

    // Mocking crypto.randomUUID for deterministic testing
    const uuid = 'mock-uuid';

    const fileKey = folderName
      ? `${folderPrefix}/${userId}/${folderName}/${uuid}-${fileName}`
      : `${folderPrefix}/${userId}/${uuid}-${fileName}`

    return fileKey;
}

const userId = 'user-123';
const folderName = 'review-456';

// Test cases
const tests = [
    { contentType: 'image/jpeg', fileName: 'test.jpg', expectedStart: 'review-images/user-123/review-456/' },
    { contentType: 'video/mp4', fileName: 'test.mp4', expectedStart: 'review-videos/user-123/review-456/' },
    { contentType: 'video/webm', fileName: 'test.webm', expectedStart: 'review-videos/user-123/review-456/' },
    { contentType: 'video/quicktime', fileName: 'test.mov', expectedStart: 'review-videos/user-123/review-456/' },
    { contentType: 'application/pdf', fileName: 'test.pdf', expectedStart: 'review-images/user-123/review-456/' }, // Fallback
];

let failed = false;

tests.forEach(test => {
    const path = getPath(test.contentType, test.fileName, folderName, userId);
    console.log(`[${test.contentType}] Path: ${path}`);
    if (!path.startsWith(test.expectedStart)) {
        console.error(`FAILED: Expected start ${test.expectedStart}, got ${path}`);
        failed = true;
    }
});

// Test without folderName
const pathNoFolder = getPath('video/mp4', 'test.mp4', undefined, userId);
const expectedNoFolder = 'review-videos/user-123/mock-uuid-test.mp4';
console.log(`[No Folder] Path: ${pathNoFolder}`);
if (pathNoFolder !== expectedNoFolder) {
    console.error(`FAILED: Expected ${expectedNoFolder}, got ${pathNoFolder}`);
    failed = true;
}

if (failed) {
    console.error("Some tests failed.");
    process.exit(1);
} else {
    console.log("All tests passed.");
}
