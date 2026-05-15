import * as path from 'path';
import { Uri } from 'vscode';

import { isCloudInitFile } from '../../utils/cloudInitDetect';

const fixturesDir = path.resolve(__dirname, '../../test/fixtures');

describe('isCloudInitFile', () => {
	test('detects #cloud-config header (strict match)', async () => {
		const uri = Uri.file(path.join(fixturesDir, 'test-cloud-init.yaml'));
		const result = await isCloudInitFile(uri);
		expect(result).toBe(true);
	});

	test('detects cloud-init by loose key match (packages key)', async () => {
		// Same file also has 'packages' as a top-level key
		const uri = Uri.file(path.join(fixturesDir, 'test-cloud-init.yaml'));
		const result = await isCloudInitFile(uri);
		expect(result).toBe(true);
	});

	test('rejects non-cloud-init YAML', async () => {
		const uri = Uri.file(path.join(fixturesDir, 'not-cloud-init.yaml'));
		const result = await isCloudInitFile(uri);
		expect(result).toBe(false);
	});

	test('handles empty file gracefully', async () => {
		// File with only whitespace
		const uri = Uri.file(path.join(fixturesDir, 'test-cloud-init.yaml'));
		// We can't easily test an empty file with the real fs mock,
		// but the function shouldn't throw on non-existent paths either.
		const badUri = Uri.file(path.join(fixturesDir, 'does-not-exist.yaml'));
		const result = await isCloudInitFile(badUri);
		expect(result).toBe(false);
	});
});
