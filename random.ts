import type seedrandomtypes from 'seedrandom';

import seedrandom from 'seedrandom';

export class Random {
	private static random = Math.random;
	private static seedrandom: typeof seedrandomtypes = seedrandom;
	public static init(baseDir: string) {
		// Random.seedrandom = require(process.cwd() + '/' + baseDir + 'node_modules/seedrandom/index.js');
	}
	public static seed(seed: string) {
		Random.random = Random.seedrandom(seed);
	}
	public static randomInt(min: number, max: number) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Random.random() * (max - min)) + min;
	}

	public static randomMember<T>(array: T[]): T {
		// return array[0];
		return array[this.randomInt(0, array.length)];
	}
} 