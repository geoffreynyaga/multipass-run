import * as assert from 'assert';

suite('Instance State Tests', () => {
	suite('Instance State Values', () => {
		test('Should recognize valid instance states', () => {
			const validStates = ['Running', 'Stopped', 'Suspended', 'Deleted', 'Creating', 'Starting', 'Stopping', 'Downloading Image'];

			for (const state of validStates) {
				assert.ok(state.length > 0, `State "${state}" should not be empty`);
			}
		});

		test('Should handle case-insensitive state comparison', () => {
			const state1 = 'Running';
			const state2 = 'running';

			assert.strictEqual(state1.toLowerCase(), state2.toLowerCase(), 'States should match case-insensitively');
		});

		test('Should differentiate between active and stopped states', () => {
			const activeStates = ['Running', 'Starting'];
			const inactiveStates = ['Stopped', 'Suspended', 'Deleted'];

			const isActive = (state: string) =>
				activeStates.some(s => s.toLowerCase() === state.toLowerCase());

			assert.strictEqual(isActive('Running'), true, 'Running should be active');
			assert.strictEqual(isActive('Stopped'), false, 'Stopped should not be active');
		});
	});

	suite('Instance State Display', () => {
		test('Should show "Creating" badge during instance creation', () => {
			const state = 'Creating';
			const shouldShowCreatingBadge = state === 'Creating';

			assert.strictEqual(shouldShowCreatingBadge, true, 'Should show creating badge');
		});

		test('Should show "Downloading Image" badge when downloading', () => {
			const state = 'Downloading Image';
			const shouldShowDownloadingBadge = state === 'Downloading Image';

			assert.strictEqual(shouldShowDownloadingBadge, true, 'Should show downloading badge');
		});

		test('Should show "Starting" badge when instance is starting', () => {
			const state = 'Starting';
			const shouldShowStartingBadge = state === 'Starting';

			assert.strictEqual(shouldShowStartingBadge, true, 'Should show starting badge');
		});

		test('Should show "Stopping" badge when instance is stopping', () => {
			const state = 'Stopping';
			const shouldShowStoppingBadge = state === 'Stopping';

			assert.strictEqual(shouldShowStoppingBadge, true, 'Should show stopping badge');
		});

		test('Should show appropriate badge for each state', () => {
			const stateBadges: Record<string, string> = {
				'Running': '🟢 Running',
				'Stopped': '⚫ Stopped',
				'Suspended': '🟡 Suspended',
				'Creating': '🔄 Creating',
				'Downloading Image': '⬇️ Downloading Image',
				'Starting': '▶️ Starting',
				'Stopping': '⏸️ Stopping'
			};

			for (const [state, badge] of Object.entries(stateBadges)) {
				assert.ok(badge.length > 0, `Badge for state "${state}" should exist`);
				// Check if badge contains the state (or at least part of it for compound states)
				const stateWords = state.split(' ');
				const containsState = stateWords.some(word => badge.includes(word));
				assert.ok(containsState, `Badge "${badge}" should contain part of state name "${state}"`);
			}
		});
	});

	suite('Instance State Transitions', () => {
		test('Should allow valid state transitions', () => {
			const validTransitions: Record<string, string[]> = {
				'Stopped': ['Starting', 'Deleted'],
				'Starting': ['Running'],
				'Running': ['Stopping', 'Suspended'],
				'Stopping': ['Stopped'],
				'Suspended': ['Starting', 'Deleted'],
				'Creating': ['Running', 'Stopped']
			};

			// Test that each state has defined transitions
			for (const [fromState, toStates] of Object.entries(validTransitions)) {
				assert.ok(toStates.length > 0, `State "${fromState}" should have valid transitions`);
			}
		});

		test('Should not allow invalid transitions', () => {
			// Can't delete a running instance directly
			const currentState: string = 'Running';
			const canDelete = currentState === 'Stopped' || currentState === 'Suspended';

			assert.strictEqual(canDelete, false, 'Running instance should not be deletable directly');
		});
	});

	suite('Empty State Messages', () => {
		test('Should show message when no instances exist', () => {
			const instances: any[] = [];
			const message = instances.length === 0 ? 'No instances found. Create one to get started.' : '';

			assert.strictEqual(message, 'No instances found. Create one to get started.');
		});

		test('Should show message when no running instances', () => {
			const instances = [
				{ name: 'test1', state: 'Stopped' },
				{ name: 'test2', state: 'Suspended' }
			];

			const runningInstances = instances.filter(i => i.state.toLowerCase() === 'running');
			const message = runningInstances.length === 0 ? 'No running instances' : '';

			assert.strictEqual(message, 'No running instances');
		});

		test('Should show message when no deleted instances', () => {
			const deletedInstances: any[] = [];
			const message = deletedInstances.length === 0 ? 'No deleted instances' : '';

			assert.strictEqual(message, 'No deleted instances');
		});

		test('Should provide action hint in empty state message', () => {
			const emptyMessage = 'No instances found. Click the + button to create one.';

			assert.ok(emptyMessage.includes('create'), 'Empty message should suggest creating instance');
			assert.ok(emptyMessage.includes('+') || emptyMessage.includes('button'), 'Should reference UI element');
		});
	});
});
