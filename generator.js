/**
 * @typedef {{[name: string]: {
			disabledEvents: string[],
			connections: {
				markers: string[],
				exits: string[][],
				chests: (number | {id: number, tags?: string[]})[]
			}[] 
		}}} MapData
 * @typedef {{[map: string]: {[exit: string]: {map: string, marker: string}}}} Edges
 */

export class Generator {
	constructor(mapData, edges) {
		/**  @type {MapData} */
		this.mapData = mapData;
		/**  @type {Edges} */
		this.edges = edges;
	}

	generate() {
		//TODO: set seed

		const mapNames = Object.keys(this.mapData);
		const entrances = this._shuffle(mapNames.flatMap(map => this.mapData[map].connections.flatMap(c => c.markers.map(marker => ({map, marker})))));
		
		const areaSize = this._random(4, 6);
		const areaRoots = entrances.slice(0, areaSize);

		/** @type {Edges} */
		const maps = {};

		/** @type {[string, string][]} */
		const availableExits = [];
		
		/** @type {[string, string][]} */
		const availableEntrances = [];

		const startRoot = areaRoots.pop();
		const start = this._findSubarea(startRoot.map, startRoot.marker);
		for (const exit of start.exits) {
			const toFlags = exit.slice(2);
			if (toFlags.length === 0 || (toFlags.length === 1 && toFlags[0] === 'maybe')) {
				availableExits.push(exit);
			}
		}

		for (const entrance of start.markers) {
			availableEntrances.push([startRoot.map, entrance]);
		}

		while (areaRoots.length > 0) {
			const nextRoot = areaRoots.pop();
			const next = this._findSubarea(nextRoot.map, nextRoot.marker);
			const exit = this._randomElement(next.exits.filter(e => e.length === 2));
			const targetExit = this._randomElement(availableExits.filter(e => e.length === 2));

			const entrance = this.edges[exit[0]][exit[1]];
			const targetEntrance = this.edges[targetExit[0]][targetExit[1]];
			
			maps[exit[0]] = maps[exit[0]] || {};
			maps[targetExit[0]] = maps[targetExit[0]] || {};

			maps[exit[0]][exit[1]] = targetEntrance;
			maps[targetExit[0]][targetExit[1]] = entrance;

			console.log('connected ' + entrance.map + '/' + entrance.marker + ' to ' + targetEntrance.map + '/' + targetEntrance.marker);

			availableExits.splice(availableExits.indexOf(targetExit), 1);
			availableEntrances.splice(availableEntrances.findIndex(e => e[0] === entrance), 1);

			for (const e of next.exits) {
				const toFlags = e.slice(2);
				if (e !== exit && (toFlags.length === 0 || (toFlags.length === 1 && toFlags[0] === 'maybe'))) {
					availableExits.push(e);
				}
			}
	
			for (const e of next.markers) {
				if (e !== entrance.marker) {
					availableEntrances.push([startRoot.map, e]);
				}
			}
		}

		while (availableExits.filter(e => e.length === 2).length > 1 && availableEntrances.length > 0) {
			const exit = this._randomElement(availableExits.filter(e => e.length === 2));
			const targetExit = this._randomElement(availableExits.filter(e => e.length === 2 && e !== exit));

			const entrance = this.edges[exit[0]][exit[1]];
			const targetEntrance = this.edges[targetExit[0]][targetExit[1]];
			
			maps[exit[0]] = maps[exit[0]] || {};
			maps[targetExit[0]] = maps[targetExit[0]] || {};

			maps[exit[0]][exit[1]] = targetEntrance;
			maps[targetExit[0]][targetExit[1]] = entrance;

			console.log('connected ' + entrance.map + '/' + entrance.marker + ' to ' + targetEntrance.map + '/' + targetEntrance.marker);

			availableExits.splice(availableExits.indexOf(targetExit), 1);
			availableEntrances.splice(availableEntrances.findIndex(e => e[0] === entrance), 1);
		}

		while (availableExits.length > 1 && availableEntrances.length > 0) {
			const exit = this._randomElement(availableExits);
			const targetExit = this._randomElement(availableExits);

			const entrance = this.edges[exit[0]][exit[1]];
			const targetEntrance = this.edges[targetExit[0]][targetExit[1]];
			
			maps[exit[0]] = maps[exit[0]] || {};
			maps[targetExit[0]] = maps[targetExit[0]] || {};

			maps[exit[0]][exit[1]] = targetEntrance;
			maps[targetExit[0]][targetExit[1]] = entrance;

			console.log('connected ' + entrance.map + '/' + entrance.marker + ' to ' + targetEntrance.map + '/' + targetEntrance.marker);

			availableExits.splice(availableExits.indexOf(targetExit), 1);
			availableEntrances.splice(availableEntrances.findIndex(e => e[0] === entrance), 1);
		}


		return {startRoot, maps};
	}
	
	_findSubarea(map, marker) {
		return this.mapData[map].connections.find(c => c.markers.includes(marker));
	}


	/**
	 * @param {Edges} assignments 
	 * @param {string} map 
	 * @param {string} marker
	 * @returns {{map: string, marker: string}[]}
	 */
	_emptyEntrances(assignments, map, marker) {
		const markers = Object.values(assignments).flatMap(a => Object.values(a)).filter(m => m.map === map).map(m => m.marker);

		const data = this.mapData[map];
		const result = [];
		for (const connection of data.connections) {
			if (connection.markers.includes(marker)) {
				for (const marker of connection.markers) {
					if (!markers.includes(marker)) {
						result.push({map, marker});
					}
				}
			}
		}
		return this._shuffle(result);
	}

	_random(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min)) + min;
	}
	
	/**
	 * @template T
	 * @param {T[]} array 
	 * @returns {T}
	 */
	_randomElement(array) {
		return array[this._random(0, array.length)];
	}

	/**
	 * @template T
	 * @param {T[]} array 
	 * @returns {T[]}
	 */
	_shuffle(array) {
		const copy = [...array];
		const result = [];
		while (copy.length) {
			const next = this._randomElement(copy);
			result.push(next);
			copy.splice(copy.indexOf(next), 1);
		}
		return result;
	}
}