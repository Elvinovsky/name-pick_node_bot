import type {Config} from 'jest';

export default async (): Promise<Config> => {
  return {
		// para
    verbose: true,
		preset: 'ts-jest',
		testEnvironment: 'node',
		workerThreads: true,
		maxWorkers: 1,
		maxConcurrency: 1,
		collectCoverageFrom: [
			'**/*.{js,jsx}',
			'!**/node_modules/**',
			'!**/vendor/**',
		],
		coverageDirectory: './_coverage',
		modulePaths:['./src/', './tests/'],
		testPathIgnorePatterns:['node_modules', '_dist'],

  };
};