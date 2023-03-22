import { Generator } from './generator.js';
import { Random } from './random.js';

/** @ {any} ig */

export default class ProjectRedo {
	constructor(mod) {
		this.baseDirectory = mod.baseDirectory;
	}

	prestart() {
		Random.init(this.baseDirectory);
		const seed = (Math.random() + '').replace('.', '');
		console.log('seed', seed);
		Random.seed(seed);
		this.load();
	}

	async load() {
		const edges = await (await fetch('/' + this.baseDirectory + 'edges.json')).json();
		const response = await fetch('/' + this.baseDirectory + 'map-data.json');
		const data = await response.json();
		const generator = window.generator = new Generator(data, edges);
		const {startRoot, maps} = generator.generate(1234);
		console.log({startRoot, maps});
		(/** @type {any} */globalThis).ig.Game.inject({
			teleport(mapName, marker, hint, clearCache, reloadCache) {
				console.log('teleporting', mapName, marker && marker.marker, hint, clearCache, reloadCache);
				if (maps[mapName] && marker && maps[mapName][marker.marker]) {
					const target = maps[mapName][marker.marker];
					console.log('redirected', target.map, target.marker, hint, clearCache, reloadCache);
					return this.parent(target.map, new (/** @type {any} */globalThis).ig.TeleportPosition(target.marker), hint, clearCache, reloadCache);
				}
				console.log('routed', startRoot.map, startRoot.marker, hint, clearCache, reloadCache);
				return this.parent(startRoot.map, new (/** @type {any} */globalThis).ig.TeleportPosition(startRoot.marker), hint, clearCache, reloadCache);
			}
		});
	}
}